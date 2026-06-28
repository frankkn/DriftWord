import { useState } from 'react'
import { useRecorder } from '../hooks/useRecorder'
import Waveform from './Waveform'
import SegmentRow from './SegmentRow'
import ConfirmDrift from './ConfirmDrift'
import { Close, Mic, Stop } from './icons'

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const r = secs % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export default function RecordingScreen({ word, onClose, onSubmit }) {
  const {
    segments,
    isRecording,
    elapsed,
    error,
    canRecordMore,
    maxSegments,
    maxDuration,
    startRecording,
    stopRecording,
    removeSegment,
  } = useRecorder()

  const [confirming, setConfirming] = useState(false)

  const handleSubmit = () => {
    onSubmit?.(segments)
  }

  const remaining = maxDuration - elapsed

  return (
    <div className="fixed inset-0 z-40 bg-paper flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-2">
        <button
          onClick={onClose}
          aria-label="返回"
          disabled={isRecording}
          className="w-9 h-9 flex items-center justify-center text-ink-muted hover:text-ink-light disabled:opacity-30 transition-colors"
        >
          <Close />
        </button>
        <span className="text-xs tracking-widest text-ink-muted font-light">
          {segments.length} / {maxSegments} 段
        </span>
        <span className="w-9" />
      </header>

      {/* The word, smaller now — 只是提醒你在回應什麼 */}
      <div className="text-center pt-4 pb-2">
        <span className="text-3xl font-serif font-light text-ink tracking-tight">
          {word}
        </span>
      </div>

      {/* Stage: waveform / timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {isRecording ? (
          <>
            <Waveform active />
            <p className="mt-8 text-sm text-ink-light font-light tabular-nums">
              {fmt(elapsed)}
              <span className="text-ink-muted">
                {' '}/ {fmt(maxDuration)}
              </span>
            </p>
            {remaining <= 10 && (
              <p className="mt-2 text-xs text-drift font-light">
                剩 {remaining} 秒
              </p>
            )}
          </>
        ) : segments.length === 0 ? (
          <>
            <Waveform active={false} />
            <p className="mt-8 text-sm text-ink-muted font-light text-center max-w-[16rem] leading-relaxed">
              按住內心想說的，按一下開始。
              <br />
              最多 {maxSegments} 段，每段 {maxDuration} 秒。
            </p>
          </>
        ) : (
          <div className="w-full max-w-sm">
            {segments.map((seg, i) => (
              <SegmentRow
                key={seg.id}
                index={i}
                segment={seg}
                onDelete={removeSegment}
              />
            ))}
            {canRecordMore && (
              <p className="mt-6 text-xs text-ink-muted font-light text-center">
                還可以錄 {maxSegments - segments.length} 段
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-6 text-sm text-drift font-light text-center max-w-xs">
            {error}
          </p>
        )}
      </div>

      {/* Controls */}
      <footer className="pb-12 px-6 flex flex-col items-center gap-6">
        {/* 大圓錄音鍵 */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isRecording && !canRecordMore}
          aria-label={isRecording ? '停止錄音' : '開始錄音'}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
            isRecording
              ? 'bg-drift text-paper'
              : 'bg-ink text-paper'
          }`}
        >
          {isRecording ? <Stop size={28} /> : <Mic size={28} />}
        </button>

        {/* 完成 → 確認 */}
        {!isRecording && segments.length > 0 && (
          <button
            onClick={() => setConfirming(true)}
            className="text-base font-serif font-light text-ink tracking-wide underline underline-offset-4 decoration-ink/30 active:opacity-60 transition-opacity"
          >
            完成，準備漂流
          </button>
        )}
      </footer>

      {confirming && (
        <ConfirmDrift
          count={segments.length}
          onConfirm={handleSubmit}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
