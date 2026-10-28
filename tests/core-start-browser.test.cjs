const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
function fixture(){const a=loadApp();a.run(`for(const id of ['production','wod'])CFG.h[id]={...LEGACY_CFG.h[id],pWork:15,pVacation:15};CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;`);return {config:a.read('CFG'),days:a.read('_state')};}
test('centered native runner, keyboard closure, timer choices, Resume and responsive skins',async t=>{
 const page=await openApp(t,fixture());await page.evaluate(()=>setTab('today'));
 const before=await page.evaluate(()=>JSON.stringify(_state));
 await page.locator('[data-routine-card="production"]').getByRole('button',{name:'START',exact:true}).click();
 const dialog=page.locator('#cr-dialog');await dialog.waitFor({state:'visible'});
 assert.equal(await dialog.evaluate(e=>e.open),true);assert.equal(await dialog.getByRole('button',{name:'Move to End',exact:true}).count(),0);assert.equal(await page.locator('#timer-clock').textContent(),await page.evaluate(()=>routineTime(S().secs)));
 for(const skin of ['classic','glow','aurora']){await page.evaluate(s=>{document.documentElement.dataset.skin=s;document.documentElement.classList.toggle('shaah-aurora',s==='aurora')},skin);
 for(const [width,height] of [[400,694],[360,740],[390,844],[768,900],[879,900],[880,900],[1024,900],[1440,1000],[740,360]]){
 await page.setViewportSize({width,height});const r=await dialog.boundingBox();assert.ok(r.x>=12&&r.y>=0&&r.x+r.width<=width-12&&r.y+r.height<=height,JSON.stringify({skin,width,r}));assert.ok(Math.abs(r.x+r.width/2-width/2)<2);assert.ok(Math.abs(r.y+r.height/2-height/2)<2);assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 }
 }
 await page.setViewportSize({width:400,height:694});
 const reset=await dialog.getByRole('button',{name:'Reset Step',exact:true}).boundingBox(),timer=await dialog.locator('.cr-timer-face').boundingBox();assert.ok(reset.x+reset.width<=timer.x);assert.ok(reset.width>=44&&reset.height>=44);assert.equal(await dialog.locator('.cr-sequence').evaluate(e=>getComputedStyle(e).scrollbarWidth),'none');const list=await dialog.locator('.cr-sequence').boundingBox();assert.ok(list.height>=170,JSON.stringify(list));await dialog.locator('.cr-sequence').evaluate(e=>{e.scrollTop=100});assert.ok(await dialog.locator('.cr-sequence').evaluate(e=>e.scrollTop)>0);
 await page.setViewportSize({width:1440,height:1000});await dialog.getByRole('button',{name:'Start Step',exact:true}).click();await dialog.getByRole('button',{name:'Next →',exact:true}).click();assert.equal(await page.evaluate(()=>S().running),true);assert.equal(await page.evaluate(()=>Object.keys(S().done).length),1);
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>sessions.production.running),true);
 await page.locator('[data-routine-card="production"]').getByRole('button',{name:'START',exact:true}).click();await dialog.getByRole('button',{name:'Close routine'}).click();assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>sessions.production.running),true);
 assert.equal(await page.locator('.cr-log-orb').isVisible(),true);assert.equal(await page.locator('#resume').isVisible(),false);
 for(const width of [400,1440]){await page.setViewportSize({width,height:900});for(const tab of ['log','social','stats','history']){await page.evaluate(tab=>setTab(tab),tab);assert.equal(await page.locator('#resume.cr-mini-sessions .cr-mini').count(),1);await page.waitForFunction(()=>document.querySelector('#resume').getBoundingClientRect().bottom<=document.querySelector('#nav').getBoundingClientRect().top-4);}await page.evaluate(()=>setTab('today'));assert.equal(await page.locator('.cr-log-orb').isVisible(),true);assert.equal(await page.locator('#resume').isVisible(),false);}
 await page.locator('.cr-orb-button').click();assert.equal(await dialog.isVisible(),true);await dialog.getByRole('button',{name:'Pause',exact:true}).click();await dialog.getByRole('button',{name:'Close routine'}).click();assert.equal(await page.evaluate(()=>sessions.production.paused),true);
 const secs=await page.evaluate(()=>sessions.production.secs);await page.locator('[data-routine-card="production"]').getByRole('button',{name:'START',exact:true}).click();assert.equal(await page.evaluate(()=>S().running),true);assert.ok(await page.evaluate(()=>S().secs)<=secs);
 assert.equal(await page.evaluate(()=>JSON.stringify(_state)),before);
 await page.screenshot({path:'docs/core-start-desktop.png'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.screenshot({path:'docs/core-start-mobile.png'});
 await page.evaluate(()=>{S().running=true;S().endAt=Date.now()-1000;syncFromSession();exitRoutine()});await page.waitForTimeout(400);assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>sessions.production.running),false);
 await page.evaluate(()=>{openRoutine('production');while(S()?.q.length)routineNext()});assert.equal(await page.locator('[data-routine-card="production"] button[aria-pressed=true]').textContent(),'DONE');assert.equal(await page.evaluate(()=>dayLogEvents(todayKey()).filter(e=>e.type==='routine'&&e.sourceId==='production').length),1);
});
test('paused persistence, concurrent sessions, automatic zero and routine-only completion',async t=>{
 const page=await openApp(t,fixture());await page.evaluate(()=>setTab('today'));
 await page.evaluate(()=>{startRoutine('production');routineToggle();S().endAt=Date.now()+45000;routineToggle();exitRoutine();startRoutine('wod');routineToggle();exitRoutine()});
 assert.equal(await page.evaluate(()=>sessions.production.paused),true);assert.equal(await page.evaluate(()=>sessions.wod.running),true);
 await page.evaluate(()=>{const r=get(RKEY());r.routineId=null;r.routineView=false;set(RKEY(),r)});
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await page.evaluate(()=>sessions.production.secs),45);assert.equal(await page.evaluate(()=>sessions.production.paused),true);assert.equal(await page.evaluate(()=>sessions.wod.running),true);
 await page.evaluate(()=>{resumeRoutine('production');S().endAt=Date.now()-1000});await page.waitForFunction(()=>sessions.production.q[0]===1);assert.equal(await page.evaluate(()=>sessions.production.running),false);assert.equal(await page.evaluate(()=>sessions.wod.running),true);
 assert.equal(await page.evaluate(()=>dayLogEvents(todayKey()).filter(e=>e.type==='routine').length),0);
 const dialog=page.locator('#cr-dialog');await dialog.getByRole('button',{name:'Close routine'}).click();assert.equal(await dialog.count(),0);
 await page.evaluate(()=>{startRoutine('production');while(S()?.q.length>1)advanceSession('production');syncFromSession();routineToggle();S().endAt=Date.now()-1000;syncFromSession();exitRoutine()});
 await page.waitForFunction(()=>!sessions.production);assert.equal(await page.locator('#cr-dialog').count(),0);assert.equal(await page.evaluate(()=>getChecked(todayKey()).production),true);assert.equal(await page.evaluate(()=>dayLogEvents(todayKey()).filter(e=>e.type==='routine'&&e.sourceId==='production').length),1);assert.equal(await page.evaluate(()=>sessions.wod.running),true);
});
test('mobile Today embeds the routine timer in LOG circle and preserves the activity shortcut',async t=>{
 const page=await openApp(t,fixture(),{width:400,height:694});await page.evaluate(()=>{setTab('today');startRoutine('production');routineToggle();exitRoutine()});
 const before=await page.evaluate(()=>JSON.stringify(_state));assert.equal(await page.locator('.cr-log-orb').isVisible(),true);assert.equal(await page.locator('#resume').isVisible(),false);assert.equal(await page.locator('.cr-orb-button b').textContent(),await page.evaluate(()=>routineTime(sessions.production.secs)));
 await page.locator('.cr-orb-button').click();assert.equal(await page.locator('#cr-dialog').isVisible(),true);await page.locator('#cr-dialog').getByRole('button',{name:'Close routine'}).click();assert.equal(await page.evaluate(()=>sessions.production.running),true);
 await page.locator('.cr-orb-add').click();assert.equal(await page.evaluate(()=>currentTab),'log');assert.equal(await page.locator('#resume .cr-mini').isVisible(),true);assert.equal(await page.evaluate(()=>JSON.stringify(_state)),before);
});
