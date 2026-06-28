// 首頁狀態：使用者今天已經對今日詞回應過了。一天只交換一次。
// received 有值 → 已收到回音，可重讀；received 為 null → 回音還在路上（涵蓋 #3）。
export default function TodayClosed({ received, onReread }) {
  return (
    <div className="flex flex-col items-center text-center max-w-[20rem] mt-10 animate-[fadeIn_0.6s_ease]">
      {received ? (
        <>
          <p className="text-base font-serif font-light text-ink leading-loose">
            今天，你已經說過，
            <br />
            也收到了一封漂來的信。
          </p>
          <p className="text-sm text-ink-muted font-light leading-loose mt-4 mb-8">
            一天，只交換一次。
          </p>
          <button
            onClick={onReread}
            className="text-sm font-serif font-light text-ink tracking-wide underline underline-offset-4 decoration-ink/30 active:opacity-60 transition-opacity"
          >
            重讀那封信
          </button>
        </>
      ) : (
        <>
          <p className="text-base font-serif font-light text-ink leading-loose">
            今天，你已經把話
            <br />
            放進了漂流。
          </p>
          <p className="text-sm text-ink-muted font-light leading-loose mt-4">
            回音也許正在路上，
            <br />
            也許不會來——
            <br />
            這就是漂流的樣子。
          </p>
        </>
      )}

      <p className="text-xs text-ink-muted/70 font-light tracking-widest mt-12 uppercase">
        明天，會有新的詞
      </p>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
