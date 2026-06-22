import type { Handler, HandlerEvent } from '@netlify/functions'
import { scrapePage } from './lib/scrape'
import { collectRepo } from './lib/github'
import { analyzeWithGemini, DEFAULT_MODELS } from './lib/gemini'

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

function err(statusCode: number, error: string, detail?: string) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify({ ok: false, error, detail }),
  }
}

const URL_RE = /^https?:\/\/.+\..+/i

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return err(405, '허용되지 않은 메서드입니다. POST를 사용하세요.')
  }

  const apiKey = process.env.GEMINI_API_KEY
  // GEMINI_MODEL(쉼표 구분)로 우선순위 목록을 덮어쓸 수 있다. 없으면 기본 체인 사용.
  const models = (process.env.GEMINI_MODEL || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
  const modelChain = models.length ? models : DEFAULT_MODELS
  const githubToken = process.env.GITHUB_TOKEN

  if (!apiKey) {
    return err(500, '서버에 GEMINI_API_KEY가 설정되지 않았습니다. Netlify 환경변수를 확인하세요.')
  }

  let body: { url?: string; repo?: string; perspectives?: string[] }
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return err(400, '요청 본문(JSON)을 해석할 수 없습니다.')
  }

  const url = (body.url || '').trim()
  const repo = (body.repo || '').trim()
  const perspectives = Array.isArray(body.perspectives)
    ? body.perspectives.map((p) => String(p).trim()).filter(Boolean).slice(0, 8)
    : []

  if (!URL_RE.test(url)) {
    return err(400, '올바른 웹앱 URL을 입력하세요. (예: https://example.com)')
  }

  const started = Date.now()

  try {
    // 1) 웹페이지 수집 + 스크린샷, 2) GitHub 수집 — 병렬 실행
    const [page, repoResult] = await Promise.all([
      scrapePage(url),
      repo ? collectRepo(repo, githubToken) : Promise.resolve(null),
    ])

    const repoAnalyzed = !!(repoResult && repoResult.ok && repoResult.sources)

    // 3) Gemini 종합 분석 (모델 폴백 체인)
    const analysis = await analyzeWithGemini({
      apiKey,
      models: modelChain,
      url: page.finalUrl,
      title: page.title,
      pageText: page.text,
      structure: page.structure,
      screenshot: page.screenshot,
      repoSummary: repoAnalyzed ? repoResult!.summary : undefined,
      repoSources: repoAnalyzed ? repoResult!.sources : undefined,
      perspectives,
    })

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        ok: true,
        markdown: analysis.markdown,
        screenshot: page.screenshot,
        meta: {
          title: page.title,
          url: page.finalUrl,
          repo: repo || undefined,
          screenshotCaptured: !!page.screenshot,
          repoAnalyzed,
          model: analysis.model,
          modelChain,
          fallbacks: analysis.fallbacks.map((f) => f.model),
          perspectives,
          elapsedMs: Date.now() - started,
        },
      }),
    }
  } catch (e) {
    return err(
      502,
      '분석 처리 중 오류가 발생했습니다.',
      e instanceof Error ? e.message : String(e),
    )
  }
}
