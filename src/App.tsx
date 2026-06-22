import { useEffect, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ScanForm from './components/ScanForm'
import LoadingState from './components/LoadingState'
import ReportView from './components/ReportView'
import RecentReports from './components/RecentReports'
import { requestScan, fetchSharedReport } from './lib/api'
import {
  getHistory,
  addHistory,
  removeHistory,
  clearHistory,
  toResponse,
  type HistoryItem,
} from './lib/history'
import type { ScanResponse } from './types'

type View = 'form' | 'loading' | 'report'

export default function App() {
  const [view, setView] = useState<View>('form')
  const [report, setReport] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // 최근 기록 로드
  useEffect(() => {
    setHistory(getHistory())
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

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6">
        <Header onHome={reset} />

        <main className="mt-2">
          {error && view === 'form' && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-pastel-pink-soft px-4 py-3 text-sm text-danger animate-fade-up">
              <span className="material-icons-outlined text-[20px]">report_problem</span>
              <span>{error}</span>
            </div>
          )}

          {view === 'form' && (
            <>
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
        </main>
      </div>

      <Footer />
    </div>
  )
}
