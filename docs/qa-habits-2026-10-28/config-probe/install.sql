begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
create table public.shaah_cfg_87e99cfaa044a0b9 (
 user_id uuid not null references auth.users(id),
 date text not null check(date in ('settings','cfgbak') or date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
 data jsonb not null default '{}'::jsonb,
 primary key(user_id,date)
);
alter table public.shaah_cfg_87e99cfaa044a0b9 enable row level security;
revoke all on public.shaah_cfg_87e99cfaa044a0b9 from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.shaah_cfg_87e99cfaa044a0b9 to authenticated;
create policy day_logs_select_own on public.shaah_cfg_87e99cfaa044a0b9 for select to authenticated using ((select auth.uid())=user_id);
create policy day_logs_insert_own on public.shaah_cfg_87e99cfaa044a0b9 for insert to authenticated with check ((select auth.uid())=user_id);
create policy day_logs_update_own on public.shaah_cfg_87e99cfaa044a0b9 for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy day_logs_delete_own on public.shaah_cfg_87e99cfaa044a0b9 for delete to authenticated using ((select auth.uid())=user_id);
-- Additive settings protocol v1. Generated with Supabase CLI 2.81.0.
-- Applied only to SHAAH-TEST in this work; production requires separate approval.
-- No settings/day data is rewritten or copied during installation.
set local lock_timeout = '5s';
set local statement_timeout = '45s';

do $preflight$
begin
  if to_regclass('public.shaah_cfg_87e99cfaa044a0b9') is null
     or not (select relrowsecurity from pg_class where oid='public.shaah_cfg_87e99cfaa044a0b9'::regclass)
     or to_regnamespace('shaah_cfg_87e99cfaa044a0b9_private') is not null
     or exists(select 1 from pg_attribute where attrelid='public.shaah_cfg_87e99cfaa044a0b9'::regclass and attname='settings_revision' and not attisdropped)
     or exists(select 1 from pg_trigger where tgrelid='public.shaah_cfg_87e99cfaa044a0b9'::regclass and not tgisinternal)
     or (select count(*) from pg_policies where schemaname='public' and tablename='shaah_cfg_87e99cfaa044a0b9') <> 4
     or (select count(*) from pg_policies where schemaname='public' and tablename='shaah_cfg_87e99cfaa044a0b9'
          and policyname in ('day_logs_select_own','day_logs_insert_own','day_logs_update_own','day_logs_delete_own')
          and roles=array['authenticated']::name[] and permissive='PERMISSIVE') <> 4
     or exists(select 1 from pg_policies where schemaname='public' and tablename='shaah_cfg_87e99cfaa044a0b9' and (
       (cmd in ('SELECT','UPDATE','DELETE') and regexp_replace(replace(coalesce(qual,''),' AS uid',''),'[[:space:]()]','','g')
         not in ('SELECTauth.uid=user_id','user_id=SELECTauth.uid','auth.uid=user_id','user_id=auth.uid'))
       or (cmd in ('INSERT','UPDATE') and regexp_replace(replace(coalesce(with_check,''),' AS uid',''),'[[:space:]()]','','g')
         not in ('SELECTauth.uid=user_id','user_id=SELECTauth.uid','auth.uid=user_id','user_id=auth.uid'))))
     or has_table_privilege('anon','public.shaah_cfg_87e99cfaa044a0b9','SELECT,INSERT,UPDATE,DELETE')
     or not exists(select 1 from pg_constraint where conrelid='public.shaah_cfg_87e99cfaa044a0b9'::regclass and contype='p'
       and (select array_agg(a.attname::text order by u.ord) from unnest(conkey) with ordinality u(attnum,ord)
            join pg_attribute a on a.attrelid=conrelid and a.attnum=u.attnum)=array['user_id','date'])
  then raise exception 'SHAAH_SCHEMA_PREFLIGHT_FAILED'; end if;
end
$preflight$;

alter table public.shaah_cfg_87e99cfaa044a0b9 add column settings_revision bigint not null default 0
  constraint shaah_settings_revision_nonnegative check (settings_revision >= 0);
comment on column public.shaah_cfg_87e99cfaa044a0b9.settings_revision is 'SHAAH settings protocol v1; monotonic revision, changed only by the settings RPC.';

create schema shaah_cfg_87e99cfaa044a0b9_private;
revoke all on schema shaah_cfg_87e99cfaa044a0b9_private from public, anon, authenticated, service_role;
grant usage on schema shaah_cfg_87e99cfaa044a0b9_private to authenticated;

create table shaah_cfg_87e99cfaa044a0b9_private.settings_versions (
  user_id uuid not null references auth.users(id) on delete cascade,
  settings_revision bigint not null check (settings_revision >= 0),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  captured_at timestamptz not null default clock_timestamp(),
  primary key (user_id, settings_revision)
);
alter table shaah_cfg_87e99cfaa044a0b9_private.settings_versions enable row level security;
revoke all on table shaah_cfg_87e99cfaa044a0b9_private.settings_versions from public, anon, authenticated, service_role;

-- Restrictive policies AND with the existing ownership policies. Legacy clients
-- keep own-row SELECT and normal day/cfgbak writes, but cannot create, replace,
-- delete or rename a settings row, including via upsert.
create policy shaah_settings_insert_requires_rpc on public.shaah_cfg_87e99cfaa044a0b9
  as restrictive for insert to authenticated with check (date <> 'settings');
create policy shaah_settings_update_requires_rpc on public.shaah_cfg_87e99cfaa044a0b9
  as restrictive for update to authenticated
  using (date <> 'settings') with check (date <> 'settings');
create policy shaah_settings_delete_requires_rpc on public.shaah_cfg_87e99cfaa044a0b9
  as restrictive for delete to authenticated using (date <> 'settings');

-- Privilege is narrowly needed to cross the deliberate direct-write barrier.
-- Definers live in a private schema, have an empty search_path, accept no owner
-- parameter, check the JWT subject, and use no dynamic SQL or user_metadata.
create function shaah_cfg_87e99cfaa044a0b9_private.save_settings_v1(p_expected_revision bigint, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_uid uuid := auth.uid();
  v_old public.shaah_cfg_87e99cfaa044a0b9%rowtype;
  v_new public.shaah_cfg_87e99cfaa044a0b9%rowtype;
begin
  if v_uid is null then raise exception 'SHAAH_AUTH_REQUIRED' using errcode='42501'; end if;
  if jsonb_typeof(p_data) is distinct from 'object'
     or jsonb_typeof(p_data->'_cfg') is distinct from 'object'
     or p_expected_revision < 0
  then raise exception 'SHAAH_INVALID_SETTINGS' using errcode='22023'; end if;

  select * into v_old from public.shaah_cfg_87e99cfaa044a0b9
    where user_id=v_uid and date='settings' for update;
  if found then
    if p_expected_revision is distinct from v_old.settings_revision
    then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='40001'; end if;
    if exists(select 1 from shaah_cfg_87e99cfaa044a0b9_private.settings_versions
      where user_id=v_uid and settings_revision=v_old.settings_revision and data<>v_old.data)
    then raise exception 'SHAAH_HISTORY_INTEGRITY_FAILED' using errcode='23514'; end if;
    insert into shaah_cfg_87e99cfaa044a0b9_private.settings_versions(user_id,settings_revision,data)
      values(v_uid,v_old.settings_revision,v_old.data) on conflict do nothing;
    update public.shaah_cfg_87e99cfaa044a0b9 set data=p_data,settings_revision=v_old.settings_revision+1
      where user_id=v_uid and date='settings' returning * into v_new;
  else
    if p_expected_revision is not null
    then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='40001'; end if;
    insert into public.shaah_cfg_87e99cfaa044a0b9(user_id,date,data,settings_revision)
      values(v_uid,'settings',p_data,1) on conflict(user_id,date) do nothing returning * into v_new;
    if not found then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='40001'; end if;
  end if;

  insert into shaah_cfg_87e99cfaa044a0b9_private.settings_versions(user_id,settings_revision,data)
    values(v_uid,v_new.settings_revision,v_new.data);
  -- Keep the latest 50 revisions and the pre-protocol baseline (revision 0).
  -- External pre-migration exports remain the independent disaster-recovery copy.
  delete from shaah_cfg_87e99cfaa044a0b9_private.settings_versions where user_id=v_uid
    and settings_revision>0 and settings_revision<v_new.settings_revision-49;
  return jsonb_build_object('data',v_new.data,'settings_revision',v_new.settings_revision);
end
$fn$;

create function shaah_cfg_87e99cfaa044a0b9_private.settings_backup_v1()
returns jsonb language plpgsql stable security definer set search_path = '' as $fn$
declare v_uid uuid := auth.uid(); v_versions jsonb;
begin
  if v_uid is null then raise exception 'SHAAH_AUTH_REQUIRED' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('settings_revision',settings_revision,
    'data',data,'captured_at',captured_at) order by settings_revision desc),'[]'::jsonb)
    into v_versions from shaah_cfg_87e99cfaa044a0b9_private.settings_versions where user_id=v_uid;
  return v_versions;
end
$fn$;

create function shaah_cfg_87e99cfaa044a0b9_private.restore_settings_v1(p_restore_revision bigint,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_uid uuid := auth.uid(); v_data jsonb;
begin
  if v_uid is null then raise exception 'SHAAH_AUTH_REQUIRED' using errcode='42501'; end if;
  select data into v_data from shaah_cfg_87e99cfaa044a0b9_private.settings_versions
    where user_id=v_uid and settings_revision=p_restore_revision;
  if not found then raise exception 'SHAAH_BACKUP_NOT_FOUND' using errcode='P0002'; end if;
  -- Recovery creates a new revision; it never rewinds the concurrency counter.
  return shaah_cfg_87e99cfaa044a0b9_private.save_settings_v1(p_expected_revision,v_data);
end
$fn$;

create function public.shaah_cfg_87e99cfaa044a0b9_save_settings_v1(p_expected_revision bigint,p_data jsonb)
returns jsonb language sql security invoker set search_path = '' as $fn$
  select shaah_cfg_87e99cfaa044a0b9_private.save_settings_v1(p_expected_revision,p_data)
$fn$;
create function public.shaah_cfg_87e99cfaa044a0b9_settings_backup_v1()
returns jsonb language sql stable security invoker set search_path = '' as $fn$
  select shaah_cfg_87e99cfaa044a0b9_private.settings_backup_v1()
$fn$;
create function public.shaah_cfg_87e99cfaa044a0b9_restore_settings_v1(p_restore_revision bigint,p_expected_revision bigint)
returns jsonb language sql security invoker set search_path = '' as $fn$
  select shaah_cfg_87e99cfaa044a0b9_private.restore_settings_v1(p_restore_revision,p_expected_revision)
$fn$;

revoke all on function shaah_cfg_87e99cfaa044a0b9_private.save_settings_v1(bigint,jsonb),
  shaah_cfg_87e99cfaa044a0b9_private.settings_backup_v1(),shaah_cfg_87e99cfaa044a0b9_private.restore_settings_v1(bigint,bigint),
  public.shaah_cfg_87e99cfaa044a0b9_save_settings_v1(bigint,jsonb),public.shaah_cfg_87e99cfaa044a0b9_settings_backup_v1(),
  public.shaah_cfg_87e99cfaa044a0b9_restore_settings_v1(bigint,bigint) from public,anon,authenticated,service_role;
grant execute on function shaah_cfg_87e99cfaa044a0b9_private.save_settings_v1(bigint,jsonb),
  shaah_cfg_87e99cfaa044a0b9_private.settings_backup_v1(),shaah_cfg_87e99cfaa044a0b9_private.restore_settings_v1(bigint,bigint),
  public.shaah_cfg_87e99cfaa044a0b9_save_settings_v1(bigint,jsonb),public.shaah_cfg_87e99cfaa044a0b9_settings_backup_v1(),
  public.shaah_cfg_87e99cfaa044a0b9_restore_settings_v1(bigint,bigint) to authenticated;

notify pgrst, 'reload schema';

-- A stale application revision is an explicit HTTP 409 business conflict.
-- It is not a database serialization failure / HTTP 500.
create or replace function shaah_cfg_87e99cfaa044a0b9_private.save_settings_v1(p_expected_revision bigint, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_uid uuid := auth.uid();
  v_old public.shaah_cfg_87e99cfaa044a0b9%rowtype;
  v_new public.shaah_cfg_87e99cfaa044a0b9%rowtype;
begin
  if v_uid is null then raise exception 'SHAAH_AUTH_REQUIRED' using errcode='42501'; end if;
  if jsonb_typeof(p_data) is distinct from 'object'
     or jsonb_typeof(p_data->'_cfg') is distinct from 'object'
     or p_expected_revision < 0
  then raise exception 'SHAAH_INVALID_SETTINGS' using errcode='22023'; end if;

  select * into v_old from public.shaah_cfg_87e99cfaa044a0b9
    where user_id=v_uid and date='settings' for update;
  if found then
    if p_expected_revision is distinct from v_old.settings_revision
    then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='PT409'; end if;
    if exists(select 1 from shaah_cfg_87e99cfaa044a0b9_private.settings_versions
      where user_id=v_uid and settings_revision=v_old.settings_revision and data<>v_old.data)
    then raise exception 'SHAAH_HISTORY_INTEGRITY_FAILED' using errcode='23514'; end if;
    insert into shaah_cfg_87e99cfaa044a0b9_private.settings_versions(user_id,settings_revision,data)
      values(v_uid,v_old.settings_revision,v_old.data) on conflict do nothing;
    update public.shaah_cfg_87e99cfaa044a0b9 set data=p_data,settings_revision=v_old.settings_revision+1
      where user_id=v_uid and date='settings' returning * into v_new;
  else
    if p_expected_revision is not null
    then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='PT409'; end if;
    insert into public.shaah_cfg_87e99cfaa044a0b9(user_id,date,data,settings_revision)
      values(v_uid,'settings',p_data,1) on conflict(user_id,date) do nothing returning * into v_new;
    if not found then raise exception 'SHAAH_REVISION_CONFLICT' using errcode='PT409'; end if;
  end if;

  insert into shaah_cfg_87e99cfaa044a0b9_private.settings_versions(user_id,settings_revision,data)
    values(v_uid,v_new.settings_revision,v_new.data);
  -- Keep the latest 50 revisions and the pre-protocol baseline (revision 0).
  -- External pre-migration exports remain the independent disaster-recovery copy.
  delete from shaah_cfg_87e99cfaa044a0b9_private.settings_versions where user_id=v_uid
    and settings_revision>0 and settings_revision<v_new.settings_revision-49;
  return jsonb_build_object('data',v_new.data,'settings_revision',v_new.settings_revision);
end
$fn$;
notify pgrst, 'reload schema';

-- Bind an HTTP request to the owner captured before the SDK resolves its token.
-- The assertion is not a write target: the private writer still uses auth.uid().
create or replace function public.shaah_cfg_87e99cfaa044a0b9_save_settings_v1(p_expected_revision bigint,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $fn$
begin
  if auth.uid() is null or p_data->>'owner_id' is distinct from auth.uid()::text
  then raise exception 'SHAAH_REQUEST_OWNER_MISMATCH' using errcode='42501'; end if;
  return shaah_cfg_87e99cfaa044a0b9_private.save_settings_v1(p_expected_revision,p_data->'data');
end
$fn$;
notify pgrst, 'reload schema';

comment on table public.shaah_cfg_87e99cfaa044a0b9 is 'shaah-isolated-config:87e99cfaa044a0b9';
comment on schema shaah_cfg_87e99cfaa044a0b9_private is 'shaah-isolated-config:87e99cfaa044a0b9';
alter table public.shaah_cfg_87e99cfaa044a0b9 replica identity full;
alter publication supabase_realtime add table public.shaah_cfg_87e99cfaa044a0b9;
notify pgrst,'reload schema';
commit;
