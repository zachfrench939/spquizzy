-- Global leaderboard. Ranks real accounts that have a username, against everyone
-- in the period. Returns the top of the board plus the caller's own rank.
-- No seeded or example player rows exist in the dd_ tables, so this file deletes nothing.
-- Do not apply this from the site deploy. Zach applies it after review.

create or replace function public.dd_leaderboard(p_period text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set timezone = 'Europe/London'
as $$
declare
  today date := public.dd_london_today();
  start_date date;
  uid uuid := auth.uid();
  rows jsonb;
  you jsonb;
  total int;
begin
  if p_period = 'week' then
    start_date := date_trunc('week', today::timestamp)::date;
  elsif p_period = 'month' then
    start_date := date_trunc('month', today::timestamp)::date;
  elsif p_period = 'year' then
    start_date := date_trunc('year', today::timestamp)::date;
  elsif p_period = 'all' then
    start_date := null;
  else
    raise exception 'unknown period';
  end if;

  with scored as (
    select r.user_id, p.username, sum(r.banked)::int as coins
    from public.dd_daily_runs r
    join public.dd_profiles p on p.id = r.user_id
    where r.status = 'completed'
      and p.username is not null
      and not p.opted_out_of_boards
      and (
        start_date is null
        or (
          r.run_date >= start_date
          and r.run_date < case p_period
            when 'week' then start_date + 7
            when 'month' then (start_date + interval '1 month')::date
            when 'year' then (start_date + interval '1 year')::date
            else r.run_date + 1
          end
        )
      )
    group by r.user_id, p.username
  ),
  ranked as (
    select
      user_id,
      username,
      coins,
      rank() over (order by coins desc, username)::int as rank
    from scored
  )
  select
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', t.rank,
        'name', t.username,
        'coins', t.coins,
        'you', t.user_id = uid
      ) order by t.rank, t.username)
      from (
        select * from ranked order by rank, username limit 25
      ) t
    ), '[]'::jsonb),
    (select count(*)::int from ranked),
    (
      select jsonb_build_object(
        'rank', r.rank,
        'of', (select count(*)::int from ranked),
        'coins', r.coins,
        'name', r.username,
        'needsUsername', false
      )
      from ranked r
      where r.user_id = uid
    )
  into rows, total, you;

  if uid is not null and you is null then
    you := jsonb_build_object(
      'rank', null,
      'of', total,
      'coins', null,
      'name', (select username from public.dd_profiles where id = uid),
      'needsUsername', (select username is null from public.dd_profiles where id = uid)
    );
  end if;

  return jsonb_build_object(
    'rows', rows,
    'you', you,
    'total', total
  );
end;
$$;

revoke all on function public.dd_leaderboard(text) from public;
grant execute on function public.dd_leaderboard(text) to anon, authenticated;
