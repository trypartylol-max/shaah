// Real pinned PostgREST response decoding, synthetic fetch/rows; no Auth or network.
const test = require('node:test');
const assert = require('node:assert/strict');
const { PostgrestClient } = require('@supabase/postgrest-js');
const { loadApp, serverRows, clone } = require('./helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');
const { syncBackend } = require('./sync-backend.cjs');
const owner = 'synthetic-A';
const endpoint = 'https://kpnwiwaiwnndpvtxkvva.supabase.co/rest/v1';
const conflict = { status: 409, body: { code: 'PT409', message: 'SHAAH_REVISION_CONFLICT', details: null, hint: null } };

function harness(respond) {
  const server = syncBackend(serverRows(locationFixture()).map(row => ({ ...row, user_id: owner })));
  const client = server.clientFor(owner), originalRpc = client.rpc;
  const requests = [];
  const transport = new PostgrestClient(endpoint, { fetch: async (url, init) => {
    assert.equal(String(url), endpoint + '/rpc/shaah_save_settings_v1');
    assert.equal(init.method, 'POST');
    const args = JSON.parse(init.body);
    assert.equal(args.p_data.owner_id, owner);
    requests.push(clone(args));
    const reply = await respond({ server, args, attempt: requests.length });
    if (reply) return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json' } });
    const result = await originalRpc('shaah_save_settings_v1', args);
    assert.equal(result.error, null);
    return new Response(JSON.stringify(result.data), { status: 200, headers: { 'content-type': 'application/json' } });
  } });
  client.rpc = (name, args) => transport.rpc(name, args);
  const app = loadApp(locationFixture(), { client });
  app.run(`USER={id:${JSON.stringify(owner)}};rowToState(${JSON.stringify(server.rows.find(row => row.date === 'settings'))});_cfgReady=true;`);
  return { server, app, requests, settings: () => server.rows.find(row => row.date === 'settings') };
}

test('decoded HTTP 409 / PT409 rereads the revision and preserves independent edits and historical points', async () => {
  const h = harness(({ server, attempt }) => {
    if (attempt !== 1) return null;
    const row = server.rows.find(row => row.date === 'settings');
    row.data._cfg.people[1].every = 99;
    row.settings_revision++;
    return conflict;
  });
  const history = clone(h.settings().data._cfg.log);
  h.app.run('personSet("pold01","name","Local edit after 409");');
  await h.app.run('flushCfgSaves()');
  assert.deepEqual(h.requests.map(args => args.p_expected_revision), [0, 1]);
  assert.equal(h.settings().data._cfg.people[0].name, 'Local edit after 409');
  assert.equal(h.settings().data._cfg.people[1].every, 99);
  assert.deepEqual(h.settings().data._cfg.log, history);
  assert.equal(h.app.read('calcScore("2026-09-16").score'), 7);
  assert.equal(h.app.read('calcScore("2026-10-08").score'), 27);
  assert.equal(h.server.writes.length, 1);
  assert.equal(h.server.writes[0].rpc, 'shaah_save_settings_v1');
  assert.equal(h.app.read('_cfgDraft'), null);
});

test('persistent HTTP 409 stops after four attempts and the saved draft can recover after reload', async () => {
  const h = harness(() => conflict);
  const before = clone(h.server.rows);
  h.app.run('personSetInactive("pold03",true);');
  await h.app.run('flushCfgSaves()');
  assert.equal(h.requests.length, 4);
  assert.equal(h.app.read('_cfgSaveFailed'), true);
  assert.equal(h.app.read('_cfgConflict'), false);
  assert.deepEqual(h.server.rows, before);
  assert.equal(h.server.writes.length, 0);
  const pendingKey = 'shaah_cfg_pending_' + owner;
  const pending = h.app.values.get(pendingKey);
  assert.ok(pending);
  const fresh = loadApp(locationFixture(), { client: h.server.clientFor(owner) });
  fresh.values.set(pendingKey, pending);
  fresh.run(`USER={id:${JSON.stringify(owner)}};rowToState(${JSON.stringify(h.settings())});`);
  assert.equal(fresh.read('personById("pold03").inactive'), true);
  fresh.run('_cfgReady=true;');
  await fresh.run('flushCfgSaves()');
  assert.equal(h.settings().data._cfg.people[2].inactive, true);
  assert.equal(h.server.writes.length, 1);
  assert.equal(fresh.read('_cfgDraft'), null);
  assert.equal(fresh.values.has(pendingKey), false);
});

test('HTTP 409 followed by a same-field conflict retains both versions for explicit resolution', async () => {
  const h = harness(({ server }) => {
    const row = server.rows.find(row => row.date === 'settings');
    row.data._cfg.people[0].name = 'Other writer';
    row.settings_revision++;
    return conflict;
  });
  h.app.run('personSet("pold01","name","My local draft");');
  await h.app.run('flushCfgSaves()');
  assert.equal(h.requests.length, 1);
  assert.equal(h.settings().data._cfg.people[0].name, 'Other writer');
  assert.equal(h.app.read('personById("pold01").name'), 'My local draft');
  assert.equal(h.app.read('_cfgConflict'), true);
  assert.equal(h.app.read('_cfgSaveFailed'), false);
  assert.ok(h.app.values.has('shaah_cfg_pending_' + owner));
  assert.equal(h.server.writes.length, 0);
});

test('an unrelated HTTP 500 does not enter the conflict retry loop or fall back to direct writes', async () => {
  const h = harness(() => ({ status: 500, body: { code: 'XX000', message: 'Synthetic server failure', details: null, hint: null } }));
  const before = clone(h.server.rows);
  h.app.run('personSetInactive("pold03",true);');
  await h.app.run('flushCfgSaves()');
  assert.equal(h.requests.length, 1);
  assert.equal(h.app.read('_cfgSaveFailed'), true);
  assert.equal(h.app.read('personById("pold03").inactive'), true);
  assert.ok(h.app.values.has('shaah_cfg_pending_' + owner));
  assert.deepEqual(h.server.rows, before);
  assert.equal(h.server.writes.length, 0);
});
