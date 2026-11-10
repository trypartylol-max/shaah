const test = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./browser-helpers.cjs');

test('login language switches immediately and survives reload', async t => {
  const page = await openApp(t, undefined, { width: 390, height: 844 }, { loggedOut: true });
  const picker = page.locator('[data-interface-language]');
  assert.equal(await picker.inputValue(), 'en');
  await picker.selectOption('es');
  await page.getByRole('button', { name: 'Continuar con Google' }).waitFor();
  await picker.selectOption('he');
  await page.reload();
  await page.getByRole('button', { name: 'המשך עם Google' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  assert.equal(await picker.inputValue(), 'he');
  await picker.selectOption('en');
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
});

for (const width of [390, 1440]) {
  test(`settings language changes preserve account data at ${width}px`, async t => {
    const page = await openApp(t, undefined, { width, height: 900 }, { stayOnToday: true });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const before = await page.evaluate(() => JSON.stringify({ config: CFG, days: _state, writes: window.__mockWrites }));
    await page.locator('[data-interface-language]').selectOption('he');
    await page.getByRole('heading', { name: 'הגדרות', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
    assert.equal(await page.evaluate(() => JSON.stringify({ config: CFG, days: _state, writes: window.__mockWrites })), before);
  });
}

test('RTL activity log keeps its timeline chronological', async t => {
  const page = await openApp(t, undefined, { width: 390, height: 844 }, { stayOnToday: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[data-interface-language]').selectOption('he');
  await page.getByRole('button', { name: 'חזרה', exact: true }).click();
  await page.locator('.nav-btn[data-tab="log"]').click();
  await page.getByText('ציר הזמן של היום', { exact: true }).waitFor();
  assert.equal(await page.locator('.logdesk-ticks').getAttribute('dir'), 'ltr');
  await page.locator('.nav-btn[data-tab="stats"]').click();
  await page.getByRole('heading', { name: 'סטטיסטיקה', exact: true }).waitFor();
});

for (const width of [390, 1440]) {
  test(`Hebrew navigation stays within the viewport at ${width}px`, async t => {
    const page = await openApp(t, undefined, { width, height: 900 }, { stayOnToday: true });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('[data-interface-language]').selectOption('he');
    await page.getByRole('button', { name: 'חזרה', exact: true }).click();
    for (const tab of ['today', 'log', 'social', 'stats', 'history']) {
      const button = page.locator(`.nav-btn[data-tab="${tab}"]`);
      if (await button.isVisible()) await button.click();
      else await page.evaluate(tab => setTab(tab), tab);
      assert.equal(await page.evaluate(() => currentTab), tab);
      assert.equal(await page.locator('html').getAttribute('lang'), 'he');
      assert.equal(await page.locator('#scroll').evaluate(el => getComputedStyle(el).direction), 'rtl');
      assert.equal(await page.locator('#scroll').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, tab);
    }
  });
}

test('Hebrew reverses swipe navigation and back gestures', async t => {
  const page = await openApp(t, undefined, { width: 390, height: 844 }, { stayOnToday: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[data-interface-language]').selectOption('he');
  const swipe = (from, to) => page.evaluate(([from, to]) => {
    const touch = clientX => new Touch({ identifier: 1, target: document.body, clientX, clientY: 100 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(from)] }));
    document.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch(to)] }));
  }, [from, to]);
  await swipe(250, 100);
  assert.equal(await page.evaluate(() => settingsOpen), false);
  await swipe(100, 250);
  assert.equal(await page.evaluate(() => currentTab), 'log');
  await swipe(250, 100);
  assert.equal(await page.evaluate(() => currentTab), 'today');
});

test('existing backup status is translated when switching language', async t => {
  const page = await openApp(t);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.evaluate(() => {
    _historySafety.status = 'El archivo no es un respaldo JSON válido.';
    render();
  });
  const backup = page.locator('[data-history-safety]');
  assert.match(await backup.textContent(), /This file is not a valid JSON backup/);
  await page.locator('[data-interface-language]').selectOption('he');
  assert.match(await backup.textContent(), /הקובץ אינו גיבוי JSON תקין/);
  await page.locator('[data-interface-language]').selectOption('es');
  assert.match(await backup.textContent(), /El archivo no es un respaldo JSON válido/);
});

test('appearance preview updates its visible and accessible text in Hebrew', async t => {
  const page = await openApp(t);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Aurora', exact: true }).click();
  await page.getByRole('complementary', { name: 'Appearance preview' }).waitFor();
  await page.locator('[data-interface-language]').selectOption('he');
  const preview = page.getByRole('complementary', { name: 'תצוגה מקדימה של המראה' });
  assert.match(await preview.textContent(), /עדיין לא נשמר/);
  await preview.getByRole('button', { name: 'ביטול', exact: true }).click();
  assert.equal(await preview.count(), 0);
});

test('Pro navigation and Settings section labels follow the chosen language', async t => {
  const page = await openApp(t, undefined, { width: 390, height: 844 }, { stayOnToday: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[data-interface-language]').selectOption('es');
  assert.match(await page.locator('#settings-toggle-data').textContent(), /Cuenta y datos/);
  await page.evaluate(() => setSkin('pro'));
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  const settings = page.locator('.pro-nav-settings');
  assert.equal(await settings.getAttribute('aria-label'), 'Ajustes');
  assert.match(await settings.textContent(), /Ajustes/);
});

test('Pro shortcuts switch languages without changing widget order or data', async t => {
  const page = await openApp(t, undefined, { width: 1440, height: 1000 }, { stayOnToday: true });
  await page.evaluate(() => { arrivalDismiss(); setTab('today'); setLayout('pro'); });
  const snapshot = () => page.evaluate(() => JSON.stringify({config: CFG, days: _state, writes: window.__mockWrites}));
  const before = await snapshot();
  const english = page.getByRole('region', { name: 'Pro shortcuts' });
  assert.deepEqual(await english.getByRole('heading').allTextContents(), ['Session', 'Day Note']);
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.locator('[data-interface-language]').selectOption('es');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  const spanish = page.getByRole('region', { name: 'Accesos rápidos de Pro' });
  assert.deepEqual(await spanish.getByRole('heading').allTextContents(), ['Sesión', 'Nota del día']);
  await spanish.getByRole('button', { name: 'Personalizar' }).click();
  assert.equal(await spanish.getByRole('button', { name: 'Mostrar Trabajo' }).isVisible(), true);
  assert.equal(await snapshot(), before);
});

test('Hebrew desktop Pro mirrors the sidebar and translates shortcuts and comparison', async t => {
  const page = await openApp(t, undefined, { width: 1440, height: 900 }, { stayOnToday: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[data-interface-language]').selectOption('he');
  await page.getByRole('button', { name: 'חזרה', exact: true }).click();
  await page.evaluate(() => { arrivalDismiss(); setLayout('pro'); });
  const shortcuts = page.getByRole('region', { name: 'קיצורי דרך של Pro' });
  await page.evaluate(()=>{CFG.proTodayOrder=['habits','session','work','note'];render();});
  assert.deepEqual(await shortcuts.getByRole('heading').allTextContents(), ['הרגלים','פעילות','עבודה','הערת היום']);
  await shortcuts.getByRole('button', { name: 'התאמה אישית' }).click();
  await shortcuts.getByRole('button', { name: 'העברת הרגלים למטה' }).waitFor();
  const nav = await page.locator('#nav').boundingBox();
  const scroll = await page.locator('#scroll').boundingBox();
  assert.ok(nav.x > scroll.x);
  assert.ok(scroll.x + scroll.width <= nav.x + 1);
  await page.locator('.nav-btn[data-tab="stats"]').click();
  await page.locator('.pro-week-comparison summary').filter({hasText:'התמדה שבועית'}).waitFor();
});

test('Hebrew contact form and calendar use the current language without rewriting data', async t => {
  const page = await openApp(t, undefined, { width: 390, height: 844 }, { stayOnToday: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('[data-interface-language]').selectOption('he');
  await page.getByRole('button', { name: 'חזרה', exact: true }).click();
  await page.evaluate(() => { setTab('social'); socialNew(todayKey()); });
  await page.getByText('תדירות בימים (לא חובה)', { exact: true }).waitFor();
  assert.equal(await page.locator('#sf-name').getAttribute('dir'), 'auto');
  await page.getByRole('button', { name: 'ביטול', exact: true }).click();
  await page.locator('.nav-btn[data-tab="history"]').click();
  await page.getByRole('button', { name: 'חודש', exact: true }).click();
  const previous = page.getByRole('button', { name: 'החודש הקודם' });
  assert.equal(await previous.textContent(), '›');
  const weekdays = await page.locator('.month-weekdays').textContent();
  assert.match(weekdays, /[א-ת]/);
});
