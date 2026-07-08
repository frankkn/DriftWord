import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    if (Deno.env.get('MODERATION_ENABLED') !== 'true') {
      return json({ flagged: false })
    }

    const { paths } = await req.json()
    if (!paths?.length) return json({ flagged: false })

    const groqKey = Deno.env.get('GROQ_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!groqKey || !openaiKey) {
      console.error('[moderate-voice] missing API keys')
      return json({ flagged: false })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const transcriptions: string[] = []

    for (const path of paths) {
      const { data, error } = await supabase.storage.from('drifts').download(path)
      if (error || !data) {
        console.error('[moderate-voice] storage download failed:', path, error?.message)
        continue
      }

      const form = new FormData()
      const filename = path.split('/').pop() ?? 'audio.webm'
      form.append('file', data, filename)
      form.append('model', 'whisper-large-v3-turbo')
      form.append('response_format', 'text')

      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}` },
        body: form,
      })

      if (!groqRes.ok) {
        console.error('[moderate-voice] Groq error:', groqRes.status, await groqRes.text())
        continue
      }

      const text = (await groqRes.text()).trim()
      if (text) transcriptions.push(text)
    }

    if (!transcriptions.length) return json({ flagged: false })

    const modRes = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({ input: transcriptions.join(' ') }),
    })

    if (!modRes.ok) {
      console.error('[moderate-voice] OpenAI error:', modRes.status)
      return json({ flagged: false })
    }

    const modData = await modRes.json()
    const cats = modData.results?.[0]?.categories ?? {}
    const BLOCK_CATEGORIES = [
      'harassment', 'harassment/threatening',
      'hate', 'hate/threatening',
      'illicit/violent',
      'sexual/minors',
    ]
    const flagged: boolean = BLOCK_CATEGORIES.some((c) => cats[c] === true)

    return json({ flagged })
  } catch (e) {
    console.error('[moderate-voice] unexpected error:', e)
    return json({ flagged: false })
  }
})

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
