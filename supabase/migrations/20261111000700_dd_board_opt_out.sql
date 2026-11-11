-- Let a signed-in player hide their username from the public leagues board.
--
-- Already true, so this file does not change the board query:
--   public.dd_leaderboard (20261111000600_dd_leaderboard.sql) returns a
--   username and coins only, and only when opted_out_of_boards is false.
--   public.dd_weekly_league also filters that flag. The live client calls
--   dd_leaderboard, not dd_weekly_league.
--
-- RLS policy dd_profiles_update already lets a user update their own row,
-- including opted_out_of_boards. authenticated has SELECT on dd_profiles
-- and does not have UPDATE. A table UPDATE grant would also let a player
-- change is_plus, so this file does not add one. The function below sets
-- only opted_out_of_boards.
--
-- Do not apply this from the site deploy. Apply it by hand after review.
-- This file does not delete rows and does not insert scores.

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
begin
  if uid is null then
    raise exception 'sign in required';
  end if;
  perform public.dd_ensure_profile();
  select username, opted_out_of_boards into name, hidden
  from public.dd_profiles
  where id = uid;
  return jsonb_build_object(
    'username', name,
    'opted_out_of_boards', coalesce(hidden, false)
  );
end;
$$;

create or replace function public.dd_set_board_opt_out(p_hide boolean)
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
  if p_hide is null then
    raise exception 'choice required';
  end if;
  perform public.dd_ensure_profile();
  update public.dd_profiles
    set opted_out_of_boards = p_hide
    where id = uid
    returning username into name;
  return jsonb_build_object(
    'username', name,
    'opted_out_of_boards', p_hide
  );
end;
$$;

revoke all on function public.dd_my_profile() from public;
revoke all on function public.dd_set_board_opt_out(boolean) from public;
grant execute on function public.dd_my_profile() to authenticated;
grant execute on function public.dd_set_board_opt_out(boolean) to authenticated;
