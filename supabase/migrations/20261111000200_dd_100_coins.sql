-- Daily stake is 100 coins. Do not apply this from the site deploy; apply it by hand.
-- Does not read or write dd_questions. Re-running this file is safe.
-- dd_weekly_league already ranks sum(banked) over the window, so it has no 10-coin
-- assumption and is left as it is. A day's banked total cannot exceed the stake.

alter table public.dd_daily_runs alter column pending set default 100;
alter table public.dd_daily_runs alter column trail set default '[100]'::jsonb;

do $$
declare
  con name;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'dd_daily_runs'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* '\mpending\M'
  loop
    execute format('alter table public.dd_daily_runs drop constraint %I', con);
  end loop;
  for con in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'dd_daily_runs'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* '\mbanked\M'
  loop
    execute format('alter table public.dd_daily_runs drop constraint %I', con);
  end loop;
end $$;

alter table public.dd_daily_runs
  add constraint dd_daily_runs_pending_check check (pending >= 0 and pending <= 100);
alter table public.dd_daily_runs
  add constraint dd_daily_runs_banked_check check (banked >= 0 and banked <= 100);

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
    values (uid, today, drop_no, 100, '[100]'::jsonb)
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
    if dist[i+1] is null or dist[i+1] < 0 then
      raise exception 'negative';
    end if;
    if dist[i+1] > 100 then
      raise exception 'too many coins';
    end if;
    placed := placed + dist[i+1];
    if dist[i+1] = 0 then
      empty_count := empty_count + 1;
    end if;
  end loop;
  if placed > 100 then
    raise exception 'too many coins';
  end if;
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
    -- Past the 20s question plus 2s grace: the whole stake for this question is lost.
    timed_out := true;
    kept := 0;
    new_pending := 0;
  elsif p_timeout then
    -- In-window timeout: coins still in the tray are not in p_dist, so placed may be
    -- below pending. Coins already on answers are judged. The empty-answer rule is off.
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
    'ranked', true,
    'funFact', q.fun_fact
  );
end;
$$;

create or replace function public.dd_grade_question(
  p_pack int,
  p_position int,
  p_dist jsonb,
  p_timeout boolean default false,
  p_guest uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  launch date;
  pack int;
  q public.dd_questions%rowtype;
  dist int[] := array[0, 0, 0, 0];
  i int;
  placed int := 0;
  empty_count int := 0;
  kept int := 0;
begin
  if auth.uid() is not null then
    raise exception 'use lock in';
  end if;
  if jsonb_typeof(p_dist) <> 'array' or jsonb_array_length(p_dist) <> 4 then
    raise exception 'need four answers';
  end if;
  for i in 0..3 loop
    dist[i + 1] := (p_dist ->> i)::int;
    if dist[i + 1] is null or dist[i + 1] < 0 then
      raise exception 'negative';
    end if;
    if dist[i + 1] > 100 then
      raise exception 'too many coins';
    end if;
    placed := placed + dist[i + 1];
    if dist[i + 1] = 0 then
      empty_count := empty_count + 1;
    end if;
  end loop;
  if placed > 100 then
    raise exception 'too many coins';
  end if;
  select launch_date into launch from public.dd_config where id = 1;
  pack := public.dd_london_today() - launch;
  if launch is null or pack is null or pack < 0 then
    raise exception 'drop has not launched';
  end if;
  if p_pack is distinct from pack then
    raise exception 'not today';
  end if;
  if p_position is null or p_position < 0 or p_position > 9 then
    raise exception 'wrong question';
  end if;
  if p_guest is null or not exists (
    select 1 from public.dd_guest_serves
    where guest_id = p_guest and pack_index = pack and position = p_position
  ) then
    raise exception 'question was not served';
  end if;
  select * into q from public.dd_questions
    where pack_index = pack and position = p_position;
  if not found then
    raise exception 'question missing';
  end if;
  if not p_timeout and empty_count < 1 then
    raise exception 'leave one answer empty';
  end if;
  kept := dist[q.correct + 1];
  return jsonb_build_object(
    'correctIndex', q.correct,
    'kept', kept,
    'pending', kept,
    'banked', 0,
    'status', 'in_progress',
    'timedOut', p_timeout,
    'ranked', false,
    'funFact', q.fun_fact
  );
end;
$$;

revoke all on function public.dd_serve_question(int) from public;
revoke all on function public.dd_lock_in(int, jsonb, boolean) from public;
revoke all on function public.dd_grade_question(int, int, jsonb, boolean, uuid) from public;

grant execute on function public.dd_serve_question(int) to authenticated;
grant execute on function public.dd_lock_in(int, jsonb, boolean) to authenticated;
grant execute on function public.dd_grade_question(int, int, jsonb, boolean, uuid) to anon;
