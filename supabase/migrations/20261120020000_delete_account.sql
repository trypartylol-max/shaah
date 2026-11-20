-- Account deletion (required by Google Play and promised in privacy.html). The delete-account Edge Function verifies
-- the caller's JWT, calls this with that user's id using the service role, and then deletes the auth user, which
-- cascades to push_subscriptions, scorecard_events and shaah_private.settings_versions. day_logs has no cascade and
-- shaah_recovery.day_logs_checkpoint has no foreign key, so both are removed here first.
create or replace function public.shaah_delete_account_data(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare days int; checkpoints int := 0;
begin
  if p_user is null then raise invalid_parameter_value using message='User required'; end if;
  delete from public.day_logs where user_id=p_user;
  get diagnostics days = row_count;
  if to_regclass('shaah_recovery.day_logs_checkpoint') is not null then
    execute 'delete from shaah_recovery.day_logs_checkpoint where user_id=$1' using p_user;
    get diagnostics checkpoints = row_count;
  end if;
  delete from public.push_subscriptions where user_id=p_user;
  return jsonb_build_object('day_logs',days,'checkpoints',checkpoints);
end $$;
revoke all on function public.shaah_delete_account_data(uuid) from public, anon, authenticated;
grant execute on function public.shaah_delete_account_data(uuid) to service_role;
