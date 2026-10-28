const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers.cjs');
const {openBulk,editPerson,socialPage}=require('./ui-helpers.cjs');
const { openApp } = require('./browser-helpers.cjs');

for (const [kind, suffix, expected] of [
  ['query text', '?error_description=' + encodeURIComponent('<b>Café & 50% + balance</b>'), '<b>Café & 50% + balance</b>'],
  ['hash text', '#error_description=' + encodeURIComponent('<em>Reintentar 日本語</em>'), '<em>Reintentar 日本語</em>'],
  ['incomplete percent', '?error_description=100%', '100%'],
  ['encoded percent', '?error_description=Access%20denied%20%2520', 'Access denied %20']
]) {
  test(`login handles ${kind} as readable text and still boots`, async t => {
    const page = await openApp(t, fixture(), { width: 390, height: 844 }, { loggedOut: true, url: 'http://shaah.test/' + suffix });
    assert.equal(await page.evaluate(() => AUTH_ERR), expected);
    assert.ok((await page.locator('#scroll').innerText()).includes(expected));
    assert.equal(await page.locator('#scroll b, #scroll em').count(), 0, 'Markup remains text');
    assert.equal(await page.getByRole('button', { name: 'Continue with Google' }).count(), 1);
    assert.equal(await page.evaluate(() => window.__mockWrites.length), 0);
  });
}

test('stored contact IDs with punctuation still support edits, bulk groups, tagging and reload', async t => {
  const data = fixture();
  const id = "person O'Neil & <id> \" \\ 雪";
  data.config.people[0].id = id;
  data.config.people[0].name = '<b>Ana & Bo</b>';
  data.config.locationGroups = [{ id: "group O'Neil & <id>", name: 'Local & nearby' }];
  data.config.selectedLocation = 'all';
  const page = await openApp(t, data);
  const before = await page.evaluate(() => JSON.stringify({ days: Object.fromEntries(Object.entries(_state).filter(([k]) => k !== todayKey())), scores: Object.keys(_state).filter(k => k !== todayKey()).map(k => calcScore(k)) }));
  await editPerson(page,id);
  assert.equal(await page.locator('#sf-name').inputValue(),'<b>Ana & Bo</b>');
  await page.locator('#sf-name').fill('Ana renamed');
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  assert.equal(await page.evaluate(id => personById(id).name, id), 'Ana renamed');
  await openBulk(page);
  const box = page.locator('input[data-ui-change="bulkPeopleToggle"]').first();
  await box.check();
  await page.getByRole('button', { name: '+ Local & nearby', exact: true }).click();
  assert.deepEqual(await page.evaluate(id => personById(id).locations, id), [data.config.locationGroups[0].id]);
  await socialPage(page);
  await page.getByRole('button',{name:'Registrar encuentro con Ana renamed',exact:true}).click();
  assert.deepEqual(await page.evaluate(() => getPeople(todayKey())), [id]);
  assert.equal(await page.locator('.sd-pts').innerText(), '16/18%');
  const unchanged = await page.evaluate(() => JSON.stringify({ days: Object.fromEntries(Object.entries(_state).filter(([k]) => k !== todayKey())), scores: Object.keys(_state).filter(k => k !== todayKey()).map(k => calcScore(k)) }));
  assert.equal(unchanged, before);
  await page.waitForFunction(id => window.__mockWrites.some(r => r.date === 'settings' && r.data._cfg.people.some(p => p.id === id && p.name === 'Ana renamed')), id);
  await page.reload();
  await page.waitForFunction(() => _cfgReady && _live);
  assert.equal(await page.evaluate(id => personById(id).name, id), 'Ana renamed');
});

test('people import displays ordinary markup as text and keeps the imported identifier editable', async t => {
  const page = await openApp(t);
  const id = "import O'Neil & <id> \\ 日本語";
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  await page.evaluate(id => { importApply({ people: [{ id, name: '<em>Imported & new</em>', sub: 'friends', every: 14 }] }); openSettings(); }, id);
  assert.equal(dialogs.length, 2);
  assert.equal(await page.locator('#scroll em').count(), 0);
  await editPerson(page,id);
  assert.equal(await page.locator('#sf-name').inputValue(),'<em>Imported & new</em>');
  await page.locator('#sf-name').fill('Imported renamed');
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  assert.equal(await page.evaluate(id => personById(id).name, id), 'Imported renamed');
});

test('stored routine colors, Next text and Day Log IDs stay data while controls remain usable', async t => {
  const page = await openApp(t);
  await page.evaluate(() => {
    const id = "routine O'Neil & <id> \"";
    CFG.h[id] = { l: '<em>Routine</em>', i: 'R', p: 5, lv: 1, routine: true, on: true };
    CFG.order.push(id);
    CFG.routines[id] = { label: '<b>Routine</b>', icon: '<i>R</i>', col: 'red;position:fixed',
      steps: [{ label: 'First', icon: '1', dur: 5 }, { label: '<b>Next & rest</b>', icon: '<i>2</i>', dur: 2 }] };
    applyCfg(); startRoutine(id);
  });
  assert.ok((await page.locator('#cr-dialog').innerText()).includes('<b>Next & rest</b>'));
  assert.ok((await page.locator('#cr-dialog').innerText()).includes('<i>2</i>'));
  assert.equal(await page.locator('#cr-dialog em, #cr-dialog i').count(),0);
  assert.equal(await page.locator('#cr-dialog b').filter({hasText:'Next & rest'}).count(),0);
  assert.equal(await page.evaluate(() => ROUTINES[routineId].col), '#9090aa');
  await page.evaluate(() => {exitRoutine();setTab('social');});
  for (const style of ['circle', 'slim', 'chips']) {
    await page.evaluate(style => { CFG.pill=style; render(); }, style);
    const id = "routine O'Neil & <id> \"";
    assert.equal(await page.locator('#resume b[id]').getAttribute('id'), 'resume-clock-' + id);
    assert.equal(await page.locator('#resume id, #resume em, #resume i').count(), 0);
    await page.locator('#resume button.cr-mini').first().click();
    assert.equal(await page.evaluate(() => routineId), id);
    await page.evaluate(() => exitRoutine());
  }
  await page.evaluate(() => { exitRoutine(); setTab('log'); _state[todayKey()]._daylog = [{
    id: "event O'Neil & <id> \\ 雪", title: '<b>Lunch & coffee</b>', type: 'manual',
    start: todayKey() + 'T12:00:00Z', end: todayKey() + 'T12:30:00Z'
  }]; render(); });
  await page.locator('.logdesk-row').first().click();
  assert.equal(await page.locator('#logPanelName').inputValue(), '<b>Lunch & coffee</b>');
  await page.locator('#logPanelName').fill('Lunch edited');
  await page.getByRole('button', { name: 'SAVE', exact: true }).click();
  assert.equal(await page.evaluate(() => dayLogEvents(todayKey())[0].title), 'Lunch edited');
  await page.evaluate(() => dayLogEdit(dayLogEvents(todayKey())[0].id));
  await page.locator('#daylogEditName').fill('Lunch modal edited');
  await page.locator('#dayLogEditModal').getByRole('button', { name: 'SAVE', exact: true }).click();
  assert.equal(await page.evaluate(() => dayLogEvents(todayKey())[0].title), 'Lunch modal edited');
});

test('malformed stored routine definitions do not break startup or rewrite metadata', async t => {
  const data = fixture();
  data.config.h.custom={l:'Custom',p:5,lv:1,on:true,routine:true};data.config.order.push('custom');
  data.config.routines = { custom: null, empty: { steps: {} }, invalid: { steps: [null] } };
  const before = data.config.routines;
  const page = await openApp(t, data);
  await page.locator('.nav-btn[data-tab="today"]').click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(['custom','empty','invalid'].map(id=>[id,CFG.routines[id]]))), before);
  assert.equal(await page.evaluate(() => ['custom','empty','invalid'].some(id=>Object.hasOwn(ROUTINES,id))), false);
});

test('adopting valid settings without a currently open routine keeps the app usable and its saved session', async t => {
  const page = await openApp(t);
  await page.evaluate(() => {
    CFG.h.custom={l:'Routine',i:'R',p:5,lv:1,routine:true};CFG.order.push('custom');
    CFG.routines.custom={label:'Routine',col:'#abc8',steps:[{label:'First',dur:3}]};
    applyCfg();startRoutine('custom');
  });
  assert.equal(await page.evaluate(() => ROUTINES.custom.col), '#aabbcc');
  await page.evaluate(() => { delete CFG.h.custom;CFG.order=CFG.order.filter(id=>id!=='custom');delete CFG.routines.custom;applyCfg();render(); });
  assert.equal(await page.locator('.nav-btn[data-tab="today"]').isVisible(), true);
  assert.equal(await page.evaluate(() => routineId), null);
  assert.deepEqual(await page.evaluate(() => liveSessions()), []);
  assert.equal(await page.evaluate(() => !!sessions.custom), true, 'Keep the stored session for recovery');
});
