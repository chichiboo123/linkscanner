interface Props {
  onHome?: () => void
}

export default function Header({ onHome }: Props) {
  return (
    <header className="w-full pt-8 pb-6 animate-fade-up">
      <button
        type="button"
        onClick={onHome}
        aria-label="첫 화면으로"
        className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
          <span className="material-icons-round text-2xl text-primary">travel_explore</span>
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900 leading-none">
            Link <span className="text-primary">Scanner</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">웹앱·소스코드 종합 분석 리포트</p>
        </div>
      </button>
    </header>
  )
}
