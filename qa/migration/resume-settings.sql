-- Resume the same verified protocol after recovery and read-back validation.
grant execute on function public.shaah_save_settings_v1(bigint,jsonb),
  public.shaah_restore_settings_v1(bigint,bigint) to authenticated;
notify pgrst, 'reload schema';
