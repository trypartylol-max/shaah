const {test} = require('node:test');
const assert = require('node:assert/strict');
const {openApp} = require('./browser-helpers.cjs');

test('Pro Today shortcuts can be reordered, hidden and restored independently of Standard', async t => {
  const page = await openApp(t, undefined, {width:1440,height:1000});
  await page.evaluate(() => {arrivalDismiss();setTab('today');setLayout('pro');});
  const panel = page.getByRole('region', {name:'Pro shortcuts'});
  const order = () => panel.getByRole('heading').allTextContents();
  assert.deepEqual(await order(), ['Habits','Session','Work','Day Note']);
  await panel.getByRole('button',{name:'Customize'}).click();
  await panel.getByRole('button',{name:'Move Habits down'}).click();
  assert.deepEqual(await order(), ['Session','Habits','Work','Day Note']);
  await panel.getByRole('button',{name:'Hide Session'}).click();
  assert.deepEqual(await order(), ['Habits','Work','Day Note']);
  await page.waitForFunction(() => __mockWrites.some(row => row.date==='settings' &&
    JSON.stringify(row.data._cfg.proTodayOrder)===JSON.stringify(['habits','work','note'])));
  await page.evaluate(() => render());
  await panel.getByRole('button',{name:'Show Session'}).click();
  assert.deepEqual(await order(), ['Habits','Work','Day Note','Session']);
  await panel.getByRole('button',{name:'Restore order'}).click();
  await panel.getByRole('button',{name:'Done'}).click();
  await panel.getByRole('textbox',{name:'Day Note'}).fill('Nota de prueba');
  await panel.getByRole('textbox',{name:'Day Note'}).blur();
  assert.equal(await page.evaluate(()=>getNote(todayKey())),'Nota de prueba');
  await panel.getByRole('button',{name:'Prepare session'}).click();
  assert.equal(await page.locator('#logPanelName').isVisible(),true);
  await page.evaluate(() => {setTab('today');setLayout('standard');});
  assert.equal(await panel.isVisible(),false);
});

test('A new browser uses the account order without writing it back', async t => {
  const page = await openApp(t, undefined, {width:1440,height:1000});
  await page.evaluate(() => {
    const rows=JSON.parse(localStorage.getItem('shaah_mock_rows'));
    rows.find(row=>row.date==='settings').data._cfg.proTodayOrder=['note','habits'];
    localStorage.setItem('shaah_mock_rows',JSON.stringify(rows));
  });
  await page.reload();
  await page.waitForFunction(()=>Array.isArray(CFG.proTodayOrder));
  await page.evaluate(()=>{arrivalDismiss();setTab('today');setLayout('pro');});
  const panel=page.getByRole('region',{name:'Pro shortcuts'});
  assert.deepEqual(await panel.getByRole('heading').allTextContents(),['Day Note','Habits']);
  assert.equal(await page.evaluate(()=>__mockWrites.some(row=>row.date==='settings')),false);
});

test('both Work triangles stay inside their cards on desktop Pro', async t => {
  const { loadApp } = require('./helpers.cjs');
  const app = loadApp();
  app.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config");
  const page = await openApp(t, { config: app.read('CFG'), days: app.read('_state') }, { width: 1440, height: 1000 });
  await page.evaluate(() => { arrivalDismiss(); setTab('today'); setLayout('pro'); });
  const figures = page.locator('.wg-card .wg-figure');
  assert.equal(await figures.count(), 2);
  assert.equal(await figures.evaluateAll(elements => elements.every(figure => {
    const shape = figure.getBoundingClientRect();
    const card = figure.closest('.wg-card').getBoundingClientRect();
    return shape.left >= card.left && shape.right <= card.right &&
      shape.top >= card.top && shape.bottom <= card.bottom;
  })), true);
});
