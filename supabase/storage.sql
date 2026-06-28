-- DriftWord storage 設定
-- 在 Supabase SQL Editor 貼上執行。

-- 建立私有 bucket：drifts
insert into storage.buckets (id, name, public)
values ('drifts', 'drifts', false)
on conflict (id) do nothing;

-- 上傳：只能傳到自己的資料夾（路徑第一段 = 自己的 user id）
drop policy if exists "upload own audio" on storage.objects;
create policy "upload own audio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'drifts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 讀取：MVP 階段允許登入者讀 drifts bucket（路徑為 uuid，難以猜測）。
-- 之後若要嚴格控管，改成只讀自己的資料夾 + 用 signed URL 派送收到的語音。
drop policy if exists "read audio (mvp)" on storage.objects;
create policy "read audio (mvp)" on storage.objects
  for select to authenticated
  using (bucket_id = 'drifts');
