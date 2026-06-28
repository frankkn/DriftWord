import { useState } from 'react'
import ConfirmDrift from './ConfirmDrift'
import { Close } from './icons'

const MAX_LEN = 300

export default function TextScreen({ word, onClose, onSubmit }) {
  const [text, setText] = useState('')
  const [confirming, setConfirming] = useState(false)

  const trimmed = text.trim()
  const canSubmit = trimmed.length > 0

  return (
    <div className="fixed inset-0 z-40 bg-paper flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-2">
        <button
          onClick={onClose}
          aria-label="返回"
          className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-ink-light transition-colors"
        >
          <Close />
        </button>
        <span className="text-xs tracking-widest text-ink-muted font-light">
          {text.length} / {MAX_LEN}
        </span>
        <span className="w-9" />
      </header>

      {/* The word — 提醒你在回應什麼 */}
      <div className="text-center pt-4 pb-6">
        <span className="text-3xl font-serif font-light text-ink tracking-tight">
          {word}
        </span>
      </div>

      {/* 書寫區 */}
      <div className="flex-1 px-8 flex flex-col">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          placeholder="寫下你的第一個記憶，或一個感受…"
          className="flex-1 w-full max-w-lg mx-auto bg-transparent resize-none outline-none border-none
                     font-serif font-light text-lg text-ink leading-loose text-center
                     placeholder:text-ink-muted/60 placeholder:font-light"
        />
      </div>

      {/* 完成 → 確認 */}
      <footer className="pb-12 px-6 flex justify-center">
        <button
          onClick={() => setConfirming(true)}
          disabled={!canSubmit}
          className="text-base font-serif font-light text-ink tracking-wide underline underline-offset-4 decoration-ink/30 active:opacity-60 disabled:opacity-25 disabled:no-underline transition-opacity"
        >
          完成，準備漂流
        </button>
      </footer>

      {confirming && (
        <ConfirmDrift
          mode="text"
          onConfirm={() => onSubmit?.(trimmed)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
