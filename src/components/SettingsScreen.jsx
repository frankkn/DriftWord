import { useEffect, useState } from 'react'
import { Close } from './icons'
import { ensureSession, resetSession } from '../lib/session'

export default function SettingsScreen({ onClose }) {
  const [shortId, setShortId] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const session = await ensureSession()
      if (alive) setShortId(session?.user?.id?.slice(0, 8) ?? null)
    })()
    return () => {
      alive = false
    }
  }, [])

  const handleReset = async () => {
    setResetting(true)
    const session = await resetSession()
    setShortId(session?.user?.id?.slice(0, 8) ?? null)
    setResetting(false)
    setConfirming(false)
  }

  return (
    <div className="fixed inset-0 z-40 bg-paper flex flex-col animate-[fadeIn_0.4s_ease] overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-2 shrink-0">
        <button
          onClick={onClose}
          aria-label="返回"
          className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-ink-light transition-colors"
        >
          <Close />
        </button>
        <span className="text-xs tracking-[0.25em] text-ink-muted font-light uppercase">
          設定
        </span>
        <span className="w-9" />
      </header>

      <div className="flex-1 px-8 py-10 max-w-md mx-auto w-full">
        {/* 關於 */}
        <section className="mb-14">
          <h2 className="text-xs tracking-[0.3em] text-ink-muted uppercase mb-5">
            關於
          </h2>
          <p className="font-serif font-light text-ink text-base leading-loose">
            每天一個詞。
            <br />
            說出你的第一個記憶，或一個感受。
            <br />
            你的話會漂流給一個陌生人，
            <br />
            你也會收到另一個陌生人的。
          </p>
          <p className="font-serif font-light text-ink-muted text-sm leading-loose mt-5">
            沒有按讚，沒有追蹤，
            <br />
            只有這一次交換。
          </p>
        </section>

        {/* 身分 */}
        <section className="mb-14">
          <h2 className="text-xs tracking-[0.3em] text-ink-muted uppercase mb-5">
            你的身分
          </h2>
          <p className="font-serif font-light text-ink-light text-sm leading-loose mb-1">
            你是一個匿名的存在
            {shortId && (
              <span className="text-ink-muted">（{shortId}）</span>
            )}
            。
          </p>
          <p className="font-serif font-light text-ink-muted text-sm leading-loose mb-6">
            沒有人知道你是誰，包括我們。
          </p>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="text-sm font-serif font-light text-ink tracking-wide underline underline-offset-4 decoration-ink/30 active:opacity-60 transition-opacity"
            >
              重新開始
            </button>
          ) : (
            <div className="rounded-2xl border border-ink/15 p-5">
              <p className="font-serif font-light text-ink text-sm leading-relaxed mb-5">
                重新開始後，你會成為一個全新的陌生人。
                <br />
                過去漂流出去與收到的，都不再屬於你。
              </p>
              <div className="flex items-center gap-5">
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-sm font-serif font-light text-drift tracking-wide active:opacity-60 disabled:opacity-40 transition-opacity"
                >
                  {resetting ? '正在重來…' : '確定，重新開始'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={resetting}
                  className="text-sm font-serif font-light text-ink-muted tracking-wide active:opacity-60 transition-opacity"
                >
                  算了
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="pb-10 px-8 shrink-0">
        <p className="text-xs text-ink-muted/70 font-light tracking-widest text-center uppercase">
          DriftWord
        </p>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
