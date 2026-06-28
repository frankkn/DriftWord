// 純 CSS 模擬的錄音波形。active=false 時收成一條靜止的線。
const BARS = 28

export default function Waveform({ active = true }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16 select-none">
      {Array.from({ length: BARS }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-drift"
          style={
            active
              ? {
                  animation: `wave 1s ease-in-out ${(i % 7) * 0.09}s infinite`,
                  height: '12px',
                }
              : { height: '4px', opacity: 0.3 }
          }
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(2.6); }
        }
      `}</style>
    </div>
  )
}
