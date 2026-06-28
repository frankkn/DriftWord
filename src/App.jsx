import { Settings } from './components/icons'

export default function App() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-4">
        <span
          className="text-sm tracking-[0.25em] text-ink-light font-serif font-light uppercase"
        >
          DriftWord
        </span>
        <button
          aria-label="設定"
          className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted hover:text-ink-light transition-colors"
        >
          <Settings />
        </button>
      </header>

      {/* Main — word stage */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        {/* Date hint */}
        <p className="text-xs tracking-widest text-ink-muted font-light mb-10 uppercase">
          6月28日
        </p>

        {/* The word */}
        <h1
          className="text-[clamp(4rem,22vw,7rem)] font-serif font-light text-ink leading-none tracking-tight mb-8 select-none"
          style={{ letterSpacing: '-0.02em' }}
        >
          消失
        </h1>

        {/* Prompt */}
        <p className="text-sm text-ink-muted font-serif font-light text-center leading-relaxed max-w-[18rem]">
          說出你的第一個記憶，或一個感受。
        </p>
      </main>

      {/* Bottom actions */}
      <footer className="pb-12 px-6 flex flex-col gap-3 max-w-sm mx-auto w-full">
        <button
          className="w-full py-4 rounded-2xl bg-ink text-paper font-serif font-light text-base tracking-wide flex items-center justify-center gap-3 active:opacity-80 transition-opacity"
        >
          <span className="text-xl leading-none">🎙</span>
          <span>開始錄音</span>
        </button>
        <button
          className="w-full py-4 rounded-2xl border border-ink/20 text-ink-light font-serif font-light text-base tracking-wide flex items-center justify-center gap-3 active:opacity-60 transition-opacity"
        >
          <span className="text-xl leading-none">✍️</span>
          <span>用文字回應</span>
        </button>
      </footer>
    </div>
  )
}
