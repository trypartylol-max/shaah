// Sends the daily SHAAH reminder to the devices that are due (see public.shaah_push_run).
// Invoked every 15 minutes by pg_cron. JWT verification is off; the cron token is checked by the RPC.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

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
  const due = (data?.due ?? []) as Array<{ id: string; endpoint: string; p256dh: string; auth: string; lang: string }>;
  if (!due.length) return Response.json({ sent: 0, gone: 0, failed: 0 });
  webpush.setVapidDetails('https://trypartylol-max.github.io/shaah/', data.vapid_public, data.vapid_private);
  let sent = 0, gone = 0, failed = 0;
  await Promise.all(due.map(async (s) => {
    const payload = JSON.stringify({ title: 'SHAAH', body: TEXT[s.lang] ?? TEXT.en, url: './', tag: 'shaah-daily' });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3 * 3600, urgency: 'normal' });
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
