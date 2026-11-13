-- Record when a player confirms they are 13 or over.
--
-- Do not apply this from the site deploy. Apply it by hand after review.
-- This file does not delete rows and does not insert scores.
--
-- authenticated can update only age_confirmed_at, and only on their own row.
-- They still cannot update is_plus or other columns. The function is what
-- the app calls. It stamps now() and does not clear a time already stored.

alter table public.dd_profiles
  add column if not exists age_confirmed_at timestamptz;

comment on column public.dd_profiles.age_confirmed_at is
  'When this player confirmed they are 13 or over. Null until they do.';

drop policy if exists dd_profiles_update on public.dd_profiles;
create policy dd_profiles_update on public.dd_profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant update (age_confirmed_at) on public.dd_profiles to authenticated;

create or replace function public.dd_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  name text;
  hidden boolean;
  confirmed timestamptz;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  perform public.dd_ensure_profile();
  select username, opted_out_of_boards, age_confirmed_at
    into name, hidden, confirmed
  from public.dd_profiles
  where id = uid;
  return jsonb_build_object(
    'username', name,
    'opted_out_of_boards', coalesce(hidden, false),
    'age_confirmed_at', confirmed
  );
end;
$$;

create or replace function public.dd_confirm_age()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  confirmed timestamptz;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  perform public.dd_ensure_profile();
  update public.dd_profiles
    set age_confirmed_at = coalesce(age_confirmed_at, now())
    where id = uid
    returning age_confirmed_at into confirmed;
  return jsonb_build_object('age_confirmed_at', confirmed);
end;
$$;

revoke all on function public.dd_my_profile() from public;
revoke all on function public.dd_confirm_age() from public;
grant execute on function public.dd_my_profile() to authenticated;
grant execute on function public.dd_confirm_age() to authenticated;

-- Accounts created before this moment are existing players. Replace it with
-- the release time before the gate is switched on. Until then, nobody is blocked.
create or replace function public.dd_age_ship_cutoff()
returns timestamptz
language sql
immutable
as $$
  select timestamptz '2099-01-01 00:00:00+00';
$$;

create or replace function public.dd_age_write_allowed(p_uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  created timestamptz;
  confirmed timestamptz;
begin
  if p_uid is null then
    return false;
  end if;
  select u.created_at into created from auth.users u where u.id = p_uid;
  if created is null or created < public.dd_age_ship_cutoff() then
    return true;
  end if;
  select p.age_confirmed_at into confirmed
  from public.dd_profiles p
  where p.id = p_uid;
  return confirmed is not null;
end;
$$;

create or replace function public.dd_require_age_write()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.dd_age_write_allowed(auth.uid()) then
    raise exception 'Confirm you are 13 or over before saving.';
  end if;
end;
$$;

-- Security-definer writers bypass RLS, so the trigger is what stops them.
create or replace function public.dd_guard_age_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if tg_table_name = 'dd_profiles' then
    uid := new.id;
    if tg_op = 'UPDATE'
       and new.username is not distinct from old.username
       and new.display_name is not distinct from old.display_name then
      return new;
    end if;
    if tg_op = 'INSERT' and new.username is null and new.display_name is null then
      return new;
    end if;
  elsif tg_table_name = 'dd_stakes' then
    select r.user_id into uid from public.dd_daily_runs r where r.id = new.run_id;
  else
    uid := new.user_id;
  end if;
  if not public.dd_age_write_allowed(uid) then
    raise exception 'Confirm you are 13 or over before saving.';
  end if;
  return new;
end;
$$;

drop trigger if exists dd_guard_age_write on public.dd_profiles;
create trigger dd_guard_age_write
  before insert or update on public.dd_profiles
  for each row execute function public.dd_guard_age_write();

drop trigger if exists dd_guard_age_write on public.dd_banks;
create trigger dd_guard_age_write
  before insert or update on public.dd_banks
  for each row execute function public.dd_guard_age_write();

drop trigger if exists dd_guard_age_write on public.dd_daily_runs;
create trigger dd_guard_age_write
  before insert or update on public.dd_daily_runs
  for each row execute function public.dd_guard_age_write();

drop trigger if exists dd_guard_age_write on public.dd_stakes;
create trigger dd_guard_age_write
  before insert or update on public.dd_stakes
  for each row execute function public.dd_guard_age_write();

drop trigger if exists dd_guard_age_write on public.dd_league_members;
create trigger dd_guard_age_write
  before insert or update on public.dd_league_members
  for each row execute function public.dd_guard_age_write();

-- Direct table writes from the signed-in role, as well as the trigger above.
drop policy if exists dd_banks_age_insert on public.dd_banks;
create policy dd_banks_age_insert on public.dd_banks
  as restrictive for insert to authenticated
  with check (public.dd_age_write_allowed(auth.uid()));

drop policy if exists dd_banks_age_update on public.dd_banks;
create policy dd_banks_age_update on public.dd_banks
  as restrictive for update to authenticated
  using (public.dd_age_write_allowed(auth.uid()))
  with check (public.dd_age_write_allowed(auth.uid()));

drop policy if exists dd_runs_age_insert on public.dd_daily_runs;
create policy dd_runs_age_insert on public.dd_daily_runs
  as restrictive for insert to authenticated
  with check (public.dd_age_write_allowed(auth.uid()));

drop policy if exists dd_runs_age_update on public.dd_daily_runs;
create policy dd_runs_age_update on public.dd_daily_runs
  as restrictive for update to authenticated
  using (public.dd_age_write_allowed(auth.uid()))
  with check (public.dd_age_write_allowed(auth.uid()));

drop policy if exists dd_stakes_age_insert on public.dd_stakes;
create policy dd_stakes_age_insert on public.dd_stakes
  as restrictive for insert to authenticated
  with check (public.dd_age_write_allowed(auth.uid()));

drop policy if exists dd_stakes_age_update on public.dd_stakes;
create policy dd_stakes_age_update on public.dd_stakes
  as restrictive for update to authenticated
  using (public.dd_age_write_allowed(auth.uid()))
  with check (public.dd_age_write_allowed(auth.uid()));

drop policy if exists dd_league_members_age_insert on public.dd_league_members;
create policy dd_league_members_age_insert on public.dd_league_members
  as restrictive for insert to authenticated
  with check (public.dd_age_write_allowed(auth.uid()));

drop policy if exists dd_league_members_age_update on public.dd_league_members;
create policy dd_league_members_age_update on public.dd_league_members
  as restrictive for update to authenticated
  using (public.dd_age_write_allowed(auth.uid()))
  with check (public.dd_age_write_allowed(auth.uid()));

-- Username and display_name changes are refused by dd_guard_age_write on
-- dd_profiles. A policy that reads dd_profiles from inside its own update
-- policy would recurse, so the trigger is the check.

-- Username writes go through this function, which bypasses RLS.
create or replace function public.dd_set_username(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cleaned text := btrim(p_name);
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  perform public.dd_require_age_write();
  if cleaned !~ '^[A-Za-z0-9_]{3,16}$' then
    raise exception 'Use 3 to 16 characters: letters, numbers and underscores.';
  end if;
  if not public.dd_username_ok(cleaned) then
    raise exception 'Pick a different username.';
  end if;
  perform public.dd_ensure_profile();
  begin
    update public.dd_profiles
      set username = cleaned
      where id = uid;
  exception
    when unique_violation then
      raise exception 'That username is taken.';
  end;
  return jsonb_build_object('username', cleaned);
end;
$$;

revoke all on function public.dd_age_ship_cutoff() from public;
revoke all on function public.dd_age_write_allowed(uuid) from public;
revoke all on function public.dd_require_age_write() from public;
revoke all on function public.dd_guard_age_write() from public;
grant execute on function public.dd_age_ship_cutoff() to authenticated;
grant execute on function public.dd_age_write_allowed(uuid) to authenticated;
grant execute on function public.dd_set_username(text) to authenticated;
