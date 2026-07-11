import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ScanResponse } from '../types'
import { createShareLink } from '../lib/api'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  result: ScanResponse
  onReset: () => void
  shared?: boolean
  /** 관리자 자동 저장 상태 (관리자 로그인 상태로 새로 분석한 경우에만 표시) */
  saveStatus?: SaveStatus
  saveError?: string
  onRetrySave?: () => void
}

type ShareState = 'idle' | 'creating' | 'done' | 'error'

export default function ReportView({
  result,
  onReset,
  shared = false,
  saveStatus = 'idle',
  saveError = '',
  onRetrySave,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [shareState, setShareState] = useState<ShareState>('idle')
  const [shareUrl, setShareUrl] = useState('')
  const [shareError, setShareError] = useState('')
  const { markdown, screenshot, meta } = result

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safe = (meta.title || 'link-scanner-report').replace(/[^\w가-힣-]+/g, '_').slice(0, 40)
    a.href = url
    a.download = `${safe}_report.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleShare() {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl).catch(() => {})
      setShareState('done')
      return
    }
    setShareState('creating')
    setShareError('')
    const res = await createShareLink(result)
    if (res.ok) {
      setShareUrl(res.url)
      setShareState('done')
      await navigator.clipboard.writeText(res.url).catch(() => {})
      try {
        window.history.replaceState({}, '', new URL(res.url).search)
      } catch {
        /* noop */
      }
    } else {
      setShareError(res.error)
      setShareState('error')
    }
  }

  // 상태 요약 (중복·색상 최소화: 중립 텍스트 한 줄)
  const statusBits: string[] = [
    meta.screenshotCaptured ? '스크린샷 포함' : '스크린샷 없음',
    meta.repoAnalyzed ? 'GitHub 소스 분석' : 'GitHub 미분석',
  ]
  if (meta.perspectives && meta.perspectives.length > 0) {
    statusBits.push(`관점: ${meta.perspectives.join('·')}`)
  }

  return (
    <div className="animate-fade-up space-y-4">
      {/* 리포트 헤더 카드 */}
      <div className="rounded-xl2 border border-ink-100 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-2">
          <span className="material-icons-round mt-0.5 text-[20px] text-success">
            {shared ? 'folder_shared' : 'task_alt'}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-ink-900">{meta.title}</h2>
            <a
              href={meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-xs text-primary hover:underline"
            >
              {meta.url}
            </a>
          </div>
        </div>

        {/* 메타: 중립 텍스트 한 줄 */}
        <p className="mt-3 text-xs text-ink-500">
          <span className="font-medium text-ink-700">{meta.model}</span>
          {!shared && <> · {(meta.elapsedMs / 1000).toFixed(1)}초 분석</>}
          {' · '}
          {statusBits.join(' · ')}
        </p>

        {/* 폴백 안내 (있을 때만, 절제된 스타일) */}
        {meta.fallbacks && meta.fallbacks.length > 0 && (
          <p className="mt-2 text-xs text-warn">
            1순위 모델 폴백: {meta.fallbacks.join(' → ')} 실패 → {meta.model} 사용
          </p>
        )}

        {/* 액션 */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleShare}
            disabled={shareState === 'creating'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-60"
          >
            <span className={`material-icons-outlined text-[18px] ${shareState === 'creating' ? 'animate-spin' : ''}`}>
              {shareState === 'creating' ? 'autorenew' : shareState === 'done' ? 'done' : 'share'}
            </span>
            {shareState === 'creating' ? '생성 중…' : shareState === 'done' ? '링크 복사됨' : '공유 링크'}
          </button>

          <SecondaryButton onClick={copyMarkdown} icon={copied ? 'done' : 'content_copy'}>
            {copied ? '복사됨' : '복사'}
          </SecondaryButton>
          <SecondaryButton onClick={downloadMarkdown} icon="download">
            .md 저장
          </SecondaryButton>
          <SecondaryButton onClick={onReset} icon="add">
            새 분석
          </SecondaryButton>
        </div>

        {/* 관리자 자동 저장 상태 */}
        {saveStatus === 'saving' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-100/40 px-3 py-2 text-sm text-ink-500">
            <span className="material-icons-round animate-spin text-[18px] text-primary">autorenew</span>
            관리자 대시보드에 저장 중…
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
            <span className="material-icons-round text-[18px]">cloud_done</span>
            관리자 대시보드에 저장되었습니다.
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-danger/30 bg-pastel-pink-soft px-3 py-2 text-sm text-danger">
            <span className="material-icons-outlined text-[18px]">cloud_off</span>
            <span className="min-w-0 flex-1">대시보드 저장 실패: {saveError || '알 수 없는 오류'}</span>
            {onRetrySave && (
              <button
                onClick={onRetrySave}
                className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10"
              >
                다시 저장
              </button>
            )}
          </div>
        )}

        {/* 공유 결과/오류 */}
        {shareState === 'done' && shareUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-100/40 px-3 py-2 text-sm">
            <span className="material-icons-outlined text-[18px] text-primary">link</span>
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent text-ink-700 outline-none"
            />
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-50"
            >
              복사
            </button>
          </div>
        )}
        {shareState === 'error' && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-danger">
            <span className="material-icons-outlined text-[16px]">error_outline</span>
            <span>{shareError || '공유 링크 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'}</span>
          </p>
        )}
      </div>

      {/* 스크린샷 */}
      {screenshot && (
        <div className="overflow-hidden rounded-xl2 border border-ink-100 bg-white">
          <div className="flex items-center gap-1.5 border-b border-ink-100 px-4 py-2 text-xs text-ink-500">
            <span className="material-icons-outlined text-[16px]">image</span>
            캡처된 화면
          </div>
          <img src={screenshot} alt="웹앱 스크린샷" className="w-full" loading="lazy" />
        </div>
      )}

      {/* 마크다운 리포트 */}
      <article className="report-prose rounded-xl2 border border-ink-100 bg-white p-6 sm:p-9">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </div>
  )
}

function SecondaryButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void
  icon: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-medium text-ink-700 transition hover:border-primary/40 hover:text-primary"
    >
      <span className="material-icons-outlined text-[18px]">{icon}</span>
      {children}
    </button>
  )
}
