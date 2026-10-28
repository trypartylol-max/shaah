const { test } = require('node:test');
const assert = require('node:assert/strict');
const { htmlPath } = require('./helpers.cjs');
// Exercise the actual artifact and its SRI even when other tests use SHAAH_SOURCE.
const html = require('node:fs').readFileSync(htmlPath, 'utf8');
const { QA_REF, QA_ORIGIN, PRODUCTION_REF, REQUIRED, assertQaUrl, validateKey,
  configFromEnv, guardedFetch, temporaryHtml, installBrowserGuard } = require('../qa/supabase/guard.cjs');

const jwt = (role, ref = QA_REF) => ['header', Buffer.from(JSON.stringify({ role, ref })).toString('base64url'), 'signature'].join('.');
const credentials = () => ({
  SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
  SHAAH_TEST_USER_A_ID: '11111111-1111-4111-8111-111111111111', SHAAH_TEST_USER_A_EMAIL: 'qa-a@shaah.invalid', SHAAH_TEST_USER_A_PASSWORD: 'synthetic-A-only',
  SHAAH_TEST_USER_B_ID: '22222222-2222-4222-8222-222222222222', SHAAH_TEST_USER_B_EMAIL: 'qa-b@shaah.invalid', SHAAH_TEST_USER_B_PASSWORD: 'synthetic-B-only'
});

test('QA configuration defaults only to the explicitly authorized project', () => {
  const result = configFromEnv(credentials());
  assert.equal(result.ready, true);
  assert.equal(result.origin, QA_ORIGIN);
  assert.equal(result.projectRef, QA_REF);
});

test('missing credentials stop execution without substituting embedded production values', () => {
  assert.deepEqual(configFromEnv({}), { ready: false, projectRef: QA_REF, missing: REQUIRED });
  for (const field of REQUIRED) {
    const env = credentials(); delete env[field];
    assert.deepEqual(configFromEnv(env).missing, [field]);
  }
});

for (const value of [`https://${PRODUCTION_REF}.supabase.co`, 'https://other.supabase.co', 'http://kpnwiwaiwnndpvtxkvva.supabase.co']) {
  test(`reject a project URL outside the QA allowlist: ${new URL(value).hostname}`, () => {
    assert.throws(() => configFromEnv({ ...credentials(), SHAAH_TEST_SUPABASE_URL: value }), /mismatch/);
  });
}

test('reject a mismatched reference and reject duplicate test identities', () => {
  assert.throws(() => configFromEnv({ ...credentials(), SHAAH_TEST_PROJECT_REF: PRODUCTION_REF }));
  const env = credentials(); env.SHAAH_TEST_USER_B_ID = env.SHAAH_TEST_USER_A_ID;
  assert.throws(() => configFromEnv(env), /distinct/);
});

test('accept public QA keys; reject service-role, secret and another project keys', () => {
  for (const key of [jwt('anon'), 'sb_publishable_synthetic']) assert.doesNotThrow(() => validateKey(key));
  for (const key of [jwt('service_role'), jwt('anon', PRODUCTION_REF), 'sb_secret_synthetic', 'malformed', 'sb_publishable_</script>']) {
    assert.throws(() => validateKey(key));
  }
});

test('Node HTTP guard rejects production, spoofed hosts, credentials, non-HTTPS and admin endpoints before fetch', async () => {
  let requests = 0;
  const send = guardedFetch(async () => { requests++; return {}; });
  for (const url of [
    `https://${PRODUCTION_REF}.supabase.co/auth/v1/settings`,
    QA_ORIGIN + '.evil.example/rest/v1/day_logs',
    QA_ORIGIN.replace('https:', 'http:') + '/rest/v1/day_logs',
    QA_ORIGIN.replace('https://', 'https://user:password@') + '/rest/v1/day_logs',
    QA_ORIGIN + '/auth/v1/admin/users', QA_ORIGIN + '/rest/v1/other_table', QA_ORIGIN + '/rest/v1/day_logs#fragment'
  ]) await assert.rejects(send(url));
  assert.equal(requests, 0);
});

test('Node HTTP guard forbids redirects even if the caller requests following them', async () => {
  let received;
  const send = guardedFetch(async (url, options) => { received = { url, options }; return { status: 401 }; });
  await send(QA_ORIGIN + '/auth/v1/settings', { redirect: 'follow' });
  assert.equal(received.options.redirect, 'error');
});

test('WebSocket guard accepts only the QA Realtime endpoint', () => {
  assert.doesNotThrow(() => assertQaUrl(QA_ORIGIN.replace('https:', 'wss:') + '/realtime/v1/websocket?vsn=1.0.0', true));
  for (const url of [`wss://${PRODUCTION_REF}.supabase.co/realtime/v1/websocket`, 'ws://kpnwiwaiwnndpvtxkvva.supabase.co/realtime/v1/websocket', QA_ORIGIN.replace('https:', 'wss:') + '/admin']) {
    assert.throws(() => assertQaUrl(url, true));
  }
});

test('temporary QA HTML changes endpoint/key/SDK locally without mutating source', () => {
  const before = html;
  const result = temporaryHtml(html, 'sb_publishable_synthetic');
  assert.equal(html, before);
  assert.ok(result.includes(QA_ORIGIN));
  assert.ok(result.includes('<script src="/sdk.js"></script>'));
  assert.equal(result.includes(PRODUCTION_REF), false);
  assert.ok(result.includes('SUPABASE_URL!=='+JSON.stringify(QA_ORIGIN)), 'Known gate targets only the isolated QA endpoint');
  assert.throws(() => temporaryHtml('<html>Unexpected</html>', 'sb_publishable_synthetic'));
});

test('browser routes abort forbidden HTTP, redirects and WebSockets before forwarding', async () => {
  let http, websocket, forwarded = 0, aborted = 0, closed = 0;
  const audit = { blocked: [], allowedHttp: 0, allowedWebSockets: 0 };
  const context = { on() {}, route: async (_, fn) => { http = fn; }, routeWebSocket: async (_, fn) => { websocket = fn; } };
  await installBrowserGuard(context, { html: '', sdk: '', audit });
  await http({ request: () => ({ url: () => `https://${PRODUCTION_REF}.supabase.co/rest/v1/day_logs` }),
    fetch: () => { forwarded++; }, abort: () => { aborted++; } });
  await http({ request: () => ({ url: () => QA_ORIGIN + '/rest/v1/day_logs' }),
    fetch: async options => { assert.equal(options.maxRedirects, 0); return { status: () => 302 }; }, abort: () => { aborted++; } });
  websocket({ url: () => `wss://${PRODUCTION_REF}.supabase.co/realtime/v1/websocket`,
    connectToServer: () => { forwarded++; }, close: () => { closed++; } });
  assert.equal(forwarded, 0);
  assert.equal(aborted, 2);
  assert.equal(closed, 1);
});

test('browser transport failures are counted without surfacing request secrets',async()=>{
  let http,aborted=0;const audit={blocked:[],allowedHttp:0,allowedWebSockets:0};
  const context={on(){},route:async(_,fn)=>http=fn,routeWebSocket:async()=>{}};
  await installBrowserGuard(context,{html:'',sdk:'',audit});
  await http({request:()=>({url:()=>QA_ORIGIN+'/rest/v1/day_logs'}),fetch:async()=>{throw new Error('synthetic-secret-value');},abort:async()=>{aborted++;}});
  assert.equal(aborted,1);assert.equal(audit.httpTransportErrors,1);assert.equal(JSON.stringify(audit).includes('synthetic-secret-value'),false);
});
test('QA fixture retargets only the known migration gate and rejects unexpected production references',()=>{
 const result=temporaryHtml(html,'sb_publishable_synthetic');
 assert.ok(result.includes('SUPABASE_URL!=='+JSON.stringify(QA_ORIGIN)));
 assert.throws(()=>temporaryHtml(html+`<script>window.unexpected="https://${PRODUCTION_REF}.supabase.co"</script>`,'sb_publishable_synthetic'),/Production reference remains/);
});
