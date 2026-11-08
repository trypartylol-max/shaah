const {test} = require('node:test');
const assert = require('node:assert/strict');
const {openApp} = require('./browser-helpers.cjs');

test('Pro Today shortcuts can be reordered, hidden and restored independently of Standard', async t => {
  const page = await openApp(t, undefined, {width:1440,height:1000});
  await page.evaluate(() => {arrivalDismiss();setTab('today');setLayout('pro');});
  const panel = page.getByRole('region', {name:'Accesos rápidos de Pro'});
  const order = () => panel.getByRole('heading').allTextContents();
  assert.deepEqual(await order(), ['Hábitos','Sesión','Work','Day Note']);
  await panel.getByRole('button',{name:'Personalizar'}).click();
  await panel.getByRole('button',{name:'Bajar Hábitos'}).click();
  assert.deepEqual(await order(), ['Sesión','Hábitos','Work','Day Note']);
  await panel.getByRole('button',{name:'Ocultar Sesión'}).click();
  assert.deepEqual(await order(), ['Hábitos','Work','Day Note']);
  await page.waitForFunction(() => __mockWrites.some(row => row.date==='settings' &&
    JSON.stringify(row.data._cfg.proTodayOrder)===JSON.stringify(['habits','work','note'])));
  await page.evaluate(() => render());
  await panel.getByRole('button',{name:'Mostrar Sesión'}).click();
  assert.deepEqual(await order(), ['Hábitos','Work','Day Note','Sesión']);
  await panel.getByRole('button',{name:'Restaurar orden'}).click();
  await panel.getByRole('button',{name:'Listo'}).click();
  await panel.getByRole('textbox',{name:'Day Note'}).fill('Nota de prueba');
  await panel.getByRole('textbox',{name:'Day Note'}).blur();
  assert.equal(await page.evaluate(()=>getNote(todayKey())),'Nota de prueba');
  await panel.getByRole('button',{name:'Preparar sesión'}).click();
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
  const panel=page.getByRole('region',{name:'Accesos rápidos de Pro'});
  assert.deepEqual(await panel.getByRole('heading').allTextContents(),['Day Note','Hábitos']);
  assert.equal(await page.evaluate(()=>__mockWrites.some(row=>row.date==='settings')),false);
});
