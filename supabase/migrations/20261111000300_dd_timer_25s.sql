-- Question timer is 25 seconds, plus 2 seconds of grace. Do not apply this from the site deploy.
-- Matches the dd_timer_25s change already applied in Supabase. Re-running is safe.
-- Does not touch question rows.

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

  if elapsed > 27 then
    -- Past the 25s question plus 2s grace: the whole stake for this question is lost.
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

