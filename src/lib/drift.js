import { supabase } from './supabase'
import { ensureSession } from './session'

const BUCKET = 'drifts'

function extFor(mimeType = '') {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

// 取得目前使用者 id（匿名身分）
async function uid() {
  const session = await ensureSession()
  if (!session?.user?.id) throw new Error('尚未取得身分，請確認已開啟匿名登入。')
  return session.user.id
}

// 送出一則語音回應：上傳各段 → 建 drift → 建 segments → 認領一則陌生人的回應。
// 回傳 { drift, received }，received 為認領到的陌生人 drift（可能為 null）。
export async function submitVoiceDrift(wordId, segments) {
  if (!wordId) throw new Error('缺少今日詞，無法送出。')
  if (!segments?.length) throw new Error('沒有可送出的語音段。')

  const userId = await uid()

  // 1. 先建 drift 取得 id（segment 上傳路徑要用到）
  const { data: drift, error: dErr } = await supabase
    .from('drifts')
    .insert({ word_id: wordId, author_id: userId, kind: 'voice' })
    .select()
    .single()
  if (dErr) {
    if (dErr.code === '23505') throw new Error('DUPLICATE')
    throw new Error(`建立回應失敗：${dErr.message}`)
  }

  // 2. 逐段上傳到 storage：{uid}/{driftId}/{idx}.{ext}
  // 任一段失敗時刪除 drift row（rollback），讓重試可以從頭開始。
  const segmentRows = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const path = `${userId}/${drift.id}/${i}.${extFor(seg.mimeType)}`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, seg.blob, {
        contentType: seg.mimeType || 'audio/webm',
        upsert: false,
      })
    if (upErr) {
      await supabase.from('drifts').delete().eq('id', drift.id)
      throw new Error(`上傳第 ${i + 1} 段失敗：${upErr.message}`)
    }
    segmentRows.push({
      drift_id: drift.id,
      path,
      duration: seg.duration ?? 0,
      idx: i,
    })
  }

  // 3. 語音內容審查：Groq Whisper 轉文字 → OpenAI Moderation
  // fail-open：審查系統出錯時放行，不因基礎設施問題擋住正常用戶
  try {
    const { data: modResult, error: modErr } = await supabase.functions.invoke('moderate-voice', {
      body: { paths: segmentRows.map((s) => s.path) },
    })
    if (!modErr && modResult?.flagged) {
      await supabase.from('drifts').delete().eq('id', drift.id)
      await supabase.storage.from(BUCKET).remove(segmentRows.map((s) => s.path))
      throw new Error('REJECTED')
    }
  } catch (e) {
    if (e.message === 'REJECTED') throw e
    console.warn('[DriftWord] voice moderation skipped:', e.message)
  }

  // 4. 寫入 segment 紀錄
  const { error: sErr } = await supabase.from('drift_segments').insert(segmentRows)
  if (sErr) {
    await supabase.from('drifts').delete().eq('id', drift.id)
    throw new Error(`儲存語音段失敗：${sErr.message}`)
  }

  // 4. 認領一則陌生人的回應
  const received = await claimStrangerDrift(wordId)

  return { drift, received }
}

// 送出一則文字回應。
export async function submitTextDrift(wordId, text) {
  if (!wordId) throw new Error('缺少今日詞，無法送出。')
  const content = (text ?? '').trim()
  if (!content) throw new Error('沒有可送出的文字。')

  // OpenAI Moderation（伺服器端，API key 不暴露給前端）
  // fail-open：Edge Function 出錯時放行，不因審查系統問題擋住正常用戶
  try {
    const { data: modResult, error: modErr } = await supabase.functions.invoke('moderate-text', {
      body: { text: content },
    })
    if (!modErr && modResult?.flagged) throw new Error('REJECTED')
  } catch (e) {
    if (e.message === 'REJECTED') throw e
    console.warn('[DriftWord] moderation skipped:', e.message)
  }

  const userId = await uid()
  const { data: drift, error } = await supabase
    .from('drifts')
    .insert({ word_id: wordId, author_id: userId, kind: 'text', text_content: content })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('DUPLICATE')
    throw new Error(`建立回應失敗：${error.message}`)
  }

  const received = await claimStrangerDrift(wordId)
  return { drift, received }
}

// 呼叫 RPC 認領一則同詞、別人寫的、未被認領的回應。沒有則回傳 null。
export async function claimStrangerDrift(wordId) {
  const { data, error } = await supabase.rpc('claim_drift', { p_word_id: wordId })
  if (error) {
    console.error('[DriftWord] 認領回應失敗：', error.message)
    return null
  }
  const drift = Array.isArray(data) ? data[0] ?? null : data
  // claim_drift 在沒有可認領的信時，PostgREST 會回傳一個欄位全為 null 的 row
  // （而非真正的 null），用 id 是否存在判斷才可靠。
  if (!drift?.id) return null
  return hydrateDrift(drift)
}

// 查詢「今天」的狀態：使用者是否已對今日詞回應過、以及是否已收到一封回音。
// 延遲投遞（方案 1）：若已回應但還沒收到回音，回訪時再撈一次池子——
// 第一個留言的人，會在稍後（有人也留言後）回來時收到漂來的信。
// 回傳 { responded, received, justArrived }，justArrived 表示這封信是本次才剛漂到。
export async function getTodayStatus(wordId) {
  if (!wordId) return { responded: false, received: null, justArrived: false }
  const userId = await uid()

  const [mine, claimed] = await Promise.all([
    supabase
      .from('drifts')
      .select('id')
      .eq('word_id', wordId)
      .eq('author_id', userId)
      .limit(1),
    supabase
      .from('drifts')
      .select('*')
      .eq('word_id', wordId)
      .eq('claimed_by', userId)
      .limit(1)
      .maybeSingle(),
  ])

  if (mine.error) throw new Error(`查詢回應狀態失敗：${mine.error.message}`)
  // claimed 查詢失敗時不可當作「還沒收到」——否則會誤判而重複認領第二封
  if (claimed.error) throw new Error(`查詢回音狀態失敗：${claimed.error.message}`)
  const responded = (mine.data?.length ?? 0) > 0
  let received = claimed.data ? await hydrateDrift(claimed.data) : null
  let justArrived = false

  if (responded && !received) {
    received = await claimStrangerDrift(wordId)
    justArrived = !!received
  }

  return { responded, received, justArrived }
}

// 池子裡是否有可立刻認領的信（不是自己的、尚未被認領）。
// 失敗時回傳 false，不影響主流程。
export async function hasClaimableDrift(wordId) {
  if (!wordId) return false
  const { data, error } = await supabase.rpc('has_claimable_drift', { p_word_id: wordId })
  if (error) {
    console.warn('[DriftWord] 讀取可認領狀態失敗：', error.message)
    return false
  }
  return !!data
}

// 今日詞已收到幾封漂流信（所有人的總數，只回傳數字）。
// 失敗時回傳 null，前端據此隱藏計數，不影響主流程。
export async function countWordDrifts(wordId) {
  if (!wordId) return null
  const { data, error } = await supabase.rpc('count_word_drifts', { p_word_id: wordId })
  if (error) {
    console.warn('[DriftWord] 讀取漂流信數失敗：', error.message)
    return null
  }
  return typeof data === 'number' ? data : null
}

// 把一則 drift 補上可播放的內容（語音段 + signed URL）。
export async function hydrateDrift(drift) {
  if (!drift) return null
  if (drift.kind === 'text') return { ...drift, segments: [] }

  const { data: rows, error } = await supabase
    .from('drift_segments')
    .select('*')
    .eq('drift_id', drift.id)
    .order('idx', { ascending: true })
  if (error) {
    console.error('[DriftWord] 讀取語音段失敗：', error.message)
    return { ...drift, segments: [] }
  }

  const segments = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.path, 60 * 60) // 1 小時有效
      return { id: row.id, duration: row.duration, url: signed?.signedUrl ?? null }
    }),
  )

  return { ...drift, segments }
}
