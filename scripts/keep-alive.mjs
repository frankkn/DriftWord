// Pings the Supabase REST endpoint so the free-tier project stays active
// and doesn't get auto-paused after 7 days without API traffic.
// Run: node scripts/keep-alive.mjs
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY env vars');
  process.exit(1);
}

// A real table query (not the /rest/v1/ root) is what resets Supabase's
// 7-day inactivity timer — it has to actually touch the database.
// RLS blocks anon reads on word_bank, so this returns an empty array,
// but the query still executes against Postgres, which is what counts.
const res = await fetch(`${url}/rest/v1/word_bank?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (!res.ok) {
  console.error(`Ping failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

console.log(`Ping OK (${res.status}) at ${new Date().toISOString()}`);
