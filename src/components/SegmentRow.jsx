import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Trash } from './icons'

function fmt(secs) {
  const s = Math.max(0, Math.round(secs))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export default function SegmentRow({ index, segment, onDelete }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1

  useEffect(() => {
    const audio = new Audio(segment.url)
    audioRef.current = audio
    const onTime = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration)
      }
    }
    const onEnd = () => {
      setPlaying(false)
      setProgress(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [segment.url])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b border-ink/10">
      <span className="text-xs text-ink-muted font-light w-6 tabular-nums">
        {String(index + 1).padStart(2, '0')}
      </span>

      <button
        onClick={toggle}
        aria-label={playing ? '暫停' : '播放'}
        className="w-10 h-10 shrink-0 rounded-full border border-ink/20 flex items-center justify-center text-ink-light active:bg-ink/5 transition-colors"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* 進度條 */}
      <div className="flex-1 h-[2px] bg-ink/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-drift transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <span className="text-xs text-ink-muted font-light tabular-nums w-10 text-right">
        {fmt(segment.duration)}
      </span>

      <button
        onClick={() => onDelete(segment.id)}
        aria-label="刪除這段"
        className="w-9 h-9 shrink-0 flex items-center justify-center text-ink-muted hover:text-ink-light active:opacity-60 transition-colors"
      >
        <Trash size={16} />
      </button>
    </div>
  )
}
