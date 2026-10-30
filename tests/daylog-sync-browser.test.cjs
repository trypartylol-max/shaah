const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
for(const width of [390,1440])test(`bulk completion and confirmed full reset persist at ${width}px`,async t=>{
  const page=await openApp(t,undefined,{width,height:1000});
  await page.evaluate(()=>{
    _state[todayKey()]={checks:{},social:blankSocial(),people:[],note:'',_daylog:[]};
    dayLogAdd('Synthetic manual activity',dayLogNowISO(),dayLogNowISO());
    setTab('today');lvlOpen[2]=true;render();
  });
  // Use the actual delegated level control, so one click runs only one mutation.
  const controls=page.locator('[data-ui-click="toggleLevelAll"]');
  const level=await controls.evaluateAll(nodes=>nodes.findIndex(n=>JSON.parse(n.getAttribute('data-ui-click-args'))[0]===2));
  assert.ok(level>=0);
  await controls.nth(level).click();
  assert.equal(await page.evaluate(()=>dayLogEvents(todayKey()).filter(e=>e.sourceId==='meditation').length),1);
  await page.waitForFunction(()=>__mockWrites.some(r=>r.date===todayKey()&&r.data._daylog?.some(e=>e.sourceId==='meditation')));
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
  assert.equal(await page.evaluate(()=>dayLogEvents(todayKey()).filter(e=>e.sourceId==='meditation').length),1);
  await page.evaluate(()=>setTab('today'));
  await page.evaluate(()=>{const scroll=document.getElementById('scroll');scroll.scrollTop=scroll.scrollHeight});
  await page.getByRole('button',{name:'Reset day',exact:true}).click();
  await page.getByRole('button',{name:'Borrar todos los datos de hoy',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>dayLogEvents(todayKey())),[]);
  await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('shaah_mock_rows')).some(r=>r.date===todayKey()));
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
  assert.deepEqual(await page.evaluate(()=>dayLogEvents(todayKey())),[]);
  assert.deepEqual(await page.evaluate(()=>getChecked(todayKey())),{});
});
