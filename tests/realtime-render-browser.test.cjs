const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');
const {clone}=require('./helpers.cjs');
async function open(t,viewport={width:1440,height:1000}){
  const data=locationFixture();data.days['2026-10-16']=clone(data.days['2026-10-15']);
  const page=await openApp(t,data,viewport,{});
  await page.locator('.nav-btn[data-tab="today"]').click();
  return page;
}
async function watch(page){
  await page.evaluate(()=>{
    window.__todayNode=document.querySelector('.today');window.__renderCount=0;
    const priorRender=render;render=(...args)=>{window.__renderCount++;return priorRender(...args);};
  });
}

for(const skin of ['classic','matrix','minimal'])test(`${skin}: desktop Today and its typing stay stable during duplicate notifications from an independent mobile context (synthetic notifications)`,async t=>{
  const desktop=await open(t),mobile=await open(t,{width:390,height:844});
  assert.notEqual(desktop.context(),mobile.context());
  await desktop.evaluate(skin=>setSkin(skin),skin);await watch(desktop);
  const note=desktop.locator('textarea').first();await note.fill('Synthetic unsaved desktop draft');
  const rows=await mobile.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')));
  await desktop.evaluate(rows=>{
    for(let i=0;i<20;i++){
      __emitMockRealtime({eventType:'UPDATE',new:{user_id:'regression-user',date:'cfgbak',data:{_bak:[]}}});
      __emitMockRealtime({eventType:'UPDATE',new:{...rows.find(row=>row.date==='2026-10-16'),user_id:'regression-user'}});
    }
  },rows);
  assert.equal(await desktop.evaluate(()=>__todayNode===document.querySelector('.today')),true);
  assert.equal(await desktop.evaluate(()=>__renderCount),0);
  assert.equal(await note.inputValue(),'Synthetic unsaved desktop draft');
  assert.equal(await note.evaluate(node=>document.activeElement===node),true);
});

test('a real remote change refreshes Today without restarting its entrance animation or sending writes',async t=>{
  const page=await open(t);await watch(page);
  const before=await page.evaluate(()=>({writes:__mockWrites.length,score:calcScore('2026-09-16')}));
  await page.evaluate(()=>{
    const row=JSON.parse(localStorage.getItem('shaah_mock_rows')).find(row=>row.date===todayKey());
    row.user_id='regression-user';row.data._note='Synthetic remote note visible once';
    __emitMockRealtime({eventType:'UPDATE',new:row});__emitMockRealtime({eventType:'UPDATE',new:row});
  });
  assert.equal(await page.locator('textarea').first().inputValue(),'Synthetic remote note visible once');
  assert.equal(await page.locator('.today').evaluate(node=>getComputedStyle(node).animationName),'none');
  assert.equal(await page.evaluate(()=>__renderCount),1);
  assert.equal(await page.evaluate(()=>__mockWrites.length),before.writes);
  assert.deepEqual(await page.evaluate(()=>calcScore('2026-09-16')),before.score);
});

test('background visibility changes coalesce remote updates into one repaint on return',async t=>{
  const page=await open(t,{width:390,height:844});await watch(page);
  await page.evaluate(()=>{
    window.__fakeHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__fakeHidden});
    document.dispatchEvent(new Event('visibilitychange'));
    const row=JSON.parse(localStorage.getItem('shaah_mock_rows')).find(row=>row.date===todayKey());row.user_id='regression-user';
    for(const text of ['Synthetic first background note','Synthetic latest background note']){row.data._note=text;__emitMockRealtime({eventType:'UPDATE',new:structuredClone(row)});}
  });
  assert.equal(await page.evaluate(()=>__renderCount),0);
  assert.equal(await page.evaluate(()=>getNote(todayKey())),'Synthetic latest background note');
  await page.evaluate(()=>{window.__fakeHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>__renderCount),1);
  assert.equal(await page.locator('textarea').first().inputValue(),'Synthetic latest background note');
  assert.equal(await page.locator('.today').evaluate(node=>getComputedStyle(node).animationName),'none');
});
