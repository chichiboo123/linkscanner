export default function Header() {
  return (
    <header className="w-full pt-10 pb-6 text-center animate-fade-up">
      <div className="inline-flex items-center justify-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-blue/40 shadow-card">
          <span className="material-icons-round text-3xl text-blue-500">travel_explore</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-900">
          Link <span className="text-blue-400">Scanner</span>
        </h1>
      </div>
      <p className="mt-4 text-ink-500 text-sm sm:text-base max-w-xl mx-auto leading-6">
        웹앱 주소와 GitHub 레포를 입력하면, 기능·구조·UI/UX·소스코드를
        <br className="hidden sm:block" />
        종합 분석해 <span className="font-semibold text-ink-700">마크다운 리포트</span>를 만들어 드립니다.
      </p>

      {/* 파스텔 칩 */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {[
          { label: '기능 분석', icon: 'widgets', bg: 'bg-pastel-blue-soft', tx: 'text-blue-500' },
          { label: '구조 파악', icon: 'account_tree', bg: 'bg-pastel-green-soft', tx: 'text-green-600' },
          { label: 'UI/UX 평가', icon: 'palette', bg: 'bg-pastel-pink-soft', tx: 'text-pink-500' },
          { label: '코드 리뷰', icon: 'code', bg: 'bg-pastel-yellow-soft', tx: 'text-yellow-600' },
        ].map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1.5 rounded-full ${c.bg} px-3 py-1.5 text-xs font-medium ${c.tx}`}
          >
            <span className="material-icons-outlined text-[16px]">{c.icon}</span>
            {c.label}
          </span>
        ))}
      </div>
    </header>
  )
}
