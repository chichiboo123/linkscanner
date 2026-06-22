import { useEffect, useState } from 'react'

const STEPS = [
  { icon: 'travel_explore', label: '웹페이지 접속 및 콘텐츠 수집', color: 'text-blue-400' },
  { icon: 'photo_camera', label: '스크린샷 캡처', color: 'text-pink-500' },
  { icon: 'folder_open', label: 'GitHub 소스코드 추출', color: 'text-green-600' },
  { icon: 'auto_awesome', label: 'Gemini AI 종합 분석', color: 'text-yellow-600' },
  { icon: 'description', label: '마크다운 리포트 생성', color: 'text-blue-500' },
]

export default function LoadingState() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setActive((a) => Math.min(a + 1, STEPS.length - 1))
    }, 3500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bg-white/80 backdrop-blur rounded-xl2 shadow-soft border border-white p-8 animate-fade-up">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-icons-round animate-spin text-blue-400">autorenew</span>
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
                    ? 'bg-pastel-green text-green-700'
                    : current
                      ? 'bg-pastel-blue-soft ' + s.color
                      : 'bg-gray-100 text-ink-300'
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
            className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:800px_100%] animate-shimmer"
          />
        ))}
      </div>
    </div>
  )
}
