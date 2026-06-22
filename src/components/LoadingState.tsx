import { useEffect, useState } from 'react'

const STEPS = [
  { icon: 'travel_explore', label: '웹페이지 접속 및 콘텐츠 수집' },
  { icon: 'photo_camera', label: '스크린샷 캡처' },
  { icon: 'folder_open', label: 'GitHub 소스코드 추출' },
  { icon: 'auto_awesome', label: 'Gemini AI 종합 분석' },
  { icon: 'description', label: '마크다운 리포트 생성' },
]

export default function LoadingState({ shared = false }: { shared?: boolean }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (shared) return
    const t = setInterval(() => {
      setActive((a) => Math.min(a + 1, STEPS.length - 1))
    }, 3500)
    return () => clearInterval(t)
  }, [shared])

  if (shared) {
    return (
      <div className="rounded-xl2 border border-ink-100 bg-white p-8 animate-fade-up flex items-center gap-3">
        <span className="material-icons-round animate-spin text-primary">autorenew</span>
        <h2 className="font-semibold text-ink-900">리포트를 불러오는 중…</h2>
      </div>
    )
  }

  return (
    <div className="rounded-xl2 border border-ink-100 bg-white p-8 animate-fade-up">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-icons-round animate-spin text-primary">autorenew</span>
        <h2 className="font-semibold text-ink-900">분석을 진행하고 있어요</h2>
      </div>

      <ul className="space-y-3">
        {STEPS.map((s, i) => {
          const done = i < active
          const current = i === active
          return (
            <li key={s.label} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  done
                    ? 'bg-primary-50 text-primary'
                    : current
                      ? 'bg-primary-50 text-primary'
                      : 'bg-ink-100 text-ink-300'
                }`}
              >
                <span className={`material-icons-outlined text-[18px] ${current ? 'animate-pulse' : ''}`}>
                  {done ? 'check' : s.icon}
                </span>
              </span>
              <span
                className={`text-sm ${
                  current ? 'font-semibold text-ink-900' : done ? 'text-ink-500' : 'text-ink-300'
                }`}
              >
                {s.label}
              </span>
            </li>
          )
        })}
      </ul>

      {/* shimmer placeholder */}
      <div className="mt-7 space-y-2.5">
        {[100, 90, 95, 80].map((w, i) => (
          <div
            key={i}
            style={{ width: `${w}%` }}
            className="h-3.5 rounded bg-gradient-to-r from-ink-100 via-ink-200 to-ink-100 bg-[length:800px_100%] animate-shimmer"
          />
        ))}
      </div>
    </div>
  )
}
