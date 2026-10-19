// Reproducible production-only adapter, never part of automatic QA migrations.
// The filename was created with the supported CLI before moving to this folder.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const first=fs.readFileSync(path.join(root,'supabase/migrations/20261018062823_protect_settings_revisions.sql'),'utf8');
const second=fs.readFileSync(path.join(root,'supabase/migrations/20261018063440_settings_conflict_http_status.sql'),'utf8');
const third=fs.readFileSync(path.join(root,'supabase/migrations/20261018085531_bind_settings_request_owner.sql'),'utf8');
const prefix=String.raw`-- Production legacy schema adapter; generated, reviewed and rehearsed in QA.
-- No business rows, IDs, timestamps or historical values are rewritten.
set local lock_timeout='5s';
set local statement_timeout='45s';
lock table public.day_logs in share row exclusive mode;
do $legacy$
begin
  if not (select relrowsecurity from pg_class where oid='public.day_logs'::regclass)
    or (select relowner::regrole::text from pg_class where oid='public.day_logs'::regclass)<>'postgres'
    or (select array_agg(attname::text order by attnum) from pg_attribute where attrelid='public.day_logs'::regclass and attnum>0 and not attisdropped)
       is distinct from array['id','created_at','date','data','user_id']
    or (select array_agg(format_type(atttypid,atttypmod) order by attnum) from pg_attribute where attrelid='public.day_logs'::regclass and attnum>0 and not attisdropped)
       is distinct from array['bigint','timestamp with time zone','text','jsonb','uuid']
    or (select array_agg(attnotnull order by attnum) from pg_attribute where attrelid='public.day_logs'::regclass and attnum>0 and not attisdropped)
       is distinct from array[true,true,false,false,false]
    or (select attidentity::text from pg_attribute where attrelid='public.day_logs'::regclass and attname='id')<>'d'
    or (select pg_get_expr(d.adbin,d.adrelid) from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum where d.adrelid='public.day_logs'::regclass and a.attname='created_at') is distinct from 'now()'
    or exists(select 1 from pg_attribute where attrelid='public.day_logs'::regclass and attacl is not null)
    or (select count(*) from pg_constraint where conrelid='public.day_logs'::regclass)<>3
    or not exists(select 1 from pg_constraint where conrelid='public.day_logs'::regclass and contype='p' and pg_get_constraintdef(oid)='PRIMARY KEY (id)')
    or not exists(select 1 from pg_constraint where conrelid='public.day_logs'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (user_id, date)')
    or not exists(select 1 from pg_constraint where conrelid='public.day_logs'::regclass and contype='f' and pg_get_constraintdef(oid)='FOREIGN KEY (user_id) REFERENCES auth.users(id)')
    or exists(select 1 from pg_trigger where tgrelid='public.day_logs'::regclass and not tgisinternal)
    or (select count(*) from pg_policies where schemaname='public' and tablename='day_logs')<>1
    or not exists(select 1 from pg_policies where schemaname='public' and tablename='day_logs' and policyname='own logs' and cmd='ALL' and roles=array['public']::name[] and permissive='PERMISSIVE'
       and regexp_replace(qual,'[[:space:]()]','','g')='auth.uid=user_id'
       and regexp_replace(with_check,'[[:space:]()]','','g')='auth.uid=user_id')
    or exists(select 1 from public.day_logs where user_id is null or date is null or data is null
       or (date='settings' and (jsonb_typeof(data) is distinct from 'object' or jsonb_typeof(data->'_cfg') is distinct from 'object')))
    or to_regnamespace('shaah_private') is not null
    or exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='day_logs' and grantee not in ('postgres','anon','authenticated','service_role'))
  then raise exception 'SHAAH_LEGACY_SCHEMA_PREFLIGHT_FAILED'; end if;
end $legacy$;

-- Preserve the surrogate PK and UNIQUE business key. Narrow equivalent owner
-- policies to authenticated; remove unnecessary anonymous/DDL-like privileges.
revoke all on public.day_logs from anon;
revoke truncate,references,trigger on public.day_logs from authenticated;
create policy day_logs_select_own on public.day_logs for select to authenticated using ((select auth.uid())=user_id);
create policy day_logs_insert_own on public.day_logs for insert to authenticated with check ((select auth.uid())=user_id);
create policy day_logs_update_own on public.day_logs for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy day_logs_delete_own on public.day_logs for delete to authenticated using ((select auth.uid())=user_id);
drop policy "own logs" on public.day_logs;
`;
const needle="and contype='p'";
if(first.split(needle).length!==2)throw Error('Unexpected core preflight');
// ON CONFLICT requires a unique business key; it need not be the primary key.
const core=first.replace(needle,"and contype in ('p','u')");
const sql=prefix+'\n-- BEGIN ORIGINAL PROTOCOL (only business-key preflight accepts UNIQUE)\n'+core+'\n'+second+'\n'+third;
const file=path.join(root,'supabase/production-migrations/20261018182501_install_settings_protocol_legacy_schema.sql');
fs.writeFileSync(file,sql);
console.log(JSON.stringify({file:path.relative(root,file),sha256:crypto.createHash('sha256').update(sql).digest('hex'),coreChanges:'one preflight: accept UNIQUE(user_id,date) as well as composite PK',businessDml:false}));
