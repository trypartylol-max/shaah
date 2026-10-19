-- Controlled containment / recovery mode. Keeps RLS guards, backups and reads.
-- Apply only to the approved target. No data changes or legacy-write reopening.
revoke execute on function public.shaah_save_settings_v1(bigint,jsonb),
  public.shaah_restore_settings_v1(bigint,bigint) from authenticated;
notify pgrst, 'reload schema';
