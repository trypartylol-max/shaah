const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./browser-helpers.cjs');

// Exercise the built entrypoint, including its SRI, against the same synthetic
// account with the candidate layer enabled/disabled. No real account requests.
for (const width of [320, 390, 768, 879, 880, 1440]) {
  test(`Original refinement preserves cards, drafts and results at ${width}px`, async t => {
    const page = await openApp(t, undefined, { width, height: 1000 });
    const layer = enabled => page.evaluate(enabled => {
      document.querySelector('link[href*="original-refinement.css"]').disabled = !enabled;
    }, enabled);
    const snapshot = () => page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.stats-metric-card,.t-lvl,.t-rout,.t-note,#nav')]
        .map(el => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
      return {
        boxes,
        overflow: document.querySelector('#scroll').scrollWidth > innerWidth,
        text: [...document.querySelectorAll('.stats-metric-value,.stats-metric-label,.stats-metric-sub')].map(el => el.textContent),
        scores: Object.keys(_state).filter(k => /^\d{4}-/.test(k)).map(k => [k, calcScore(k)]),
        writes: window.__mockWrites,
      };
    });
    await page.evaluate(() => setSkin('classic'));
    for (const tab of ['today', 'stats']) {
      await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
      await layer(false);
      const before = await snapshot();
      if (width === 390 || width === 1440) await page.screenshot({ path: `docs/phase1/${tab}-${width}-before.png` });
      await layer(true);
      const after = await snapshot();
      assert.deepEqual(after, before, 'Same card geometry, content, scoring and synthetic writes');
      assert.equal(after.overflow, false);
      if (width === 390 || width === 1440) await page.screenshot({ path: `docs/phase1/${tab}-${width}-after.png` });
    }
    // A visual switch must not replace a note that has not been saved.
    await page.locator('.nav-btn[data-tab="today"]').click();
    const note = page.locator('.t-note textarea');
    if (await note.count()) {
      await note.fill('Phase 1 unsaved draft');
      await layer(false); await layer(true);
      assert.equal(await note.inputValue(), 'Phase 1 unsaved draft');
    }
    await page.locator('.nav-btn[data-tab="stats"]').click();
    for (const skin of ['aurora', 'matrix', 'minimal', 'glow', 'pro']) {
      await page.evaluate(skin => setSkin(skin), skin);
      const appearance = () => page.locator('.stats-metric-card').first().evaluate(el => {
        const targets = [el, ...el.querySelectorAll('*')];
        return targets.map(node => {
          const css = getComputedStyle(node);
          return [css.color, css.backgroundColor, css.borderColor, css.fontFamily, css.fontSize, css.fontWeight, css.boxShadow];
        });
      });
      await layer(false); const before = await appearance();
      await layer(true); assert.deepEqual(await appearance(), before, `${skin} appearance unchanged`);
    }
  });
}
