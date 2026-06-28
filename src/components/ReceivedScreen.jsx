import AudioPlayer from './AudioPlayer'

// 送出後的畫面：先是漂流中，接著呈現收到的陌生人回應（或尚無回應的訊息）。
// status: 'sending' | 'done'
export default function ReceivedScreen({ status, word, received, error, onDone }) {
  if (status === 'sending') {
    return (
      <div className="fixed inset-0 z-50 bg-paper flex flex-col items-center justify-center px-10">
        <div className="flex items-center gap-[3px] h-10 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-drift/60"
              style={{
                height: '10px',
                animation: `drift 1.2s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
        <p className="text-sm text-ink-muted font-light tracking-wide">
          正在讓它漂流出去…
        </p>
        <style>{`
          @keyframes drift {
            0%, 100% { transform: scaleY(0.6); opacity: 0.4; }
            50% { transform: scaleY(2.2); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col animate-[fadeIn_0.6s_ease] overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 min-h-full">
        {error ? (
          <>
            <p className="text-sm text-drift font-light text-center max-w-xs leading-relaxed mb-12">
              {error}
            </p>
          </>
        ) : received ? (
          <div className="w-full max-w-sm">
            <p className="text-xs tracking-[0.3em] text-ink-muted uppercase text-center mb-10">
              有人也說了「{word}」
            </p>

            {received.kind === 'text' ? (
              <p className="text-lg font-serif font-light text-ink leading-loose text-center whitespace-pre-wrap">
                {received.text_content}
              </p>
            ) : (
              <div>
                {received.segments?.length ? (
                  received.segments.map((s, i) => (
                    <AudioPlayer
                      key={s.id}
                      index={i}
                      url={s.url}
                      duration={s.duration}
                    />
                  ))
                ) : (
                  <p className="text-sm text-ink-muted font-light text-center">
                    這則回應暫時無法播放。
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-ink-muted font-light text-center mt-12 leading-relaxed">
              這是一個陌生人留下的。
              <br />
              你們不會再相遇。
            </p>
          </div>
        ) : (
          <p className="text-lg font-serif font-light text-ink leading-loose text-center max-w-xs">
            你的話已經漂出去了。
            <br />
            <span className="text-ink-muted text-base">
              此刻還沒有人在「{word}」下留下回應——
              <br />
              你的，會是第一個，
              <br />
              靜靜等著被誰拾起。
            </span>
          </p>
        )}
      </div>

      <footer className="pb-12 px-6 flex justify-center shrink-0">
        <button
          onClick={onDone}
          className="text-base font-serif font-light text-ink tracking-wide underline underline-offset-4 decoration-ink/30 active:opacity-60 transition-opacity"
        >
          回到今天
        </button>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
