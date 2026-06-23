interface Props {
  isAdmin: boolean
  onClick: () => void
}

/** 우측 하단 숨겨진 진입 아이콘. 평소엔 거의 보이지 않다가 hover 시 드러난다. */
export default function AdminEntry({ isAdmin, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isAdmin ? '관리자 대시보드' : '관리자 로그인'}
      title={isAdmin ? '관리자 대시보드' : ''}
      className={`fixed bottom-3 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full transition-all ${
        isAdmin
          ? 'bg-primary text-white opacity-90 shadow-card hover:bg-primary-600'
          : 'bg-transparent text-ink-300 opacity-15 hover:opacity-70 hover:bg-white hover:shadow-card'
      }`}
    >
      <span className="material-icons-round text-[20px]">
        {isAdmin ? 'dashboard' : 'lock'}
      </span>
    </button>
  )
}
