const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
function fixture(){const a=loadApp();a.run(`for(const id of ['production','wod'])CFG.h[id]={...LEGACY_CFG.h[id],pWork:15,pVacation:15};CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;`);return {config:a.read('CFG'),days:a.read('_state')};}
test('compact routine parity across every selectable skin, widths and credit states',async t=>{
 const page=await openApp(t,fixture());await page.evaluate(()=>{setTab('today');todayRoutinesOpen=true;render()});
 const history=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey()))));
 for(const skin of await page.evaluate(()=>SKINS.map(s=>s.id))){
  await page.evaluate(s=>setSkin(s),skin);
  for(const width of [320,390,768,879,880,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   for(const credit of [false,0.5,true]){
    await page.evaluate(v=>{const d=_state[todayKey()];d.checks.production=v;d.checks.wod=v;todayRoutinesOpen=true;render()},credit);
    const measures=[];
    for(const id of ['production','wod']){
     const card=page.locator(`[data-routine-card="${id}"]`);
     assert.deepEqual(await card.locator('button').allTextContents(),['LIGHT','DONE','START']);
     assert.equal(await card.locator('circle,.cr-card-state,.cr-card-session,.r-step').count(),0);
     const m=await card.evaluate(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,overflow:e.scrollWidth>e.clientWidth+1,buttons:[...e.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return {w:q.width,h:q.height,y:q.y,bottom:q.bottom<=r.bottom+1}})}});
     assert.equal(m.overflow,false,`${skin} ${width}`);assert.ok(m.buttons.every(b=>b.h>=44&&b.bottom));assert.ok(Math.max(...m.buttons.map(b=>b.w))-Math.min(...m.buttons.map(b=>b.w))<1);assert.ok(Math.max(...m.buttons.map(b=>b.y))-Math.min(...m.buttons.map(b=>b.y))<1);measures.push(m);
    }
    assert.ok(Math.abs(measures[0].w-measures[1].w)<1);assert.ok(Math.abs(measures[0].h-measures[1].h)<1,`${skin} ${width} symmetric height`);
    assert.equal(await page.evaluate(()=>document.querySelector('#scroll').scrollWidth<=innerWidth),true);
   }
  }
 }
 await page.setViewportSize({width:320,height:700});
 await page.evaluate(()=>{ROUTINES.production.label='Production with an unusually long custom routine name';todayRoutinesOpen=true;render()});
 assert.equal(await page.locator('[data-routine-card="production"]').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await page.locator('.t-rout-toggle').click();assert.equal(await page.locator('[data-routine-card="production"]').isVisible(),false);
 await page.locator('.t-rout-toggle').click();assert.equal(await page.locator('[data-routine-card="production"]').isVisible(),true);
 await page.evaluate(()=>{ROUTINES.production.label='Production';render()});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{setSkin('glow');_state[todayKey()].checks={};render()});
 const card=page.locator('[data-routine-card="production"]');
 for(const [name,value] of [['LIGHT',0.5],['LIGHT',false],['DONE',true],['DONE',false]]){
  await card.getByRole('button',{name,exact:true}).click();assert.equal(await page.evaluate(()=>getChecked(todayKey()).production),value);
 }
 await card.getByRole('button',{name:'START',exact:true}).click();assert.equal(await page.evaluate(()=>sessions.production.running),false);
 await page.evaluate(()=>{routineToggle();sessions.production.endAt=Date.now()+45000;routineToggle();exitRoutine()});
 await card.getByRole('button',{name:'START',exact:true}).click();assert.equal(await page.evaluate(()=>sessions.production.running),true);assert.equal(await page.evaluate(()=>sessions.production.secs),45);
 await page.evaluate(()=>exitRoutine());await card.getByRole('button',{name:'START',exact:true}).click();assert.equal(await page.evaluate(()=>sessions.production.secs),45);
 await page.evaluate(()=>exitRoutine());await card.getByRole('button',{name:'DONE',exact:true}).click();assert.equal(await page.evaluate(()=>!!sessions.production),false);
 await page.evaluate(()=>{closeRoutine('production');document.querySelector('#scroll').scrollTop=0});
 await page.screenshot({path:'test-results/core-compact-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/core-compact-desktop.png'});
 assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())))),history);
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);assert.equal(await page.evaluate(()=>getChecked(todayKey()).production),true);
});
