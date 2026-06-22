// Gemini API 호출 (REST, 멀티모달).
// 스크린샷(jpeg base64)이 있으면 inline_data 로 함께 전달해 UI/UX까지 시각 분석한다.

interface GeminiInput {
  apiKey: string
  model: string
  url: string
  title: string
  pageText: string
  structure: string
  /** "data:image/jpeg;base64,..." 또는 null */
  screenshot: string | null
  repoSummary?: string
  repoSources?: string
}

const SYSTEM_GUIDE = `너는 시니어 풀스택 개발자이자 제품 분석가다.
주어진 웹앱 정보(페이지 텍스트, 구조 요약, 스크린샷, GitHub 소스코드)를 종합해
한국어 기술 분석 리포트를 마크다운으로 작성한다.

작성 규칙:
- 반드시 순수 마크다운으로만 작성한다. (코드펜스로 전체를 감싸지 말 것)
- 추측이 필요한 부분은 "추정" 이라고 명시한다.
- 근거 없는 단정/과장 금지. 정보가 없으면 "확인 불가"로 표기한다.
- 친근하지만 전문적인 톤.`

function buildPrompt(input: GeminiInput): string {
  const hasRepo = !!input.repoSources
  return `${SYSTEM_GUIDE}

아래 형식의 리포트를 작성하라:

# 🔎 ${input.title || '웹앱'} 분석 리포트

## 📌 한눈에 보기
- 3~5줄 요약 (이 앱이 무엇이고 누구를 위한 것인지)

## 🧩 핵심 기능
- 관찰된 기능들을 불릿으로 정리

## 🏗️ 구조 및 아키텍처
- 페이지/화면 구성과 ${hasRepo ? '소스코드로 파악한 기술 스택·폴더 구조' : '프론트 구조(추정)'}

## 🎨 UI/UX 분석
- 레이아웃, 색감, 사용성, 접근성 관점 평가 ${input.screenshot ? '(스크린샷 기반)' : '(텍스트 기반, 시각 정보 제한)'}

${hasRepo ? '## 💻 소스코드 리뷰\n- 코드 품질, 패턴, 개선 포인트' : ''}

## ✅ 강점

## ⚠️ 개선 제안

## 📝 종합 평가
- 한 문단 총평

---
[입력 데이터]

■ 분석 대상 URL: ${input.url}
■ 페이지 제목: ${input.title}

■ 페이지 구조 요약:
${input.structure}

■ 페이지 본문 텍스트(발췌):
${input.pageText}

${
  hasRepo
    ? `■ GitHub 레포 메타:\n${input.repoSummary}\n\n■ GitHub 소스코드(발췌):\n${input.repoSources}`
    : '■ GitHub 레포: 제공되지 않음 (소스코드 분석 생략)'
}
`
}

export async function analyzeWithGemini(input: GeminiInput): Promise<string> {
  const prompt = buildPrompt(input)

  const parts: Array<Record<string, unknown>> = [{ text: prompt }]

  if (input.screenshot && input.screenshot.startsWith('data:')) {
    const [, base64] = input.screenshot.split(',')
    if (base64) {
      parts.push({
        inline_data: { mime_type: 'image/jpeg', data: base64 },
      })
    }
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini API 오류 (HTTP ${res.status}): ${errText.slice(0, 300)}`)
  }

  const json = await res.json()
  const candidate = json?.candidates?.[0]
  const text: string | undefined = candidate?.content?.parts
    ?.map((p: { text?: string }) => p.text || '')
    .join('')

  if (!text) {
    const reason = candidate?.finishReason || json?.promptFeedback?.blockReason || '응답 없음'
    throw new Error(`Gemini가 분석 결과를 반환하지 않았습니다. (사유: ${reason})`)
  }

  return text.trim()
}
