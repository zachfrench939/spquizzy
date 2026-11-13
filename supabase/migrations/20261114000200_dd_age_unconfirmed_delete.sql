-- DO NOT APPLY – needs review
--
-- Do not run this file until a person has reviewed it and replaced
-- SHIP_CUTOFF with the moment the 13+ gate is released.
-- This file is not part of the site deploy.
--
-- It deletes sign-in accounts created more than 24 hours ago that never
-- confirmed they are 13 or over. Any account created before SHIP_CUTOFF
-- is an existing player and is not touched.

create or replace function public.dd_delete_unconfirmed_accounts()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  -- Existing players. Replace this with the release timestamp before use.
  -- Rows in auth.users created before this moment are never deleted.
  ship_cutoff timestamptz := timestamptz '2099-01-01 00:00:00+00';
  removed integer := 0;
begin
  if ship_cutoff > now() then
    return 0;
  end if;
  delete from auth.users u
  where u.created_at < now() - interval '24 hours'
    and u.created_at >= ship_cutoff
    and not exists (
      select 1
      from public.dd_profiles p
      where p.id = u.id
        and p.age_confirmed_at is not null
    );
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.dd_delete_unconfirmed_accounts() from public;
revoke all on function public.dd_delete_unconfirmed_accounts() from anon;
revoke all on function public.dd_delete_unconfirmed_accounts() from authenticated;

-- Left commented on purpose. Do not schedule this until the review is done.
-- select cron.schedule(
--   'dd-delete-unconfirmed-age',
--   '15 * * * *',
--   $$select public.dd_delete_unconfirmed_accounts()$$
-- );
