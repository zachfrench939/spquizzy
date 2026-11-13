-- DO NOT APPLY – needs review
--
-- Do not run this file until a person has reviewed it and replaced the
-- timestamp in public.dd_age_ship_cutoff() with the moment the 13+ gate
-- is released. This file is not part of the site deploy.
--
-- It deletes sign-in accounts created more than 24 hours ago that never
-- confirmed they are 13 or over, and the rows those accounts have in
-- dd_ tables. Any account created before the cutoff is an existing player
-- and is not touched. Tables that are not named dd_ are not touched.
-- Wick shares this project, so this file never names those tables.

create or replace function public.dd_delete_user_rows(p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  stakes int := 0;
  runs int := 0;
  members int := 0;
  banks int := 0;
  profiles int := 0;
  extra int := 0;
  removed int := 0;
  rec record;
begin
  if p_uid is null then
    raise exception 'missing account';
  end if;

  delete from public.dd_stakes s
    using public.dd_daily_runs r
    where s.run_id = r.id
      and r.user_id = p_uid;
  get diagnostics stakes = row_count;

  delete from public.dd_daily_runs where user_id = p_uid;
  get diagnostics runs = row_count;

  delete from public.dd_league_members where user_id = p_uid;
  get diagnostics members = row_count;

  delete from public.dd_banks where user_id = p_uid;
  get diagnostics banks = row_count;

  delete from public.dd_profiles where id = p_uid;
  get diagnostics profiles = row_count;

  -- Any later dd_ table that stores a user_id. Never a table outside dd_.
  for rec in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'user_id' and a.attnum > 0 and not a.attisdropped
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'dd\_%' escape '\'
      and c.relname not in (
        'dd_stakes', 'dd_daily_runs', 'dd_league_members', 'dd_banks', 'dd_profiles',
        'dd_config', 'dd_questions', 'dd_leagues', 'dd_guest_serves'
      )
  loop
    execute format('delete from public.%I where user_id = $1', rec.table_name) using p_uid;
    get diagnostics removed = row_count;
    extra := extra + removed;
  end loop;

  return jsonb_build_object(
    'profiles', profiles,
    'banks', banks,
    'runs', runs,
    'stakes', stakes,
    'league_members', members,
    'other', extra
  );
end;
$$;

create or replace function public.dd_delete_unconfirmed_accounts()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  ship_cutoff timestamptz := public.dd_age_ship_cutoff();
  uid uuid;
  accounts int := 0;
  profiles int := 0;
  banks int := 0;
  runs int := 0;
  stakes int := 0;
  members int := 0;
  other int := 0;
  one jsonb;
begin
  if ship_cutoff > now() then
    raise log 'dd_delete_unconfirmed_accounts accounts=0';
    return jsonb_build_object('accounts', 0);
  end if;

  for uid in
    select u.id
    from auth.users u
    where u.created_at < now() - interval '24 hours'
      and u.created_at >= ship_cutoff
      and not exists (
        select 1
        from public.dd_profiles p
        where p.id = u.id
          and p.age_confirmed_at is not null
      )
  loop
    one := public.dd_delete_user_rows(uid);
    delete from auth.users where id = uid;
    accounts := accounts + 1;
    profiles := profiles + coalesce((one->>'profiles')::int, 0);
    banks := banks + coalesce((one->>'banks')::int, 0);
    runs := runs + coalesce((one->>'runs')::int, 0);
    stakes := stakes + coalesce((one->>'stakes')::int, 0);
    members := members + coalesce((one->>'league_members')::int, 0);
    other := other + coalesce((one->>'other')::int, 0);
  end loop;

  raise log 'dd_delete_unconfirmed_accounts accounts=% profiles=% banks=% runs=% stakes=% league_members=% other=%',
    accounts, profiles, banks, runs, stakes, members, other;

  return jsonb_build_object(
    'accounts', accounts,
    'profiles', profiles,
    'banks', banks,
    'runs', runs,
    'stakes', stakes,
    'league_members', members,
    'other', other
  );
end;
$$;

-- A signed-in player can delete only their own new, unconfirmed account.
create or replace function public.dd_delete_my_unconfirmed_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  created timestamptz;
  confirmed timestamptz;
  counts jsonb;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  select u.created_at into created from auth.users u where u.id = uid;
  select p.age_confirmed_at into confirmed from public.dd_profiles p where p.id = uid;
  if created is null
     or created < public.dd_age_ship_cutoff()
     or confirmed is not null then
    raise exception 'This account cannot be deleted here.';
  end if;
  counts := public.dd_delete_user_rows(uid);
  delete from auth.users where id = uid;
  return jsonb_build_object('deleted', true) || counts;
end;
$$;

revoke all on function public.dd_delete_user_rows(uuid) from public;
revoke all on function public.dd_delete_user_rows(uuid) from anon;
revoke all on function public.dd_delete_user_rows(uuid) from authenticated;
revoke all on function public.dd_delete_unconfirmed_accounts() from public;
revoke all on function public.dd_delete_unconfirmed_accounts() from anon;
revoke all on function public.dd_delete_unconfirmed_accounts() from authenticated;
revoke all on function public.dd_delete_my_unconfirmed_account() from public;
revoke all on function public.dd_delete_my_unconfirmed_account() from anon;
grant execute on function public.dd_delete_my_unconfirmed_account() to authenticated;

-- Left commented on purpose. Do not schedule this until the review is done.
-- Once an hour. The function logs counts only. It does not log emails or ids.
-- select cron.schedule(
--   'dd-delete-unconfirmed-age',
--   '0 * * * *',
--   $$select public.dd_delete_unconfirmed_accounts()$$
-- );
