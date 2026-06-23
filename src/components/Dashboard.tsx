import { useEffect, useState } from 'react'
import {
  adminList,
  adminGet,
  adminRename,
  adminDelete,
  type AdminIndexItem,
} from '../lib/admin'
import type { ScanResponse } from '../types'

interface Props {
  adminKey: string
  onClose: () => void
  onOpen: (report: ScanResponse) => void
  onLogout: () => void
}

type ViewMode = 'card' | 'list'

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Dashboard({ adminKey, onClose, onOpen, onLogout }: Props) {
  const [items, setItems] = useState<AdminIndexItem[]>([])
  const [mode, setMode] = useState<ViewMode>('card')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editValue, setEditValue] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const res = await adminList(adminKey)
    setLoading(false)
    if (res.ok) {
      setItems(res.items)
    } else {
      if (res.status === 401) {
        onLogout()
        return
      }
      setError(res.error)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function open(id: string) {
    setBusyId(id)
    const res = await adminGet(adminKey, id)
    setBusyId('')
    if ('ok' in res) onOpen(res)
    else setError(res.error)
  }

  function startEdit(it: AdminIndexItem) {
    setEditingId(it.id)
    setEditValue(it.name)
  }

  async function commitEdit(id: string) {
    const name = editValue.trim()
    setEditingId('')
    if (!name) return
    const prev = items
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, name } : x)))
    const res = await adminRename(adminKey, id, name)
    if (!res.ok) {
      setItems(prev)
      setError(res.error || '이름 변경 실패')
    }
  }

  async function remove(it: AdminIndexItem) {
    if (!window.confirm(`'${it.name}' 항목을 삭제할까요?`)) return
    setBusyId(it.id)
    const res = await adminDelete(adminKey, it.id)
    setBusyId('')
    if (res.ok) setItems((arr) => arr.filter((x) => x.id !== it.id))
    else setError(res.error || '삭제 실패')
  }

  return (
    <div className="animate-fade-up">
      {/* 헤더 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-[22px] text-primary">dashboard</span>
          <h2 className="text-lg font-bold text-ink-900">관리자 대시보드</h2>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-500">{items.length}건</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 토글 */}
          <div className="flex rounded-lg border border-ink-200 p-0.5">
            <button
              onClick={() => setMode('card')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm ${
                mode === 'card' ? 'bg-primary-50 text-primary' : 'text-ink-500'
              }`}
            >
              <span className="material-icons-outlined text-[18px]">grid_view</span>
            </button>
            <button
              onClick={() => setMode('list')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm ${
                mode === 'list' ? 'bg-primary-50 text-primary' : 'text-ink-500'
              }`}
            >
              <span className="material-icons-outlined text-[18px]">view_list</span>
            </button>
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-ink-200 p-1.5 text-ink-500 transition hover:text-primary"
            aria-label="새로고침"
          >
            <span className="material-icons-outlined text-[18px]">refresh</span>
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition hover:border-primary/40 hover:text-primary"
          >
            <span className="material-icons-outlined text-[18px]">arrow_back</span>분석으로
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-ink-500 transition hover:text-danger"
          >
            <span className="material-icons-outlined text-[18px]">logout</span>로그아웃
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-pastel-pink-soft px-3 py-2 text-sm text-danger">
          <span className="material-icons-outlined text-[18px]">error_outline</span>
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl2 border border-ink-100 bg-white p-8 text-ink-500">
          <span className="material-icons-round animate-spin text-primary">autorenew</span>
          불러오는 중…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
          <span className="material-icons-outlined mb-2 block text-4xl text-ink-300">inbox</span>
          저장된 분석 리포트가 없습니다.
          <br />
          관리자로 로그인한 상태에서 분석하면 자동으로 저장됩니다.
        </div>
      ) : mode === 'card' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <Card
              key={it.id}
              it={it}
              busy={busyId === it.id}
              editing={editingId === it.id}
              editValue={editValue}
              setEditValue={setEditValue}
              onOpen={() => open(it.id)}
              onStartEdit={() => startEdit(it)}
              onCommitEdit={() => commitEdit(it.id)}
              onCancelEdit={() => setEditingId('')}
              onDelete={() => remove(it)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-ink-100 bg-white">
          {items.map((it, i) => (
            <Row
              key={it.id}
              it={it}
              first={i === 0}
              busy={busyId === it.id}
              editing={editingId === it.id}
              editValue={editValue}
              setEditValue={setEditValue}
              onOpen={() => open(it.id)}
              onStartEdit={() => startEdit(it)}
              onCommitEdit={() => commitEdit(it.id)}
              onCancelEdit={() => setEditingId('')}
              onDelete={() => remove(it)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ItemProps {
  it: AdminIndexItem
  busy: boolean
  editing: boolean
  editValue: string
  setEditValue: (v: string) => void
  onOpen: () => void
  onStartEdit: () => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

function NameEditor({ value, setValue, onCommit, onCancel }: {
  value: string
  setValue: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit()
        if (e.key === 'Escape') onCancel()
      }}
      className="w-full rounded-md border border-primary bg-white px-2 py-1 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-primary/20"
    />
  )
}

function MetaLine({ it }: { it: AdminIndexItem }) {
  const bits = [it.model, it.screenshotCaptured ? '스크린샷' : null, it.repoAnalyzed ? 'GitHub' : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <p className="truncate text-xs text-ink-500">
      {bits}
      {it.perspectives && it.perspectives.length > 0 && ` · 관점: ${it.perspectives.join('·')}`}
    </p>
  )
}

function Card({
  it,
  busy,
  editing,
  editValue,
  setEditValue,
  onOpen,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDelete,
}: ItemProps) {
  return (
    <div className="flex flex-col rounded-xl2 border border-ink-100 bg-white p-4 transition hover:shadow-card">
      <div className="mb-2 flex items-start gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <span className="material-icons-outlined text-[18px] text-primary">description</span>
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <NameEditor value={editValue} setValue={setEditValue} onCommit={onCommitEdit} onCancel={onCancelEdit} />
          ) : (
            <h3 className="truncate text-sm font-semibold text-ink-900">{it.name}</h3>
          )}
          <p className="truncate text-xs text-ink-400">{it.url}</p>
        </div>
      </div>
      <MetaLine it={it} />
      <p className="mt-1 text-xs text-ink-300">{fmtDate(it.savedAt)}</p>

      <div className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3">
        <button
          onClick={onOpen}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-600 disabled:opacity-60"
        >
          <span className={`material-icons-outlined text-[16px] ${busy ? 'animate-spin' : ''}`}>
            {busy ? 'autorenew' : 'open_in_new'}
          </span>
          열기
        </button>
        <button
          onClick={onStartEdit}
          className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs text-ink-700 transition hover:border-primary/40 hover:text-primary"
        >
          <span className="material-icons-outlined text-[16px]">edit</span>이름
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-ink-400 transition hover:text-danger disabled:opacity-60"
        >
          <span className="material-icons-outlined text-[16px]">delete_outline</span>
        </button>
      </div>
    </div>
  )
}

function Row({
  it,
  first,
  busy,
  editing,
  editValue,
  setEditValue,
  onOpen,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDelete,
}: ItemProps & { first: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${first ? '' : 'border-t border-ink-100'}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50">
        <span className="material-icons-outlined text-[16px] text-primary">description</span>
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <NameEditor value={editValue} setValue={setEditValue} onCommit={onCommitEdit} onCancel={onCancelEdit} />
        ) : (
          <p className="truncate text-sm font-medium text-ink-900">{it.name}</p>
        )}
        <MetaLine it={it} />
      </div>
      <span className="hidden shrink-0 text-xs text-ink-300 sm:block">{fmtDate(it.savedAt)}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onOpen}
          disabled={busy}
          aria-label="열기"
          className="rounded-md p-1.5 text-primary transition hover:bg-primary-50 disabled:opacity-60"
        >
          <span className={`material-icons-outlined text-[18px] ${busy ? 'animate-spin' : ''}`}>
            {busy ? 'autorenew' : 'open_in_new'}
          </span>
        </button>
        <button
          onClick={onStartEdit}
          aria-label="이름 변경"
          className="rounded-md p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-primary"
        >
          <span className="material-icons-outlined text-[18px]">edit</span>
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          aria-label="삭제"
          className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-danger disabled:opacity-60"
        >
          <span className="material-icons-outlined text-[18px]">delete_outline</span>
        </button>
      </div>
    </div>
  )
}
