-- PRUEBA en SHAAH-TEST (no en producción). Todo va dentro de begin/rollback: no deja ningún cambio.
-- Pegar entero en Supabase → proyecto SHAAH-TEST → SQL Editor → Run. Resultado esperado: una fila "ALL OK".
begin;
create table if not exists public.push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and length(endpoint)<=2000),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 8 and 100),
  remind_at time not null default '20:00',
  timezone text not null check (length(timezone) between 1 and 64),
  lang text not null default 'en' check (lang in ('en','es','he')),
  last_sent_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions
  add column if not exists reminder_on boolean not null default true,
  add column if not exists badge_on boolean not null default false,
  add column if not exists badge_next_day date,
  add column if not exists badge_next_count integer check (badge_next_count between 0 and 999),
  add column if not exists badge_sent_on date;

create or replace function public.shaah_push_subscribe(p_endpoint text,p_p256dh text,p_auth text,p_remind_at text,p_timezone text,p_lang text)
returns void language plpgsql security definer set search_path='' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise insufficient_privilege using message='Sign in required'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise invalid_parameter_value using message='Invalid timezone'; end if;
  if p_remind_at !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise invalid_parameter_value using message='Invalid time'; end if;
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,remind_at,timezone,lang,reminder_on)
  values(me,p_endpoint,p_p256dh,p_auth,p_remind_at::time,p_timezone,case when p_lang in ('en','es','he') then p_lang else 'en' end,true)
  on conflict (endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,remind_at=excluded.remind_at,
    timezone=excluded.timezone,lang=excluded.lang,reminder_on=true,updated_at=now(),
    last_sent_on=case when public.push_subscriptions.user_id=excluded.user_id then public.push_subscriptions.last_sent_on end,
    badge_on=public.push_subscriptions.badge_on and public.push_subscriptions.user_id=excluded.user_id;
end $$;

create or replace function public.shaah_push_unsubscribe(p_endpoint text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.push_subscriptions set reminder_on=false,updated_at=now() where endpoint=p_endpoint and user_id=auth.uid() and badge_on;
  delete from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid() and not badge_on;
end $$;

create or replace function public.shaah_push_badge(p_endpoint text,p_p256dh text,p_auth text,p_timezone text,p_lang text,p_on boolean,p_next_day text,p_next_count integer)
returns void language plpgsql security definer set search_path='' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise insufficient_privilege using message='Sign in required'; end if;
  if not p_on then
    update public.push_subscriptions set badge_on=false,updated_at=now() where endpoint=p_endpoint and user_id=me;
    delete from public.push_subscriptions where endpoint=p_endpoint and user_id=me and not reminder_on and not badge_on;
    return;
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise invalid_parameter_value using message='Invalid timezone'; end if;
  if p_next_day !~ '^\d{4}-\d{2}-\d{2}$' then raise invalid_parameter_value using message='Invalid day'; end if;
  if p_next_count is null or p_next_count<0 or p_next_count>999 then raise invalid_parameter_value using message='Invalid count'; end if;
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,timezone,lang,reminder_on,badge_on,badge_next_day,badge_next_count)
  values(me,p_endpoint,p_p256dh,p_auth,p_timezone,case when p_lang in ('en','es','he') then p_lang else 'en' end,false,true,p_next_day::date,p_next_count)
  on conflict (endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,timezone=excluded.timezone,
    lang=excluded.lang,badge_on=true,badge_next_day=excluded.badge_next_day,badge_next_count=excluded.badge_next_count,updated_at=now(),
    reminder_on=public.push_subscriptions.reminder_on and public.push_subscriptions.user_id=excluded.user_id,
    last_sent_on=case when public.push_subscriptions.user_id=excluded.user_id then public.push_subscriptions.last_sent_on end,
    badge_sent_on=case when public.push_subscriptions.user_id=excluded.user_id then public.push_subscriptions.badge_sent_on end;
end $$;

-- Same claiming logic as shaah_push_run, without the Vault token check (SHAAH-TEST has no push secrets).
create or replace function public.shaah_push_run_test()
returns jsonb language plpgsql security definer set search_path='' as $$
declare due jsonb; badge jsonb;
begin
  with now_local as (
    select s.id,(now() at time zone s.timezone) as ts from public.push_subscriptions s
  ), claimed as (
    update public.push_subscriptions s set last_sent_on=n.ts::date
    from now_local n
    where s.id=n.id and s.reminder_on
      and n.ts::time>=s.remind_at
      and n.ts::time<(case when s.remind_at>='22:00' then '23:59:59.999999'::time else s.remind_at+interval '2 hours' end)
      and (s.last_sent_on is null or s.last_sent_on<n.ts::date)
      and not exists(select 1 from public.day_logs d where d.user_id=s.user_id and d.date=to_char(n.ts::date,'YYYY-MM-DD')
                     and coalesce(nullif(d.data->>'score','')::numeric,0)>0)
    returning s.id,s.endpoint,s.p256dh,s.auth,s.lang
  )
  select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into due from claimed;
  with now_local as (
    select s.id,(now() at time zone s.timezone) as ts from public.push_subscriptions s
  ), claimed as (
    update public.push_subscriptions s set badge_sent_on=n.ts::date
    from now_local n
    where s.id=n.id and s.badge_on and s.badge_next_day=n.ts::date and s.badge_next_count>0
      and (s.badge_sent_on is null or s.badge_sent_on<n.ts::date)
      and not exists(select 1 from public.day_logs d where d.user_id=s.user_id and d.date=to_char(n.ts::date,'YYYY-MM-DD')
                     and coalesce(nullif(d.data->>'score','')::numeric,0)>0)
    returning s.id,s.endpoint,s.p256dh,s.auth,s.lang,s.badge_next_count as count
  )
  select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into badge from claimed;
  return jsonb_build_object('due',due,'badge',badge);
end $$;

do $t$
declare u uuid; r jsonb; n int; today text := to_char((now() at time zone 'UTC')::date,'YYYY-MM-DD');
begin
  select id into u from auth.users where not exists(select 1 from public.day_logs d where d.user_id=auth.users.id and d.date=today and coalesce(nullif(d.data->>'score','')::numeric,0)>0) order by created_at limit 1;
  if u is null then raise exception 'no test user without score today'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub',u,'role','authenticated')::text, true);
  perform public.shaah_push_badge('https://push.example/1','p'||repeat('x',30),'a'||repeat('y',10),'UTC','es',true,today,5);
  select count(*) into n from public.push_subscriptions where endpoint='https://push.example/1' and badge_on and not reminder_on and badge_next_count=5;
  if n<>1 then raise exception 'badge insert failed'; end if;
  perform public.shaah_push_subscribe('https://push.example/1','p'||repeat('x',30),'a'||repeat('y',10),'23:45','UTC','es');
  select count(*) into n from public.push_subscriptions where endpoint='https://push.example/1' and badge_on and reminder_on;
  if n<>1 then raise exception 'subscribe dropped badge'; end if;
  perform public.shaah_push_unsubscribe('https://push.example/1');
  select count(*) into n from public.push_subscriptions where endpoint='https://push.example/1' and badge_on and not reminder_on;
  if n<>1 then raise exception 'unsubscribe removed badge row'; end if;
  r := public.shaah_push_run_test();
  if jsonb_array_length(r->'badge')<>1 or (r->'badge'->0->>'count')::int<>5 then raise exception 'run 1 wrong: %', r; end if;
  r := public.shaah_push_run_test();
  if jsonb_array_length(r->'badge')<>0 then raise exception 'sent twice: %', r; end if;
  perform public.shaah_push_badge('https://push.example/1','p'||repeat('x',30),'a'||repeat('y',10),'UTC','es',true,to_char((now() at time zone 'UTC')::date+1,'YYYY-MM-DD'),3);
  r := public.shaah_push_run_test();
  if jsonb_array_length(r->'badge')<>0 then raise exception 'future due: %', r; end if;
  perform public.shaah_push_badge('https://push.example/1','','','UTC','es',false,'',0);
  select count(*) into n from public.push_subscriptions where endpoint='https://push.example/1';
  if n<>0 then raise exception 'badge off kept row'; end if;
  perform public.shaah_push_subscribe('https://push.example/2','p'||repeat('x',30),'a'||repeat('y',10),to_char((now() at time zone 'UTC'),'HH24:MI'),'UTC','en');
  r := public.shaah_push_run_test();
  if jsonb_array_length(r->'due')<>1 or jsonb_array_length(r->'badge')<>0 then raise exception 'reminder run wrong: %', r; end if;
end $t$;
select 'ALL OK' as result;
rollback;
