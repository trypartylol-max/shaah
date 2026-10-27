const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');

const choose = (page, id) => page.locator(`[data-skin-choice="${id}"]`);
const snapshot = page => page.evaluate(() => JSON.stringify({ config: CFG, days: _state,
  scores: Object.keys(_state).filter(k => /^\d{4}-/.test(k)).map(k => [k, calcScore(k)]) }));

for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  test(`${device}: skins change every tab without altering contacts, history, results or writes`, async t => {
    const page = await openApp(t, locationFixture(), viewport);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.evaluate(() => flushCfgSaves());
    const before = await snapshot(page);
    const writes = await page.evaluate(() => window.__mockWrites.filter(row=>row.date!=='cfgbak').length);
    const backgrounds = [];
    for (const id of ['matrix', 'minimal', 'classic']) {
      await choose(page, id).click();
      assert.equal(await choose(page, id).getAttribute('aria-pressed'), 'true');
      assert.equal(await choose(page, id).evaluate(el => el === document.activeElement), true);
      backgrounds.push(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
      await page.evaluate(() => closeSettings());
      for (const tab of ['today', 'log', 'social', 'stats', 'history']) {
        await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.equal(await page.evaluate(() => document.getElementById('scroll').scrollWidth <= innerWidth), true);
        assert.equal(await page.locator('html').getAttribute('data-skin'), id);
      }
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
    }
    assert.equal(new Set(backgrounds).size, 3, 'Three different actual palettes');
    assert.equal(await snapshot(page), before, 'Appearance does not edit account data or score history');
    assert.equal(await page.evaluate(() => window.__mockWrites.filter(row=>row.date!=='cfgbak').length), writes, 'No server write for skin changes');
  });
}

test('skin choice persists after reload, ignores corrupt values and survives unavailable storage', async t => {
  const page = await openApp(t, locationFixture());
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await choose(page, 'matrix').focus();
  await page.keyboard.press('Enter');
  await page.reload();
  await page.waitForFunction(() => _cfgReady && _live);
  assert.equal(await page.locator('html').getAttribute('data-skin'), 'matrix');
  await page.evaluate(() => localStorage.setItem(SKIN_KEY, 'unrecognized-value'));
  await page.reload();
  await page.waitForFunction(() => _cfgReady && _live);
  assert.equal(await page.locator('html').getAttribute('data-skin'), 'classic');
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === SKIN_KEY) throw new DOMException('Not available', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await choose(page, 'minimal').click();
  assert.equal(await page.locator('html').getAttribute('data-skin'), 'minimal');
  assert.match(await page.locator('#skin-status').innerText(), /durante esta sesión/);
});

test('low stimulation disables glow and motion; Matrix respects system reduced motion', async t => {
  const page = await openApp(t, locationFixture());
  await page.evaluate(() => { setSkin('minimal'); setTab('today'); });
  const style = await page.locator('.t-ring svg').evaluate(el => ({
    filter: getComputedStyle(el).filter,
    shadow: getComputedStyle(el).boxShadow,
    transition: getComputedStyle(el.querySelector('circle:last-child')).transitionDuration,
    animation: getComputedStyle(document.querySelector('.today')).animationName
  }));
  assert.deepEqual(style, { filter: 'none', shadow: 'none', transition: '0s', animation: 'none' });
  assert.equal(await page.locator('.skin-emoji').first().evaluate(el => getComputedStyle(el).filter), 'grayscale(1)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { setSkin('matrix'); setTab('today'); });
  assert.equal(await page.locator('.today').evaluate(el => getComputedStyle(el).animationName), 'none');
});

test('all result grades stay distinct, readable and numerically identical in each skin, including SVG', async t => {
  const page = await openApp(t, locationFixture());
  for (const id of ['classic', 'matrix', 'minimal', 'aurora']) {
    await page.evaluate(id => {
      setSkin(id);
      let probe = document.getElementById('skin-grade-probe');
      if (!probe) { probe = document.createElement('div'); probe.id = 'skin-grade-probe'; document.body.append(probe); }
      uiHTML(probe, [0, 15, 30, 45, 72, 85, 95].map(n => {
        const g = GRADE(n, 100);
        return `<span ${uiStyle('color:'+g.c)} data-grade="${g.l}">${g.l} ${n}%</span><svg><circle stroke="${g.c}" /></svg>`;
      }).join(''));
    }, id);
    const grades = await page.locator('#skin-grade-probe span').evaluateAll(nodes => nodes.map(el => ({ label: el.textContent, color: getComputedStyle(el).color })));
    assert.deepEqual(grades.map(g => g.label), ['F 0%', 'D 15%', 'C 30%', 'B 45%', 'A 72%', 'S 85%', 'S+ 95%']);
    assert.equal(new Set(grades.map(g => g.color)).size, 7);
    const strokes = await page.locator('#skin-grade-probe circle').evaluateAll(nodes => nodes.map(el => getComputedStyle(el).stroke));
    assert.deepEqual(strokes, grades.map(g => g.color));
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const luminance = rgb => {
      const values = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    for (const grade of grades) assert.ok((luminance(grade.color) + .05) / (luminance(bg) + .05) >= 4.5, `${id} ${grade.label} readable against the app background`);
  }
});

test('another tab follows a skin change without replacing its pending note or settings inputs', async t => {
  const page = await openApp(t, locationFixture());
  const other = await page.context().newPage();
  await other.goto('http://shaah.test/');
  await other.waitForFunction(() => _cfgReady && _live);
  await other.evaluate(() => { setTab('today'); });
  const note = other.locator('textarea').first();
  await note.fill('Unsaved local note — keep focus');
  await page.evaluate(() => setSkin('matrix'));
  await other.waitForFunction(() => document.documentElement.dataset.skin === 'matrix');
  assert.equal(await note.inputValue(), 'Unsaved local note — keep focus');
  assert.equal(await note.evaluate(el => el === document.activeElement), true);
});
