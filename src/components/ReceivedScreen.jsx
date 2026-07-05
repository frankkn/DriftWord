import LetterAudio from './LetterAudio'

// 送出後的畫面：先是漂流中，接著像「拆開一封不知從哪來的信」般展開陌生人的回應。
// status: 'sending' | 'done'
export default function ReceivedScreen({ status, word, received, error, rejected, onDone, onRetry, onRewrite }) {
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

  // 展開時逐段浮現的動畫工具
  const rise = (delay) => ({
    animation: `rise 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) ${delay}s both`,
  })

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 min-h-full w-full">
        {error ? (
          <div className="max-w-xs text-center">
            <p
              className="text-[0.7rem] tracking-[0.35em] text-ink-muted mb-7"
              style={rise(0.05)}
            >
              {rejected ? '未能成行' : '海面靜止'}
            </p>
            <p
              className="text-lg font-serif font-light text-ink leading-loose mb-10 whitespace-pre-line"
              style={rise(0.2)}
            >
              {error}
            </p>
            {rejected ? (
              onRewrite && (
                <button
                  onClick={onRewrite}
                  className="text-sm font-serif font-light text-ink tracking-wide underline underline-offset-4 decoration-ink/30 active:opacity-60 transition-opacity"
                  style={rise(0.35)}
                >
                  換個說法
                </button>
              )
            ) : (
              onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm font-serif font-light text-ink tracking-wide underline underline-offset-4 decoration-ink/30 active:opacity-60 transition-opacity"
                  style={rise(0.35)}
                >
                  再讓它漂一次
                </button>
              )
            )}
          </div>
        ) : received ? (
          <div className="w-full max-w-sm">
            {/* 信從何處來 */}
            <p
              className="text-[0.7rem] tracking-[0.35em] text-ink-muted text-center mb-7"
              style={rise(0.05)}
            >
              一封漂流而來的回應
            </p>

            {/* 共同的詞——兩個回應在此相遇 */}
            <div className="text-center mb-3" style={rise(0.2)}>
              <span className="text-2xl font-serif font-light text-ink tracking-tight">
                {word}
              </span>
            </div>

            {/* 細線：拆開的摺痕 */}
            <div
              className="w-10 h-px bg-ink/20 mx-auto mb-10"
              style={rise(0.35)}
            />

            {/* 內容 */}
            <div style={rise(0.5)}>
              {received.kind === 'text' ? (
                <div className="rounded-[20px] bg-[#FBF7EF] border border-ink/10 shadow-[0_1px_24px_rgba(26,26,46,0.05)] px-7 py-9">
                  <p className="font-hand text-ink text-[1.7rem] leading-[2.4rem] whitespace-pre-wrap break-words">
                    {received.text_content}
                  </p>
                </div>
              ) : received.segments?.length ? (
                <div className="flex flex-col gap-6">
                  {received.segments.map((s) => (
                    <LetterAudio
                      key={s.id}
                      seed={s.id}
                      url={s.url}
                      duration={s.duration}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted font-light text-center">
                  這則回應暫時無法開啟。
                </p>
              )}
            </div>

            {/* 來自誰，無從得知 */}
            <p
              className="text-xs text-ink-muted font-light text-center mt-12 leading-relaxed"
              style={rise(0.7)}
            >
              這是一個陌生人留下的。
              <br />
              你們不會再相遇。
            </p>
          </div>
        ) : (
          // 還沒有人在這個詞下留言——信還在路上
          <div className="max-w-xs text-center">
            <p
              className="text-[0.7rem] tracking-[0.35em] text-ink-muted mb-7"
              style={rise(0.05)}
            >
              信還在路上
            </p>
            <p
              className="text-lg font-serif font-light text-ink leading-loose"
              style={rise(0.2)}
            >
              你的話已經漂出去了。
              <br />
              <span className="text-ink-muted text-base">
                這裡會靜靜等著——
                <br />
                有信漂來，會自動出現。
              </span>
            </p>
          </div>
        )}
      </div>

      {/* 收束：今天的交換到此，沒有任何後續入口（錯誤時不顯示收束句）*/}
      <footer className="pb-14 px-6 flex flex-col items-center shrink-0">
        {!error && received && (
          <p
            className="text-sm text-ink-light font-serif font-light tracking-[0.15em] mb-6"
            style={rise(0.95)}
          >
            今天的交換，到這裡了。
          </p>
        )}
        <button
          onClick={onDone}
          className="text-xs text-ink-muted font-light tracking-widest active:opacity-60 transition-opacity"
          style={rise(error || !received ? 0.5 : 1.05)}
        >
          {received ? '輕輕闔上' : '先離開'}
        </button>
      </footer>

      <style>{`
        @keyframes rise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
