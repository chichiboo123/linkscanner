import { useState, type FormEvent, type KeyboardEvent } from 'react'

interface Props {
  loading: boolean
  onSubmit: (url: string, repo: string, perspectives: string[]) => void
}

const URL_RE = /^https?:\/\/.+\..+/i
const REPO_RE = /github\.com\/[^/]+\/[^/]+/i

const PRESET_PERSPECTIVES = [
  { label: '교육', icon: 'school' },
  { label: '예술', icon: 'palette' },
  { label: '철학', icon: 'psychology' },
  { label: '디지털', icon: 'memory' },
  { label: '심리', icon: 'favorite' },
  { label: '비즈니스', icon: 'trending_up' },
  { label: '접근성', icon: 'accessibility_new' },
]

export default function ScanForm({ loading, onSubmit }: Props) {
  const [url, setUrl] = useState('')
  const [repo, setRepo] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function toggle(label: string) {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label],
    )
  }

  function addCustom() {
    const v = customInput.trim()
    if (!v) return
    // 쉼표로 여러 개 입력 허용
    const items = v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setSelected((prev) => Array.from(new Set([...prev, ...items])).slice(0, 8))
    setCustomInput('')
  }

  function onCustomKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addCustom()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedUrl = url.trim()
    const trimmedRepo = repo.trim()

    if (!URL_RE.test(trimmedUrl)) {
      setError('올바른 웹앱 URL을 입력해 주세요. (예: https://example.com)')
      return
    }
    if (trimmedRepo && !REPO_RE.test(trimmedRepo)) {
      setError('GitHub 레포 주소 형식이 올바르지 않습니다. (예: https://github.com/user/repo)')
      return
    }

    // 입력 중이던 직접입력 값도 포함
    const pending = customInput.trim()
    const extra = pending ? pending.split(',').map((s) => s.trim()).filter(Boolean) : []
    const perspectives = Array.from(new Set([...selected, ...extra])).slice(0, 8)

    onSubmit(trimmedUrl, trimmedRepo, perspectives)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/90 backdrop-blur rounded-xl2 shadow-soft border border-white p-6 sm:p-8 animate-fade-up"
    >
      {/* 웹앱 URL */}
      <label className="block mb-5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-700 mb-2">
          <span className="material-icons-outlined text-[18px] text-blue-400">language</span>
          웹앱 URL
          <span className="text-pink-500">*</span>
        </span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-webapp.com"
          disabled={loading}
          className="w-full rounded-xl border border-ink-300/60 bg-white px-4 py-3 text-ink-900 placeholder:text-ink-300 outline-none transition focus:border-pastel-blue focus:ring-4 focus:ring-pastel-blue/30 disabled:opacity-60"
        />
      </label>

      {/* GitHub 레포 (선택) */}
      <label className="block mb-5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-700 mb-2">
          <span className="material-icons-outlined text-[18px] text-green-600">folder_open</span>
          GitHub 레포 주소
          <span className="text-ink-300 font-normal">(선택)</span>
        </span>
        <input
          type="url"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="https://github.com/username/repository"
          disabled={loading}
          className="w-full rounded-xl border border-ink-300/60 bg-white px-4 py-3 text-ink-900 placeholder:text-ink-300 outline-none transition focus:border-pastel-green focus:ring-4 focus:ring-pastel-green/30 disabled:opacity-60"
        />
      </label>

      {/* 분야별 관점 (선택) */}
      <div className="mb-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-700 mb-2">
          <span className="material-icons-outlined text-[18px] text-pink-500">interests</span>
          분야별 관점 분석
          <span className="text-ink-300 font-normal">(선택 · 리포트 최하단에 추가)</span>
        </span>
        <p className="text-xs text-ink-500 mb-3">
          선택하거나 직접 입력한 분야의 전문가 관점에서, 이 앱을 어떻게 해석할 수 있는지 상세 분석해 드립니다.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_PERSPECTIVES.map((p) => {
            const on = selected.includes(p.label)
            return (
              <button
                key={p.label}
                type="button"
                disabled={loading}
                onClick={() => toggle(p.label)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                  on
                    ? 'bg-pastel-pink text-pink-700 ring-2 ring-pastel-pink/60'
                    : 'bg-pastel-pink-soft text-ink-500 hover:brightness-95'
                }`}
              >
                <span className="material-icons-outlined text-[16px]">{on ? 'check' : p.icon}</span>
                {p.label}
              </button>
            )
          })}
        </div>

        {/* 직접 입력 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={onCustomKey}
            placeholder="직접 입력 후 Enter (예: 환경, 게임화)"
            disabled={loading}
            className="flex-1 rounded-xl border border-ink-300/60 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 outline-none transition focus:border-pastel-pink focus:ring-4 focus:ring-pastel-pink/30 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={loading || !customInput.trim()}
            className="rounded-xl bg-pastel-pink-soft px-4 text-sm font-medium text-pink-600 transition hover:brightness-95 disabled:opacity-50"
          >
            추가
          </button>
        </div>

        {/* 선택된 분야 표시 */}
        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-pastel-yellow-soft px-2.5 py-1 text-xs text-yellow-700"
              >
                {s}
                <button
                  type="button"
                  onClick={() => setSelected((prev) => prev.filter((x) => x !== s))}
                  className="material-icons-outlined text-[14px] hover:text-pink-600"
                  aria-label={`${s} 제거`}
                >
                  close
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-pink-600">
          <span className="material-icons-outlined text-[18px]">error_outline</span>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pastel-blue to-pastel-green px-6 py-3.5 font-semibold text-ink-900 shadow-card transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <>
            <span className="material-icons-round animate-spin text-[20px]">autorenew</span>
            분석 중…
          </>
        ) : (
          <>
            <span className="material-icons-round text-[20px]">search</span>
            분석 시작
          </>
        )}
      </button>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-ink-500 leading-5">
        <span className="material-icons-outlined text-[15px] mt-0.5">lock</span>
        입력한 정보와 API 키는 서버에서만 처리되며 브라우저에 노출되지 않습니다.
        스크린샷 캡처는 사이트에 따라 수 초가 걸릴 수 있습니다.
      </p>
    </form>
  )
}
