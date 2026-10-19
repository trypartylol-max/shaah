-- Administrative logical checkpoint BEFORE migration. Fill the explicit approved
-- owner predicate; the template cannot accidentally copy all accounts unchanged.
-- No Auth rows, passwords, JWTs or keys are copied. Export a separate private
-- copy and verify its SHA256 before proceeding with a real production cutover.
begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
lock table public.day_logs in share mode;
create schema shaah_recovery;
revoke all on schema shaah_recovery from public,anon,authenticated,service_role;
create table shaah_recovery.day_logs_checkpoint(
  user_id uuid not null,
  date text not null,
  data jsonb not null,
  primary key(user_id,date)
);
alter table shaah_recovery.day_logs_checkpoint enable row level security;
revoke all on table shaah_recovery.day_logs_checkpoint from public,anon,authenticated,service_role;
insert into shaah_recovery.day_logs_checkpoint(user_id,date,data)
  select d.user_id,d.date,d.data from public.day_logs d where __APPROVED_OWNER_PREDICATE__;
do $verify$
begin
  if exists(
    (select d.user_id,d.date,d.data from public.day_logs d where __APPROVED_OWNER_PREDICATE__
      except select user_id,date,data from shaah_recovery.day_logs_checkpoint)
    union all
    (select user_id,date,data from shaah_recovery.day_logs_checkpoint
      except select d.user_id,d.date,d.data from public.day_logs d where __APPROVED_OWNER_PREDICATE__)
  ) then raise exception 'SHAAH_CHECKPOINT_MISMATCH'; end if;
end
$verify$;
select jsonb_build_object('status','passed','exact_source_match',true,
  'rows',(select count(*) from shaah_recovery.day_logs_checkpoint),
  'direct_authenticated_read_allowed',has_table_privilege('authenticated','shaah_recovery.day_logs_checkpoint','SELECT'),
  'direct_anonymous_read_allowed',has_table_privilege('anon','shaah_recovery.day_logs_checkpoint','SELECT'),
  'scope','explicit approved owner predicate; Auth data excluded') as checkpoint;
commit;
