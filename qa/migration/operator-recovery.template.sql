-- Fill from a verified backup/checkpoint and the approved owner receipt.
-- Administrative operation during full write pause; no Auth users are changed.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $recovery$
declare
  v_owner uuid := '__OWNER_UUID__';
  v_date text := '__DAY_KEY__';
  v_expected_day jsonb := __EXPECTED_DAY_JSON__;
  v_restore_day jsonb := __BASELINE_DAY_JSON__;
  v_restore_cfg jsonb := __BASELINE_SETTINGS_JSON__;
  v_revision bigint; v_result jsonb; v_affected integer; v_checksum text;
begin
  if has_table_privilege('authenticated','public.day_logs','INSERT,UPDATE,DELETE')
     or has_function_privilege('authenticated','public.shaah_save_settings_v1(bigint,jsonb)','EXECUTE')
     or has_function_privilege('authenticated','public.shaah_restore_settings_v1(bigint,bigint)','EXECUTE')
  then raise exception 'SHAAH_FULL_WRITE_PAUSE_REQUIRED'; end if;
  if not exists(select 1 from shaah_private.settings_versions where user_id=v_owner and settings_revision=0 and data=v_restore_cfg)
  then raise exception 'SHAAH_BACKUP_RECEIPT_MISMATCH'; end if;
  select settings_revision into strict v_revision from public.day_logs
    where user_id=v_owner and date='settings' for update;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
  v_result:=shaah_private.restore_settings_v1(0,v_revision);
  if v_result->'data'<>v_restore_cfg then raise exception 'SHAAH_SETTINGS_RECOVERY_MISMATCH'; end if;
  update public.day_logs set data=v_restore_day
    where user_id=v_owner and date=v_date and data=v_expected_day;
  get diagnostics v_affected=row_count;
  if v_affected<>1 then raise exception 'SHAAH_DAY_CHECKPOINT_MISMATCH'; end if;
  select md5(jsonb_agg(jsonb_build_object('date',date,'data',data) order by date)::text)
    into v_checksum from public.day_logs where user_id=v_owner;
  if v_checksum<>'__PROFILE_CHECKSUM__' then raise exception 'SHAAH_PROFILE_RECOVERY_MISMATCH'; end if;
end
$recovery$;
select jsonb_build_object('status','passed','scope','one receipt-owned profile; full write pause; exact checkpoint match; settings revision increases','auth_users_changed',false,'settings_and_day_restored',true) as recovery;
commit;
