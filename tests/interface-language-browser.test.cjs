const test = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./browser-helpers.cjs');

test('login language switches immediately and survives reload', async t => {
  const page = await openApp(t, undefined, { width: 390, height: 844 }, { loggedOut: true });
  const picker = page.locator('[data-interface-language]');
  assert.equal(await picker.inputValue(), 'en');
  await picker.selectOption('es');
  await page.getByRole('button', { name: 'Continuar con Google' }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Continuar con Google' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
  assert.equal(await picker.inputValue(), 'es');
  await picker.selectOption('en');
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
});

for (const width of [390, 1440]) {
  test(`settings language changes preserve account data at ${width}px`, async t => {
    const page = await openApp(t, undefined, { width, height: 900 }, { stayOnToday: true });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const before = await page.evaluate(() => JSON.stringify({ config: CFG, days: _state, writes: window.__mockWrites }));
    await page.locator('[data-interface-language]').selectOption('es');
    await page.getByRole('heading', { name: 'Ajustes', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
    assert.equal(await page.evaluate(() => JSON.stringify({ config: CFG, days: _state, writes: window.__mockWrites })), before);
  });
}

test('existing backup status is translated when switching language', async t => {
  const page = await openApp(t);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.evaluate(() => {
    _historySafety.status = 'El archivo no es un respaldo JSON válido.';
    render();
  });
  const backup = page.locator('[data-history-safety]');
  assert.match(await backup.textContent(), /This file is not a valid JSON backup/);
  await page.locator('[data-interface-language]').selectOption('es');
  assert.match(await backup.textContent(), /El archivo no es un respaldo JSON válido/);
});

test('appearance preview updates its visible and accessible text in Spanish', async t => {
  const page = await openApp(t);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Aurora', exact: true }).click();
  await page.getByRole('complementary', { name: 'Appearance preview' }).waitFor();
  await page.locator('[data-interface-language]').selectOption('es');
  const preview = page.getByRole('complementary', { name: 'Vista previa del aspecto' });
  assert.match(await preview.textContent(), /Aún no está guardado/);
  await preview.getByRole('button', { name: 'Cancelar', exact: true }).click();
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
  assert.deepEqual(await english.getByRole('heading').allTextContents(), ['Habits', 'Session', 'Work', 'Day Note']);
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.locator('[data-interface-language]').selectOption('es');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  const spanish = page.getByRole('region', { name: 'Accesos rápidos de Pro' });
  assert.deepEqual(await spanish.getByRole('heading').allTextContents(), ['Hábitos', 'Sesión', 'Trabajo', 'Nota del día']);
  await spanish.getByRole('button', { name: 'Personalizar' }).click();
  assert.equal(await spanish.getByRole('button', { name: 'Ocultar Trabajo' }).isVisible(), true);
  assert.equal(await snapshot(), before);
});
