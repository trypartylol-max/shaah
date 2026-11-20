-- The midnight badge push shows a notification on iPhone (Apple requires one per push). Nobody wants that at 00:00,
-- so Apple endpoints get it from 08:00 local time; Android keeps the silent update shortly after midnight.
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
      -- iPhone must show a notification with every push, so it gets the new number at 08:00 instead of midnight.
      and (s.endpoint not like 'https://web.push.apple.com/%' or n.ts::time>='08:00')
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
