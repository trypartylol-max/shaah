const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
function fixture(){const a=loadApp();a.run("CFG.h.sleep={l:'Wake Up and Sleep Early',p:8,pWork:8,pVacation:8,lv:2,on:true};CFG.order.push('sleep');for(const e of CFG.log){e.h.sleep={...CFG.h.sleep};e.order.push('sleep')}_dayCfgCache={};applyCfg();_state[todayKey()]={checks:{},social:blankSocial(),people:[],note:'',_daylog:[]}");return {config:a.read('CFG'),days:a.read('_state')};}
for(const width of [390,1440])test(`Wake and Sleep retain complementary times and shared score across reload at ${width}px`,async t=>{
 const p=await openApp(t,fixture(),{width,height:1000});
 const row=p.locator('[data-ui-click="toggleHabit"][data-ui-click-args*="sleep"]');
 await p.clock.setFixedTime(new Date('2026-10-16T07:00:00Z'));await p.evaluate(()=>{lvlOpen[2]=true;setTab('today')});
 const baseScore=await p.evaluate(()=>calcScore(todayKey()).score);await row.click();
 assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),baseScore+4);
 assert.deepEqual(await p.evaluate(()=>dayLogEvents(todayKey()).map(e=>[e.meta.sleepRole,e.start])),[['wake','2026-10-16T07:00:00.000Z']]);
 await p.clock.setFixedTime(new Date('2026-10-16T23:00:00Z'));await row.click();
 assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),baseScore+8);
 const events=await p.evaluate(()=>dayLogEvents(todayKey()));assert.deepEqual(events.map(e=>[e.meta.sleepRole,e.start]),[['wake','2026-10-16T07:00:00.000Z'],['sleep','2026-10-16T23:00:00.000Z']]);
 assert.equal(await p.evaluate(()=>dayLogActiveId()),null);await p.evaluate(()=>setTab('log'));
 assert.equal(await p.locator('.logdesk-activity-sub').filter({hasText:/^WAKE$/}).count(),1);
 assert.equal(await p.locator('.logdesk-activity-sub').filter({hasText:/^SLEEP$/}).count(),1);
 assert.equal(await p.evaluate(()=>dayLogSummary(todayKey()).tracked),0);
 await p.waitForFunction(()=>__mockWrites.some(r=>r.date===todayKey()&&r.data._checks?.sleep===true&&r.data._daylog?.length===2));
 await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);await p.evaluate(()=>setTab('log'));
 assert.deepEqual(await p.evaluate(()=>dayLogEvents(todayKey())),events);
 const writes=await p.evaluate(()=>__mockWrites.length);await p.evaluate(()=>{setTab('today');setTab('log');setTab('today');setTab('log')});
 await p.waitForTimeout(650);assert.equal(await p.evaluate(()=>__mockWrites.length),writes);
 await p.evaluate(()=>{lvlOpen[2]=true;setTab('today')});await row.click();
 assert.equal(await p.evaluate(()=>getChecked(todayKey()).sleep),false);assert.equal(await p.evaluate(()=>dayLogEvents(todayKey()).length),0);
});
