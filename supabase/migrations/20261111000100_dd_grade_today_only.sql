-- Harden guest grading. Do not apply this from the site deploy; apply it by hand.
-- dd_grade_question used to accept any pack and return that question's correct index.
-- It now grades only today's pack (dd_london_today() - launch_date), and only a
-- question this guest has already been served. Signed-in runs stay on dd_lock_in,
-- which already uses today's pack and the served question, and commits the stake
-- in the same call. Re-running this file is safe.

create table if not exists public.dd_guest_serves (
  guest_id uuid not null,
  pack_index int not null,
  position int not null check (position between 0 and 9),
  served_at timestamptz not null default now(),
  primary key (guest_id, pack_index, position)
);

alter table public.dd_guest_serves enable row level security;
revoke all on table public.dd_guest_serves from public, anon, authenticated;

create or replace function public.dd_serve_guest(p_guest uuid, p_position int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  launch date;
  pack int;
begin
  if p_guest is null then
    raise exception 'guest required';
  end if;
  if p_position is null or p_position < 0 or p_position > 9 then
    raise exception 'wrong question';
  end if;
  select launch_date into launch from public.dd_config where id = 1;
  pack := public.dd_london_today() - launch;
  if launch is null or pack is null or pack < 0 then
    raise exception 'drop has not launched';
  end if;
  if not exists (
    select 1 from public.dd_questions
    where pack_index = pack and position = p_position
  ) then
    raise exception 'question missing';
  end if;
  insert into public.dd_guest_serves (guest_id, pack_index, position)
  values (p_guest, pack, p_position)
  on conflict (guest_id, pack_index, position) do nothing;
end;
$$;

drop function if exists public.dd_grade_question(int, int, jsonb, boolean);

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
    if dist[i + 1] = 0 then
      empty_count := empty_count + 1;
    end if;
  end loop;
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
    'ranked', false
  );
end;
$$;

revoke all on function public.dd_serve_guest(uuid, int) from public;
revoke all on function public.dd_grade_question(int, int, jsonb, boolean, uuid) from public;

grant execute on function public.dd_serve_guest(uuid, int) to anon;
grant execute on function public.dd_grade_question(int, int, jsonb, boolean, uuid) to anon;
