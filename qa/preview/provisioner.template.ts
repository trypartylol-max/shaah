// Temporary SHAAH-TEST-only Auth Admin API provisioner. No SQL or data access.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const CONFIG = __QA_PROVISION_CONFIG__;
const ORIGIN = 'https://kpnwiwaiwnndpvtxkvva.supabase.co';
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type':'application/json','Cache-Control':'no-store'}
});
let busy = false;
Deno.serve(async request => {
  if (request.method !== 'POST') return reply(405,{error:'METHOD_NOT_ALLOWED'});
  if (Date.now() > CONFIG.expiresAt) return reply(410,{error:'PROVISIONING_EXPIRED'});
  if ((Deno.env.get('SUPABASE_URL') || '').replace(/\/$/,'') !== ORIGIN) return reply(403,{error:'WRONG_PROJECT'});
  const proof = request.headers.get('x-shaah-provision-proof') || '';
  if (!/^[a-f0-9]{64}$/.test(proof)) return reply(401,{error:'UNAUTHORIZED'});
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(proof)));
  const expected = Uint8Array.from(CONFIG.proofHash.match(/../g)!, (h: string) => parseInt(h,16));
  let mismatch = 0; for(let i=0;i<32;i++) mismatch |= digest[i] ^ expected[i];
  if (mismatch) return reply(401,{error:'UNAUTHORIZED'});
  if (busy) return reply(409,{error:'PROVISIONING_IN_PROGRESS'});
  let input;
  try { input = await request.json(); } catch { return reply(400,{error:'INVALID_REQUEST'}); }
  for(const who of ['A','B']) if(!/^[A-Za-z0-9!_-]{48,72}$/.test(input.passwords?.[who] || '')) return reply(400,{error:'INVALID_PASSWORD_INPUT'});
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) return reply(503,{error:'ADMIN_RUNTIME_UNAVAILABLE'});
  const admin = createClient(ORIGIN,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  busy = true;
  const users: Record<string,{id:string}> = {};
  try {
    for(const who of ['A','B']) {
      const {data,error} = await admin.auth.admin.createUser({
        email:CONFIG.emails[who],password:input.passwords[who],email_confirm:true,
        app_metadata:{shaah_qa:true,shaah_qa_batch:CONFIG.tag}
      });
      if(error || !data.user?.id || data.user.email !== CONFIG.emails[who]) return reply(502,{error:'QA_PROVISION_FAILED',created:users});
      users[who] = {id:data.user.id};
    }
    return reply(200,{projectRef:'kpnwiwaiwnndpvtxkvva',users});
  } catch { return reply(502,{error:'QA_PROVISION_FAILED',created:users}); }
  finally { busy = false; }
});
