// Offline preparation only. This module never connects to Supabase.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const PROJECT='kpnwiwaiwnndpvtxkvva';
const migrations=[
 '20261018062823_protect_settings_revisions.sql',
 '20261018063440_settings_conflict_http_status.sql',
 '20261018085531_bind_settings_request_owner.sql'
];
function prepare({projectRef,nonce}){
 if(projectRef!==PROJECT)throw new Error('SHAAH_TEST_ONLY');
 if(!/^[a-f0-9]{16}$/.test(nonce))throw new Error('INVALID_PROBE_NONCE');
 const table='shaah_cfg_'+nonce, schema=table+'_private', marker='shaah-isolated-config:'+nonce;
 const rpc={save:'shaah_save_settings_v1',backup:'shaah_settings_backup_v1',restore:'shaah_restore_settings_v1'};
 const mapped=Object.fromEntries(Object.entries(rpc).map(([k,v])=>[k,v.replace('shaah_',table+'_')]));
 const sources=migrations.map(name=>{
  const source=fs.readFileSync(path.join(__dirname,'../../supabase/migrations',name),'utf8');
  return {name,source,sha256:crypto.createHash('sha256').update(source).digest('hex')};
 });
 const rewrite=source=>{
  let sql=source.replaceAll('public.day_logs','public.'+table).replaceAll("tablename='day_logs'","tablename='"+table+"'").replaceAll('shaah_private',schema);
  for(const k of Object.keys(rpc))sql=sql.replaceAll('public.'+rpc[k],'public.'+mapped[k]);
  if(sql.includes('public.day_logs')||sql.includes('shaah_private'))throw new Error('UNSCOPED_PROTOCOL');
  return sql;
 };
 const install=`begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
create table public.${table} (
 user_id uuid not null references auth.users(id),
 date text not null check(date in ('settings','cfgbak') or date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
 data jsonb not null default '{}'::jsonb,
 primary key(user_id,date)
);
alter table public.${table} enable row level security;
revoke all on public.${table} from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.${table} to authenticated;
create policy day_logs_select_own on public.${table} for select to authenticated using ((select auth.uid())=user_id);
create policy day_logs_insert_own on public.${table} for insert to authenticated with check ((select auth.uid())=user_id);
create policy day_logs_update_own on public.${table} for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy day_logs_delete_own on public.${table} for delete to authenticated using ((select auth.uid())=user_id);
${sources.map(s=>rewrite(s.source)).join('\n')}
comment on table public.${table} is '${marker}';
comment on schema ${schema} is '${marker}';
alter table public.${table} replica identity full;
alter publication supabase_realtime add table public.${table};
notify pgrst,'reload schema';
commit;
`;
 // No CASCADE: unexpected dependencies cause a rollback instead of deletion.
 const cleanup=`begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
do $guard$ begin
 if obj_description(to_regclass('public.${table}'),'pg_class') is distinct from '${marker}'
 or obj_description(to_regnamespace('${schema}'),'pg_namespace') is distinct from '${marker}'
 then raise exception 'PROBE_IDENTITY_MISMATCH'; end if;
end $guard$;
drop function public.${mapped.save}(bigint,jsonb);
drop function public.${mapped.backup}();
drop function public.${mapped.restore}(bigint,bigint);
drop function ${schema}.restore_settings_v1(bigint,bigint);
drop function ${schema}.settings_backup_v1();
drop function ${schema}.save_settings_v1(bigint,jsonb);
drop table ${schema}.settings_versions;
drop schema ${schema};
drop table public.${table};
notify pgrst,'reload schema';
commit;
`;
 return {projectRef,nonce,table,schema,marker,rpc:mapped,sources:sources.map(({name,sha256})=>({name,sha256})),install,cleanup};
}
module.exports={prepare};
