import { supabase } from './supabase'

// 取得今日詞（台北時間）。後端 RPC 會在尚未換詞時即時換一個，確保永遠有結果。
// 回傳 { id, text, featured_date } 或 null。
export async function getTodayWord() {
  const { data, error } = await supabase.rpc('today_word')
  if (error) {
    console.error('[DriftWord] 取得今日詞失敗：', error.message)
    return null
  }
  // RPC 回傳單一 row（物件）；保險起見也處理陣列形式
  return Array.isArray(data) ? data[0] ?? null : data
}
