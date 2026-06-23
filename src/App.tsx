import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ScanForm from './components/ScanForm'
import LoadingState from './components/LoadingState'
import ReportView from './components/ReportView'
import RecentReports from './components/RecentReports'
import AdminEntry from './components/AdminEntry'
import AdminLogin from './components/AdminLogin'
import Dashboard from './components/Dashboard'
import { requestScan, fetchSharedReport } from './lib/api'
import {
  getHistory,
  addHistory,
  removeHistory,
  clearHistory,
  toResponse,
  type HistoryItem,
} from './lib/history'
import { getAdminKey, clearAdminKey, adminSave } from './lib/admin'
import type { ScanResponse } from './types'

type View = 'form' | 'loading' | 'report' | 'dashboard'

export default function App() {
  const [view, setView] = useState<View>('form')
  const [report, setReport] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  const [adminKey, setAdminKeyState] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const isAdmin = !!adminKey

  // 최근 기록 + 관리자 세션 로드
  useEffect(() => {
    setHistory(getHistory())
    setAdminKeyState(getAdminKey())
  }, [])

  // 공유 링크(?r=ID)로 진입한 경우 저장된 리포트 로드
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('r')
    if (!id) return
    setView('loading')
    setShared(true)
    fetchSharedReport(id).then((res) => {
      if ('ok' in res) {
        setReport(res)
        setView('report')
      } else {
        setError(res.error)
        setShared(false)
        setView('form')
      }
    })
  }, [])

  async function handleScan(url: string, repo: string, perspectives: string[]) {
    setError(null)
    setShared(false)
    setView('loading')

    const result = await requestScan({ url, repo: repo || undefined, perspectives })

    if (result.ok) {
      setReport(result)
      setHistory(addHistory(result))
      // 관리자 로그인 상태면 백엔드에 자동 저장
      if (adminKey) {
        adminSave(adminKey, result).catch(() => {})
      }
      setView('report')
    } else {
      setError(result.detail ? `${result.error} (${result.detail})` : result.error)
      setView('form')
    }
  }

  function openHistory(item: HistoryItem) {
    setReport(toResponse(item))
    setShared(true)
    setError(null)
    setView('report')
  }

  function reset() {
    setReport(null)
    setError(null)
    setShared(false)
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }
    setView('form')
  }

  // 관리자 진입 아이콘 클릭
  function handleAdminEntry() {
    if (isAdmin) setView('dashboard')
    else setShowLogin(true)
  }

  function handleLoginSuccess(key: string) {
    setAdminKeyState(key)
    setShowLogin(false)
    setView('dashboard')
  }

  function handleLogout() {
    clearAdminKey()
    setAdminKeyState('')
    setView('form')
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6">
        <Header onHome={view === 'dashboard' ? () => setView('form') : reset} />

        <main className="mt-2">
          {error && view === 'form' && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-pastel-pink-soft px-4 py-3 text-sm text-danger animate-fade-up">
              <span className="material-icons-outlined text-[20px]">report_problem</span>
              <span>{error}</span>
            </div>
          )}

          {view === 'form' && (
            <>
              {isAdmin && (
                <button
                  onClick={() => setView('dashboard')}
                  className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-100"
                >
                  <span className="material-icons-outlined text-[18px]">dashboard</span>
                  관리자 대시보드 열기
                </button>
              )}
              <ScanForm loading={false} onSubmit={handleScan} />
              <RecentReports
                items={history}
                onOpen={openHistory}
                onRemove={(id) => setHistory(removeHistory(id))}
                onClear={() => {
                  clearHistory()
                  setHistory([])
                }}
              />
            </>
          )}
          {view === 'loading' && <LoadingState shared={shared} />}
          {view === 'report' && report && (
            <ReportView result={report} onReset={reset} shared={shared} />
          )}
          {view === 'dashboard' && isAdmin && (
            <Dashboard
              adminKey={adminKey}
              onClose={() => setView('form')}
              onOpen={(r) => {
                setReport(r)
                setShared(true)
                setView('report')
              }}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      <Footer />

      <AdminEntry isAdmin={isAdmin} onClick={handleAdminEntry} />
      {showLogin && (
        <AdminLogin onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}
