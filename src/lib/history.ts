// 최근 분석 리포트를 localStorage에 보관한다.
// 스크린샷(base64)이 커서 용량을 초과할 수 있으므로, 저장 실패 시
// 오래된 항목의 스크린샷을 제거하거나 항목을 줄여 가며 재시도한다.

import type { ScanResponse } from '../types'

const KEY = 'linkscanner:recent'
const MAX_ITEMS = 10

export interface HistoryItem {
  id: string
  title: string
  url: string
  repo?: string
  perspectives?: string[]
  savedAt: number
  markdown: string
  screenshot: string | null
  meta: ScanResponse['meta']
}

function read(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/** 용량 초과 시 단계적으로 줄여 가며 저장 시도 */
function persist(items: HistoryItem[]): HistoryItem[] {
  let working = items.slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(KEY, JSON.stringify(working))
    return working
  } catch {
    // 1단계: 가장 오래된 항목부터 스크린샷 제거
    const stripped = working.map((it, i) =>
      i === 0 ? it : { ...it, screenshot: null },
    )
    try {
      localStorage.setItem(KEY, JSON.stringify(stripped))
      return stripped
    } catch {
      // 2단계: 모든 스크린샷 제거 + 항목 수 축소
      working = stripped.map((it) => ({ ...it, screenshot: null })).slice(0, 5)
      try {
        localStorage.setItem(KEY, JSON.stringify(working))
      } catch {
        /* 최후엔 저장 포기 */
      }
      return working
    }
  }
}

export function getHistory(): HistoryItem[] {
  return read().sort((a, b) => b.savedAt - a.savedAt)
}

export function addHistory(report: ScanResponse): HistoryItem[] {
  const item: HistoryItem = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: report.meta.title || report.meta.url,
    url: report.meta.url,
    repo: report.meta.repo,
    perspectives: report.meta.perspectives,
    savedAt: Date.now(),
    markdown: report.markdown,
    screenshot: report.screenshot ?? null,
    meta: report.meta,
  }
  // 같은 URL의 이전 기록은 대체
  const rest = read().filter((it) => it.url !== item.url)
  return persist([item, ...rest])
}

export function removeHistory(id: string): HistoryItem[] {
  return persist(read().filter((it) => it.id !== id))
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function toResponse(item: HistoryItem): ScanResponse {
  return {
    ok: true,
    markdown: item.markdown,
    screenshot: item.screenshot,
    meta: item.meta,
  }
}
