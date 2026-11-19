-- Icon number at midnight. The app computes, while open, how many habits the next day will start with and stores it
-- for this device (shaah_push_badge). Shortly after local midnight the push cron sends that number to the device, whose
-- service worker sets the icon badge (iPhone) or the pending-habits notification (Android). A device can have the daily
-- reminder, the badge, or both on the same browser subscription.
alter table public.push_subscriptions
  add column if not exists reminder_on boolean not null default true,
  add column if not exists badge_on boolean not null default false,
  add column if not exists badge_next_day date,
  add column if not exists badge_next_count integer check (badge_next_count between 0 and 999),
  add column if not exists badge_sent_on date;

-- Turning the reminder on keeps this device's badge state when the account is the same.
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

-- Turning the reminder off removes the device only when the badge does not use it.
create or replace function public.shaah_push_unsubscribe(p_endpoint text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.push_subscriptions set reminder_on=false,updated_at=now() where endpoint=p_endpoint and user_id=auth.uid() and badge_on;
  delete from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid() and not badge_on;
end $$;

-- Badge on/off for this device, and the number the next local day starts with.
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
revoke all on function public.shaah_push_badge(text,text,text,text,text,boolean,text,integer) from public, anon;
grant execute on function public.shaah_push_badge(text,text,text,text,text,boolean,text,integer) to authenticated;

-- Reminders as before (now only for devices with the reminder on), plus the midnight badge: devices whose stored next
-- day has begun locally, not sent yet that day, with something left to do, and that have not scored that day.
create or replace function public.shaah_push_run(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare due jsonb; badge jsonb;
begin
  if p_token is null or p_token is distinct from (select decrypted_secret from vault.decrypted_secrets where name='shaah_push_cron_token') then
    raise insufficient_privilege using message='Bad token';
  end if;
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
  return jsonb_build_object(
    'vapid_public',(select decrypted_secret from vault.decrypted_secrets where name='shaah_push_vapid_public'),
    'vapid_private',(select decrypted_secret from vault.decrypted_secrets where name='shaah_push_vapid_private'),
    'due',due,'badge',badge);
end $$;
revoke all on function public.shaah_push_run(text) from public, anon, authenticated;
grant execute on function public.shaah_push_run(text) to service_role;
