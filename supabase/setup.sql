-- Evolve or Die: online scores and cloud saves.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query > Run).
-- The tables are locked; the game only talks to the functions below with the public anon key.

create table if not exists scores (
  id bigint generated always as identity primary key,
  code text not null,
  name text not null,
  time_s int not null,
  kills int not null,
  age text not null,
  "character" text not null,
  daily date,
  created_at timestamptz not null default now()
);
create index if not exists scores_time_idx on scores (daily, time_s desc);

create table if not exists saves (
  code text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table scores enable row level security;
alter table saves enable row level security;

create or replace function submit_score(p_code text, p_name text, p_time int, p_kills int, p_age text, p_character text, p_daily date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if length(p_code) < 10 or p_time < 0 or p_time > 7200 or p_kills < 0 or p_kills > 100000 then return; end if;
  insert into scores (code, name, time_s, kills, age, "character", daily)
  values (p_code, left(regexp_replace(p_name, '[^A-Za-z0-9 _-]', '', 'g'), 12), p_time, p_kills, left(p_age, 20), left(p_character, 20), p_daily);
end $$;

-- Each player's best run, top first (all-time when p_daily is null, else that day's challenge)
create or replace function top_scores(p_daily date, p_limit int default 10)
returns table (name text, time_s int, kills int, age text, "character" text)
language sql security definer set search_path = public as $$
  select best.name, best.time_s, best.kills, best.age, best."character" from (
    select distinct on (s.code) s.name, s.time_s, s.kills, s.age, s."character"
    from scores s
    where (p_daily is null and s.daily is null) or s.daily = p_daily
    order by s.code, s.time_s desc, s.kills desc
  ) best
  order by best.time_s desc, best.kills desc
  limit least(p_limit, 50);
$$;

create or replace function save_progress(p_code text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if length(p_code) < 10 or pg_column_size(p_data) > 200000 then return; end if;
  insert into saves (code, data, updated_at) values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now();
end $$;

create or replace function load_progress(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select data from saves where code = p_code;
$$;

grant execute on function submit_score(text, text, int, int, text, text, date), top_scores(date, int),
  save_progress(text, jsonb), load_progress(text) to anon;
