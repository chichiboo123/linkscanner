import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ScanResponse } from '../types'

interface Props {
  result: ScanResponse
  onReset: () => void
}

export default function ReportView({ result, onReset }: Props) {
  const [copied, setCopied] = useState(false)
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

  return (
    <div className="animate-fade-up space-y-5">
      {/* 상단 액션 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <span className="material-icons-round text-green-500">task_alt</span>
          <span className="font-semibold text-ink-900">분석 완료</span>
          <span className="text-ink-300">·</span>
          <span>{(meta.elapsedMs / 1000).toFixed(1)}초</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg bg-pastel-blue-soft px-3 py-2 text-sm font-medium text-blue-600 transition hover:brightness-95"
          >
            <span className="material-icons-outlined text-[18px]">{copied ? 'done' : 'content_copy'}</span>
            {copied ? '복사됨' : '복사'}
          </button>
          <button
            onClick={downloadMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg bg-pastel-green-soft px-3 py-2 text-sm font-medium text-green-700 transition hover:brightness-95"
          >
            <span className="material-icons-outlined text-[18px]">download</span>
            .md 저장
          </button>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-gray-200"
          >
            <span className="material-icons-outlined text-[18px]">refresh</span>
            새 분석
          </button>
        </div>
      </div>

      {/* 메타 배지 */}
      <div className="flex flex-wrap gap-2 text-xs">
        <ModelBadge model={meta.model} fallbacks={meta.fallbacks} chain={meta.modelChain} />
        <Badge ok icon="link" text={meta.url} truncate />
        <Badge
          ok={meta.screenshotCaptured}
          icon="photo_camera"
          text={meta.screenshotCaptured ? '스크린샷 포함' : '스크린샷 미포함'}
        />
        <Badge
          ok={meta.repoAnalyzed}
          icon="folder"
          text={meta.repoAnalyzed ? 'GitHub 소스 분석됨' : 'GitHub 미분석'}
        />
      </div>

      {/* 폴백 안내: 1순위가 실패해 다른 모델로 처리된 경우 */}
      {meta.fallbacks.length > 0 && (
        <p className="flex items-start gap-1.5 rounded-xl bg-pastel-yellow-soft px-3 py-2 text-xs text-yellow-700">
          <span className="material-icons-outlined text-[16px] mt-0.5">info</span>
          <span>
            1순위 모델 호출이 실패하여 폴백되었습니다.{' '}
            <span className="font-medium">{meta.fallbacks.join(' → ')}</span> 실패 →{' '}
            <span className="font-semibold">{meta.model}</span> 으로 분석 완료.
          </span>
        </p>
      )}

      {/* 스크린샷 미리보기 */}
      {screenshot && (
        <div className="overflow-hidden rounded-xl2 border border-white shadow-card bg-white">
          <div className="flex items-center gap-1.5 border-b border-ink-300/20 px-4 py-2 text-xs text-ink-500">
            <span className="material-icons-outlined text-[16px]">image</span>
            캡처된 화면
          </div>
          <img src={screenshot} alt="웹앱 스크린샷" className="w-full" loading="lazy" />
        </div>
      )}

      {/* 마크다운 리포트 */}
      <article className="report-prose bg-white/85 backdrop-blur rounded-xl2 shadow-soft border border-white p-6 sm:p-9">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </div>
  )
}

function ModelBadge({
  model,
  fallbacks,
  chain,
}: {
  model: string
  fallbacks: string[]
  chain: string[]
}) {
  const isPrimary = chain.length === 0 || model === chain[0]
  const tooltip =
    `호출된 모델: ${model}\n` +
    `우선순위: ${chain.join(' → ') || '(기본)'}` +
    (fallbacks.length ? `\n폴백됨: ${fallbacks.join(', ')}` : '')
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ${
        isPrimary ? 'bg-pastel-blue-soft text-blue-600' : 'bg-pastel-yellow-soft text-yellow-700'
      }`}
    >
      <span className="material-icons-outlined text-[15px]">auto_awesome</span>
      <span>{model}</span>
      {isPrimary ? (
        <span className="rounded-full bg-pastel-blue/50 px-1.5 text-[10px] text-blue-700">1순위</span>
      ) : (
        <span className="rounded-full bg-pastel-yellow/60 px-1.5 text-[10px] text-yellow-800">폴백</span>
      )}
    </span>
  )
}

function Badge({
  ok,
  icon,
  text,
  truncate,
}: {
  ok: boolean
  icon: string
  text: string
  truncate?: boolean
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ${
        ok ? 'bg-pastel-green-soft text-green-700' : 'bg-gray-100 text-ink-500'
      }`}
    >
      <span className="material-icons-outlined text-[15px]">{icon}</span>
      <span className={truncate ? 'truncate max-w-[260px]' : ''}>{text}</span>
    </span>
  )
}
