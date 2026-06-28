// 種測試資料：用多個拋棄式匿名身分，針對「今日詞」留下幾則未認領的回應，
// 讓你在瀏覽器送出時能配對到一則陌生人的回應，走完整個交換循環。
//
// 用法（在專案根目錄）：
//   node scripts/seed-test-drifts.mjs          # 種 5 則文字 + 1 則語音
//   node scripts/seed-test-drifts.mjs 8        # 種 8 則文字 + 1 則語音
//   node scripts/seed-test-drifts.mjs --verify # 種完後用新身分認領一則，確認循環可通
//
// 這些回應會留在資料庫（不清理），刻意留給你在 App 裡認領。

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/VITE_SUPABASE_KEY=(.+)/)[1].trim()

const args = process.argv.slice(2)
const verify = args.includes('--verify')
const count = Number(args.find((a) => /^\d+$/.test(a))) || 5

const newClient = () => createClient(url, key, { auth: { persistSession: false } })

// 通用、適用於任何詞的感受句（不綁特定詞義）
const LINES = [
  '我一直記得那天的光線，其他都模糊了。',
  '說不出口的，最後都變成了沉默。',
  '有些事，是在很久以後才真正結束的。',
  '我以為我已經忘了，原來只是沒去想。',
  '那句話我練習了很多次，還是沒說出來。',
  '夜深的時候，這個詞會自己浮上來。',
  '我們都假裝沒事，然後各自走遠。',
  '如果可以重來，我大概還是會這樣選。',
  '它沒有離開，只是換了一種方式留下。',
  '最痛的不是發生，是後來什麼都沒發生。',
]

// 產生一段真實可播放的 WAV（1.5 秒、440Hz 柔和正弦音），讓語音分支能實際試聽
function makeWav(seconds = 1.5, freq = 440, rate = 8000) {
  const n = Math.floor(seconds * rate)
  const dataLen = n * 2 // 16-bit mono
  const buf = Buffer.alloc(44 + dataLen)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataLen, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataLen, 40)
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / 400, (n - i) / 400) // 頭尾淡入淡出
    const v = Math.sin((2 * Math.PI * freq * i) / rate) * 0.3 * fade
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  return buf
}

async function getToday() {
  const c = newClient()
  await c.auth.signInAnonymously()
  const { data } = await c.rpc('today_word')
  const w = Array.isArray(data) ? data[0] : data
  return w
}

async function seedText(word, text) {
  const c = newClient()
  const { data: auth, error: aErr } = await c.auth.signInAnonymously()
  if (aErr) throw new Error(`sign-in: ${aErr.message}`)
  const { error } = await c
    .from('drifts')
    .insert({ word_id: word.id, author_id: auth.user.id, kind: 'text', text_content: text })
  if (error) throw new Error(`insert text: ${error.message}`)
}

async function seedVoice(word) {
  const c = newClient()
  const { data: auth, error: aErr } = await c.auth.signInAnonymously()
  if (aErr) throw new Error(`sign-in: ${aErr.message}`)
  const uid = auth.user.id
  const { data: drift, error: dErr } = await c
    .from('drifts')
    .insert({ word_id: word.id, author_id: uid, kind: 'voice' })
    .select()
    .single()
  if (dErr) throw new Error(`insert voice drift: ${dErr.message}`)

  const path = `${uid}/${drift.id}/0.wav`
  const wav = makeWav()
  const { error: upErr } = await c.storage
    .from('drifts')
    .upload(path, wav, { contentType: 'audio/wav' })
  if (upErr) throw new Error(`upload wav: ${upErr.message}`)

  const { error: sErr } = await c
    .from('drift_segments')
    .insert({ drift_id: drift.id, path, duration: 2, idx: 0 })
  if (sErr) throw new Error(`insert segment: ${sErr.message}`)
}

async function main() {
  const word = await getToday()
  console.log(`今日詞：${word.text} (${word.id.slice(0, 8)})`)

  const texts = LINES.slice(0, count)
  for (const t of texts) {
    await seedText(word, t)
    console.log(`  + 文字回應：${t}`)
  }
  await seedVoice(word)
  console.log('  + 語音回應：1.5 秒測試音')

  console.log(`\n已種下 ${texts.length} 則文字 + 1 則語音（未認領）。`)

  if (verify) {
    const c = newClient()
    await c.auth.signInAnonymously()
    const { data, error } = await c.rpc('claim_drift', { p_word_id: word.id })
    const claimed = Array.isArray(data) ? data[0] : data
    if (error) console.log(`\n驗證認領：FAIL ${error.message}`)
    else if (!claimed) console.log('\n驗證認領：NULL（沒有可認領的）')
    else
      console.log(
        `\n驗證認領：OK 收到 ${claimed.kind} 回應` +
          (claimed.kind === 'text' ? ` →「${claimed.text_content}」` : ''),
      )
    console.log('（驗證消耗了 1 則，其餘留給你在 App 認領）')
  }
}

main().catch((e) => {
  console.error('種子失敗：', e.message)
  process.exit(1)
})
