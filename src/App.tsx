import { useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ScanForm from './components/ScanForm'
import LoadingState from './components/LoadingState'
import ReportView from './components/ReportView'
import { requestScan } from './lib/api'
import type { ScanResponse } from './types'

type View = 'form' | 'loading' | 'report'

export default function App() {
  const [view, setView] = useState<View>('form')
  const [report, setReport] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleScan(url: string, repo: string) {
    setError(null)
    setView('loading')

    const result = await requestScan({ url, repo: repo || undefined })

    if (result.ok) {
      setReport(result)
      setView('report')
    } else {
      setError(result.detail ? `${result.error} (${result.detail})` : result.error)
      setView('form')
    }
  }

  function reset() {
    setReport(null)
    setError(null)
    setView('form')
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6">
        <Header />

        <main className="mt-2">
          {error && view === 'form' && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-pink-200 bg-pastel-pink-soft px-4 py-3 text-sm text-pink-700 animate-fade-up">
              <span className="material-icons-outlined text-[20px]">report_problem</span>
              <span>{error}</span>
            </div>
          )}

          {view === 'form' && <ScanForm loading={false} onSubmit={handleScan} />}
          {view === 'loading' && <LoadingState />}
          {view === 'report' && report && <ReportView result={report} onReset={reset} />}
        </main>
      </div>

      <Footer />
    </div>
  )
}
