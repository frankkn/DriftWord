// 把技術性的錯誤轉成符合 DriftWord 語氣的提示。
export function toPoeticError(err, word) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  const raw = (err?.message || '').toLowerCase()

  // 今天已經對這個詞說過話了（資料庫唯一約束擋下）
  if (raw === 'duplicate') {
    const w = word ? `「${word}」` : '這個詞'
    return `今天，你已經為${w}說過話了。一天，只交換一次。`
  }

  // 內容含不適合漂給陌生人的字眼（黑名單擋下）
  if (raw === 'rejected') {
    return '這段話，DriftWord 沒能讓它漂出去。\n也許換一種說法，它就能抵達某個人。'
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
