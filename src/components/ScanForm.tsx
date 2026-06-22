import { useState, type FormEvent } from 'react'

interface Props {
  loading: boolean
  onSubmit: (url: string, repo: string) => void
}

const URL_RE = /^https?:\/\/.+\..+/i
const REPO_RE = /github\.com\/[^/]+\/[^/]+/i

export default function ScanForm({ loading, onSubmit }: Props) {
  const [url, setUrl] = useState('')
  const [repo, setRepo] = useState('')
  const [error, setError] = useState<string | null>(null)

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

    onSubmit(trimmedUrl, trimmedRepo)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/80 backdrop-blur rounded-xl2 shadow-soft border border-white p-6 sm:p-8 animate-fade-up"
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
      <label className="block mb-2">
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

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-pink-600">
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
        스크린샷 캡처는 사이트에 따라 수십 초가 걸릴 수 있습니다.
      </p>
    </form>
  )
}
