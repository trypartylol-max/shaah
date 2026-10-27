const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');
const fs=require('node:fs');

async function open(t,skin='classic',viewport={width:1440,height:1000}){
  const data=locationFixture();
  data.days['2026-10-16']=structuredClone(data.days['2026-10-15']);
  data.days['2026-10-16'].checks.work=false;
  data.days['2026-10-16'].checks.social=false;
  data.days['2026-10-16'].checks.meditation=false;
  data.days['2026-10-16'].social={flirt:false,friends:false,strangers:false};
  data.days['2026-10-16'].people=[];
  const page=await openApp(t,data,viewport);
  await page.evaluate(skin=>{setSkin(skin);setTab('today');},skin);
  return page;
}

for(const skin of ['classic','matrix','minimal','aurora'])for(const [device,viewport] of [
  ['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]
])test(`${skin}/${device}: checking updates immediately, preserves the page, keyboard focus and drafts during a delayed save`,async t=>{
  const page=await open(t,skin,viewport);
  await page.evaluate(()=>{
    window.__todayNode=document.querySelector('.today');window.__ring=document.querySelector('.t-ring svg');
    window.__beforeHistory=JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey())));
    window.__held=[];const send=sendDayItem;
    sendDayItem=(...args)=>new Promise((resolve,reject)=>__held.push(()=>send(...args).then(resolve,reject)));
    document.querySelector('textarea').value='Synthetic note draft';
    document.querySelector('#dayLogInput').value='Synthetic activity draft';
  });
  const row=page.locator('.t-lvl2 .row').filter({hasText:'Meditate'});
  await row.focus();await row.press('Space');
  assert.equal(await page.evaluate(()=>getChecked(todayKey()).meditation),true);
  assert.equal(await row.getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>__todayNode===document.querySelector('.today')),true);
  assert.equal(await page.evaluate(()=>__ring===document.querySelector('.t-ring svg')),true);
  assert.equal(await row.evaluate(node=>node===document.activeElement),true);
  assert.equal(await page.locator('textarea').inputValue(),'Synthetic note draft');
  assert.equal(await page.locator('#dayLogInput').inputValue(),'Synthetic activity draft');
  assert.equal(await page.locator('.today').evaluate(node=>getComputedStyle(node).animationName),'none');
  assert.equal(await page.locator('#tb-score .ts-p').textContent(),await page.evaluate(()=>calcScore(todayKey()).score+'%'));
  await page.waitForFunction(()=>__held.length>0);
  await page.evaluate(async()=>{for(const release of __held)await release();});
  await page.waitForFunction(()=>!_pending[todayKey()]);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date===todayKey()).data._checks.meditation),true);
  assert.equal(await page.evaluate(()=>__todayNode===document.querySelector('.today')),true);
  assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey())))===__beforeHistory),true);
});

test('rapid three-state changes persist the final state without replacing Today or losing scroll',async t=>{
  const page=await open(t,'matrix',{width:390,height:640});
  await page.evaluate(()=>{
    window.__todayNode=document.querySelector('.today');
    document.getElementById('scroll').scrollTo({top:120,behavior:'instant'});window.__scrollBefore=document.getElementById('scroll').scrollTop;
    for(const expected of [0.5,true,false]){toggleHabit('work',todayKey());if(getChecked(todayKey()).work!==expected)throw Error('Invalid cycle');}
  });
  assert.equal(await page.evaluate(()=>__todayNode===document.querySelector('.today')),true);
  assert.equal(await page.evaluate(()=>document.getElementById('scroll').scrollTop),await page.evaluate(()=>__scrollBefore));
  await page.waitForFunction(()=>!_pending[todayKey()]);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date===todayKey()).data._checks.work),false);
  assert.equal(await page.evaluate(()=>__mockWrites.filter(r=>r.date===todayKey()).length),1);
});

test('a failed save keeps the checked state and draft locally, then retries through the existing queue',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{window.__todayNode=document.querySelector('.today');window.__realSend=sendDayItem;sendDayItem=async()=>{throw Error('Synthetic network failure');};toggleHabit('work',todayKey());});
  await page.waitForFunction(()=>!_pending[todayKey()]);
  assert.equal(await page.evaluate(()=>getChecked(todayKey()).work),0.5);
  assert.equal(await page.evaluate(()=>__todayNode===document.querySelector('.today')),true);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah-offline-day-writes:regression-user'))[todayKey()].data._checks.work),0.5);
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);await page.evaluate(()=>setTab('today'));
  assert.equal(await page.evaluate(()=>getChecked(todayKey()).work),0.5);
  await page.waitForFunction(()=>Object.keys(_offlineQueue).length===0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date===todayKey()).data._checks.work),0.5);
});

test('Social checkboxes and people update within the same screen and keep their score consistent',async t=>{
  const page=await open(t,'matrix');await page.evaluate(()=>setTab('social'));
  await page.evaluate(()=>{window.__socialNode=document.querySelector('.soc');});
  await page.locator('.sf-category-toggle').filter({hasText:'Friends'}).click();
  assert.equal(await page.evaluate(()=>__socialNode===document.querySelector('.soc')),true);
  await page.locator('.sf-compact-combo').getByRole('button',{name:/Ana Existing/}).click();
  assert.equal(await page.evaluate(()=>getPeople(todayKey()).includes('pold01')),true);
  assert.equal(await page.evaluate(()=>__socialNode===document.querySelector('.soc')),true);
  assert.match(await page.locator('.sf-combo-heading').innerText(),/16\s*\/\s*18\s*pts/i);
});

test('editing a historical day and checking a level preserves that screen and other days',async t=>{
  const page=await open(t);await page.evaluate(()=>{
    openEditDay('2026-09-07');window.__todayNode=document.querySelector('.today');
    window.__otherDays=JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!=='2026-09-07')));
    toggleLevelAll(1,'2026-09-07');
  });
  assert.equal(await page.evaluate(()=>__todayNode===document.querySelector('.today')),true);
  assert.equal(await page.evaluate(()=>getChecked('2026-09-07').work),false);
  assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!=='2026-09-07')))===__otherDays),true);
  assert.equal(await page.locator('.today').evaluate(node=>getComputedStyle(node).animationName),'none');
});
