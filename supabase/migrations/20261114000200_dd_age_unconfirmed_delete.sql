-- DO NOT APPLY – needs review
--
-- Do not run this file until a person has reviewed it and replaced the
-- timestamp in public.dd_age_ship_cutoff() with the moment the 13+ gate
-- is released. This file is not part of the site deploy.
-- The cutoff stays 2099-01-01 until that replacement, so a live call
-- matches nobody. The hourly job below stays commented out.
--
-- auth.users is shared with Wick. Wick accounts have no dd_profiles row.
-- This file must never select a user just because a confirmed profile is
-- missing. A target has to be a provable Spiquizzy sign-up:
--   1. a dd_profiles row EXISTS (dd_ensure_profile writes it on the first
--      Spiquizzy sign-in) and age_confirmed_at is null, and
--   2. the auth user metadata marks the sign-up, where that marker was set:
--      raw_user_meta_data->>'age_13_plus' is true, or
--      raw_user_meta_data->>'app' = 'spiquizzy'.
-- Accounts created before the cutoff are existing players and are not touched.
--
-- Two paths, for the batch job and for dd_delete_my_unconfirmed_account:
--   delete_auth
--     No non-dd_ table in public references this user id. Checked
--     dynamically: every uuid column on those tables, plus a text column
--     named user_id, userid, user_uuid, owner_id, profile_id or
--     auth_user_id. auth.sessions does not count, because every account has
--     those. Delete the dd_ rows, then delete that one auth.users row.
--   dd_rows_only
--     A non-dd_ public row references the user, or that check cannot be
--     finished. Delete only the dd_ rows. Revoke that user's sessions
--     (auth.refresh_tokens, then auth.sessions). Do not delete auth.users,
--     so a Wick login can remain.
-- The result and the log carry counts only. They never include an email or an id.
--
-- dd_delete_unconfirmed_accounts(dry_run) defaults to dry_run true.
-- A bare call returns would_delete_auth and dd_rows_only and deletes nothing.

drop function if exists public.dd_delete_unconfirmed_accounts();
drop function if exists public.dd_delete_unconfirmed_accounts(boolean);

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

-- True only for a Spiquizzy sign-up that still has an empty confirmation.
-- A missing dd_profiles row is not a match. Wick sign-ups are not a match.
create or replace function public.dd_is_unconfirmed_spiquizzy(p_uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  created timestamptz;
  meta jsonb;
  found boolean := false;
  confirmed timestamptz;
begin
  if p_uid is null then
    return false;
  end if;
  select u.created_at, u.raw_user_meta_data
    into created, meta
  from auth.users u
  where u.id = p_uid;
  if created is null or created < public.dd_age_ship_cutoff() then
    return false;
  end if;
  select true, p.age_confirmed_at
    into found, confirmed
  from public.dd_profiles p
  where p.id = p_uid;
  if not coalesce(found, false) or confirmed is not null then
    return false;
  end if;
  return coalesce(meta->>'age_13_plus', '') in ('true', 't')
    or coalesce(meta->>'app', '') = 'spiquizzy';
end;
$$;

-- True when some public table outside dd_ references this user, or when
-- that scan cannot be finished. True means "do not delete auth.users".
create or replace function public.dd_referenced_outside_dd(p_uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rec record;
  hit boolean;
begin
  if p_uid is null then
    return true;
  end if;
  for rec in
    select c.relname as table_name, a.attname as column_name, t.typname as type_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    join pg_type t on t.oid = a.atttypid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not like 'dd\_%' escape '\'
      and (
        t.typname = 'uuid'
        or (
          t.typname in ('text', 'varchar', 'bpchar')
          and a.attname in ('user_id', 'userid', 'user_uuid', 'owner_id', 'profile_id', 'auth_user_id')
        )
      )
  loop
    if rec.type_name = 'uuid' then
      execute format('select exists(select 1 from public.%I where %I = $1)', rec.table_name, rec.column_name)
        into hit
        using p_uid;
    else
      execute format('select exists(select 1 from public.%I where %I = $1)', rec.table_name, rec.column_name)
        into hit
        using p_uid::text;
    end if;
    if hit then
      return true;
    end if;
  end loop;
  return false;
exception
  when others then
    return true;
end;
$$;

-- Sessions for this user only. Does not delete the auth.users row.
create or replace function public.dd_revoke_user_sessions(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = auth
as $$
begin
  if p_uid is null then
    return;
  end if;
  delete from auth.refresh_tokens where user_id = p_uid;
  delete from auth.sessions where user_id = p_uid;
end;
$$;

-- One eligible account. dry_run counts the path and writes nothing.
-- Returns delete_auth or dd_rows_only. Never returns the user id.
create or replace function public.dd_apply_unconfirmed_delete(p_uid uuid, p_dry_run boolean)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  outside boolean;
begin
  if not public.dd_is_unconfirmed_spiquizzy(p_uid) then
    raise exception 'This account cannot be deleted here.';
  end if;
  outside := public.dd_referenced_outside_dd(p_uid);
  if coalesce(p_dry_run, true) then
    if outside then
      return 'dd_rows_only';
    end if;
    return 'delete_auth';
  end if;
  perform public.dd_delete_user_rows(p_uid);
  if outside then
    perform public.dd_revoke_user_sessions(p_uid);
    return 'dd_rows_only';
  end if;
  delete from auth.users where id = p_uid;
  return 'delete_auth';
end;
$$;

create or replace function public.dd_delete_unconfirmed_accounts(dry_run boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  ship_cutoff timestamptz := public.dd_age_ship_cutoff();
  preview boolean := coalesce(dry_run, true);
  uid uuid;
  path text;
  would_delete_auth int := 0;
  dd_rows_only int := 0;
begin
  if ship_cutoff > now() then
    raise log 'dd_delete_unconfirmed_accounts dry_run=% would_delete_auth=0 dd_rows_only=0', preview;
    return jsonb_build_object(
      'dry_run', preview,
      'would_delete_auth', 0,
      'dd_rows_only', 0
    );
  end if;

  -- The profile row has to exist. A missing confirmation is not enough.
  for uid in
    select u.id
    from auth.users u
    join public.dd_profiles p on p.id = u.id
    where u.created_at < now() - interval '24 hours'
      and u.created_at >= ship_cutoff
      and p.age_confirmed_at is null
      and (
        coalesce(u.raw_user_meta_data->>'age_13_plus', '') in ('true', 't')
        or coalesce(u.raw_user_meta_data->>'app', '') = 'spiquizzy'
      )
  loop
    path := public.dd_apply_unconfirmed_delete(uid, preview);
    if path = 'delete_auth' then
      would_delete_auth := would_delete_auth + 1;
    elsif path = 'dd_rows_only' then
      dd_rows_only := dd_rows_only + 1;
    end if;
  end loop;

  raise log 'dd_delete_unconfirmed_accounts dry_run=% would_delete_auth=% dd_rows_only=%',
    preview, would_delete_auth, dd_rows_only;

  return jsonb_build_object(
    'dry_run', preview,
    'would_delete_auth', would_delete_auth,
    'dd_rows_only', dd_rows_only
  );
end;
$$;

-- Same scope as the batch job, without the 24 hour wait.
-- The signed-in player can delete only themselves, and only when they are
-- a new unconfirmed Spiquizzy sign-up. The path is delete_auth or dd_rows_only.
create or replace function public.dd_delete_my_unconfirmed_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  path text;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  if not public.dd_is_unconfirmed_spiquizzy(uid) then
    raise exception 'This account cannot be deleted here.';
  end if;
  path := public.dd_apply_unconfirmed_delete(uid, false);
  return jsonb_build_object('path', path);
end;
$$;

revoke all on function public.dd_delete_user_rows(uuid) from public;
revoke all on function public.dd_delete_user_rows(uuid) from anon;
revoke all on function public.dd_delete_user_rows(uuid) from authenticated;
revoke all on function public.dd_is_unconfirmed_spiquizzy(uuid) from public;
revoke all on function public.dd_is_unconfirmed_spiquizzy(uuid) from anon;
revoke all on function public.dd_is_unconfirmed_spiquizzy(uuid) from authenticated;
revoke all on function public.dd_referenced_outside_dd(uuid) from public;
revoke all on function public.dd_referenced_outside_dd(uuid) from anon;
revoke all on function public.dd_referenced_outside_dd(uuid) from authenticated;
revoke all on function public.dd_revoke_user_sessions(uuid) from public;
revoke all on function public.dd_revoke_user_sessions(uuid) from anon;
revoke all on function public.dd_revoke_user_sessions(uuid) from authenticated;
revoke all on function public.dd_apply_unconfirmed_delete(uuid, boolean) from public;
revoke all on function public.dd_apply_unconfirmed_delete(uuid, boolean) from anon;
revoke all on function public.dd_apply_unconfirmed_delete(uuid, boolean) from authenticated;
revoke all on function public.dd_delete_unconfirmed_accounts(boolean) from public;
revoke all on function public.dd_delete_unconfirmed_accounts(boolean) from anon;
revoke all on function public.dd_delete_unconfirmed_accounts(boolean) from authenticated;
revoke all on function public.dd_delete_my_unconfirmed_account() from public;
revoke all on function public.dd_delete_my_unconfirmed_account() from anon;
grant execute on function public.dd_delete_my_unconfirmed_account() to authenticated;

-- Left commented on purpose. Do not schedule this until the review is done.
-- Once an hour. Dry run is the default, so the job passes false to delete.
-- The function logs counts only. It does not log emails or ids.
-- select cron.schedule(
--   'dd-delete-unconfirmed-age',
--   '0 * * * *',
--   $$select public.dd_delete_unconfirmed_accounts(false)$$
-- );
