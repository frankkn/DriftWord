import { supabase } from './supabase'

// DriftWord 不需要註冊：第一次進來就建立一個匿名身分，讓 RLS 與配對能運作。
let sessionPromise = null

export function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) return data.session
      const { data: signed, error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error('[DriftWord] 匿名登入失敗：', error.message)
        return null
      }
      return signed.session
    })()
  }
  return sessionPromise
}

// 重新開始：登出目前匿名身分，下一次會建立全新的身分（過去的漂流不再屬於你）。
export async function resetSession() {
  await supabase.auth.signOut()
  sessionPromise = null
  return ensureSession()
}
