import type { Handler, HandlerEvent } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

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
const MAX_BYTES = 6 * 1024 * 1024 // 6MB 안전 상한

function json(statusCode: number, payload: unknown) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) }
}

function shortId(): string {
  return (
    Date.now().toString(36).slice(-4) +
    Math.random().toString(36).slice(2, 8)
  )
}

function baseUrl(event: HandlerEvent): string {
  const proto = event.headers['x-forwarded-proto'] || 'https'
  const host = event.headers['host'] || ''
  return `${proto}://${host}`
}

export const handler: Handler = async (event: HandlerEvent) => {
  const store = getStore(STORE)

  // ── 조회 ──
  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters?.id?.trim()
    if (!id) return json(400, { ok: false, error: 'id 파라미터가 필요합니다.' })

    const data = await store.get(id, { type: 'json' }).catch(() => null)
    if (!data) return json(404, { ok: false, error: '공유된 리포트를 찾을 수 없습니다. (만료되었거나 잘못된 링크)' })

    return json(200, { ok: true, report: data })
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

    const serialized = JSON.stringify(payload)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) {
      // 스크린샷이 너무 크면 제외하고 저장
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
