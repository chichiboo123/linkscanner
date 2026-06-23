import type { Handler, HandlerEvent } from '@netlify/functions'
import { timingSafeEqual } from 'crypto'
import { type Store } from '@netlify/blobs'
import { resolveStore } from './lib/blobs'

// 관리자 대시보드 백엔드.
//  - POST /api/admin  { action, ... }  (login 외 모든 액션은 x-admin-key 헤더 필요)
//    · login                          → 비밀번호 검증
//    · list                           → 인덱스(목록 메타) 반환
//    · get    { id }                  → 개별 전체 리포트 반환
//    · save   { record }              → 새 항목 저장(매 분석마다 개별 생성)
//    · rename { id, name }            → 이름 변경
//    · delete { id }                  → 삭제
//
// 저장 구조(Netlify Blobs, store: "admin-reports"):
//    · "__index__"   : AdminIndexItem[] (목록용 경량 메타)
//    · "report:<id>" : { markdown, screenshot, meta, id, name, savedAt } (전체)

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}
const STORE = 'admin-reports'
const INDEX_KEY = '__index__'
const MAX_BYTES = 5 * 1024 * 1024

function json(statusCode: number, payload: unknown) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) }
}

function shortId(): string {
  return Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 8)
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  try {
    return timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

interface AdminIndexItem {
  id: string
  name: string
  title: string
  url: string
  repo?: string
  perspectives?: string[]
  model: string
  screenshotCaptured: boolean
  repoAnalyzed: boolean
  savedAt: number
}

async function readIndex(store: Store): Promise<AdminIndexItem[]> {
  const idx = await store.get(INDEX_KEY, { type: 'json' }).catch(() => null)
  return Array.isArray(idx) ? (idx as AdminIndexItem[]) : []
}

async function writeIndex(store: Store, items: AdminIndexItem[]) {
  await store.setJSON(INDEX_KEY, items)
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: '허용되지 않은 메서드입니다.' })
  }

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return json(503, {
      ok: false,
      error: '관리자 기능이 비활성화되어 있습니다. (ADMIN_PASSWORD 미설정)',
    })
  }

  let body: {
    action?: string
    password?: string
    id?: string
    name?: string
    record?: { markdown?: string; screenshot?: string | null; meta?: Record<string, unknown>; name?: string }
  }
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: '요청 본문(JSON)을 해석할 수 없습니다.' })
  }

  const action = body.action

  // ── 로그인: 비밀번호 검증 ──
  if (action === 'login') {
    if (!body.password || !safeEqual(body.password, adminPassword)) {
      return json(401, { ok: false, error: '비밀번호가 올바르지 않습니다.' })
    }
    return json(200, { ok: true })
  }

  // ── 그 외 액션: 인증 필요 ──
  const key = event.headers['x-admin-key'] || ''
  if (!safeEqual(key, adminPassword)) {
    return json(401, { ok: false, error: '인증이 필요합니다. 다시 로그인해 주세요.' })
  }

  let store: Store
  try {
    store = resolveStore(STORE)
  } catch (e) {
    return json(500, {
      ok: false,
      error: '저장소(Netlify Blobs) 초기화에 실패했습니다.',
      detail: e instanceof Error ? e.message : String(e),
    })
  }

  try {
    switch (action) {
      case 'list': {
        const idx = await readIndex(store)
        idx.sort((a, b) => b.savedAt - a.savedAt)
        return json(200, { ok: true, items: idx })
      }

      case 'get': {
        if (!body.id) return json(400, { ok: false, error: 'id가 필요합니다.' })
        const full = await store.get(`report:${body.id}`, { type: 'json' }).catch(() => null)
        if (!full) return json(404, { ok: false, error: '리포트를 찾을 수 없습니다.' })
        return json(200, { ok: true, report: full })
      }

      case 'save': {
        const record = body.record
        if (!record || !record.markdown) {
          return json(400, { ok: false, error: '저장할 리포트가 없습니다.' })
        }
        const meta = (record.meta || {}) as Record<string, unknown>
        const id = shortId()
        const savedAt = Date.now()
        const name =
          (record.name && record.name.trim()) ||
          (meta.title as string) ||
          (meta.url as string) ||
          '제목 없음'

        const full = {
          id,
          name,
          savedAt,
          markdown: record.markdown,
          screenshot: record.screenshot ?? null,
          meta,
        }
        // 용량 초과 시 스크린샷 제외
        if (Buffer.byteLength(JSON.stringify(full), 'utf8') > MAX_BYTES) {
          full.screenshot = null
        }
        await store.setJSON(`report:${id}`, full)

        const item: AdminIndexItem = {
          id,
          name,
          title: (meta.title as string) || name,
          url: (meta.url as string) || '',
          repo: meta.repo as string | undefined,
          perspectives: meta.perspectives as string[] | undefined,
          model: (meta.model as string) || '',
          screenshotCaptured: !!meta.screenshotCaptured,
          repoAnalyzed: !!meta.repoAnalyzed,
          savedAt,
        }
        const idx = await readIndex(store)
        idx.unshift(item)
        await writeIndex(store, idx)

        return json(200, { ok: true, id })
      }

      case 'rename': {
        if (!body.id || !body.name?.trim()) {
          return json(400, { ok: false, error: 'id와 새 이름이 필요합니다.' })
        }
        const name = body.name.trim().slice(0, 120)
        const idx = await readIndex(store)
        const it = idx.find((x) => x.id === body.id)
        if (!it) return json(404, { ok: false, error: '항목을 찾을 수 없습니다.' })
        it.name = name
        await writeIndex(store, idx)

        const full = (await store.get(`report:${body.id}`, { type: 'json' }).catch(() => null)) as
          | Record<string, unknown>
          | null
        if (full) {
          full.name = name
          await store.setJSON(`report:${body.id}`, full)
        }
        return json(200, { ok: true })
      }

      case 'delete': {
        if (!body.id) return json(400, { ok: false, error: 'id가 필요합니다.' })
        await store.delete(`report:${body.id}`).catch(() => {})
        const idx = (await readIndex(store)).filter((x) => x.id !== body.id)
        await writeIndex(store, idx)
        return json(200, { ok: true })
      }

      default:
        return json(400, { ok: false, error: `알 수 없는 action: ${action}` })
    }
  } catch (e) {
    return json(500, {
      ok: false,
      error: '관리자 작업 처리 중 오류가 발생했습니다.',
      detail: e instanceof Error ? e.message : String(e),
    })
  }
}
