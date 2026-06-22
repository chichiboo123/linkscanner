// 웹페이지 콘텐츠 수집 + 스크린샷
//
// 서버리스(Netlify Functions)에서 Headless Chromium은 콜드스타트/번들 제약으로 불안정하므로,
//  - 텍스트/구조: 일반 fetch + HTML 파싱
//  - 스크린샷: 렌더링 전용 외부 API(Microlink, 키 불필요)로 캡처
// 두 작업을 병렬로 수행한다. 스크린샷 실패 시에도 텍스트 분석은 그대로 진행한다.

export interface ScrapeResult {
  title: string
  finalUrl: string
  /** 페이지에서 추출한 본문 텍스트 (길이 제한 적용) */
  text: string
  /** 주요 메타 정보 요약 (제목/설명/헤딩, 링크·버튼 수 등) */
  structure: string
  /** base64 data URL. 캡처 실패 시 null */
  screenshot: string | null
}

const MAX_TEXT = 12000

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function matchAll(re: RegExp, html: string, limit = 30): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < limit) {
    out.push(decodeEntities(m[1].replace(/<[^>]+>/g, '').trim()))
  }
  return out.filter(Boolean)
}

/** HTML 텍스트/구조 추출 */
async function fetchContent(url: string): Promise<Omit<ScrapeResult, 'screenshot'>> {
  let finalUrl = url
  let title = ''
  let description = ''
  let body = ''
  let headings: string[] = []
  let counts = ''

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkScanner/1.0)' },
    })
    finalUrl = res.url || url
    const html = await res.text()

    title =
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim() ||
      (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim()
    title = decodeEntities(title)

    description =
      (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim() ||
      (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').trim()
    description = decodeEntities(description)

    headings = [
      ...matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, html, 8).map((h) => `H1: ${h.slice(0, 80)}`),
      ...matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, html, 15).map((h) => `H2: ${h.slice(0, 80)}`),
    ]

    const count = (re: RegExp) => (html.match(re) || []).length
    counts = `링크 ${count(/<a\b/gi)}개 · 버튼 ${count(/<button\b|role=["']button["']/gi)}개 · 입력필드 ${count(
      /<input\b|<textarea\b|<select\b/gi,
    )}개 · 이미지 ${count(/<img\b/gi)}개 · 스크립트 ${count(/<script\b/gi)}개`

    body = decodeEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
  } catch (e) {
    console.warn('[scrape] fetch 실패:', e instanceof Error ? e.message : e)
  }

  const structure = [
    description ? `설명: ${description}` : '설명: (없음)',
    counts || '(요소 수 파악 불가)',
    headings.length ? '주요 헤딩:\n' + headings.join('\n') : '주요 헤딩: (없음)',
  ].join('\n')

  return {
    title: title || url,
    finalUrl,
    text: body.slice(0, MAX_TEXT),
    structure,
  }
}

/** Microlink 렌더링 API로 스크린샷 캡처 → base64 data URL */
async function captureScreenshot(url: string): Promise<string | null> {
  try {
    const apiKey = process.env.MICROLINK_API_KEY
    const params = new URLSearchParams({
      url,
      screenshot: 'true',
      meta: 'false',
      'viewport.width': '1280',
      'viewport.height': '900',
      'screenshot.type': 'jpeg',
      'screenshot.quality': '70',
      waitUntil: 'networkidle2',
    })
    const endpoint = `https://api.microlink.io/?${params.toString()}`
    const headers: Record<string, string> = {}
    if (apiKey) headers['x-api-key'] = apiKey

    const res = await fetch(endpoint, { headers })
    if (!res.ok) {
      console.warn('[scrape] microlink HTTP', res.status)
      return null
    }
    const json = await res.json()
    const shotUrl: string | undefined = json?.data?.screenshot?.url
    if (json?.status !== 'success' || !shotUrl) {
      console.warn('[scrape] microlink 스크린샷 URL 없음:', json?.status)
      return null
    }

    // 캡처 이미지를 받아 base64 data URL 로 변환 (Gemini inline_data + 공유 저장용)
    const imgRes = await fetch(shotUrl)
    if (!imgRes.ok) return null
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const mime = imgRes.headers.get('content-type') || 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch (e) {
    console.warn('[scrape] 스크린샷 실패:', e instanceof Error ? e.message : e)
    return null
  }
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const [content, screenshot] = await Promise.all([fetchContent(url), captureScreenshot(url)])
  return { ...content, screenshot }
}
