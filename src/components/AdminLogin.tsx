import { useState, type FormEvent } from 'react'
import { adminLogin } from '../lib/admin'

interface Props {
  onClose: () => void
  onSuccess: (key: string) => void
}

export default function AdminLogin({ onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError('')
    const res = await adminLogin(password)
    setLoading(false)
    if (res.ok) {
      onSuccess(password)
    } else {
      setError(res.error || '로그인 실패')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
            <span className="material-icons-round text-[20px] text-primary">admin_panel_settings</span>
          </span>
          <h2 className="text-base font-bold text-ink-900">관리자 로그인</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            disabled={loading}
            className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-ink-900 placeholder:text-ink-300 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60"
          />

          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
              <span className="material-icons-outlined text-[18px]">error_outline</span>
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-ink-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
            >
              {loading && <span className="material-icons-round animate-spin text-[18px]">autorenew</span>}
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
