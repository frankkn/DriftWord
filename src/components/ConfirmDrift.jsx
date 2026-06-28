// 送出前的確認層。刻意做成全螢幕、安靜、需要停頓一下的儀式感。
// mode: 'voice'（搭配 count 段數）| 'text'
export default function ConfirmDrift({ mode = 'voice', count = 0, onConfirm, onCancel }) {
  const detail =
    mode === 'text'
      ? '你寫下的話，會交給一個你永遠不會認識的人。'
      : `${count} 段語音，會交給一個你永遠不會認識的人。`

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col items-center justify-center px-10 animate-[fadeIn_0.4s_ease]">
      <p className="text-xs tracking-[0.3em] text-ink-muted uppercase mb-12">
        漂流前
      </p>

      <p className="text-2xl font-serif font-light text-ink leading-relaxed text-center max-w-xs mb-4">
        一旦送出，<br />就會漂流出去，<br />你無法收回。
      </p>

      <p className="text-sm text-ink-muted font-light text-center mb-16">
        {detail}
      </p>

      <button
        onClick={onConfirm}
        className="w-full max-w-xs py-4 rounded-2xl bg-ink text-paper font-serif font-light text-base tracking-wide active:opacity-80 transition-opacity mb-3"
      >
        送出，讓它漂走
      </button>
      <button
        onClick={onCancel}
        className="text-sm text-ink-muted font-light active:opacity-60 transition-opacity"
      >
        再想想
      </button>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
