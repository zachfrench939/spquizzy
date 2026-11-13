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
