-- DriftWord 詞庫種子 + 每日自動換詞
-- 在 Supabase SQL Editor 貼上執行（需先執行 schema.sql）。

-- ── 300 個帶情感重量的詞 ───────────────────────────────────
insert into public.word_bank (text) values
  ('消失'),('失去'),('遺忘'),('告別'),('離開'),('缺席'),('結束'),('終點'),('殘缺'),('凋零'),
  ('褪色'),('流失'),('蒸發'),('散場'),('落幕'),('謝幕'),('斷線'),('失聯'),('走失'),('遺落'),
  ('留下'),('剩下'),('殘留'),('餘溫'),('痕跡'),('影子'),('回聲'),('餘生'),('倖存'),('殘響'),
  ('遺物'),('遺照'),('舊物'),('廢墟'),('灰燼'),('塵埃'),('碎片'),('殘骸'),('遺跡'),('印記'),
  ('等待'),('漫長'),('瞬間'),('從前'),('後來'),('當時'),('過去'),('未來'),('此刻'),('永遠'),
  ('來不及'),('太遲'),('過期'),('倒數'),('期限'),('錯過'),('遲到'),('守候'),('苦等'),('蹉跎'),
  ('陌生'),('熟悉'),('距離'),('依賴'),('佔有'),('重逢'),('單戀'),('曖昧'),('背叛'),('拋棄'),
  ('冷落'),('疏遠'),('牽掛'),('糾纏'),('放手'),('挽留'),('緣分'),('註定'),('錯付'),('利用'),
  ('回家'),('故鄉'),('漂泊'),('歸屬'),('遠方'),('流浪'),('出走'),('安頓'),('故里'),('異鄉'),
  ('他鄉'),('旅途'),('啟程'),('返鄉'),('寄居'),('落腳'),('港灣'),('歸途'),('遊子'),('鄉愁'),
  ('謊言'),('坦白'),('隱瞞'),('秘密'),('真相'),('面具'),('偽裝'),('沉默'),('坦承'),('欺騙'),
  ('掩飾'),('假裝'),('拆穿'),('戳破'),('謊話'),('把戲'),('騙局'),('真心'),('虛偽'),('誠實'),
  ('孤獨'),('思念'),('後悔'),('遺憾'),('釋懷'),('心碎'),('悸動'),('麻木'),('委屈'),('嫉妒'),
  ('寂寞'),('空虛'),('失落'),('惆悵'),('落寞'),('憂傷'),('憤怒'),('恐懼'),('焦慮'),('不安'),
  ('脆弱'),('倔強'),('堅強'),('逞強'),('認輸'),('妥協'),('退讓'),('隱忍'),('崩潰'),('失控'),
  ('壓抑'),('釋放'),('解脫'),('救贖'),('沉淪'),('墮落'),('自責'),('愧疚'),('怨恨'),('原諒'),
  ('開始'),('重來'),('初衷'),('勇氣'),('期待'),('嚮往'),('奇蹟'),('轉機'),('希望'),('信念'),
  ('夢想'),('渴望'),('追尋'),('啟航'),('萌芽'),('破曉'),('黎明'),('曙光'),('新生'),('蛻變'),
  ('體溫'),('呼吸'),('心跳'),('皺紋'),('白髮'),('傷疤'),('眼淚'),('指尖'),('掌紋'),('脈搏'),
  ('顫抖'),('擁抱'),('觸碰'),('凝視'),('對望'),('牽手'),('親吻'),('耳語'),('嘆息'),('哽咽'),
  ('活著'),('存在'),('生存'),('命運'),('宿命'),('輪迴'),('生死'),('衰老'),('病痛'),('死亡'),
  ('墓碑'),('葬禮'),('遺言'),('訃聞'),('來世'),('前世'),('今生'),('靈魂'),('軀殼'),('殘喘'),
  ('深淵'),('邊界'),('縫隙'),('裂痕'),('漩渦'),('迷宮'),('盡頭'),('彼岸'),('此岸'),('渡口'),
  ('孤島'),('荒原'),('曠野'),('深海'),('暗夜'),('黃昏'),('凌晨'),('雨季'),('寒冬'),('殘陽'),
  ('車站'),('月台'),('信箱'),('舊照'),('鑰匙'),('門縫'),('窗台'),('空房'),('病床'),('餐桌'),
  ('鬧鐘'),('日曆'),('行李'),('車票'),('戒指'),('婚紗'),('搖籃'),('棺木'),('骨灰'),('墓園'),
  ('告白'),('道歉'),('道別'),('託付'),('失言'),('食言'),('承諾'),('誓言'),('遺囑'),('留言'),
  ('未讀'),('已讀'),('回覆'),('拒接'),('封鎖'),('刪除'),('訊息'),('通話'),('簡訊'),('來電'),
  ('初戀'),('暗戀'),('失戀'),('熱戀'),('分手'),('復合'),('離婚'),('喪偶'),('守寡'),('再見'),
  ('情人'),('故人'),('舊愛'),('前任'),('知己'),('摯友'),('仇人'),('路人'),('過客'),('歸人')
on conflict (text) do nothing;

-- ── 每日換詞：選一個還沒用過的詞，標記為「今天（台北時間）」的今日詞 ──
-- 可重複呼叫：同一天重複呼叫不會換第二次。詞用完會自動回收（清空 featured_date 重來）。
create or replace function public.rotate_daily_word()
returns public.word_bank
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Taipei')::date;
  picked public.word_bank;
begin
  -- 今天已經有詞了就直接回傳
  select * into picked from public.word_bank where featured_date = today;
  if found then
    return picked;
  end if;

  -- 還有沒用過的詞 → 隨機挑一個
  update public.word_bank
     set featured_date = today
   where id = (
     select id from public.word_bank
      where featured_date is null
      order by random()
      limit 1
   )
  returning * into picked;

  if found then
    return picked;
  end if;

  -- 詞庫用完了 → 全部回收，再挑一個
  update public.word_bank set featured_date = null;
  update public.word_bank
     set featured_date = today
   where id = (
     select id from public.word_bank order by random() limit 1
   )
  returning * into picked;

  return picked;
end;
$$;

grant execute on function public.rotate_daily_word() to authenticated, anon;

-- ── 今日詞：前端用這個 RPC 取（台北時間的當天）──────────────
-- 若今天還沒換詞（例如 cron 還沒跑），會即時換一個再回傳，確保永遠有詞。
create or replace function public.today_word()
returns public.word_bank
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Taipei')::date;
  w public.word_bank;
begin
  select * into w from public.word_bank where featured_date = today;
  if not found then
    select * into w from public.rotate_daily_word();
  end if;
  return w;
end;
$$;

grant execute on function public.today_word() to authenticated, anon;

-- ── 設定 cron：每天台北 00:00（= UTC 16:00）自動換詞 ──────────
-- pg_cron 以 UTC 排程；台北 00:00 等於前一日 UTC 16:00。
create extension if not exists pg_cron;

-- 先移除舊的同名排程（避免重複），再建立
select cron.unschedule('driftword-rotate')
  where exists (select 1 from cron.job where jobname = 'driftword-rotate');

select cron.schedule(
  'driftword-rotate',
  '0 16 * * *',
  $$ select public.rotate_daily_word(); $$
);

-- 立刻先換出「今天」的詞，讓現在就有東西可顯示
select public.rotate_daily_word();
