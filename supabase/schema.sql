-- DriftWord schema
-- 在 Supabase SQL Editor 貼上執行。可重複執行（用 if not exists / or replace）。
-- 執行順序：schema.sql → words.sql → storage.sql

-- ── 詞庫 ───────────────────────────────────────────────────
-- 所有候選詞都放這裡。featured_date 為 null 表示還沒當過今日詞；
-- 被選為某天的今日詞時，featured_date 設為那天（台北時間）的日期。
create table if not exists public.word_bank (
  id            uuid primary key default gen_random_uuid(),
  text          text not null unique,
  featured_date date unique,
  created_at    timestamptz not null default now()
);

create index if not exists word_bank_unused_idx
  on public.word_bank(id) where featured_date is null;

-- ── 一則回應（漂流瓶本體）─────────────────────────────────
create table if not exists public.drifts (
  id            uuid primary key default gen_random_uuid(),
  word_id       uuid not null references public.word_bank(id) on delete cascade,
  author_id     uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('voice', 'text')),
  text_content  text,
  created_at    timestamptz not null default now(),
  claimed_by    uuid references auth.users(id) on delete set null, -- 收到這則的陌生人
  claimed_at    timestamptz
);

create index if not exists drifts_word_idx on public.drifts(word_id);
create index if not exists drifts_unclaimed_idx
  on public.drifts(word_id) where claimed_by is null;

-- 一個人對同一個詞只能回應一次（鎖死「一天一次」，繞過 UI 也擋得住）
create unique index if not exists drifts_one_per_author_word
  on public.drifts(author_id, word_id);

-- 一個人對同一個詞只能收到一封信（DB 層擋掉重複認領，
-- 即使多分頁 race 或直接呼叫 RPC 也拿不到第二封）
create unique index if not exists drifts_one_claim_per_user_word
  on public.drifts(word_id, claimed_by) where claimed_by is not null;

-- ── 語音分段（最多 3 段）─────────────────────────────────
create table if not exists public.drift_segments (
  id          uuid primary key default gen_random_uuid(),
  drift_id    uuid not null references public.drifts(id) on delete cascade,
  path        text not null,         -- storage 路徑
  duration    int  not null default 0,
  idx         int  not null,         -- 0,1,2 段落順序
  created_at  timestamptz not null default now()
);

create index if not exists segments_drift_idx on public.drift_segments(drift_id);

-- ── RLS ───────────────────────────────────────────────────
alter table public.word_bank       enable row level security;
alter table public.drifts          enable row level security;
alter table public.drift_segments  enable row level security;

-- word_bank：所有登入者可讀
drop policy if exists "word_bank readable" on public.word_bank;
create policy "word_bank readable" on public.word_bank
  for select to authenticated using (true);

-- drifts：自己可建立、自己可讀、認領給自己的可讀
drop policy if exists "insert own drift" on public.drifts;
create policy "insert own drift" on public.drifts
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "read own or claimed drift" on public.drifts;
create policy "read own or claimed drift" on public.drifts
  for select to authenticated
  using (author_id = auth.uid() or claimed_by = auth.uid());

-- drift_segments：父 drift 屬於我或認領給我時可讀；建立時父 drift 必須是我的
drop policy if exists "insert own segment" on public.drift_segments;
create policy "insert own segment" on public.drift_segments
  for insert to authenticated
  with check (exists (
    select 1 from public.drifts d
    where d.id = drift_id and d.author_id = auth.uid()
  ));

drop policy if exists "read accessible segment" on public.drift_segments;
create policy "read accessible segment" on public.drift_segments
  for select to authenticated
  using (exists (
    select 1 from public.drifts d
    where d.id = drift_id
      and (d.author_id = auth.uid() or d.claimed_by = auth.uid())
  ));

-- ── 配對：認領一則陌生人的回應（原子操作）──────────────────
create or replace function public.claim_drift(p_word_id uuid)
returns public.drifts
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.drifts;
begin
  -- 先寫過信才有資格認領（儀式：先付出才有交換）
  if not exists (
    select 1 from public.drifts
     where word_id = p_word_id and author_id = auth.uid()
  ) then
    return null;
  end if;

  -- 已經收過一封就不再給（配合 drifts_one_claim_per_user_word 雙重保險）
  if exists (
    select 1 from public.drifts
     where word_id = p_word_id and claimed_by = auth.uid()
  ) then
    return null;
  end if;

  update public.drifts
     set claimed_by = auth.uid(),
         claimed_at = now()
   where id = (
     select d.id from public.drifts d
      where d.word_id = p_word_id
        and d.author_id <> auth.uid()
        and d.claimed_by is null
      order by d.created_at asc
      for update skip locked
      limit 1
   )
  returning * into result;

  -- 沒有可認領的回應時，result 會是一個欄位全為 null 的 row；
  -- 必須明確回傳 SQL NULL，否則前端會收到 {id:null,...} 這種假物件。
  if not found then
    return null;
  end if;

  return result;
end;
$$;

grant execute on function public.claim_drift(uuid) to authenticated;

-- ── 統計：今日詞已收到幾封漂流信 ────────────────────────────
-- RLS 讓一般使用者只能讀自己/認領到的 drift，所以用 security definer
-- 只回傳「數字」，不洩漏任何內容。
create or replace function public.count_word_drifts(p_word_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.drifts where word_id = p_word_id;
$$;

grant execute on function public.count_word_drifts(uuid) to authenticated;
