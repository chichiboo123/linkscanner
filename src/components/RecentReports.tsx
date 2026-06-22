import type { HistoryItem } from '../lib/history'

interface Props {
  items: HistoryItem[]
  onOpen: (item: HistoryItem) => void
  onRemove: (id: string) => void
  onClear: () => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(ts).toLocaleDateString('ko-KR')
}

export default function RecentReports({ items, onOpen, onRemove, onClear }: Props) {
  if (items.length === 0) return null

  return (
    <section className="mt-5 rounded-xl2 border border-ink-100 bg-white p-5 sm:p-6 animate-fade-up">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
          <span className="material-icons-outlined text-[18px] text-ink-500">history</span>
          최근 분석한 리포트
        </h2>
        <button
          onClick={onClear}
          className="text-xs text-ink-500 hover:text-danger transition-colors"
        >
          전체 삭제
        </button>
      </div>

      <ul className="divide-y divide-ink-100">
        {items.map((it) => (
          <li key={it.id} className="group flex items-center gap-3 py-2.5">
            <button
              onClick={() => onOpen(it)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                <span className="material-icons-outlined text-[18px] text-primary">description</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink-900">{it.title}</span>
                <span className="block truncate text-xs text-ink-500">{it.url}</span>
              </span>
            </button>
            <span className="shrink-0 text-xs text-ink-300">{timeAgo(it.savedAt)}</span>
            <button
              onClick={() => onRemove(it.id)}
              aria-label="기록 삭제"
              className="shrink-0 rounded-md p-1 text-ink-300 transition-colors hover:bg-ink-100 hover:text-danger"
            >
              <span className="material-icons-outlined text-[18px]">close</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
