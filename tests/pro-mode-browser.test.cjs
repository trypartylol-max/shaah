const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
function proFixture(){
 const a=loadApp();a.run(`
 CFG.h=Object.fromEntries(Object.entries(LEGACY_CFG.h).map(([id,h])=>[id,{...h,pWork:h.p,pVacation:h.p}]));CFG.order=[...LEGACY_CFG.order];
 CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];
 CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));
 for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order];}
 CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;
 _state['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]};`);
 return {config:a.read('CFG'),days:a.read('_state')};
}
const state=page=>page.evaluate(()=>JSON.stringify({config:CFG,days:_state}));
test('Pro Mode picker persists and changes presentation without replacing drafts or writing data',async t=>{
 const p=await openApp(t,proFixture());
 await p.getByRole('button',{name:'Settings',exact:true}).click();
 await p.locator('[data-skin-choice="pro"]').click();
 assert.equal(await p.locator('html').getAttribute('data-skin'),'pro');
 await p.evaluate(()=>{closeSettings();setTab('today')});
 const note=p.locator('textarea').first();await note.fill('Keep my unsaved draft');
 const before=await state(p),writes=await p.evaluate(()=>__mockWrites.length);
 await p.evaluate(()=>{window.__proNote=document.querySelector('textarea');setSkin('classic');setSkin('pro')});
 assert.equal(await note.inputValue(),'Keep my unsaved draft');
 assert.equal(await note.evaluate(e=>e===window.__proNote&&e===document.activeElement),true);
 assert.equal(await state(p),before);assert.equal(await p.evaluate(()=>__mockWrites.length),writes);
 await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await p.locator('html').getAttribute('data-skin'),'pro');
});
test('Pro Mode desktop geometry, equal typography, overflow and legacy skin restoration',async t=>{
 const p=await openApp(t,proFixture());
 await p.evaluate(()=>{setSkin('pro');setTab('today');todayRoutinesOpen=true;lvlOpen={1:true,2:true,3:true};render()});
 for(const width of [880,1024,1180,1280,1440,1672,1920]){
  await p.setViewportSize({width,height:1000});
  const m=await p.evaluate(()=>{
   const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,overflow:e.scrollWidth>e.clientWidth+1}};
   const font=s=>getComputedStyle(document.querySelector(s)).fontSize;
   return {ring:box('.t-ring'),next:box('.t-grade'),log:box('.today-log-start'),nav:box('#nav'),headings:['.t-lvl2 .lvl-toggle','.t-lvl3 .lvl-toggle','.sf-combo-heading strong'].map(font),items:['.t-lvl2 .row>div>span','.t-lvl3 .row>div>span','.sf-category-toggle>span'].map(font),overflow:document.querySelector('#scroll').scrollWidth>document.querySelector('#scroll').clientWidth+1};
  });
  assert.ok(m.next.w>m.ring.w*1.5&&m.next.w>m.log.w*1.5,JSON.stringify(m));
  assert.equal(m.ring.h,m.next.h);assert.equal(m.next.h,m.log.h);
  assert.ok(Math.abs(m.ring.y-m.log.y)<1);assert.equal(m.overflow,false);
  assert.equal(new Set(m.headings).size,1,JSON.stringify(m));assert.equal(new Set(m.items).size,1,JSON.stringify(m));
  if(width>=1180){assert.equal(m.nav.w,180);assert.ok(m.ring.x>=180);}
  for(const card of await p.locator('.t-rout-body>.sf-core-routine').all())assert.equal(await card.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
  if(width===1672){await p.evaluate(()=>document.querySelector('#scroll').scrollTop=0);await p.waitForTimeout(250);assert.ok(await p.locator('#tb-date').evaluate(e=>Math.abs(e.getBoundingClientRect().x-document.querySelector('.t-ring').getBoundingClientRect().x)<2));await p.screenshot({path:'test-results/pro-mode-desktop.png'});}
 }
 await p.evaluate(()=>setSkin('classic'));
 assert.ok(await p.locator('#nav').evaluate(e=>e.getBoundingClientRect().width>1000));
 assert.equal(await p.locator('.t-ring').evaluate(e=>getComputedStyle(e).borderTopStyle),'none');
});
test('Pro Mode mobile retains original geometry; desktop controls and routine orb remain usable',async t=>{
 const p=await openApp(t,proFixture(),{width:390,height:844});await p.evaluate(()=>setTab('today'));
 const geometry=()=>p.locator('.t-ring,.t-grade,.t-lvl2,.t-lvl3,#nav').evaluateAll(ns=>ns.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));
 for(const width of [320,390,879]){
  await p.setViewportSize({width,height:900});await p.evaluate(()=>setSkin('classic'));const before=await geometry();
  await p.evaluate(()=>setSkin('pro'));assert.deepEqual(await geometry(),before);
 }
 await p.setViewportSize({width:1440,height:1000});
 await p.evaluate(()=>{todayRoutinesOpen=true;lvlOpen[2]=true;render()});
 const before=await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey()))));
 const work=p.locator('.wg-card');await work.click();assert.ok(await p.evaluate(()=>getChecked(todayKey()).work)>0);
 const prod=p.locator('[data-routine-card="production"]');await prod.getByRole('button',{name:'LIGHT',exact:true}).click();assert.equal(await p.evaluate(()=>getChecked(todayKey()).production),.5);
 await prod.getByRole('button',{name:'DONE',exact:true}).click();assert.equal(await p.evaluate(()=>getChecked(todayKey()).production),true);
 await prod.getByRole('button',{name:'PLAY',exact:true}).click();await p.getByRole('button',{name:'Close routine',exact:true}).click();
 assert.equal(await p.locator('.cr-log-orb').isVisible(),true);
 const orb=await p.locator('.cr-log-orb').boundingBox(),next=await p.locator('.t-grade').boundingBox();assert.ok(orb.x>=next.x+next.width);
 await p.locator('.cr-orb-add').click();await p.locator('#logPanelName').waitFor();
 await p.locator('.nav-btn[data-tab="today"]').click();await p.getByRole('button',{name:'Settings',exact:true}).click();
 assert.equal(await p.locator('#nav').isVisible(),false);await p.evaluate(()=>closeSettings());
 for(const tab of ['log','social','stats','history','today']){await p.locator(`.nav-btn[data-tab="${tab}"]`).click();assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);}
 assert.equal(await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())))),before);
});
