const fs = require('node:fs');
const crypto = require('node:crypto');

const QA_REF = 'kpnwiwaiwnndpvtxkvva';
const QA_ORIGIN = `https://${QA_REF}.supabase.co`;
const PRODUCTION_REF = 'llpyxktcfubhmthqujpa';
const LOCAL_ORIGIN = 'http://127.0.0.1:4179';
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED = ['SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY', ...['A', 'B'].flatMap(who =>
  ['ID', 'EMAIL', 'PASSWORD'].map(field => `SHAAH_TEST_USER_${who}_${field}`))];

function assertQaUrl(input, websocket = false) {
  const url = new URL(input);
  const origin = websocket ? QA_ORIGIN.replace('https:', 'wss:') : QA_ORIGIN;
  if (url.origin !== origin || url.username || url.password || url.hash) throw new Error('QA target blocked');
  const allowed = websocket ? ['/realtime/v1/websocket'] : [
    '/auth/v1/settings', '/auth/v1/token', '/auth/v1/user', '/auth/v1/logout', '/rest/v1/day_logs',
    '/rest/v1/rpc/shaah_save_settings_v1', '/rest/v1/rpc/shaah_settings_backup_v1', '/rest/v1/rpc/shaah_restore_settings_v1'
  ];
  if (!allowed.includes(url.pathname)) throw new Error('QA endpoint blocked');
  return url;
}

function validateKey(key) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return;
  try {
    const parts = key.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (parts.length === 3 && payload.role === 'anon' && payload.ref === QA_REF) return;
  } catch {}
  throw new Error('Use only a publishable/anon key for SHAAH-TEST');
}

function configFromEnv(env = process.env) {
  if ((env.SHAAH_TEST_SUPABASE_URL || QA_ORIGIN) !== QA_ORIGIN ||
      (env.SHAAH_TEST_PROJECT_REF || QA_REF) !== QA_REF) throw new Error('QA project mismatch');
  const missing = REQUIRED.filter(name => !env[name]);
  if (missing.length) return { ready: false, projectRef: QA_REF, missing };
  const key = env.SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY;
  validateKey(key);
  const users = Object.fromEntries(['A', 'B'].map(who => {
    const prefix = `SHAAH_TEST_USER_${who}_`;
    const id = env[prefix + 'ID'];
    const email = env[prefix + 'EMAIL'];
    const password = env[prefix + 'PASSWORD'];
    if (!ID_RE.test(id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) throw new Error('Invalid QA user configuration');
    return [who, { id, email, password }];
  }));
  if (users.A.id === users.B.id || users.A.email.toLowerCase() === users.B.email.toLowerCase()) throw new Error('QA users must be distinct');
  return { ready: true, projectRef: QA_REF, origin: QA_ORIGIN, key, users };
}

function guardedFetch(fetchImpl = fetch) {
  return async (url, options = {}) => {
    assertQaUrl(url);
    return fetchImpl(url, { ...options, redirect: 'error', signal: options.signal || AbortSignal.timeout(15000) });
  };
}

function temporaryHtml(source, key) {
  validateKey(key);
  const replacements = [
    [/const SUPABASE_URL="[^"]*";/g, `const SUPABASE_URL=${JSON.stringify(QA_ORIGIN)};`],
    [/const SUPABASE_KEY="[^"]*";/g, `const SUPABASE_KEY=${JSON.stringify(key)};`],
    [/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.118\.0(?:\/dist\/umd\/supabase\.js)?"(?: integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous")?><\/script>/g, '<script src="/sdk.js"></script>']
  ];
  let html = source;
  for (const [pattern, replacement] of replacements) {
    if ([...html.matchAll(pattern)].length !== 1) throw new Error('Unexpected application source; abort');
    html = html.replace(pattern, replacement);
  }
  if (html.includes(PRODUCTION_REF)) throw new Error('Production reference remains in QA HTML');
  return html;
}

function fileHash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

async function installBrowserGuard(context, { html, sdk, session, userId, audit, transport = { offline: false }, nativeQaWebSockets = false }) {
  const bridges=new Set();
  let offline=transport.offline;
  Object.defineProperty(transport,'offline',{configurable:true,get:()=>offline,set:value=>{offline=!!value;if(offline)for(const socket of bridges)socket.close();}});
  context.on('close',()=>{for(const socket of bridges)socket.terminate();bridges.clear();});
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (url === LOCAL_ORIGIN + '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (url === LOCAL_ORIGIN + '/sdk.js') return route.fulfill({ contentType: 'application/javascript', body: sdk });
    try { assertQaUrl(url); } catch {
      audit.blocked.push({ type: 'http', production: new URL(url).hostname === `${PRODUCTION_REF}.supabase.co` });
      return route.abort('blockedbyclient');
    }
    if (transport.offline) return route.abort('internetdisconnected');
    audit.allowedHttp++;
    let response;
    try{response=await route.fetch({maxRedirects:0,timeout:15000});}
    catch{audit.httpTransportErrors=(audit.httpTransportErrors||0)+1;return route.abort('failed').catch(()=>{});}
    if (response.status() >= 300 && response.status() < 400) {
      audit.blocked.push({ type: 'redirect', production: false });
      return route.abort('blockedbyclient');
    }
    return route.fulfill({ response }).catch(()=>{});
  });
  const websocketMatch=nativeQaWebSockets?url=>{
    try{assertQaUrl(String(url),true);if(transport.offline)return true;audit.allowedWebSockets++;return false;}catch{return true;}
  }:'**/*';
  await context.routeWebSocket(websocketMatch, ws => {
    try { assertQaUrl(ws.url(), true); } catch {
      audit.blocked.push({ type: 'websocket', production: new URL(ws.url()).hostname === `${PRODUCTION_REF}.supabase.co` });
      return ws.close({ code: 1008, reason: 'QA target blocked' });
    }
    if (transport.offline) return ws.close({ code: 1001, reason: 'QA offline simulation' });
    audit.allowedWebSockets++;
    const socket=require('./websocket-bridge.cjs').bridgeQaWebSocket(ws,{audit,transport});
    if(socket){bridges.add(socket);socket.on('close',()=>bridges.delete(socket));}
  });
  if (session) {
    await context.addInitScript(({ session, userId, ref }) => {
      if (location.origin !== 'http://127.0.0.1:4179') return;
      // Do not reinstate the original session on reload after a deliberate QA account switch.
      if (!localStorage.getItem('shaah_qa_initialized')) {
        localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
        localStorage.setItem(`shaah_tour_${userId}`, '1');
        localStorage.setItem('shaah_qa_initialized', '1');
      }
    }, { session, userId, ref: QA_REF });
  }
}

module.exports = { QA_REF, QA_ORIGIN, PRODUCTION_REF, LOCAL_ORIGIN, REQUIRED,
  assertQaUrl, validateKey, configFromEnv, guardedFetch, temporaryHtml, installBrowserGuard, fileHash };
