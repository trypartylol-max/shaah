const test = require('node:test');
const assert = require('node:assert/strict');
const { publicPreflight } = require('../qa/supabase/public-preflight.cjs');
const { QA_ORIGIN } = require('../qa/supabase/guard.cjs');

test('public preflight never requests existing rows and redacts key and Auth response fields', async () => {
  const calls=[];
  const key='sb_publishable_synthetic_test_key';
  const report=await publicPreflight(key, async (url,options)=>{
    calls.push({url,options});
    return url.endsWith('/settings')
      ? new Response(JSON.stringify({external:{email:true},disable_signup:false,mailer_autoconfirm:false,privateFixture:'must_not_be_reported'}),{status:200})
      : new Response('permission denied',{status:403});
  });
  assert.equal(report.status,'passed');
  assert.equal(report.passwordProviderEnabled,true);
  assert.equal(report.authenticatedSyncExecuted,false);
  assert.deepEqual(calls.map(c=>c.url),[QA_ORIGIN+'/auth/v1/settings',QA_ORIGIN+'/rest/v1/day_logs?select=user_id&limit=0']);
  assert.ok(calls.every(c=>c.options.method==='GET'));
  assert.equal(JSON.stringify(report).includes(key),false);
  assert.equal(JSON.stringify(report).includes('must_not_be_reported'),false);
});

test('public preflight refuses privileged keys before any network request', async () => {
  let requests=0;
  await assert.rejects(publicPreflight('sb_secret_forbidden',async()=>{requests++;}));
  assert.equal(requests,0);
});

test('public preflight does not certify anonymous table access or invalid gateway keys', async () => {
  for (const [authStatus,restStatus] of [[200,200],[401,401],[503,403]]) {
    const report=await publicPreflight('sb_publishable_test',async url=>new Response('{}',{status:url.endsWith('/settings')?authStatus:restStatus}));
    assert.equal(report.status,'blocked');
    assert.equal(report.authenticatedSyncExecuted,false);
  }
});
