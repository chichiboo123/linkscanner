import type { Handler, HandlerEvent } from '@netlify/functions'
import { getStore, type Store } from '@netlify/blobs'

// 리포트 공유:
//  - POST  /api/share          → 리포트 JSON 저장 후 { id, url } 반환
//  - GET   /api/share?id=XXXX  → 저장된 리포트 JSON 반환
// Netlify Blobs(무설정 내장 스토리지)에 스크린샷 포함 전체 리포트를 그대로 저장하므로
// 다른 기기에서도 링크만으로 동일한 내용을 볼 수 있다.

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

const STORE = 'reports'
const MAX_BYTES = 5 * 1024 * 1024 // 5MB 안전 상한

function json(statusCode: number, payload: unknown) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) }
}

function shortId(): string {
  return Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 8)
}

function baseUrl(event: HandlerEvent): string {
  const proto = event.headers['x-forwarded-proto'] || 'https'
  const host = event.headers['host'] || ''
  return `${proto}://${host}`
}

/**
 * Blobs 스토어 초기화.
 * 환경변수에 siteID/token 이 있으면 명시 모드를 우선 사용한다.
 * (자동 모드 getStore(name) 은 생성 시점엔 에러를 내지 않고 실제 읽기/쓰기 시점에
 *  "환경 미설정" 에러를 던지므로, 명시 모드를 우선해야 안정적이다.)
 * 없으면 Netlify 런타임이 주입하는 자동 컨텍스트로 시도한다.
 */
function resolveStore(): Store {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID || process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN

  if (siteID && token) {
    return getStore({ name: STORE, siteID, token })
  }
  return getStore(STORE)
}

export const handler: Handler = async (event: HandlerEvent) => {
  let store: Store
  try {
    store = resolveStore()
  } catch (e) {
    return json(500, {
      ok: false,
      error: '공유 저장소(Netlify Blobs) 초기화에 실패했습니다.',
      detail:
        (e instanceof Error ? e.message : String(e)) +
        ' — Netlify 사이트에서 Blobs가 활성화됐는지, 또는 NETLIFY_BLOBS_SITE_ID/NETLIFY_BLOBS_TOKEN 환경변수를 확인하세요.',
    })
  }

  // ── 조회 ──
  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters?.id?.trim()
    if (!id) return json(400, { ok: false, error: 'id 파라미터가 필요합니다.' })

    try {
      const data = await store.get(id, { type: 'json' })
      if (!data) {
        return json(404, { ok: false, error: '공유된 리포트를 찾을 수 없습니다. (만료되었거나 잘못된 링크)' })
      }
      return json(200, { ok: true, report: data })
    } catch (e) {
      return json(500, {
        ok: false,
        error: '리포트 조회에 실패했습니다.',
        detail: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // ── 저장 ──
  if (event.httpMethod === 'POST') {
    let body: { markdown?: string; screenshot?: string | null; meta?: unknown }
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { ok: false, error: '요청 본문(JSON)을 해석할 수 없습니다.' })
    }

    if (!body.markdown || typeof body.markdown !== 'string') {
      return json(400, { ok: false, error: '저장할 리포트(markdown)가 없습니다.' })
    }

    const payload = {
      markdown: body.markdown,
      screenshot: body.screenshot ?? null,
      meta: body.meta ?? {},
      savedAt: new Date().toISOString(),
    }

    // 스크린샷 포함 시 용량이 크면 제외하고 저장 (본문/메타는 유지)
    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_BYTES) {
      payload.screenshot = null
    }

    const id = shortId()
    try {
      await store.setJSON(id, payload)
    } catch (e) {
      return json(500, {
        ok: false,
        error: '리포트 저장에 실패했습니다.',
        detail: e instanceof Error ? e.message : String(e),
      })
    }

    return json(200, { ok: true, id, url: `${baseUrl(event)}/?r=${id}` })
  }

  return json(405, { ok: false, error: '허용되지 않은 메서드입니다.' })
}
