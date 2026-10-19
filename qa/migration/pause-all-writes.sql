-- Containment for full-profile recovery. Reads/backups stay available.
-- Execute only on the approved project, after recording the original grants.
revoke insert,update,delete on table public.day_logs from authenticated;
revoke execute on function public.shaah_save_settings_v1(bigint,jsonb),
  public.shaah_restore_settings_v1(bigint,bigint) from authenticated;
notify pgrst, 'reload schema';
