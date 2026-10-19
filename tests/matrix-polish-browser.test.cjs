const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');

test('Matrix decorations preserve mobile hit targets and disappear or stop with reduced motion and other skins', async t => {
  const page = await openApp(t, locationFixture(), { width: 390, height: 844 });
  const before = await page.evaluate(() => JSON.stringify({ config: CFG, days: _state }));
  const writes = await page.evaluate(() => window.__mockWrites.length);
  await page.evaluate(() => { setSkin('matrix'); setTab('today'); });
  const decor = await page.evaluate(() => {
    const edge = getComputedStyle(document.body, '::before');
    const cursor = getComputedStyle(document.querySelector('.tb-gr'), '::after');
    return { edgePointer: edge.pointerEvents, edgeWidth: parseFloat(edge.width), edgeOpacity: parseFloat(edge.opacity), edgeAnimation: edge.animationName, cursorAnimation: cursor.animationName };
  });
  assert.equal(decor.edgePointer, 'none');
  assert.ok(decor.edgeWidth <= 9 && decor.edgeOpacity <= .12);
  assert.notEqual(decor.edgeAnimation, 'none');
  assert.notEqual(decor.cursorAnimation, 'none');
  for (const tab of ['today', 'log', 'social', 'stats', 'history']) {
    await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
    assert.equal(await page.locator(`.nav-btn[data-tab="${tab}"]`).getAttribute('aria-current'), 'page');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.evaluate(() => setTab('today'));
  const output = path.join(__dirname, '../test-results/matrix-polish');
  fs.mkdirSync(output, { recursive: true });
  await page.screenshot({ path: path.join(output, 'matrix-mobile.png'), animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const animations = await page.evaluate(() => [
    getComputedStyle(document.body, '::before').animationName,
    getComputedStyle(document.body, '::after').animationName,
    getComputedStyle(document.querySelector('.tb-gr')).animationName,
    getComputedStyle(document.querySelector('.tb-gr'), '::after').animationName
  ]);
  assert.deepEqual(animations, ['none', 'none', 'none', 'none']);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const id of ['classic', 'minimal']) {
    await page.evaluate(id => setSkin(id), id);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body, '::before').content), 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.tb-gr'), '::after').content), 'none');
  }
  assert.equal(await page.evaluate(() => JSON.stringify({ config: CFG, days: _state })), before);
  assert.equal(await page.evaluate(() => window.__mockWrites.length), writes);
});

test('all five dock tabs exist in the same order before a delayed SDK finishes loading', async t => {
  const page = await openApp(t, locationFixture(), { width: 390, height: 844 });
  const tabs = () => page.locator('#nav .nav-btn').evaluateAll(nodes => nodes.filter(node => !node.hidden).map(node => node.dataset.tab));
  const expected = ['today', 'log', 'social', 'stats', 'history'];
  assert.deepEqual(await tabs(), expected);
  let release, entered;
  const intercepted = new Promise(resolve => { entered = resolve; });
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js', async route => {
    await new Promise(resolve => { release = resolve; entered(); });
    await route.fulfill({ contentType: 'application/javascript', body: '/* local SDK test double */' });
  });
  t.after(() => release?.());
  await page.reload({ waitUntil: 'commit' });
  await intercepted;
  try {
    await page.locator('#nav .nav-btn').last().waitFor({ state: 'visible' });
    assert.deepEqual(await tabs(), expected);
    for (const tab of expected) assert.equal(await page.locator(`.nav-btn[data-tab="${tab}"]`).isVisible(), true);
  } finally { release(); }
  await page.waitForFunction(() => typeof _cfgReady !== 'undefined' && _cfgReady && _live);
  assert.deepEqual(await tabs(), expected);
});
