// Gemini API 호출 (REST, 멀티모달).
// 스크린샷(jpeg base64)이 있으면 inline_data 로 함께 전달해 UI/UX까지 시각 분석한다.
//
// 모델 폴백: 1순위부터 순서대로 시도하고, 호출이 실패하면(미제공/한도초과/안전차단 등)
// 다음 모델로 자동 폴백한다. 실제로 성공한 모델명을 함께 반환한다.

/** 기본 모델 우선순위. 환경변수 GEMINI_MODEL(쉼표 구분)로 덮어쓸 수 있다. */
export const DEFAULT_MODELS = [
  'gemini-3.1-flash-lite', // 1순위
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]

interface GeminiInput {
  apiKey: string
  /** 시도할 모델 우선순위 목록 */
  models: string[]
  url: string
  title: string
  pageText: string
  structure: string
  /** "data:image/...;base64,..." 또는 null */
  screenshot: string | null
  repoSummary?: string
  repoSources?: string
  /** 분야별 관점 분석 키워드 (예: 교육, 예술, 철학, 디지털) */
  perspectives?: string[]
}

export interface GeminiResult {
  markdown: string
  /** 실제로 응답을 생성한 모델 */
  model: string
  /** 성공 전에 실패한 모델들 (폴백 내역) */
  fallbacks: Array<{ model: string; reason: string }>
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
  const perspectives = (input.perspectives || []).filter(Boolean)
  const perspectiveBlock = perspectives.length
    ? `

## 🔭 분야별 심층 관점 분석
아래 각 분야의 전문가 관점에서 이 앱을 어떻게 해석·활용·평가할 수 있는지,
분야마다 \`###\` 소제목으로 나누어 상세히 서술하라.
각 분야당 최소 3~4문장으로, 그 분야 고유의 개념·가치·활용 시나리오·한계를 앱의 구체적 기능과 연결하라.
대상 분야: ${perspectives.join(', ')}`
    : ''

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
${perspectiveBlock}

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

/** 단일 모델 호출. 실패 시 throw. */
async function callModel(
  model: string,
  apiKey: string,
  parts: Array<Record<string, unknown>>,
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

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
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const candidate = json?.candidates?.[0]
  const text: string | undefined = candidate?.content?.parts
    ?.map((p: { text?: string }) => p.text || '')
    .join('')

  if (!text) {
    const reason = candidate?.finishReason || json?.promptFeedback?.blockReason || '응답 없음'
    throw new Error(`결과 미반환 (사유: ${reason})`)
  }

  return text.trim()
}

export async function analyzeWithGemini(input: GeminiInput): Promise<GeminiResult> {
  const prompt = buildPrompt(input)

  const parts: Array<Record<string, unknown>> = [{ text: prompt }]
  if (input.screenshot && input.screenshot.startsWith('data:')) {
    const match = input.screenshot.match(/^data:([^;]+);base64,(.*)$/)
    if (match) {
      const [, mime, base64] = match
      parts.push({ inline_data: { mime_type: mime || 'image/jpeg', data: base64 } })
    }
  }

  const models = input.models.length ? input.models : DEFAULT_MODELS
  const fallbacks: Array<{ model: string; reason: string }> = []

  for (const model of models) {
    try {
      const markdown = await callModel(model, input.apiKey, parts)
      return { markdown, model, fallbacks }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      console.warn(`[gemini] 모델 '${model}' 실패 → 다음 후보로 폴백:`, reason)
      fallbacks.push({ model, reason })
    }
  }

  throw new Error(
    `모든 모델 호출에 실패했습니다.\n` +
      fallbacks.map((f) => `- ${f.model}: ${f.reason}`).join('\n'),
  )
}
