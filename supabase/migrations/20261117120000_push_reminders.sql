-- Daily reminders by Web Push. Opt-in per device: off unless the person turns it on in Settings.
-- Secrets (VAPID keys, cron token) live in Vault, never in this repo. Applied to production 2026-11-17.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

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
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
-- Owners may read their own rows; every write goes through the functions below.
grant select on public.push_subscriptions to authenticated;
create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated using ((select auth.uid())=user_id);

-- Subscribe or update this device. The endpoint and its keys belong to the browser that holds them, so a device that
-- changes account moves its subscription to the signed-in account.
create or replace function public.shaah_push_subscribe(p_endpoint text,p_p256dh text,p_auth text,p_remind_at text,p_timezone text,p_lang text)
returns void language plpgsql security definer set search_path='' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise insufficient_privilege using message='Sign in required'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise invalid_parameter_value using message='Invalid timezone'; end if;
  if p_remind_at !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise invalid_parameter_value using message='Invalid time'; end if;
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,remind_at,timezone,lang)
  values(me,p_endpoint,p_p256dh,p_auth,p_remind_at::time,p_timezone,case when p_lang in ('en','es','he') then p_lang else 'en' end)
  on conflict (endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,remind_at=excluded.remind_at,
    timezone=excluded.timezone,lang=excluded.lang,updated_at=now(),
    last_sent_on=case when public.push_subscriptions.user_id=excluded.user_id then public.push_subscriptions.last_sent_on end;
end $$;

create or replace function public.shaah_push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path='' as $$
  delete from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid();
$$;

revoke all on function public.shaah_push_subscribe(text,text,text,text,text,text) from public, anon;
revoke all on function public.shaah_push_unsubscribe(text) from public, anon;
grant execute on function public.shaah_push_subscribe(text,text,text,text,text,text) to authenticated;
grant execute on function public.shaah_push_unsubscribe(text) to authenticated;

-- Called only by the push-reminders Edge Function (service role). Claims the subscriptions that are due now:
-- local time inside [remind_at, remind_at + 2 h) on the same local day, not yet sent today, and nothing scored today.
-- Marks them as sent in the same statement so two runs never notify twice.
create or replace function public.shaah_push_run(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare due jsonb;
begin
  if p_token is null or p_token is distinct from (select decrypted_secret from vault.decrypted_secrets where name='shaah_push_cron_token') then
    raise insufficient_privilege using message='Bad token';
  end if;
  with now_local as (
    select s.id,(now() at time zone s.timezone) as ts from public.push_subscriptions s
  ), claimed as (
    update public.push_subscriptions s set last_sent_on=n.ts::date
    from now_local n
    where s.id=n.id
      and n.ts::time>=s.remind_at
      -- two-hour window, closed at midnight (time + interval wraps around)
      and n.ts::time<(case when s.remind_at>='22:00' then '23:59:59.999999'::time else s.remind_at+interval '2 hours' end)
      and (s.last_sent_on is null or s.last_sent_on<n.ts::date)
      and not exists(select 1 from public.day_logs d where d.user_id=s.user_id and d.date=to_char(n.ts::date,'YYYY-MM-DD')
                     and coalesce(nullif(d.data->>'score','')::numeric,0)>0)
    returning s.id,s.endpoint,s.p256dh,s.auth,s.lang
  )
  select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into due from claimed;
  return jsonb_build_object(
    'vapid_public',(select decrypted_secret from vault.decrypted_secrets where name='shaah_push_vapid_public'),
    'vapid_private',(select decrypted_secret from vault.decrypted_secrets where name='shaah_push_vapid_private'),
    'due',due);
end $$;
revoke all on function public.shaah_push_run(text) from public, anon, authenticated;
grant execute on function public.shaah_push_run(text) to service_role;

-- Every 15 minutes (5 since 20261117140000). The Edge Function checks the token against Vault through shaah_push_run.
select cron.unschedule('shaah-push-reminders') where exists(select 1 from cron.job where jobname='shaah-push-reminders');
select cron.schedule('shaah-push-reminders','*/15 * * * *',$cron$
  select net.http_post(
    url:='https://llpyxktcfubhmthqujpa.supabase.co/functions/v1/push-reminders',
    headers:=jsonb_build_object('Content-Type','application/json','x-shaah-cron',(select decrypted_secret from vault.decrypted_secrets where name='shaah_push_cron_token')),
    body:='{}'::jsonb,timeout_milliseconds:=20000);
$cron$);
