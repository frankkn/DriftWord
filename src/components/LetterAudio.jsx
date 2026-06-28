import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause } from './icons'

const BARS = 38

function fmt(secs) {
  const s = Math.max(0, Math.round(secs || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// 從 seed 字串產生穩定、看似真實的波形高度（同一段語音每次都一樣）
function waveformFrom(seed = '') {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rng = () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length: BARS }, (_, i) => {
    // 中間高、兩端低，像一句話的能量起伏
    const envelope = Math.sin((i / (BARS - 1)) * Math.PI)
    return 0.18 + (0.25 + 0.75 * rng()) * envelope
  })
}

// 拆信用的語音波形播放器：一排波形 + 一個播放鍵，播放時波形依進度上色。
export default function LetterAudio({ url, duration, seed }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const bars = useMemo(() => waveformFrom(seed || url || ''), [seed, url])

  useEffect(() => {
    if (!url) return
    const audio = new Audio(url)
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
  }, [url])

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

  const filled = Math.round(progress * BARS)

  return (
    <div className="flex items-center gap-5">
      <button
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? '暫停' : '播放'}
        className="w-14 h-14 shrink-0 rounded-full bg-ink text-paper flex items-center justify-center active:scale-95 disabled:opacity-30 transition-transform"
      >
        {playing ? <Pause size={22} /> : <Play size={22} />}
      </button>

      <div className="flex-1 flex items-center gap-[3px] h-14">
        {bars.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-full transition-colors duration-150"
            style={{
              height: `${Math.round(v * 100)}%`,
              backgroundColor: i < filled ? '#5B5EA6' : 'rgba(26,26,46,0.15)',
            }}
          />
        ))}
      </div>

      <span className="text-xs text-ink-muted font-light tabular-nums w-9 text-right shrink-0">
        {fmt(duration)}
      </span>
    </div>
  )
}
