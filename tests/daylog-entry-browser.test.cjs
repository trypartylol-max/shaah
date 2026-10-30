const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./browser-helpers.cjs');

for (const width of [390, 1440]) {
  test(`Day Log first activity survives save, edit, reload and deletion at ${width}px`, async t => {
    const page = await openApp(t, undefined, { width, height: 1000 });
    await page.evaluate(() => {
      _state[todayKey()] = { checks: {}, social: blankSocial(), people: [], note: '', _daylog: [] };
      window.__dayLogPanelMode = 'edit';
      window.__dayLogSelectedId = null;
      setTab('log');
    });
    await page.locator('#logPanelName').fill('Synthetic first activity');
    await page.locator('#logPanelStart').fill('10:00');
    await page.locator('#logPanelEnd').fill('11:00');
    await page.getByRole('button', { name: 'ADD ACTIVITY', exact: true }).click();
    assert.equal(await page.evaluate(() => dayLogEvents(todayKey()).length), 1);
    await page.locator('#logPanelName').fill('Synthetic edited activity');
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    await page.waitForFunction(() => __mockWrites.some(r => r.date === todayKey() && r.data._daylog?.[0]?.title === 'Synthetic edited activity'));
    await page.reload();
    await page.waitForFunction(() => _cfgReady && _live);
    await page.evaluate(() => setTab('log'));
    assert.equal(await page.locator('#logPanelName').inputValue(), 'Synthetic edited activity');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'DELETE', exact: true }).click();
    assert.equal(await page.evaluate(() => dayLogEvents(todayKey()).length), 0);
    await page.locator('#logPanelName').fill('Synthetic second activity');
    await page.locator('#logPanelStart').fill('12:00');
    await page.locator('#logPanelEnd').fill('13:00');
    await page.getByRole('button', { name: 'ADD ACTIVITY', exact: true }).click();
    assert.equal(await page.evaluate(() => dayLogEvents(todayKey()).length), 1);
  });

  test(`Today Log opens a new activity or selects the running event at ${width}px`, async t => {
    const page = await openApp(t, undefined, { width, height: 1000 });
    await page.evaluate(() => {
      _state[todayKey()] = { checks: {}, social: blankSocial(), people: [], note: '', _daylog: [] };
      dayLogAdd('Synthetic finished', todayKey() + 'T09:00:00Z', todayKey() + 'T10:00:00Z');
      setTab('today');
    });
    await page.locator('.today-log-start').click();
    await page.waitForFunction(() => document.activeElement?.id === 'logPanelName');
    assert.equal(await page.locator('#logPanelName').inputValue(), '');
    assert.equal(await page.getByRole('button', { name: 'ADD ACTIVITY', exact: true }).count(), 1);
    assert.equal(await page.evaluate(() => dayLogEvents(todayKey()).length), 1);
    await page.evaluate(() => {
      dayLogAdd('Synthetic running', todayKey() + 'T11:00:00Z', null);
      window.__dayLogSelectedId = dayLogEvents(todayKey())[0].id;
      setTab('today');
    });
    await page.locator('.today-log-start').click();
    await page.waitForFunction(() => document.activeElement?.id === 'logPanelName');
    assert.equal(await page.locator('#logPanelName').inputValue(), 'Synthetic running');
    assert.equal(await page.evaluate(() => window.__dayLogSelectedId === dayLogActiveId()), true);
    assert.equal(await page.evaluate(() => dayLogEvents(todayKey()).length), 2);
  });
}
