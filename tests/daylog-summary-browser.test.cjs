const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
for(const width of [320,390,1440])test(`day summary counts concurrent/open activity and refreshes without losing typed input at ${width}px`,async t=>{
 const p=await openApp(t,undefined,{width,height:1000});await p.waitForTimeout(2300);
 await p.evaluate(()=>{
  _state[todayKey()]={checks:{},social:blankSocial(),people:[],note:'',_daylog:[
   {id:'work',title:'Synthetic work',type:'manual',start:todayKey()+'T10:00:00Z',end:todayKey()+'T11:00:00Z'},
   {id:'call',title:'Synthetic call',type:'manual',start:todayKey()+'T10:30:00Z',end:todayKey()+'T11:30:00Z'},
   {id:'open',title:'Synthetic ongoing',type:'manual',start:todayKey()+'T11:30:00Z',end:null}]
  };setTab('log');
 });
 const summary=p.getByRole('region',{name:'Day summary'});
 assert.equal(await summary.locator('[data-summary-time]').textContent(),'2h 30m');
 assert.equal(await summary.locator('[data-summary-ongoing]').textContent(),'1');
 assert.equal(await p.locator('[data-daylog-duration="open"]').textContent(),'30m');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const state=await p.evaluate(()=>JSON.stringify(_state));const writes=await p.evaluate(()=>__mockWrites.length);
 await p.locator('#logPanelName').fill('Unsaved draft — preserve');
 await p.clock.setFixedTime(new Date('2026-10-16T12:30:00Z'));await p.clock.runFor(30001);
 assert.equal(await summary.locator('[data-summary-time]').textContent(),'3h');
 assert.equal(await p.locator('[data-daylog-duration="open"]').textContent(),'1h');
 assert.equal(await p.locator('#logPanelName').inputValue(),'Unsaved draft — preserve');
 assert.equal(await p.evaluate(()=>JSON.stringify(_state)),state);
 assert.equal(await p.evaluate(()=>__mockWrites.length),writes);
 if(width===390){await p.evaluate(()=>{document.activeElement?.blur();document.getElementById('scroll').scrollTop=0});await summary.screenshot({path:'test-results/daylog-summary-mobile.png'});}
});
