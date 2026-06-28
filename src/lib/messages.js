// 把技術性的錯誤轉成符合 DriftWord 語氣的提示。
export function toPoeticError(err) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  const raw = (err?.message || '').toLowerCase()

  // 今天已經對這個詞說過話了（資料庫唯一約束擋下）
  if (raw === 'duplicate') {
    return '今天，你已經為「這個詞」說過話了。一天，只交換一次。'
  }
  const networkish =
    offline ||
    raw.includes('fetch') ||
    raw.includes('network') ||
    raw.includes('timeout') ||
    raw.includes('failed to')

  if (networkish) {
    return '風像是停了，你的話還停在原地。等海面再起波瀾，讓它重新出發。'
  }
  // 其他未預期的問題
  return '這封信卡在了某處，沒能漂出去。再讓它試一次吧。'
}
