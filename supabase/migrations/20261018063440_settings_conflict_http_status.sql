-- A stale application revision is an explicit HTTP 409 business conflict.
-- It is not a database serialization failure / HTTP 500.
create or replace function shaah_private.save_settings_v1(p_expected_revision bigint, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_uid uuid := auth.uid();
  v_old public.day_logs%rowtype;
  v_new public.day_logs%rowtype;
begin
  if v_uid is null then raise exception 'SHAAH_AUTH_REQUIRED' using errcode='42501'; end if;
  if jsonb_typeof(p_data) is distinct from 'object'
     or jsonb_typeof(p_data->'_cfg') is distinct from 'object'
     or p_expected_revision < 0
  then raise exception 'SHAAH_INVALID_SETTINGS' using errcode='22023'; end if;

  select * into v_old from public.day_logs
    where user_id=v_uid and date='settings' for update;
  if found then
    if p_expected_revision is distinct from v_old.settings_revision
    then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='PT409'; end if;
    if exists(select 1 from shaah_private.settings_versions
      where user_id=v_uid and settings_revision=v_old.settings_revision and data<>v_old.data)
    then raise exception 'SHAAH_HISTORY_INTEGRITY_FAILED' using errcode='23514'; end if;
    insert into shaah_private.settings_versions(user_id,settings_revision,data)
      values(v_uid,v_old.settings_revision,v_old.data) on conflict do nothing;
    update public.day_logs set data=p_data,settings_revision=v_old.settings_revision+1
      where user_id=v_uid and date='settings' returning * into v_new;
  else
    if p_expected_revision is not null
    then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='PT409'; end if;
    insert into public.day_logs(user_id,date,data,settings_revision)
      values(v_uid,'settings',p_data,1) on conflict(user_id,date) do nothing returning * into v_new;
    if not found then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='PT409'; end if;
  end if;

  insert into shaah_private.settings_versions(user_id,settings_revision,data)
    values(v_uid,v_new.settings_revision,v_new.data);
  -- Keep the latest 50 revisions and the pre-protocol baseline (revision 0).
  -- External pre-migration exports remain the independent disaster-recovery copy.
  delete from shaah_private.settings_versions where user_id=v_uid
    and settings_revision>0 and settings_revision<v_new.settings_revision-49;
  return jsonb_build_object('data',v_new.data,'settings_revision',v_new.settings_revision);
end
$fn$;
notify pgrst, 'reload schema';
