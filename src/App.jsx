import { useEffect, useState } from 'react'
import { Settings } from './components/icons'
import RecordingScreen from './components/RecordingScreen'
import TextScreen from './components/TextScreen'
import ReceivedScreen from './components/ReceivedScreen'
import SettingsScreen from './components/SettingsScreen'
import { ensureSession } from './lib/session'
import { getTodayWord } from './lib/words'
import { submitVoiceDrift, submitTextDrift } from './lib/drift'

const FALLBACK_WORD = '消失'

function formatToday() {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日`
}

export default function App() {
  const [view, setView] = useState('home') // 'home' | 'recording' | 'text' | 'result' | 'settings'
  const [word, setWord] = useState(null) // { id, text } | null
  const [loading, setLoading] = useState(true)

  // 送出 / 收件狀態
  const [sendStatus, setSendStatus] = useState('sending') // 'sending' | 'done'
  const [received, setReceived] = useState(null)
  const [sendError, setSendError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      await ensureSession()
      const w = await getTodayWord()
      if (!alive) return
      setWord(w)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const wordText = word?.text ?? FALLBACK_WORD

  // 共用送出流程：進入結果畫面 → 顯示漂流中 → 執行送出 → 呈現收到的回應
  const runSubmit = async (submitFn) => {
    setReceived(null)
    setSendError(null)
    setSendStatus('sending')
    setView('result')

    try {
      const { received } = await submitFn()
      setReceived(received)
    } catch (err) {
      console.error(err)
      setSendError(err?.message || '送出時發生問題，請稍後再試。')
    } finally {
      setSendStatus('done')
    }
  }

  const handleSubmitVoice = (segments) =>
    runSubmit(() => submitVoiceDrift(word?.id, segments))

  const handleSubmitText = (text) =>
    runSubmit(() => submitTextDrift(word?.id, text))

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-4">
        <span className="text-sm tracking-[0.25em] text-ink-light font-serif font-light uppercase">
          DriftWord
        </span>
        <button
          onClick={() => setView('settings')}
          aria-label="設定"
          className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted hover:text-ink-light transition-colors"
        >
          <Settings />
        </button>
      </header>

      {/* Main — word stage */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <p className="text-xs tracking-widest text-ink-muted font-light mb-10 uppercase">
          {formatToday()}
        </p>

        <h1
          className={`text-[clamp(4rem,22vw,7rem)] font-serif font-light text-ink leading-none tracking-tight mb-8 select-none transition-opacity duration-700 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ letterSpacing: '-0.02em' }}
        >
          {wordText}
        </h1>

        <p className="text-sm text-ink-muted font-serif font-light text-center leading-relaxed max-w-[18rem]">
          說出你的第一個記憶，或一個感受。
        </p>
      </main>

      {/* Bottom actions */}
      <footer className="pb-12 px-6 flex flex-col gap-3 max-w-sm mx-auto w-full">
        <button
          onClick={() => setView('recording')}
          className="w-full py-4 rounded-2xl bg-ink text-paper font-serif font-light text-base tracking-wide flex items-center justify-center gap-3 active:opacity-80 transition-opacity"
        >
          <span className="text-xl leading-none">🎙</span>
          <span>開始錄音</span>
        </button>
        <button
          onClick={() => setView('text')}
          className="w-full py-4 rounded-2xl border border-ink/20 text-ink-light font-serif font-light text-base tracking-wide flex items-center justify-center gap-3 active:opacity-60 transition-opacity"
        >
          <span className="text-xl leading-none">✍️</span>
          <span>用文字回應</span>
        </button>
      </footer>

      {view === 'recording' && (
        <RecordingScreen
          word={wordText}
          onClose={() => setView('home')}
          onSubmit={handleSubmitVoice}
        />
      )}

      {view === 'text' && (
        <TextScreen
          word={wordText}
          onClose={() => setView('home')}
          onSubmit={handleSubmitText}
        />
      )}

      {view === 'result' && (
        <ReceivedScreen
          status={sendStatus}
          word={wordText}
          received={received}
          error={sendError}
          onDone={() => setView('home')}
        />
      )}

      {view === 'settings' && <SettingsScreen onClose={() => setView('home')} />}
    </div>
  )
}
