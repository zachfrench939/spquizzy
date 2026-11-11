-- Usernames on the existing dd_profiles table.
-- Players choose a unique public name. RLS still lets a user update only their own row.
-- No seeded or example player rows exist in the dd_ tables, so this file deletes nothing.
-- Do not apply this from the site deploy. Zach applies it after review.

alter table public.dd_profiles
  add column if not exists username text;

create or replace function public.dd_username_ok(p_name text)
returns boolean
language plpgsql
immutable
as $$
declare
  lowered text := lower(p_name);
  blocked text[] := array[
    'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'dick', 'piss', 'bastard',
    'wank', 'cock', 'tits', 'slut', 'whore', 'nigger', 'faggot', 'retard'
  ];
  word text;
begin
  if p_name is null then
    return true;
  end if;
  if p_name !~ '^[A-Za-z0-9_]{3,16}$' then
    return false;
  end if;
  foreach word in array blocked loop
    if position(word in lowered) > 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.dd_profiles drop constraint if exists dd_profiles_username_ok;
alter table public.dd_profiles
  add constraint dd_profiles_username_ok check (public.dd_username_ok(username));

create unique index if not exists dd_profiles_username_lower_idx
  on public.dd_profiles (lower(username));

create or replace function public.dd_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  name text;
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  perform public.dd_ensure_profile();
  select username into name from public.dd_profiles where id = uid;
  return jsonb_build_object('username', name);
end;
$$;

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

revoke all on function public.dd_username_ok(text) from public;
revoke all on function public.dd_my_profile() from public;
revoke all on function public.dd_set_username(text) from public;
grant execute on function public.dd_my_profile() to authenticated;
grant execute on function public.dd_set_username(text) to authenticated;
