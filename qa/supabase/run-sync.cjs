// Opt-in real QA runner. No production fallback, user provisioning, schema DDL or broad cleanup.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { configFromEnv, QA_REF, LOCAL_ORIGIN, temporaryHtml, installBrowserGuard, fileHash } = require('./guard.cjs');
const { apiClient, waitFor } = require('./api.cjs');
const { locationFixture } = require('../../tests/location-fixtures.cjs');
const { serverRows } = require('../../tests/helpers.cjs');

const root = path.resolve(__dirname, '../..');
let output = path.join(root, 'test-results', 'supabase-phase2');
const appFile = path.join(root, 'index.html');
const sourceHash = fileHash(appFile);
const report = { projectRef: QA_REF, sourceSha256: sourceHash, cases: [], remoteExecuted: false };

function saveReport() {
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(output, report.runId ? 'report.json' : 'readiness.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
}
function safeCode(error) {
  // Error messages from browser/SDK/network can contain URLs or credentials; never print them.
  return /^QA_[A-Z_]+$/.test(error.message) ? error.message : (error.name === 'AssertionError' ? 'ASSERTION_FAILED' : 'QA_STEP_FAILED');
}

async function run() {
  let config;
  try { config = configFromEnv(); } catch {
    report.status = 'blocked'; report.blocker = 'INVALID_QA_CONFIGURATION'; saveReport(); process.exitCode = 2; return;
  }
  if (!config.ready) {
    report.status = 'blocked'; report.missing = config.missing; saveReport();
    process.exitCode = 2; return;
  }
  if (!process.argv.includes('--run')) { report.status = 'configuration_ready_not_executed'; saveReport(); return; }
  report.runId = crypto.randomUUID();
  output = path.join(output, 'runs', report.runId);
  report.remoteExecuted = true;
  const api = apiClient(config);
  let browser;
  const pages = [];
  async function step(name, fn) {
    try { await fn(); report.cases.push({ name, status: 'passed' }); }
    catch (error) { report.cases.push({ name, status: 'failed', code: safeCode(error) }); }
    saveReport();
  }
  try {
    report.phase = 'authenticate_and_verify_QA_users';
    const sessions = { A: await api.login('A'), B: await api.login('B') };
    // Both users must be empty before ANY seed write; do not wipe existing data.
    report.phase = 'empty_accounts_preflight';
    for (const who of ['A', 'B']) if ((await api.rows(who, sessions[who])).length) throw new Error('QA_EXISTING_DATA_ABORT');
    report.cases.push({ name: 'identity_and_empty_accounts', status: 'passed' });
    const fixtures = {};
    for (const who of ['A', 'B']) {
      const data = locationFixture();
      data.config._qaRunId = report.runId;
      for (const person of data.config.people) person.name = `QA ${who} ${person.name}`;
      for (const day of Object.values(data.days)) day.note = `QA ${who} synthetic ${report.runId}`;
      fixtures[who] = serverRows(data);
    }
    // Persist a non-secret ownership manifest BEFORE the first synthetic write.
    fs.mkdirSync(output, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({
      projectRef: QA_REF, runId: report.runId, sourceSha256: sourceHash,
      fixtures: ['A', 'B'].flatMap(who => fixtures[who].map(row => ({ user_id: config.users[who].id, date: row.date }))),
      possibleRuntimeRows: ['A', 'B'].flatMap(who => ['cfgbak', '2026-10-16', '2099-01-01'].map(date => ({ user_id: config.users[who].id, date }))),
      cleanup: 'retained; no automatic deletion'
    }, null, 2) + '\n', { mode: 0o600 });
    report.phase = 'synthetic_seed';
    for (const who of ['A', 'B']) await api.seed(who, sessions[who], fixtures[who]);
    const originalHistory = (await api.rows('A', sessions.A)).filter(row => row.date !== 'settings');
    const html = temporaryHtml(fs.readFileSync(appFile, 'utf8'), config.key);
    const sdkRoot = path.dirname(require.resolve('@supabase/supabase-js'));
    const sdk = fs.readFileSync(path.join(sdkRoot, 'umd', 'supabase.js'), 'utf8');
    const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    const proxyServer = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    async function open(who) {
      report.phase = `browser_boot_${who}`;
      const context = await browser.newContext({ serviceWorkers: 'block', timezoneId: 'UTC', ...(proxyServer ? { proxy: { server: proxyServer } } : {}) });
      const events = [];
      const audit = { allowedHttp: 0, allowedWebSockets: 0, blocked: [], realtimeEvents: events };
      const transport = { offline: false };
      await installBrowserGuard(context, { html, sdk, session: sessions[who], userId: config.users[who].id, audit, transport });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('pageerror', () => errors.push('BROWSER_RUNTIME_ERROR'));
      page.on('websocket', socket => socket.on('framereceived', frame => {
        try {
          const message = JSON.parse(String(frame.payload));
          if (message.event === 'postgres_changes' && message.payload?.data?.table === 'day_logs') {
            const data = message.payload.data;
            events.push({ type: data.type, date: data.record?.date || data.old_record?.date });
          }
        } catch {}
      }));
      await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
      const state = { page, context, audit, transport, events, errors };
      pages.push(state);
      await page.goto(LOCAL_ORIGIN + '/');
      await page.waitForFunction(id => typeof USER !== 'undefined' && USER?.id === id && _cfgReady && _live, config.users[who].id);
      return state;
    }
    const a1 = await open('A'), a2 = await open('A'), b1 = await open('B');
    const aSettings = async () => (await api.rows('A', sessions.A)).find(row => row.date === 'settings').data._cfg;
    const aDay = async () => (await api.rows('A', sessions.A)).find(row => row.date === '2026-10-16');
    await step('actual_app_boot_and_realtime_subscription', async () => {
      assert.equal(await a1.page.evaluate(() => peopleList().length), 7);
      assert.equal(await a2.page.evaluate(() => peopleList().length), 7);
      assert.equal(await b1.page.evaluate(() => peopleList()[0].name.startsWith('QA B ')), true);
    });
    await step('rls_cross_account_crud_and_anonymous_read', async () => {
      const before = await api.rows('B', sessions.B);
      const filter = `/rest/v1/day_logs?user_id=eq.${config.users.B.id}`;
      const read = await api.request('GET', filter + '&select=date,data', sessions.A.access_token);
      assert.ok(!read.ok || (Array.isArray(read.data) && read.data.length === 0));
      const insert = await api.request('POST', '/rest/v1/day_logs', sessions.A.access_token,
        { user_id: config.users.B.id, date: '2099-01-01', data: { _note: 'QA ownership attack fixture' } });
      assert.equal(insert.ok, false);
      await api.request('PATCH', filter + '&date=eq.settings', sessions.A.access_token, { data: { _note: 'QA cross-update' } });
      await api.request('DELETE', filter + '&date=eq.settings', sessions.A.access_token);
      const ownership = await api.request('PATCH', `/rest/v1/day_logs?user_id=eq.${config.users.A.id}&date=eq.settings`, sessions.A.access_token, { user_id: config.users.B.id },{Prefer:'return=representation'});
      assert.ok(!ownership.ok||(Array.isArray(ownership.data)&&ownership.data.length===0));
      const anonymous = await api.request('GET', '/rest/v1/day_logs?select=date,data', null);
      assert.ok(!anonymous.ok || (Array.isArray(anonymous.data) && anonymous.data.length === 0));
      assert.deepEqual(await api.rows('B', sessions.B), before);
    });
    await step('late_session_switch_cannot_submit_A_settings_under_B_JWT',async()=>{
      const read=who=>api.request('GET','/rest/v1/day_logs?select=data,settings_revision&user_id=eq.'+config.users[who].id+'&date=eq.settings',sessions[who].access_token);
      const a=await read('A'),b=await read('B');assert.ok(a.ok&&b.ok);
      const attack=await api.request('POST','/rest/v1/rpc/shaah_save_settings_v1',sessions.B.access_token,{p_expected_revision:b.data[0].settings_revision,p_data:{owner_id:config.users.A.id,data:a.data[0].data}});
      assert.equal(attack.status,403);assert.equal(attack.data?.code,'42501');
      assert.deepEqual((await read('B')).data,b.data);assert.deepEqual((await read('A')).data,a.data);
    });
    await step('bulk_individual_and_inactive_sync_across_contexts', async () => {
      await a1.page.evaluate(() => { bulkPeopleToggle('pold01', true); bulkPeopleApply('pa', 'add'); });
      await waitFor(aSettings, cfg => cfg.people.find(p => p.id === 'pold01').locations.includes('pa'));
      await a2.page.waitForFunction(() => personById('pold01').locations.includes('pa'));
      await a1.page.evaluate(() => locationTogglePerson('pold02', 'il'));
      await a2.page.waitForFunction(() => !personById('pold02').locations.includes('il'));
      assert.deepEqual(await a2.page.evaluate(() => personById('pold02').locations), ['pa']);
      await a1.page.evaluate(() => personSetInactive('pold03', true));
      await a2.page.waitForFunction(() => personById('pold03').inactive === true);
      assert.equal(await b1.page.evaluate(() => personById('pold03').inactive), false);
      assert.ok(a2.events.some(event => event.type === 'UPDATE' && event.date === 'settings'));
    });
    await step('metadata_edits_preserve_remote_history_and_mode_points', async () => {
      assert.deepEqual((await api.rows('A', sessions.A)).filter(row => row.date !== 'settings' && row.date !== 'cfgbak'), originalHistory);
      assert.equal(await a2.page.evaluate(() => cfgForDate('2026-09-16').mode), 'vacation');
      assert.equal(await a2.page.evaluate(() => cfgForDate('2026-10-08').mode), 'work');
      assert.equal(await a2.page.evaluate(() => calcScore('2026-09-16').score), 7);
      assert.equal(await a2.page.evaluate(() => calcScore('2026-10-08').score), 27);
    });
    await step('fresh_context_reads_confirmed_metadata_without_cache', async () => {
      const fresh = await open('A');
      assert.equal(await fresh.page.evaluate(() => personById('pold03').inactive), true);
      assert.deepEqual(await fresh.page.evaluate(() => personById('pold02').locations), ['pa']);
      await fresh.context.close();
    });
    await step('day_insert_update_and_delete_sync_preserves_other_owner', async () => {
      await a1.page.evaluate(() => togglePerson('pold03', todayKey()));
      await waitFor(aDay, row => row?.data._people?.includes('pold03'));
      await a2.page.waitForFunction(() => getPeople(todayKey()).includes('pold03'));
      await a1.page.evaluate(() => setNote(todayKey(), 'QA synthetic day update'));
      await waitFor(aDay, row => row?.data._note === 'QA synthetic day update');
      await a2.page.waitForFunction(() => getNote(todayKey()) === 'QA synthetic day update');
      // B has its own same-date record: A's DELETE must not remove B's UI record.
      await b1.page.evaluate(() => setNote(todayKey(), 'QA B independent day'));
      await waitFor(() => api.rows('B', sessions.B), rows => rows.some(r => r.date === '2026-10-16' && r.data._note === 'QA B independent day'));
      await a1.page.evaluate(() => { const k=todayKey();setChecked(k,{});setSocial(k,{});setPeople(k,[]);_state[k].note='';_state[k]._daylog=[];persistDay(k); });
      await waitFor(aDay, row => !row);
      await a2.page.waitForFunction(() => !hasDayData(todayKey()));
      assert.ok(a2.events.some(event => event.type === 'DELETE' && event.date === '2026-10-16'));
      assert.equal(await b1.page.evaluate(() => getNote(todayKey())), 'QA B independent day');
    });
    await step('remote_configuration_backup', async () => {
      await waitFor(() => api.rows('A', sessions.A), rows => rows.some(row => row.date === 'cfgbak' && row.data._bak?.length));
    });
    await step('concurrent_stale_settings_must_not_silently_lose_edits', async () => {
      a2.transport.offline = true; await a2.context.setOffline(true);
      try {
        await a1.page.evaluate(() => personSet('pold01', 'name', 'QA A concurrent rename'));
        await waitFor(aSettings, cfg => cfg.people.find(p => p.id === 'pold01').name === 'QA A concurrent rename');
        await a2.page.evaluate(() => personSet('pold02', 'every', 99));
      } finally { a2.transport.offline = false; await a2.context.setOffline(false); }
      await a2.page.evaluate(() => saveCfg());
      const cfg = await waitFor(aSettings, cfg => cfg.people.find(p => p.id === 'pold02').every === 99);
      assert.equal(cfg.people.find(p => p.id === 'pold01').name, 'QA A concurrent rename');
    });
    await step('same_field_conflict_keeps_draft_until_explicit_resolution', async () => {
      a2.transport.offline = true; await a2.context.setOffline(true);
      try {
        await a1.page.evaluate(() => personSet('pold01', 'name', 'QA server conflict choice'));
        await waitFor(aSettings, cfg => cfg.people[0].name === 'QA server conflict choice');
        await a2.page.evaluate(() => personSet('pold01', 'name', 'QA local conflict choice'));
      } finally { a2.transport.offline = false; await a2.context.setOffline(false); }
      await a2.page.waitForFunction(() => _cfgFlushPromise === null);
      await a2.page.evaluate(() => flushCfgSaves());
      await a2.page.waitForFunction(() => _cfgConflict);
      assert.equal((await aSettings()).people[0].name, 'QA server conflict choice');
      await a2.page.reload();
      await a2.page.waitForFunction(() => _cfgReady && _cfgConflict);
      assert.equal(await a2.page.evaluate(() => personById('pold01').name), 'QA local conflict choice');
      a2.page.once('dialog', dialog => dialog.accept());
      await a2.page.getByRole('button', { name: 'Use saved settings', exact: true }).click();
      await a2.page.waitForFunction(() => !_cfgConflict && !_cfgDraft);
      assert.equal(await a2.page.evaluate(() => personById('pold01').name), 'QA server conflict choice');
    });
    await step('offline_queue_must_not_replay_A_data_as_B', async () => {
      a1.transport.offline = true; await a1.context.setOffline(true);
      try {
        await a1.page.evaluate(() => setNote(todayKey(), 'QA_A_PENDING_MUST_NOT_BECOME_B'));
        await a1.page.waitForFunction(() => _offlineQueue[todayKey()]?.data?._note === 'QA_A_PENDING_MUST_NOT_BECOME_B');
        await a1.page.evaluate(({ ref, session }) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session)), { ref: QA_REF, session: sessions.B });
        await a1.page.reload();
        await a1.page.waitForFunction(id => USER?.id === id, config.users.B.id);
      } finally { a1.transport.offline = false; await a1.context.setOffline(false); }
      await a1.page.waitForFunction(() => Object.keys(_offlineQueue).length === 0);
      assert.equal(await a1.page.evaluate(() => getNote(todayKey()) === 'QA_A_PENDING_MUST_NOT_BECOME_B'), false);
      assert.equal(await a1.page.evaluate(({ owner }) => JSON.parse(localStorage.getItem('shaah-offline-day-writes:' + owner))['2026-10-16'].data._note, { owner: config.users.A.id }), 'QA_A_PENDING_MUST_NOT_BECOME_B');
      const bRows = await api.rows('B', sessions.B);
      assert.equal(bRows.some(row => row.data._note === 'QA_A_PENDING_MUST_NOT_BECOME_B'), false);
      // Prove preservation as well as isolation: A can still submit its own queue.
      await a1.page.evaluate(({ ref, session }) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session)), { ref: QA_REF, session: sessions.A });
      await a1.page.reload();
      await a1.page.waitForFunction(id => USER?.id === id && _cfgReady, config.users.A.id);
      await waitFor(aDay, row => row?.data._note === 'QA_A_PENDING_MUST_NOT_BECOME_B');
    });
    report.status = report.cases.some(item => item.status === 'failed') ? 'failed' : 'passed';
  } catch (error) { report.status = 'blocked'; report.blocker = safeCode(error); }
  finally {
    if (browser) await browser.close();
    report.nodeRequests = api.audit.requests;
    report.browserAudit = pages.map(({ audit, events, errors }) => ({ ...audit, events, runtimeErrors: errors.length }));
    report.sourceUnchanged = fileHash(appFile) === sourceHash;
    if (!report.sourceUnchanged || report.browserAudit.some(a => a.runtimeErrors || a.blocked.some(x => x.production))) report.status = 'failed';
    report.fixturesRetained = true;
    saveReport();
    if (report.status !== 'passed') process.exitCode = report.status === 'blocked' ? 2 : 1;
  }
}

run().catch(() => { report.status = 'blocked'; report.blocker = 'QA_EXECUTOR_ERROR'; saveReport(); process.exitCode = 2; })
  .finally(() => { console.log(JSON.stringify(report, null, 2)); });
