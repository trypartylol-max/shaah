const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');

const order = ['data', 'trav', 'hab', 'rout', 'ppl', 'bak', 'appearance'];
const snapshot = page => page.evaluate(() => JSON.stringify({ config: CFG, days: _state }));

for (const [device, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 1000 }]]) {
  test(`${device}: compact settings list preserves editors, keyboard order, collapse state and synthetic data`, async t => {
    const page = await openApp(t, locationFixture(), viewport);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const before = await snapshot(page);
    const writes = await page.evaluate(() => window.__mockWrites.length);
    assert.deepEqual(await page.locator('[data-settings-section]').evaluateAll(nodes => nodes.map(node => node.dataset.settingsSection)), order);
    while (await page.locator('.st-head[aria-expanded="true"]').count()) await page.locator('.st-head[aria-expanded="true"]').first().click();
    assert.equal(await page.locator('.settings-list > .st-card').count(), 7);
    for (const id of order) {
      const button = page.locator('#settings-toggle-' + id);
      const box = await button.boundingBox();
      assert.ok(box.height >= 44 && box.height <= 72, 'Compact full-row touch targets');
      assert.equal(await button.getAttribute('aria-controls'), 'settings-section-' + id);
      assert.equal(await page.locator('#settings-section-' + id).getAttribute('inert'), '');
    }
    const listBox = await page.locator('.settings-list').boundingBox();
    assert.ok(listBox.height <= 510, 'All collapsed rows fit as one compact list');
    await page.locator('#settings-toggle-data').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-toggle-trav', 'Hidden account editors are skipped');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#settings-toggle-trav').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'settings-toggle-trav', 'Rerender retains keyboard focus');
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#settings-toggle-trav').getAttribute('aria-expanded'), 'false');
    const output = path.join(__dirname, '../test-results/settings-list');
    fs.mkdirSync(output, { recursive: true });
    for (const skin of ['matrix', 'minimal', 'classic']) {
      await page.evaluate(skin => setSkin(skin), skin);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('scroll').scrollWidth <= innerWidth), true);
    }
    await page.reload();
    await page.waitForFunction(() => _cfgReady && _live);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    assert.equal(await page.locator('.st-head[aria-expanded="false"]').count(), 7, 'Stored open/collapse choices survive reload');
    await page.getByRole('button', { name: 'People', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search contacts for bulk assignment' }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('#settings-section-ppl').getAttribute('inert'), null);
    assert.equal(await snapshot(page), before, 'Menu actions preserve contacts, history and scores');
    assert.equal(await page.evaluate(() => window.__mockWrites.length), writes, 'Appearance and menu navigation do not write settings to Supabase');
  });
}

test('an initially open Appearance section closes on the first click even without a stored flag', async t => {
  const page = await openApp(t, locationFixture());
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const appearance = page.getByRole('button', { name: 'Appearance', exact: true });
  assert.equal(await page.evaluate(() => Object.hasOwn(secOpen, 'appearance')), false);
  assert.equal(await appearance.getAttribute('aria-expanded'), 'true');
  await appearance.click();
  assert.equal(await appearance.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#settings-section-appearance').getAttribute('inert'), '');
  await appearance.click();
  assert.equal(await appearance.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('[data-skin-choice="matrix"]').isVisible(), true);
});
