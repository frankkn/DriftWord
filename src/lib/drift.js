import { supabase } from './supabase'
import { ensureSession } from './session'
import { findBlockedWord } from './blocklist'

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

  // 3. 寫入 segment 紀錄
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

  // 黑名單檢查：命中就在送出前擋下，不寫入資料庫
  if (findBlockedWord(content)) throw new Error('REJECTED')

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
  if (!drift) return null
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
  const responded = (mine.data?.length ?? 0) > 0
  let received = claimed.data ? await hydrateDrift(claimed.data) : null
  let justArrived = false

  if (responded && !received) {
    received = await claimStrangerDrift(wordId)
    justArrived = !!received
  }

  return { responded, received, justArrived }
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
