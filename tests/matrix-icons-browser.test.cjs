const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');

const output = path.join(__dirname, '../test-results/matrix-icons-palette-2026-10-20');
const snapshot = page => page.evaluate(() => JSON.stringify({ config: CFG, days: _state,
  scores: Object.keys(_state).filter(key => /^\d{4}-/.test(key)).map(key => [key, calcScore(key)]) }));

function iconFixture() {
  const data = locationFixture();
  for (const habits of [data.config.h, ...data.config.log.map(era => era.h)]) {
    habits.work.i = '💼'; habits.meditation.i = '🧘'; habits.social.i = '👥';
  }
  data.days['2026-10-16'] = structuredClone(data.days['2026-10-15']);
  return data;
}

for (const [device, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 1000 }]]) {
  test(`${device}: Matrix icons cover navigation and content, preserve names and restore other skins`, async t => {
    const page = await openApp(t, iconFixture(), viewport);
    const before = await snapshot(page);
    const writes = await page.evaluate(() => window.__mockWrites.length);
    const navNames = await page.locator('#nav button').allTextContents();
    await page.evaluate(() => { setSkin('matrix'); setTab('today'); });
    for (const tab of ['today', 'log', 'social', 'stats', 'history']) {
      const button = page.locator(`.nav-btn[data-tab="${tab}"]`);
      await button.locator('.matrix-icon').waitFor({ state: 'visible' });
      await button.click();
      assert.equal(await button.getAttribute('aria-current'), 'page');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('scroll').scrollWidth <= innerWidth), true);
      if (['today', 'social', 'stats'].includes(tab)) {
        fs.mkdirSync(output, { recursive: true });
      }
    }
    assert.deepEqual(await page.locator('#nav button').allTextContents(), navNames, 'Original names remain intact');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    assert.equal(await page.locator('.st-icon svg').count(), 7);
    while (await page.locator('.st-head[aria-expanded="true"]').count()) await page.locator('.st-head[aria-expanded="true"]').first().click();
    await page.evaluate(() => document.getElementById('scroll').scrollTo(0, 0));
    assert.equal(await page.getByRole('heading', { name: 'Settings', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    for (const skin of ['minimal', 'classic']) {
      await page.evaluate(skin => setSkin(skin), skin);
      assert.equal(await page.locator('.matrix-icon:visible').count(), 0, 'Matrix drawings stay exclusive to Matrix');
      assert.deepEqual(await page.locator('#nav button').allTextContents(), navNames);
    }
    await page.evaluate(() => { setSkin('matrix'); setTab('today'); });
    assert.equal(await page.locator('.skin-emoji .skin-emoji').count(), 0, 'No nested icon rewrites');
    assert.equal(await snapshot(page), before, 'Appearance preserves scoring, contacts and history');
    assert.equal(await page.evaluate(() => window.__mockWrites.length), writes, 'No backend writes for appearance');
  });
}

test('dynamic custom icons remain safe text and editable fields retain their values and focus', async t => {
  const page = await openApp(t, iconFixture());
  await page.evaluate(() => {
    const probe = document.createElement('div'); probe.id = 'matrix-custom-probe';
    probe.textContent = '👋 🦄 🇵🇦 1️⃣ <img src=x onerror=alert(1)>';
    const input = document.createElement('input'); input.id = 'matrix-custom-input'; input.value = '🧘 Draft unchanged';
    probe.append(input); document.body.append(probe); input.focus();
    setSkin('matrix');
  });
  await page.locator('#matrix-custom-probe .matrix-icon').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#matrix-custom-probe img').count(), 0);
  assert.equal(await page.locator('#matrix-custom-probe').textContent(), '👋 🦄 🇵🇦 1️⃣ <img src=x onerror=alert(1)>');
  assert.equal(await page.locator('#matrix-custom-probe .skin-emoji').count(), 4, 'Flags and keycaps also receive the theme');
  const unknown = page.locator('#matrix-custom-probe .skin-emoji').filter({ hasText: '🦄' });
  assert.match(await unknown.evaluate(node => getComputedStyle(node).filter), /hue-rotate/);
  for (const skin of ['classic', 'minimal', 'matrix']) await page.evaluate(skin => setSkin(skin), skin);
  assert.equal(await page.locator('#matrix-custom-input').inputValue(), '🧘 Draft unchanged');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'matrix-custom-input');
});

test('Matrix keeps rendered controls and result charts within its green and neutral palette', async t => {
  const page = await openApp(t, iconFixture());
  await page.evaluate(() => setSkin('matrix'));
  const check = async label => {
    await page.evaluate(async () => {
      const finite = document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity);
      await Promise.all(finite.map(animation => animation.finished.catch(() => {})));
    });
    const failures = await page.evaluate(() => {
      const bad = [];
      const properties = ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'fill', 'stroke', 'boxShadow', 'textShadow', 'backgroundImage'];
      for (const node of document.querySelectorAll('body *')) {
        if (node.closest('[data-skin-preview],.skin-options') || !node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') continue;
        const style = getComputedStyle(node);
        for (const property of properties) {
          for (const color of style[property].matchAll(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/g)) {
            const [r, g, b] = color.slice(1, 4).map(Number);
            if (color[4] !== undefined && Number(color[4]) === 0) continue;
            if (g + 2 < r || g + 2 < b) bad.push({ tag: node.tagName, id: node.id, class: node.getAttribute('class'), property, color: color[0] });
          }
        }
      }
      return bad.slice(0, 15);
    });
    assert.deepEqual(failures, [], label);
  };
  for (const tab of ['today', 'log', 'social', 'stats', 'history']) {
    await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
    await check(tab);
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await check('Settings');
});
