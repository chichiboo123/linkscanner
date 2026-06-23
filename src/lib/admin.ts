import type { ScanResponse } from '../types'

// 관리자 인증 키(=비밀번호)는 localStorage에 보관해 로그인 상태를 지속한다.
const KEY_STORE = 'linkscanner:adminKey'

export interface AdminIndexItem {
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

export function getAdminKey(): string {
  try {
    return localStorage.getItem(KEY_STORE) || ''
  } catch {
    return ''
  }
}

export function setAdminKey(key: string) {
  try {
    localStorage.setItem(KEY_STORE, key)
  } catch {
    /* noop */
  }
}

export function clearAdminKey() {
  try {
    localStorage.removeItem(KEY_STORE)
  } catch {
    /* noop */
  }
}

async function post(body: unknown, key?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) headers['x-admin-key'] = key
  const res = await fetch('/api/admin', { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({ ok: false, error: `오류 (${res.status})` }))
  return { status: res.status, data }
}

/** 비밀번호 검증. 성공 시 키 저장. */
export async function adminLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  const { data } = await post({ action: 'login', password })
  if (data.ok) {
    setAdminKey(password)
    return { ok: true }
  }
  return { ok: false, error: data.error || '로그인 실패' }
}

export async function adminList(
  key: string,
): Promise<{ ok: true; items: AdminIndexItem[] } | { ok: false; error: string; status: number }> {
  const { status, data } = await post({ action: 'list' }, key)
  if (data.ok) return { ok: true, items: data.items as AdminIndexItem[] }
  return { ok: false, error: data.error || '목록 조회 실패', status }
}

export async function adminGet(key: string, id: string): Promise<ScanResponse | { error: string }> {
  const { data } = await post({ action: 'get', id }, key)
  if (!data.ok) return { error: data.error || '리포트 조회 실패' }
  const r = data.report
  return { ok: true, markdown: r.markdown, screenshot: r.screenshot ?? null, meta: r.meta }
}

/** 분석 결과 자동 저장 (관리자 로그인 상태에서 호출) */
export async function adminSave(
  key: string,
  report: ScanResponse,
): Promise<{ ok: boolean; error?: string }> {
  // 6MB 본문 한도 보호
  const screenshot =
    report.screenshot && report.screenshot.length < 3_500_000 ? report.screenshot : null
  const { data } = await post(
    {
      action: 'save',
      record: { markdown: report.markdown, screenshot, meta: report.meta },
    },
    key,
  )
  return { ok: !!data.ok, error: data.error }
}

export async function adminRename(
  key: string,
  id: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await post({ action: 'rename', id, name }, key)
  return { ok: !!data.ok, error: data.error }
}

export async function adminDelete(
  key: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await post({ action: 'delete', id }, key)
  return { ok: !!data.ok, error: data.error }
}
