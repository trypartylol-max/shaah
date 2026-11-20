// Deletes the signed-in account and all its data (Settings → Delete account, and delete-account.html).
// JWT verification is on: only the account itself can delete itself, identified by its own access token.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const ORIGINS = ['https://trypartylol-max.github.io', 'http://localhost:8080', 'http://localhost:8081'];
function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: who, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !who?.user?.id) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { body = {}; }
  // The client must send the confirmation explicitly, so a stray request cannot delete an account.
  if (body.confirm !== 'DELETE') return Response.json({ error: 'Confirmation required' }, { status: 400, headers });
  const id = who.user.id;
  const { data: removed, error: dataError } = await admin.rpc('shaah_delete_account_data', { p_user: id });
  if (dataError) return Response.json({ error: 'Could not delete data' }, { status: 500, headers });
  const { error: userError } = await admin.auth.admin.deleteUser(id);
  if (userError) return Response.json({ error: 'Could not delete account' }, { status: 500, headers });
  return Response.json({ deleted: true, removed }, { headers });
});
