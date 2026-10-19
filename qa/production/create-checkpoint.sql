-- Explicitly authorized scope: every existing public.day_logs app row.
-- Includes surrogate IDs and created_at; excludes Auth, passwords and tokens.
-- DDL: run with apply_migration, before the application protocol.
set local lock_timeout='5s';
set local statement_timeout='45s';
lock table public.day_logs in share mode;
create schema shaah_recovery;
revoke all on schema shaah_recovery from public,anon,authenticated,service_role;
create table shaah_recovery.day_logs_checkpoint as table public.day_logs with no data;
alter table shaah_recovery.day_logs_checkpoint enable row level security;
revoke all on table shaah_recovery.day_logs_checkpoint from public,anon,authenticated,service_role;
insert into shaah_recovery.day_logs_checkpoint select * from public.day_logs;
create table shaah_recovery.cutover_manifest(
  captured_at timestamptz not null default clock_timestamp(),
  source_rows bigint not null,
  source_fingerprint text not null,
  source_columns jsonb not null,
  original_policies jsonb not null,
  original_grants jsonb not null
);
alter table shaah_recovery.cutover_manifest enable row level security;
revoke all on table shaah_recovery.cutover_manifest from public,anon,authenticated,service_role;
insert into shaah_recovery.cutover_manifest(source_rows,source_fingerprint,source_columns,original_policies,original_grants)
select count(*),md5(coalesce(jsonb_agg(to_jsonb(d) order by id)::text,'[]')),
  (select jsonb_agg(jsonb_build_object('name',attname,'type',format_type(atttypid,atttypmod),'not_null',attnotnull) order by attnum) from pg_attribute where attrelid='public.day_logs'::regclass and attnum>0 and not attisdropped),
  (select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='public' and tablename='day_logs'),
  (select jsonb_agg(to_jsonb(g)) from information_schema.role_table_grants g where table_schema='public' and table_name='day_logs')
from public.day_logs d;
do $verify$
begin
 if exists(
  (select * from public.day_logs except select * from shaah_recovery.day_logs_checkpoint)
  union all
  (select * from shaah_recovery.day_logs_checkpoint except select * from public.day_logs)
 ) then raise exception 'SHAAH_CHECKPOINT_MISMATCH'; end if;
 if has_table_privilege('anon','shaah_recovery.day_logs_checkpoint','SELECT')
    or has_table_privilege('authenticated','shaah_recovery.day_logs_checkpoint','SELECT')
 then raise exception 'SHAAH_CHECKPOINT_EXPOSED'; end if;
end $verify$;
