// 웹페이지 콘텐츠 수집 + 스크린샷
// Netlify Functions(AWS Lambda) 환경에서 puppeteer-core + @sparticuz/chromium 사용.
// 실행 환경에서 Chromium 구동이 불가하면 일반 fetch 기반 텍스트 추출로 폴백한다.

export interface ScrapeResult {
  title: string
  finalUrl: string
  /** 페이지에서 추출한 본문 텍스트 (길이 제한 적용) */
  text: string
  /** 주요 메타 정보 요약 (h1/h2, 링크 수, 버튼 수 등) */
  structure: string
  /** base64 data URL (image/jpeg). 캡처 실패 시 null */
  screenshot: string | null
}

const MAX_TEXT = 12000
const NAV_TIMEOUT = 22000

/** HTML 문자열에서 태그를 제거하고 텍스트만 대략 추출 (폴백 전용) */
function stripHtml(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { title, text }
}

/** 일반 fetch 기반 폴백 */
async function fetchFallback(url: string): Promise<ScrapeResult> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkScanner/1.0)' },
  })
  const html = await res.text()
  const { title, text } = stripHtml(html)
  return {
    title: title || url,
    finalUrl: res.url || url,
    text: text.slice(0, MAX_TEXT),
    structure: '(브라우저 렌더링 없이 HTML 텍스트만 수집됨 — 동적 콘텐츠는 누락될 수 있음)',
    screenshot: null,
  }
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  let browser: import('puppeteer-core').Browser | null = null

  try {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default

    browser = await puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(NAV_TIMEOUT)
    await page.setUserAgent('Mozilla/5.0 (compatible; LinkScanner/1.0; +https://litt.ly/chichiboo)')

    await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT }).catch(async () => {
      // networkidle 실패 시 domcontentloaded 로 재시도
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
    })

    // 렌더 안정화를 위한 짧은 대기
    await new Promise((r) => setTimeout(r, 1200))

    const data = await page.evaluate(() => {
      const txt = (document.body?.innerText || '').replace(/\s+/g, ' ').trim()
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .slice(0, 25)
        .map((h) => `${h.tagName}: ${(h.textContent || '').trim().slice(0, 80)}`)
      const links = document.querySelectorAll('a').length
      const buttons = document.querySelectorAll('button, [role="button"]').length
      const inputs = document.querySelectorAll('input, textarea, select').length
      const imgs = document.querySelectorAll('img').length
      const navs = document.querySelectorAll('nav').length
      return {
        title: document.title || '',
        text: txt,
        structure: [
          `링크 ${links}개 · 버튼 ${buttons}개 · 입력필드 ${inputs}개 · 이미지 ${imgs}개 · 내비 ${navs}개`,
          '주요 헤딩:',
          ...headings,
        ].join('\n'),
      }
    })

    const shotBuffer = (await page.screenshot({
      type: 'jpeg',
      quality: 70,
      fullPage: false,
    })) as Buffer

    const finalUrl = page.url()
    await browser.close()
    browser = null

    return {
      title: data.title || url,
      finalUrl,
      text: data.text.slice(0, MAX_TEXT),
      structure: data.structure,
      screenshot: `data:image/jpeg;base64,${Buffer.from(shotBuffer).toString('base64')}`,
    }
  } catch (err) {
    if (browser) {
      await browser.close().catch(() => {})
    }
    console.warn('[scrape] puppeteer 실패, fetch 폴백 사용:', err instanceof Error ? err.message : err)
    return fetchFallback(url)
  }
}
