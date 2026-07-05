import { useEffect, useRef, useState } from 'react'
import { Settings } from './components/icons'
import RecordingScreen from './components/RecordingScreen'
import TextScreen from './components/TextScreen'
import ReceivedScreen from './components/ReceivedScreen'
import SettingsScreen from './components/SettingsScreen'
import TodayClosed from './components/TodayClosed'
import { ensureSession } from './lib/session'
import { getTodayWord } from './lib/words'
import { submitVoiceDrift, submitTextDrift, getTodayStatus, claimStrangerDrift, countWordDrifts, hasClaimableDrift } from './lib/drift'
import { toPoeticError } from './lib/messages'

const FALLBACK_WORD = '消失'

function formatToday() {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日`
}

export default function App() {
  const [view, setView] = useState('home') // 'home' | 'recording' | 'text' | 'result' | 'settings'
  const [word, setWord] = useState(null) // { id, text } | null
  const [loading, setLoading] = useState(true)

  // 今天的狀態
  const [responded, setResponded] = useState(false)
  const [todayReceived, setTodayReceived] = useState(null)
  const [justArrived, setJustArrived] = useState(false)
  const [driftCount, setDriftCount] = useState(null) // 今天已有幾封信，null = 未知/隱藏
  const [claimable, setClaimable] = useState(false)  // 池子裡現在是否有信可認領

  // 送出 / 收件狀態
  const [sendStatus, setSendStatus] = useState('sending') // 'sending' | 'done'
  const [received, setReceived] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [rejected, setRejected] = useState(false) // 內容被黑名單擋下
  const lastSubmit = useRef(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      await ensureSession()
      const w = await getTodayWord()
      if (!alive) return
      setWord(w)
      setLoading(false)
      if (w?.id) {
        // 計數與可認領狀態獨立載入，失敗只是不顯示，不影響主流程
        countWordDrifts(w.id).then((n) => { if (alive) setDriftCount(n) })
        hasClaimableDrift(w.id).then((v) => { if (alive) setClaimable(v) })
        try {
          const status = await getTodayStatus(w.id)
          if (!alive) return
          setResponded(status.responded)
          setTodayReceived(status.received)
          setJustArrived(status.justArrived)
        } catch (e) {
          console.error('[DriftWord] 無法取得今日狀態：', e.message)
          // 查詢失敗保持預設值；若使用者已送出，DB constraint 仍會擋下重複送出
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 每 30 秒輪詢一次，等待配對漂入
  useEffect(() => {
    if (!responded || todayReceived || !word?.id) return
    let busy = false
    const id = setInterval(async () => {
      if (document.hidden || busy) return
      busy = true
      const found = await claimStrangerDrift(word.id)
      busy = false
      if (!found) return
      setTodayReceived(found)
      setReceived(found)
      setJustArrived(true)
    }, 30_000)
    return () => clearInterval(id)
  }, [responded, todayReceived, word?.id])

  const wordText = word?.text ?? FALLBACK_WORD

  // 共用送出流程：進入結果畫面 → 顯示漂流中 → 執行送出 → 呈現收到的回應
  const runSubmit = async (submitFn) => {
    lastSubmit.current = submitFn
    setReceived(null)
    setSendError(null)
    setRejected(false)
    setSendStatus('sending')
    setView('result')

    try {
      const { received } = await submitFn()
      setReceived(received)
      // 更新今天的狀態，回首頁時會反映「已說過」
      setResponded(true)
      setTodayReceived(received)
      setJustArrived(false) // 當場交換得到的，不算「稍後漂到」
      setDriftCount((c) => (c == null ? c : c + 1)) // 自己這封也算進去
      setClaimable(false) // 送出並認領後，池子狀態重置
    } catch (err) {
      console.error(err)
      if (err?.message === 'REJECTED') setRejected(true)
      if (err?.message === 'DUPLICATE') setResponded(true)
      setSendError(toPoeticError(err, wordText))
    } finally {
      setSendStatus('done')
    }
  }

  const handleSubmitVoice = (segments) =>
    runSubmit(() => submitVoiceDrift(word?.id, segments))

  const handleSubmitText = (text) =>
    runSubmit(() => submitTextDrift(word?.id, text))

  const handleRetry = () => {
    if (lastSubmit.current) runSubmit(lastSubmit.current)
  }

  // 重讀今天收到的那封信
  const openReread = () => {
    setReceived(todayReceived)
    setSendError(null)
    setSendStatus('done')
    setView('result')
  }

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

        {!loading && responded ? (
          <TodayClosed
            received={todayReceived}
            justArrived={justArrived}
            onReread={openReread}
          />
        ) : (
          <p className="text-sm text-ink-muted font-serif font-light text-center leading-relaxed max-w-[18rem]">
            說出你的第一個記憶，或一個感受。
          </p>
        )}

        {!loading && driftCount != null && (
          <div className="mt-8 flex flex-col items-center gap-1.5">
            <p className="text-xs text-ink-muted/70 font-serif font-light tracking-wider">
              {driftCount > 0 ? `今天已有 ${driftCount} 封信在漂流` : '今天的海面還很安靜'}
            </p>
            {!responded && claimable && (
              <p className="text-xs text-drift/70 font-serif font-light tracking-wider">
                有一封信正在等人收
              </p>
            )}
          </div>
        )}
      </main>

      {/* Bottom actions — 只有還沒回應時顯示 */}
      {!responded && (
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
      )}

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
          rejected={rejected}
          onRetry={handleRetry}
          onRewrite={() => setView('text')}
          onDone={() => setView('home')}
        />
      )}

      {view === 'settings' && <SettingsScreen onClose={() => setView('home')} />}
    </div>
  )
}
