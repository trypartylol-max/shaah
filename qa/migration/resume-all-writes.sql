-- Restore the verified baseline grants after read-back and recovery validation.
-- Existing ownership RLS and restrictive settings policies remain enforced.
grant insert,update,delete on table public.day_logs to authenticated;
grant execute on function public.shaah_save_settings_v1(bigint,jsonb),
  public.shaah_restore_settings_v1(bigint,bigint) to authenticated;
notify pgrst, 'reload schema';
