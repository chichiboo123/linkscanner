// 프론트 ↔ 백엔드 공유 타입

export interface ScanRequest {
  url: string
  repo?: string
}

export interface ScanMeta {
  /** 페이지 제목 */
  title: string
  /** 분석에 사용된 최종 URL */
  url: string
  /** GitHub 레포 (분석한 경우) */
  repo?: string
  /** 스크린샷 캡처 성공 여부 */
  screenshotCaptured: boolean
  /** GitHub 소스 수집 성공 여부 */
  repoAnalyzed: boolean
  /** 사용된 Gemini 모델 */
  model: string
  /** 처리 시간(ms) */
  elapsedMs: number
}

export interface ScanResponse {
  ok: true
  /** Gemini가 생성한 마크다운 리포트 */
  markdown: string
  /** base64 data URL 스크린샷 (있을 경우) */
  screenshot?: string | null
  meta: ScanMeta
}

export interface ScanError {
  ok: false
  error: string
  detail?: string
}

export type ScanResult = ScanResponse | ScanError
