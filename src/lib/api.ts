import type { ScanRequest, ScanResult, ScanResponse } from '../types'

/**
 * Netlify Function `scan` 호출.
 * netlify.toml 의 리다이렉트로 /api/scan → /.netlify/functions/scan 매핑됨.
 */
export async function requestScan(payload: ScanRequest): Promise<ScanResult> {
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = (await res.json()) as ScanResult
    if (!res.ok && 'ok' in data === false) {
      return { ok: false, error: `서버 오류 (${res.status})` }
    }
    return data
  } catch (e) {
    return {
      ok: false,
      error: '네트워크 오류로 분석 요청에 실패했습니다.',
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}

/** 리포트를 서버에 저장하고 공유 URL을 반환 */
export async function createShareLink(
  report: ScanResponse,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: report.markdown,
        screenshot: report.screenshot ?? null,
        meta: report.meta,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || `공유 링크 생성 실패 (${res.status})` }
    }
    return { ok: true, url: data.url as string }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '공유 링크 생성 중 오류' }
  }
}

/** 공유 ID로 저장된 리포트를 불러오기 */
export async function fetchSharedReport(id: string): Promise<ScanResponse | { error: string }> {
  try {
    const res = await fetch(`/api/share?id=${encodeURIComponent(id)}`)
    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { error: data.error || '공유된 리포트를 불러오지 못했습니다.' }
    }
    const r = data.report
    return {
      ok: true,
      markdown: r.markdown,
      screenshot: r.screenshot ?? null,
      meta: r.meta,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '리포트 로드 중 오류' }
  }
}
