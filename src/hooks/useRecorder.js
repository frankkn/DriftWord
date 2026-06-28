import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_SEGMENTS = 3
const MAX_DURATION = 60 // 秒

// 挑一個瀏覽器支援的音訊格式（Safari 走 mp4，其餘走 webm/opus）
function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

let idSeed = 0
const nextId = () => `seg-${++idSeed}`

export function useRecorder() {
  const [segments, setSegments] = useState([]) // { id, blob, url, duration, mimeType }
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0) // 當前這段已錄秒數
  const [error, setError] = useState(null)

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const startTimeRef = useRef(0)
  const timerRef = useRef(null)
  const mimeRef = useRef('')

  const canRecordMore = segments.length < MAX_SEGMENTS

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const startRecording = useCallback(async () => {
    if (isRecording || !canRecordMore) return
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      mimeRef.current = mimeType
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const type = mimeRef.current || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const duration = Math.min(
          MAX_DURATION,
          Math.round((Date.now() - startTimeRef.current) / 1000),
        )
        const url = URL.createObjectURL(blob)
        setSegments((prev) => [
          ...prev,
          { id: nextId(), blob, url, duration, mimeType: type },
        ])
        clearTimer()
        stopStream()
        setIsRecording(false)
        setElapsed(0)
      }

      startTimeRef.current = Date.now()
      recorder.start()
      setIsRecording(true)
      setElapsed(0)

      timerRef.current = setInterval(() => {
        const secs = Math.round((Date.now() - startTimeRef.current) / 1000)
        setElapsed(secs)
        if (secs >= MAX_DURATION) {
          // 到上限自動停止
          if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop()
          }
        }
      }, 200)
    } catch (err) {
      console.error(err)
      setError(
        err?.name === 'NotAllowedError'
          ? '還沒能聽見你。讓 DriftWord 借用麥克風，或改用文字也好。'
          : '這個裝置暫時收不到你的聲音。也許，用寫的說也是一種方式。',
      )
      stopStream()
      setIsRecording(false)
    }
  }, [isRecording, canRecordMore])

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }, [])

  const removeSegment = useCallback((id) => {
    setSegments((prev) => {
      const target = prev.find((s) => s.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((s) => s.id !== id)
    })
  }, [])

  // 卸載時清乾淨
  useEffect(() => {
    return () => {
      clearTimer()
      stopStream()
      setSegments((prev) => {
        prev.forEach((s) => URL.revokeObjectURL(s.url))
        return prev
      })
    }
  }, [])

  return {
    segments,
    isRecording,
    elapsed,
    error,
    canRecordMore,
    maxSegments: MAX_SEGMENTS,
    maxDuration: MAX_DURATION,
    startRecording,
    stopRecording,
    removeSegment,
  }
}
