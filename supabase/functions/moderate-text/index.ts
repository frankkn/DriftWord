import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return json({ flagged: false })
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      console.error('[moderate-text] OPENAI_API_KEY not set')
      return json({ flagged: false }) // fail open
    }

    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: text }),
    })

    if (!res.ok) {
      console.error('[moderate-text] OpenAI error:', res.status, await res.text())
      return json({ flagged: false }) // fail open on API error
    }

    const data = await res.json()
    const cats = data.results?.[0]?.categories ?? {}
    // Only block content that attacks others — self-expression about dark emotions
    // (self-harm, violence in memories, etc.) is intentionally allowed on DriftWord.
    const BLOCK_CATEGORIES = [
      'harassment', 'harassment/threatening',
      'hate', 'hate/threatening',
      'illicit/violent',
      'sexual/minors',
    ]
    const flagged: boolean = BLOCK_CATEGORIES.some((c) => cats[c] === true)

    return json({ flagged })
  } catch (e) {
    console.error('[moderate-text] unexpected error:', e)
    return json({ flagged: false }) // fail open
  }
})

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
