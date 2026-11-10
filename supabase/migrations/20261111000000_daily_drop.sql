-- The Daily Drop on the shared Supabase project.
-- Does not alter daily_scores, spiquizzy_scores, or spiquizzy_pageviews.
-- New objects are prefixed dd_. Re-running this file is safe.
-- Answers in dd_questions are readable only through the security-definer functions.
-- This file does not contain the question rows or the correct index.
-- Launch day is an updatable row. Leave it at 2026-11-10 until the date is decided:
--   update public.dd_config set launch_date = 'YYYY-MM-DD' where id = 1;
-- The same date is LAUNCH_DATE in js/config.js.

create table if not exists public.dd_config (
  id int primary key default 1 check (id = 1),
  launch_date date not null
);

insert into public.dd_config (id, launch_date) values (1, '2026-11-10')
on conflict (id) do nothing;

create table if not exists public.dd_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  opted_out_of_boards boolean not null default false,
  is_plus boolean not null default false
);

create table if not exists public.dd_banks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.dd_daily_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_date date not null,
  drop_number int not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'busted', 'forfeited')),
  pending int not null default 10 check (pending >= 0),
  banked int not null default 0 check (banked >= 0),
  trail jsonb not null default '[10]'::jsonb,
  question_index int not null default 0,
  question_served_at timestamptz,
  finished_at timestamptz,
  unique (user_id, run_date)
);

create index if not exists dd_daily_runs_date_idx on public.dd_daily_runs (run_date);

create table if not exists public.dd_stakes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.dd_daily_runs (id) on delete cascade,
  question_index int not null,
  distribution jsonb not null,
  correct_index int not null,
  kept int not null,
  timed_out boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dd_stakes_run_idx on public.dd_stakes (run_id);

create table if not exists public.dd_questions (
  id text primary key,
  pack_index int not null,
  position int not null,
  q text not null,
  answers jsonb not null,
  correct int not null check (correct between 0 and 3),
  source text,
  difficulty text,
  unique (pack_index, position)
);

create index if not exists dd_questions_pack_idx on public.dd_questions (pack_index, position);

create table if not exists public.dd_leagues (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period in ('week', 'month', 'year')),
  period_start date not null,
  tier text not null default 'fusilli',
  group_index int not null default 0,
  unique (period, period_start, tier, group_index)
);

create table if not exists public.dd_league_members (
  league_id uuid not null references public.dd_leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  coins_in_period int not null default 0,
  rank int,
  primary key (league_id, user_id)
);

create index if not exists dd_league_members_user_idx on public.dd_league_members (user_id);

alter table public.dd_config enable row level security;
alter table public.dd_profiles enable row level security;
alter table public.dd_banks enable row level security;
alter table public.dd_daily_runs enable row level security;
alter table public.dd_stakes enable row level security;
alter table public.dd_questions enable row level security;
alter table public.dd_leagues enable row level security;
alter table public.dd_league_members enable row level security;

revoke all on public.dd_questions from public, anon, authenticated;

drop policy if exists dd_config_read on public.dd_config;
create policy dd_config_read on public.dd_config for select to anon, authenticated using (true);

drop policy if exists dd_profiles_select on public.dd_profiles;
create policy dd_profiles_select on public.dd_profiles for select to authenticated using (auth.uid() = id);

drop policy if exists dd_profiles_update on public.dd_profiles;
create policy dd_profiles_update on public.dd_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists dd_banks_select on public.dd_banks;
create policy dd_banks_select on public.dd_banks for select to authenticated using (auth.uid() = user_id);

drop policy if exists dd_runs_select on public.dd_daily_runs;
create policy dd_runs_select on public.dd_daily_runs for select to authenticated using (auth.uid() = user_id);

drop policy if exists dd_stakes_select on public.dd_stakes;
create policy dd_stakes_select on public.dd_stakes for select to authenticated using (
  exists (select 1 from public.dd_daily_runs r where r.id = run_id and r.user_id = auth.uid())
);

drop policy if exists dd_leagues_select on public.dd_leagues;
create policy dd_leagues_select on public.dd_leagues for select to anon, authenticated using (true);

drop policy if exists dd_league_members_select on public.dd_league_members;
create policy dd_league_members_select on public.dd_league_members for select to anon, authenticated using (
  not exists (
    select 1 from public.dd_profiles p
    where p.id = user_id and p.opted_out_of_boards
  )
);

grant select on public.dd_config to anon, authenticated;
grant select on public.dd_profiles, public.dd_banks, public.dd_daily_runs, public.dd_stakes to authenticated;
grant select on public.dd_leagues, public.dd_league_members to anon, authenticated;

create or replace function public.dd_london_today()
returns date
language sql
stable
security definer
set search_path = public
as $$ select (timezone('Europe/London', now()))::date $$;

create or replace function public.dd_ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dd_profiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.dd_banks (user_id) values (auth.uid()) on conflict (user_id) do nothing;
end;
$$;

create or replace function public.dd_serve_question(p_index int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.dd_london_today();
  launch date;
  drop_no int;
  pack int;
  run public.dd_daily_runs%rowtype;
  q public.dd_questions%rowtype;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  perform public.dd_ensure_profile();
  select launch_date into launch from public.dd_config where id = 1;
  drop_no := (today - launch) + 1;
  pack := drop_no - 1;
  if drop_no < 1 then
    raise exception 'drop has not launched';
  end if;
  select * into run from public.dd_daily_runs where user_id = uid and run_date = today;
  if not found then
    insert into public.dd_daily_runs (user_id, run_date, drop_number, pending, trail)
    values (uid, today, drop_no, 10, '[10]'::jsonb)
    returning * into run;
  end if;
  if run.status <> 'in_progress' then
    raise exception 'run closed';
  end if;
  if run.question_index <> p_index then
    raise exception 'wrong question';
  end if;
  if run.question_served_at is null then
    update public.dd_daily_runs set question_served_at = now() where id = run.id returning * into run;
  end if;
  select * into q from public.dd_questions where pack_index = pack and position = p_index;
  if not found then
    raise exception 'question missing';
  end if;
  return jsonb_build_object(
    'id', q.id,
    'q', q.q,
    'answers', q.answers,
    'servedAt', run.question_served_at,
    'pending', run.pending,
    'status', run.status,
    'questionIndex', run.question_index,
    'limitMs', 20000,
    'graceMs', 2000
  );
end;
$$;

-- Guest grading is created in 20261111000100_dd_grade_today_only.sql.
-- This file must not recreate the old dd_grade_question(int, int, jsonb, boolean),
-- which accepted any pack. Re-running this file leaves that later function in place.

create or replace function public.dd_lock_in(p_index int, p_dist jsonb, p_timeout boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.dd_london_today();
  launch date;
  run public.dd_daily_runs%rowtype;
  q public.dd_questions%rowtype;
  elapsed double precision;
  dist int[] := array[0,0,0,0];
  i int;
  placed int := 0;
  empty_count int := 0;
  kept int := 0;
  new_pending int;
  new_status text;
  banked int := 0;
  timed_out boolean := false;
  trail jsonb;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  if jsonb_typeof(p_dist) <> 'array' or jsonb_array_length(p_dist) <> 4 then
    raise exception 'need four answers';
  end if;
  for i in 0..3 loop
    dist[i+1] := (p_dist->>i)::int;
    if dist[i+1] < 0 then
      raise exception 'negative';
    end if;
    placed := placed + dist[i+1];
    if dist[i+1] = 0 then
      empty_count := empty_count + 1;
    end if;
  end loop;
  select * into run from public.dd_daily_runs where user_id = uid and run_date = today for update;
  if not found or run.status <> 'in_progress' or run.question_index <> p_index then
    raise exception 'run not ready';
  end if;
  if run.question_served_at is null then
    raise exception 'question was not served';
  end if;
  elapsed := extract(epoch from (now() - run.question_served_at));
  select launch_date into launch from public.dd_config where id = 1;
  select * into q from public.dd_questions
    where pack_index = (today - launch) and position = p_index;
  if not found then
    raise exception 'question missing';
  end if;

  if elapsed > 22 then
    timed_out := true;
    kept := 0;
    new_pending := 0;
  elsif p_timeout then
    timed_out := true;
    if placed > run.pending then
      raise exception 'too many coins';
    end if;
    kept := dist[q.correct + 1];
    new_pending := kept;
  else
    if placed <> run.pending or empty_count < 1 then
      raise exception 'place every coin and leave one answer empty';
    end if;
    kept := dist[q.correct + 1];
    new_pending := kept;
  end if;

  insert into public.dd_stakes (run_id, question_index, distribution, correct_index, kept, timed_out)
  values (run.id, p_index, p_dist, q.correct, kept, timed_out);

  trail := run.trail || to_jsonb(new_pending);
  new_status := 'in_progress';
  banked := 0;
  if new_pending = 0 and p_index < 9 then
    new_status := 'busted';
  elsif p_index >= 9 then
    new_status := 'completed';
    banked := new_pending;
    if banked > 0 then
      update public.dd_banks set balance = balance + banked, updated_at = now() where user_id = uid;
    end if;
  end if;

  update public.dd_daily_runs set
    pending = new_pending,
    banked = case when new_status = 'in_progress' then 0 else banked end,
    trail = trail,
    question_index = case when new_status = 'in_progress' then p_index + 1 else p_index end,
    question_served_at = case when new_status = 'in_progress' then null else question_served_at end,
    status = new_status,
    finished_at = case when new_status = 'in_progress' then null else now() end
  where id = run.id;

  return jsonb_build_object(
    'correctIndex', q.correct,
    'kept', kept,
    'pending', new_pending,
    'banked', banked,
    'status', new_status,
    'trail', trail,
    'timedOut', timed_out,
    'elapsed', elapsed,
    'ranked', true
  );
end;
$$;

create or replace function public.dd_forfeit_run()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.dd_london_today();
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  update public.dd_daily_runs
    set status = 'forfeited', banked = 0, pending = 0, finished_at = now()
    where user_id = uid and run_date = today and status = 'in_progress';
  return jsonb_build_object('status', 'forfeited', 'banked', 0);
end;
$$;

create or replace function public.dd_weekly_league()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  today date := public.dd_london_today();
  week_start date := date_trunc('week', today::timestamp)::date;
  uid uuid := auth.uid();
begin
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.rank), '[]'::jsonb)
    from (
      select
        rank() over (order by sum(r.banked) desc, coalesce(p.display_name, 'Player'))::int as rank,
        coalesce(p.display_name, 'Player') as name,
        sum(r.banked)::int as coins,
        (r.user_id = uid) as you
      from public.dd_daily_runs r
      join public.dd_profiles p on p.id = r.user_id
      where r.status = 'completed'
        and r.run_date >= week_start
        and r.run_date < week_start + 7
        and not p.opted_out_of_boards
      group by r.user_id, p.display_name
    ) t
  );
end;
$$;

revoke all on function public.dd_london_today() from public;
revoke all on function public.dd_ensure_profile() from public;
revoke all on function public.dd_serve_question(int) from public;
revoke all on function public.dd_lock_in(int, jsonb, boolean) from public;
revoke all on function public.dd_forfeit_run() from public;
revoke all on function public.dd_weekly_league() from public;

grant execute on function public.dd_london_today() to anon, authenticated;
grant execute on function public.dd_ensure_profile() to authenticated;
grant execute on function public.dd_serve_question(int) to authenticated;
grant execute on function public.dd_lock_in(int, jsonb, boolean) to authenticated;
grant execute on function public.dd_forfeit_run() to authenticated;
grant execute on function public.dd_weekly_league() to anon, authenticated;

-- The 140 question rows, including the correct index and citation, live in the
-- database only. They are not in this file, because the site publishes it.
-- Re-running this file does not change those rows.
