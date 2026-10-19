const { test } = require('node:test');
const assert = require('node:assert/strict');
const { apiClient } = require('../qa/supabase/api.cjs');
const cfg = { key: 'sb_publishable_synthetic', users: {
  A: { id: 'synthetic-A', email: 'qa-a@shaah.invalid', password: 'synthetic-only' }
} };

test('auth verifies the configured identity before exposing a session to QA app contexts', async () => {
  let calls = 0;
  const api = apiClient(cfg, async () => {
    calls++;
    return { ok: true, status: 200, json: async () => calls === 1
      ? { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_in: 3600, user: { id: 'synthetic-A' } }
      : { id: 'synthetic-A' } };
  });
  const session = await api.login('A');
  assert.equal(calls, 2);
  assert.equal(session.user.id, cfg.users.A.id);
  assert.ok(Number.isFinite(session.expires_at));
});

test('a different authenticated identity aborts without reading or seeding table rows', async () => {
  let calls = 0;
  const api = apiClient(cfg, async () => {
    calls++;
    return { ok: true, status: 200, json: async () => ({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', user: { id: 'someone-else' } }) };
  });
  await assert.rejects(api.login('A'), /QA_IDENTITY_MISMATCH/);
  assert.equal(calls, 1);
});

test('table accessibility and returned ownership are checked rather than assumed from a 200 response', async () => {
  for (const data of [{ message: 'not a table' }, [{ user_id: 'someone-else', date: 'settings' }]]) {
    const api = apiClient(cfg, async () => ({ ok: true, status: 200, json: async () => data }));
    await assert.rejects(api.rows('A', { access_token: 'synthetic-only' }));
  }
});

test('network errors are reported as a fixed code without echoing credentials', async () => {
  const api = apiClient(cfg, async () => { throw new Error('synthetic-password-and-token'); });
  await assert.rejects(api.login('A'), error => error.message === 'QA_NETWORK_UNAVAILABLE');
});
