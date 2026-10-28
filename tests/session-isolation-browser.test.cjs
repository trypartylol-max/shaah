const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
async function open(t){
  const a=fixture(),b=fixture();
  a.config.h.production={l:'Production',p:5,pWork:5,pVacation:5,lv:1,on:true,routine:true};a.config.order.push('production');
  for(const era of a.config.log){era.h.production={...a.config.h.production};era.order.push('production');}
  a.config.routines={production:{label:'Synthetic A routine',icon:'W',steps:[{label:'Synthetic A step',dur:1}]}};
  b.config.routines={};b.config.people=[];
  for(const day of Object.values(b.days)){day.note='Synthetic B note';day.people=[];day._daylog=[];}
  return openApp(t,a,{width:390,height:844},{syntheticAccounts:{'synthetic-B':b}});
}
async function emit(page,owner,event='SIGNED_IN'){
  await page.evaluate(({owner,event})=>window.__emitMockAuth(event,owner?{id:owner,email:owner+'@example.invalid'}:null),{owner,event});
  if(owner)await page.waitForFunction(id=>USER?.id===id&&_cfgReady&&_live,owner);
  else await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
}

test('actual Original artifact removes A routine and editor when B signs in, preserving both scoped copies',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{startRoutine('production');routineToggle();});
  const savedA=await page.evaluate(()=>localStorage.getItem('shaah_routine_regression-user'));
  assert.ok(savedA);
  await page.evaluate(()=>{
    dayLogEdit('synthetic-event','2026-10-15');
    bulkPeopleSelection=['pold01'];bulkPeopleQuery='Synthetic A';
    window.__dayLogSelectedId='synthetic-event';
  });
  await page.locator('#dayLogEditModal').waitFor();
  await emit(page,'synthetic-B');
  assert.equal(await page.locator('#dayLogEditModal').count(),0);
  assert.equal(await page.locator('#scroll').textContent().then(s=>s.includes('Synthetic A routine')),false);
  assert.deepEqual(await page.evaluate(()=>Object.keys(sessions)),[]);
  assert.equal(await page.evaluate(()=>timerInterval),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_routine_synthetic-B')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_routine_regression-user')),savedA);
  assert.deepEqual(await page.evaluate(()=>bulkPeopleSelection),[]);
  assert.equal(await page.evaluate(()=>getNote('2026-10-15')),'Synthetic B note');
});

test('returning to A through the auth callback restores only A routine and A screen preferences',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{
    set(cfgKey(),CFG);startRoutine('production');routineToggle();
    set(todayRoutinesKey(),false);set(secKey(),{hab:false});
  });
  await emit(page,'synthetic-B');
  assert.equal(await page.evaluate(()=>todayRoutinesOpen),true);
  await emit(page,'regression-user');
  assert.deepEqual(await page.evaluate(()=>Object.keys(sessions)),['production']);
  assert.equal(await page.evaluate(()=>routineView&&timerRunning),true);
  assert.equal(await page.evaluate(()=>todayRoutinesOpen),false);
  assert.equal(await page.evaluate(()=>secOpen.hab),false);
  assert.equal(await page.locator('#cr-dialog #cr-title').textContent(),await page.evaluate(()=>ROUTINES.production.icon+' '+ROUTINES.production.label));
});

test('same-owner refresh keeps the live runner and signed-out state shows no account activity',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{startRoutine('production');routineToggle();});
  const timer=await page.evaluate(()=>timerInterval),epoch=await page.evaluate(()=>_syncEpoch);
  await emit(page,'regression-user','TOKEN_REFRESHED');
  assert.equal(await page.evaluate(()=>timerInterval),timer);assert.equal(await page.evaluate(()=>_syncEpoch),epoch);
  const saved=await page.evaluate(()=>localStorage.getItem('shaah_routine_regression-user'));
  await emit(page,null,'SIGNED_OUT');
  assert.equal(await page.evaluate(()=>timerInterval),null);
  assert.deepEqual(await page.evaluate(()=>Object.keys(sessions)),[]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_routine_anon')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_routine_regression-user')),saved);
  assert.equal(await page.locator('#resume').textContent(),'');
});

test('B fictitious note stays separate from A after switching twice and reloading the browser',async t=>{
  const page=await open(t);
  const before=await page.evaluate(()=>localStorage.getItem('shaah_mock_rows'));
  await emit(page,'synthetic-B');
  await page.locator('.nav-btn[data-tab="today"]').click();
  const note=page.locator('textarea[id^="note-"]');
  await note.fill('Synthetic B isolation proof');await note.blur();
  await page.waitForFunction(()=>__mockWrites.some(row=>row.user_id==='synthetic-B'&&row.data?._note==='Synthetic B isolation proof'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_mock_rows')),before);
  await emit(page,'regression-user');
  assert.notEqual(await page.evaluate(()=>getNote(todayKey())),'Synthetic B isolation proof');
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
  await emit(page,'synthetic-B');
  assert.equal(await page.evaluate(()=>getNote(todayKey())),'Synthetic B isolation proof');
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_mock_rows')),before);
});
