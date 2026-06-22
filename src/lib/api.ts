import type { ScanRequest, ScanResult } from '../types'

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
