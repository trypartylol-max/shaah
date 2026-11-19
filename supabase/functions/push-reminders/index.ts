// Sends the daily SHAAH reminder, and the midnight icon number, to the devices that are due (see public.shaah_push_run).
// Invoked every 5 minutes by pg_cron. JWT verification is off; the cron token is checked by the RPC.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

// iOS already prints "from SHAAH" under the title, so the title says what the notification is about.
const TITLE: Record<string, string> = {
  en: "Today's plan",
  es: 'Tu plan de hoy',
  he: 'התוכנית של היום',
};
const TEXT: Record<string, string> = {
  en: 'Your day is still open. One small action is enough.',
  es: 'Tu día sigue abierto. Basta con una acción pequeña.',
  he: 'היום שלך עדיין פתוח. מספיק צעד קטן אחד.',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const token = req.headers.get('x-shaah-cron') ?? '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('shaah_push_run', { p_token: token });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  type Due = { id: string; endpoint: string; p256dh: string; auth: string; lang: string; count?: number };
  const due = (data?.due ?? []) as Due[];
  const badge = (data?.badge ?? []) as Due[];
  if (!due.length && !badge.length) return Response.json({ sent: 0, gone: 0, failed: 0 });
  webpush.setVapidDetails('https://trypartylol-max.github.io/shaah/', data.vapid_public, data.vapid_private);
  let sent = 0, gone = 0, failed = 0;
  const jobs = [
    ...due.map((s) => ({ s, ttl: 3 * 3600, payload: JSON.stringify({ title: TITLE[s.lang] ?? TITLE.en, body: TEXT[s.lang] ?? TEXT.en, url: './', tag: 'shaah-daily' }) })),
    // The service worker turns this into the icon number (iPhone) or the pending-habits notification (Android).
    ...badge.map((s) => ({ s, ttl: 6 * 3600, payload: JSON.stringify({ kind: 'badge', count: s.count ?? 0, lang: s.lang }) })),
  ];
  await Promise.all(jobs.map(async ({ s, ttl, payload }) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: ttl, urgency: 'normal' });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // The browser dropped this subscription: forget it so it is not tried again.
      if (code === 404 || code === 410) { gone++; await sb.from('push_subscriptions').delete().eq('id', s.id); }
      else failed++;
    }
  }));
  return Response.json({ sent, gone, failed });
});
