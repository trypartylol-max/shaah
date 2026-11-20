-- PRUEBA en SHAAH-TEST (begin/rollback: no deja cambios). Resultado esperado: una fila "ALL OK".
begin;
create table if not exists public.push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null,
  remind_at time not null default '20:00', timezone text not null, lang text not null default 'en',
  last_sent_on date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create or replace function public.shaah_delete_account_data(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare days int; checkpoints int := 0;
begin
  if p_user is null then raise invalid_parameter_value using message='User required'; end if;
  delete from public.day_logs where user_id=p_user;
  get diagnostics days = row_count;
  if to_regclass('shaah_recovery.day_logs_checkpoint') is not null then
    execute 'delete from shaah_recovery.day_logs_checkpoint where user_id=$1' using p_user;
    get diagnostics checkpoints = row_count;
  end if;
  delete from public.push_subscriptions where user_id=p_user;
  return jsonb_build_object('day_logs',days,'checkpoints',checkpoints);
end $$;
revoke all on function public.shaah_delete_account_data(uuid) from public, anon, authenticated;
grant execute on function public.shaah_delete_account_data(uuid) to service_role;
do $t$
declare u uuid := gen_random_uuid(); other uuid; r jsonb; n int; before_other int;
begin
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
  values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','delete-test-'||u||'@example.test','',now(),now());
  insert into public.day_logs(user_id,date,data) values(u,'2026-11-01','{"score":5}'),(u,'2026-11-02','{"score":7}');
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,timezone) values(u,'https://push.example/del','p'||repeat('x',30),'a'||repeat('y',10),'UTC');
  if to_regclass('shaah_recovery.day_logs_checkpoint') is not null then
    begin execute 'insert into shaah_recovery.day_logs_checkpoint(user_id,date,data) values($1,''2026-11-01'',''{}''::jsonb)' using u;
    exception when others then null; end;
  end if;
  select user_id into other from public.day_logs where user_id<>u limit 1;
  select count(*) into before_other from public.day_logs where user_id=other;
  r := public.shaah_delete_account_data(u);
  if (r->>'day_logs')::int<>2 then raise exception 'day_logs not deleted: %', r; end if;
  select count(*) into n from public.day_logs where user_id=u; if n<>0 then raise exception 'rows left'; end if;
  select count(*) into n from public.push_subscriptions where user_id=u; if n<>0 then raise exception 'push left'; end if;
  if other is not null then select count(*) into n from public.day_logs where user_id=other; if n<>before_other then raise exception 'touched another user'; end if; end if;
  delete from auth.users where id=u;   -- what the Edge Function does next (cascades)
  select count(*) into n from auth.users where id=u; if n<>0 then raise exception 'user left'; end if;
end $t$;
select 'ALL OK' as result;
rollback;
