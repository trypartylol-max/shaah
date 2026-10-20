const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');

const changeControl = (page, action, args) => page.locator(`input[data-ui-change="${action}"][data-ui-change-args=${JSON.stringify(JSON.stringify(args))}]`);
const bulkBox = (page, id) => changeControl(page, 'bulkPeopleToggle', [id]);
const membership = (page, id, loc) => changeControl(page, 'locationTogglePerson', [id, loc]);
const inactive = (page, id) => changeControl(page, 'personSetInactive', [id]);
const history = page => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k]) => k !== todayKey()))));

for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  test(`${name}: bulk/individual memberships, removal, inactive/reactivation and reload preserve history`, async t => {
    const page = await openApp(t, locationFixture(), viewport);
    const original = await history(page);
    const score = await page.evaluate(() => calcScore('2026-09-16'));
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await bulkBox(page, 'pold01').check();
    await bulkBox(page, 'pold02').check();
    await page.getByRole('button', { name: '+ Panamá', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => personById('pold02').locations), ['il', 'pa']);
    assert.deepEqual(await page.evaluate(() => personById('pold01').locations), ['pa']);
    assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]:checked').count(), 0);
    await membership(page, 'pold01', 'il').check();
    await membership(page, 'pold02', 'il').uncheck();
    assert.deepEqual(await page.evaluate(() => personById('pold02').locations), ['pa']);
    // The row disappears immediately when its status changes.
    await inactive(page, 'pold01').click();
    assert.equal(await page.evaluate(() => personById('pold01').inactive), true);
    assert.equal(await inactive(page, 'pold01').count(), 0);
    await page.getByRole('button', { name: 'Inactive', exact: true }).click();
    await inactive(page, 'pold01').click();
    assert.equal(await page.evaluate(() => personById('pold01').inactive), false);
    await page.getByRole('button', { name: 'All people', exact: true }).click();
    await bulkBox(page, 'pold01').check();
    await page.getByRole('button', { name: '− Panamá', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => personById('pold01').locations), ['il']);
    const row = changeControl(page, 'personSet', ['pold01', 'name']).locator('..');
    assert.equal(await row.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'Contact controls fit the row');
    await page.waitForFunction(() => window.__mockWrites.some(r => r.date === 'settings' && r.data._cfg.people.find(p => p.id === 'pold01').locations.join() === 'il'));
    await page.reload();
    await page.waitForFunction(() => _cfgReady && _live);
    assert.deepEqual(await page.evaluate(() => personById('pold01').locations), ['il']);
    assert.deepEqual(await page.evaluate(() => personById('pold02').locations), ['pa']);
    assert.equal(await page.evaluate(() => personById('pold01').inactive), false);
    assert.deepEqual(await page.evaluate(() => CFG.locationGroups.map(g => g.id)), ['il', 'pa', 'empty']);
    assert.equal(await history(page), original);
    assert.deepEqual(await page.evaluate(() => calcScore('2026-09-16')), score);
  });
}

test('bulk search filters while typing, retains keyboard focus, and clears stale selections', async t => {
  const page = await openApp(t, locationFixture());
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await bulkBox(page, 'pold01').check();
  const search = page.getByRole('textbox', { name: 'Search contacts for bulk assignment' });
  await search.click();
  await search.pressSequentially('lUiS');
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]').count(), 1);
  assert.equal(await search.evaluate(el => el === document.activeElement), true);
  assert.deepEqual(await page.evaluate(() => bulkPeopleSelection), []);
  await page.getByRole('button', { name: 'Select visible', exact: true }).click();
  await page.getByRole('button', { name: '+ Empty', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => personById('pold02').locations), ['il', 'pa', 'empty']);
  assert.deepEqual(await page.evaluate(() => personById('pold01').locations), []);
});

test('Unassigned, Active, Inactive and All people filters reset bulk selection', async t => {
  const page = await openApp(t, locationFixture());
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await bulkBox(page, 'pold02').check();
  await page.getByRole('button', { name: 'Unassigned', exact: true }).click();
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]').count(), 2);
  assert.deepEqual(await page.evaluate(() => bulkPeopleSelection), []);
  await page.getByRole('button', { name: 'All contacts', exact: true }).click();
  await bulkBox(page, 'pold02').check();
  await page.getByRole('button', { name: 'Inactive', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => bulkPeopleSelection), []);
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]').count(), 2);
  await page.getByRole('button', { name: 'All people', exact: true }).click();
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]').count(), 7);
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]').count(), 5);
});

test('WHO TO SEE and Social suggestions follow the location without changing recorded scores', async t => {
  const page = await openApp(t, locationFixture());
  const original = await history(page);
  assert.deepEqual((await page.locator('.w-name').allTextContents()).sort(), ['Ana Existing', 'Luis Existing', 'Alex Existing', 'Legacy Person'].sort());
  await page.getByLabel('Current social location').first().selectOption('pa');
  assert.deepEqual((await page.locator('.w-name').allTextContents()).sort(), ['Ana Existing', 'Luis Existing', 'Remote Person', 'Legacy Person'].sort());
  await page.locator('.cb-row').filter({ hasText: 'Flirting' }).click();
  assert.equal(await page.getByTitle('Alex Existing', { exact: true }).count(), 0);
  assert.equal(await page.getByTitle('Inactive Person', { exact: true }).count(), 0);
  assert.equal(await page.locator('.sd-pts').innerText(), '2/18%');
  assert.deepEqual(await page.evaluate(() => getPeople(todayKey())), []);
  await page.getByLabel('Current social location').first().selectOption('il');
  assert.equal(await page.getByTitle('Alex Existing', { exact: true }).count(), 1);
  assert.equal(await page.locator('.sd-pts').innerText(), '2/18%');
  assert.equal(await history(page), original);
});

test('an empty WHO TO SEE retains a working selector to recover recommendations', async t => {
  const data = locationFixture();
  data.config.people = data.config.people.filter(p => p.locations?.length);
  data.config.selectedLocation = 'empty';
  const page = await openApp(t, data);
  assert.equal(await page.locator('.w-name').count(), 0);
  await page.getByLabel('Current social location').last().selectOption('il');
  assert.equal(await page.locator('.w-name').count(), 2);
});

test('creation and rename dialogs preserve selected-location metadata across reload', async t => {
  const page = await openApp(t, locationFixture());
  const original = await history(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  page.once('dialog', d => d.accept('Madrid'));
  await page.getByRole('button', { name: '+ ADD LOCATION', exact: true }).click();
  const loc = await page.evaluate(() => selectedLocation());
  page.once('dialog', d => d.accept('España'));
  await page.getByRole('button', { name: '✎ Madrid', exact: true }).click();
  const answers = ['New Synthetic Person', '21'];
  const onDialog = d => d.accept(answers.shift());
  page.on('dialog', onDialog);
  await page.getByRole('button', { name: '+ ADD PERSON', exact: true }).first().click();
  page.off('dialog', onDialog);
  const person = await page.evaluate(() => peopleList().find(p => p.name === 'New Synthetic Person'));
  assert.deepEqual(person.locations, [loc]);
  assert.equal(person.inactive, false);
  assert.equal(person.every, 21);
  await page.waitForFunction(() => window.__mockWrites.some(r => r.date === 'settings' && r.data._cfg.people.some(p => p.name === 'New Synthetic Person')));
  await page.reload();
  await page.waitForFunction(() => _cfgReady && _live);
  assert.equal(await page.evaluate(() => locationGroups().find(g => g.id === selectedLocation()).name), 'España');
  assert.deepEqual(await page.evaluate(id => personById(id), person.id), person);
  assert.equal(await history(page), original);
});

test('stale selected groups and deleted memberships remain accessible after full startup', async t => {
  const data = locationFixture();
  data.config.selectedLocation = 'deleted';
  data.config.people[0].locations = ['deleted'];
  const page = await openApp(t, data);
  assert.equal(await page.getByLabel('Current social location').first().inputValue(), 'all');
  assert.equal(await page.evaluate(() => selectedLocation()), 'all');
  assert.equal(await page.locator('.w-name').count(), 5);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Unassigned', exact: true }).click();
  assert.equal(await bulkBox(page, 'pold01').count(), 1);
});

test('contacts with an orphan Social category retain individual location editing', async t => {
  const data = locationFixture();
  data.days['2026-09-16'].people.push('porphan');
  const page = await openApp(t, data, { width: 390, height: 844 });
  const original = await history(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Inactive', exact: true }).click();
  assert.equal(await membership(page, 'porphan', 'pa').count(), 1);
  await membership(page, 'porphan', 'pa').check();
  assert.deepEqual(await page.evaluate(() => personById('porphan').locations), ['il', 'pa']);
  assert.equal(await history(page), original);
});
