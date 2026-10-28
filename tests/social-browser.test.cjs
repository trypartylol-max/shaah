const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers.cjs');
const {control,editPerson}=require('./ui-helpers.cjs');
const { openApp } = require('./browser-helpers.cjs');

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }]
]) {
  test(`${name}: existing contacts render, can be tagged individually, and survive reload through the fake server`, async t => {
    const page = await openApp(t, fixture(), viewport);
    const originalHistory = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k]) => k !== todayKey()))));
    assert.equal(await page.locator('.w-name').count(), 3);
    await control(page,'click','socialCategoryToggle',['friends','2026-10-16'],'button').click();
    assert.deepEqual(await page.evaluate(() => getPeople(todayKey())), []);
    await page.getByRole('button',{name:'Ana Existing',exact:true}).click();
    await page.getByRole('button',{name:'Luis Existing',exact:true}).click();
    assert.deepEqual(await page.evaluate(() => getPeople(todayKey())), ['pold01', 'pold02']);
    assert.equal(await page.locator('.sd-pts').innerText(), '16/18%');
    await page.waitForFunction(() => window.__mockWrites.some(r => r.date === todayKey() && r.data._people.length === 2));
    await page.reload();
    await page.waitForFunction(() => _cfgReady && _live);
    await page.locator('.nav-btn[data-tab="social"]').click();
    assert.deepEqual(await page.evaluate(() => getPeople(todayKey())), ['pold01', 'pold02']);
    assert.equal(await page.locator('.sd-pts').innerText(), '16/18%');
    assert.equal(await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k]) => k !== todayKey())))), originalHistory);
  });
}

for (const [mode, maximum] of [['work', 18], ['vacation', 24]]) {
  test(`${mode}: zero-point activity shows zero consistently in Social, Today and the calculated score`, async t => {
    const data = fixture();
    data.config.travel.mode = mode;
    data.config.log[2].mode = mode;
    const page = await openApp(t, data);
    await control(page,'click','socialCategoryToggle',['strangers','2026-10-16'],'button').click();
    assert.equal(await page.locator('.sd-pts').innerText(), `0/${maximum}%`);
    assert.equal(await page.evaluate(() => calcScore(todayKey()).l3), 0);
    assert.equal(await control(page,'click','socialCategoryToggle',['strangers','2026-10-16'],'button').getAttribute('aria-pressed'),'true');
    await page.locator('.nav-btn[data-tab="today"]').click();
    assert.equal(await page.evaluate(() => calcScore(todayKey()).l3), 0);
    assert.ok((await page.locator('.sf-compact-combo').innerText()).includes('0/'+maximum));
    assert.equal(await control(page,'click','socialCategoryToggle',['strangers','2026-10-16'],'button').getAttribute('aria-pressed'),'true');
  });
}

test('old unpriced historical Social parts render their dated Work/Vacation split', async t => {
  const data = fixture();
  for (const era of data.config.log) era.subs = era.subs.map(({ id, label, icon }) => ({ id, label, icon }));
  const page = await openApp(t, data);
  for (const [date, expected] of [['2026-09-07', '6/18%'], ['2026-09-16', '8/24%'], ['2026-10-08', '6/18%']]) {
    await page.evaluate(date => { socialDay = date; render(); }, date);
    assert.equal(await page.locator('.sd-pts').innerText(), expected);
  }
});

test('changing a contact category and name in Social keeps its historical ID and recorded Social part', async t => {
  const page = await openApp(t);
  const before = await page.evaluate(() => JSON.stringify({ days: _state, log: CFG.log, score: calcScore('2026-09-16') }));
  await editPerson(page,'pold03');
  await page.locator('#sf-name').fill('Alex Renamed');
  await page.locator('#sf-sub').selectOption('friends');
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  assert.equal(await page.evaluate(() => JSON.stringify({ days: _state, log: CFG.log, score: calcScore('2026-09-16') })), before);
  assert.equal(await page.evaluate(() => personById('pold03').name), 'Alex Renamed');
});
