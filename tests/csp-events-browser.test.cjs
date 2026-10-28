const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');
const {html}=require('./helpers.cjs');
const control=(page,event,action,args,tag='*')=>page.locator(`${tag}[data-ui-${event}="${action}"][data-ui-${event}-args=${JSON.stringify(JSON.stringify(args))}]`);
const history=page=>page.evaluate(()=>JSON.stringify({days:Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey())),log:CFG.log}));
async function open(t,data=locationFixture(),options={}){
  assert.match(html,/script-src-attr 'none';/);
  return openApp(t,data,{width:390,height:844},options);
}
async function section(page,name){const row=page.getByRole('button',{name:new RegExp('^'+name+'(?:$|\\s)')});if(await row.getAttribute('aria-expanded')==='false')await row.click();}
async function noEventAttributes(page){
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('*')].flatMap(node=>[...node.attributes].filter(a=>/^on/i.test(a.name)).map(a=>a.name))),[]);
}

test('strict CSP permits bulk membership, individual edits and ordinary Unicode legacy IDs without changing history',async t=>{
  const data=locationFixture(),id="old O'Neil & 雪";data.config.people[0].id=id;
  const page=await open(t,data),before=await history(page);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await section(page,'People');
  await control(page,'change','bulkPeopleToggle',[id],'input').check();
  await page.getByRole('button',{name:'+ Panamá',exact:true}).click();
  assert.deepEqual(await page.evaluate(id=>personById(id).locations,id),['pa']);
  await control(page,'change','locationTogglePerson',[id,'il'],'input').check();
  const name=control(page,'change','personSet',[id,'name'],'input');await name.fill('Synthetic Unicode contact');await name.press('Tab');
  assert.equal(await page.evaluate(id=>personById(id).name,id),'Synthetic Unicode contact');
  await control(page,'change','personSetInactive',[id],'input').click();
  await page.getByRole('button',{name:'Inactive',exact:true}).click();
  await control(page,'change','personSetInactive',[id],'input').click();
  assert.equal(await page.evaluate(id=>personById(id).inactive,id),false);
  assert.equal(await history(page),before);await noEventAttributes(page);
});

test('strict CSP preserves separate Work/Vacation editor values and score history',async t=>{
  const page=await open(t),before=await history(page);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await section(page,'Habits & weights');
  const work=control(page,'change','cfgSet',['meditation','p'],'input');await work.fill('12');await work.press('Tab');
  const vacation=control(page,'change','cfgVacationPoints',['meditation'],'input');await vacation.fill('8');await vacation.press('Tab');
  assert.deepEqual(await page.evaluate(()=>[CFG.h.meditation.pWork,CFG.h.meditation.pVacation]),[12,8]);
  await section(page,'Modes');await control(page,'click','setTravelMode',['vacation'],'button').click();
  assert.equal(await page.evaluate(()=>travelMode()),'vacation');
  assert.deepEqual(await page.evaluate(()=>[CFG.h.meditation.pWork,CFG.h.meditation.pVacation]),[12,8]);
  // New mode eras are expected; previous dated eras and saved day records stay intact.
  const prior=JSON.parse(before);
  assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey())))),JSON.stringify(prior.days));
  assert.deepEqual(await page.evaluate(()=>CFG.log.filter(era=>era.from<todayKey())),prior.log.filter(era=>era.from<'2026-10-16'));
  await noEventAttributes(page);
});

test('strict CSP preserves keyboard activation, nested contact clicks, note editing and history controls',async t=>{
  const page=await open(t),before=await history(page);
  const friends=page.locator('.cb-row').filter({hasText:'Friends'});await friends.focus();await friends.press('Enter');
  const chosen=await page.evaluate(()=>getSocial(todayKey()).friends);
  await page.getByTitle('Ana Existing',{exact:true}).click();
  assert.equal(await page.evaluate(()=>getSocial(todayKey()).friends),chosen,'Child tagging does not activate the parent row');
  await page.locator('.nav-btn[data-tab="today"]').click();
  const note=page.locator('textarea').first();await note.fill('Synthetic note under strict CSP');await note.press('Tab');
  assert.equal(await page.evaluate(()=>getNote(todayKey())),'Synthetic note under strict CSP');
  await page.locator('.nav-btn[data-tab="history"]').click();
  await page.getByRole('button',{name:'MONTH',exact:true}).click();
  const month=await page.evaluate(()=>histMonth);
  await control(page,'click','histMonthShift',[-1],'button').click();
  assert.notEqual(await page.evaluate(()=>histMonth),month);
  assert.equal(await history(page),before);await noEventAttributes(page);
});

test('strict CSP keeps Original login control usable without real Auth requests',async t=>{
  const page=await open(t,locationFixture(),{loggedOut:true});
  await page.evaluate(()=>{window.__syntheticSignIns=0;signIn=()=>window.__syntheticSignIns++;});
  await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__syntheticSignIns),1);
  assert.equal(await page.evaluate(()=>USER),null);assert.equal(await page.evaluate(()=>window.__mockWrites.length),0);
  await noEventAttributes(page);
});

test('strict CSP permits activity create, edit and delete without changing older history',async t=>{
  const page=await open(t),before=await history(page);
  await page.locator('.nav-btn[data-tab="log"]').click();
  await control(page,'click','dayLogPanelNew',[],'button').filter({visible:true}).first().click();
  await page.locator('#logPanelName').fill('Synthetic scheduled activity');
  await page.locator('#logPanelStart').fill('13:00');await page.locator('#logPanelEnd').fill('13:30');
  await page.getByRole('button',{name:'ADD ACTIVITY',exact:true}).click();
  assert.equal(await page.evaluate(()=>dayLogEvents(todayKey()).filter(e=>e.title==='Synthetic scheduled activity').length),1);
  await page.getByRole('button',{name:'Edit Synthetic scheduled activity',exact:true}).last().click();
  await page.locator('#logPanelName').fill('Synthetic revised activity');
  await page.getByRole('button',{name:'SAVE',exact:true}).click();
  await page.getByRole('button',{name:'Edit Synthetic revised activity',exact:true}).last().click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'DELETE',exact:true}).click();
  assert.equal(await page.evaluate(()=>dayLogEvents(todayKey()).some(e=>e.title==='Synthetic revised activity')),false);
  assert.equal(await history(page),before);await noEventAttributes(page);
});

test('strict CSP preserves routine step editors, timer controls and discard confirmation',async t=>{
  const data=locationFixture();data.config.h.work.routine=true;
  for(const era of data.config.log)era.h.work.routine=true;
  data.config.routines.work={label:'Synthetic routine',icon:'W',col:'#4ade80',steps:[{label:'First step',icon:'1',dur:1},{label:'Second step',icon:'2',dur:1}]};
  const page=await open(t,data),before=await page.evaluate(()=>calcScore('2026-09-16'));
  await page.getByRole('button',{name:'Settings',exact:true}).click();await section(page,'Routines');
  const label=control(page,'change','stepSet',['work',0,'label'],'input');await label.fill('Synthetic renamed step');await label.press('Tab');
  const duration=control(page,'change','stepSet',['work',0,'dur'],'input');await duration.fill('2');await duration.press('Tab');
  assert.deepEqual(await page.evaluate(()=>[CFG.routines.work.steps[0].label,CFG.routines.work.steps[0].dur]),['Synthetic renamed step',2]);
  await page.getByRole('button',{name:'Back',exact:true}).click();await page.locator('.nav-btn[data-tab="today"]').click();
  if(await page.locator('.t-rout.collapsed').count())await control(page,'click','toggleTodayRoutines',[]).click();
  await page.locator('[data-ui-click="startRoutine"],[data-ui-click="openRoutine"]').filter({visible:true}).first().click();
  assert.equal(await page.evaluate(()=>routineId),'work');
  await control(page,'click','routineToggle',[],'button').click();assert.equal(await page.evaluate(()=>sessions.work.running),true);
  await control(page,'click','routineToggle',[],'button').click();assert.equal(await page.evaluate(()=>sessions.work.running),false);
  await control(page,'click','routineReset',[],'button').click();assert.equal(await page.evaluate(()=>timerSecs),120);
  await control(page,'click','routineSendToEnd',[],'button').click();assert.equal(await page.evaluate(()=>sessions.work.q[0]),1);
  await control(page,'click','routineNext',['work',1],'button').click();assert.equal(await page.evaluate(()=>sessions.work.q.length),1);
  page.once('dialog',dialog=>dialog.accept());await control(page,'click','discardCurrentRoutine',[],'button').click();
  assert.equal(await page.evaluate(()=>routineView),false);assert.equal(await page.evaluate(()=>Object.keys(sessions).length),0);
  assert.deepEqual(await page.evaluate(()=>calcScore('2026-09-16')),before);await noEventAttributes(page);
});
