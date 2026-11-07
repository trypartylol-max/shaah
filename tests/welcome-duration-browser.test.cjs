const test=require('node:test'),assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
test('welcome stays readable for seven seconds after entrance; rerender does not restart it',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await p.evaluate(async()=>{
  const n=document.getElementById('arrival-welcome');await Promise.all(n.getAnimations().map(a=>a.finished));
  window.welcomeEntered=performance.now();
  new MutationObserver(()=>{if(!n.isConnected)window.welcomeRemoved=performance.now()}).observe(n.parentNode,{childList:true});
 });
 await p.waitForTimeout(6300);assert.equal(await p.locator('#arrival-welcome').isVisible(),true);
 assert.equal(await p.locator('#arrival-welcome').getAttribute('aria-hidden'),null);
 await p.evaluate(()=>render());
 await p.locator('#arrival-welcome').waitFor({state:'detached',timeout:1800});
 const elapsed=await p.evaluate(()=>welcomeRemoved-welcomeEntered);assert.ok(elapsed>=6900&&elapsed<7900,elapsed);
});
for(const width of [390,1440])test(`click greeting or app dismisses smoothly without stealing the action at ${width}px`,async t=>{
 const p=await openApp(t,undefined,{width,height:900},{stayOnToday:true});
 const before=await p.evaluate(()=>JSON.stringify({cfg:CFG,days:_state}));
 await p.locator('#arrival-welcome h2').click();
 assert.equal(await p.locator('#arrival-welcome').getAttribute('aria-hidden'),'true');
 await p.locator('#arrival-welcome').waitFor({state:'detached'});
 await p.evaluate(()=>{arrivalReset();del(arrivalSeenKey());arrivalPlanExisting();render()});
 await p.locator('.nav-btn[data-tab="social"]').click();
 assert.equal(await p.evaluate(()=>currentTab),'social');
 await p.locator('#arrival-welcome').waitFor({state:'detached'});
 assert.equal(await p.evaluate(()=>JSON.stringify({cfg:CFG,days:_state})),before);
});
test('click during entrance cannot schedule another dismissal or affect a later account',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await p.evaluate(()=>{arrivalReset();del(arrivalSeenKey());arrivalPlanExisting();render();document.getElementById('arrival-welcome').click()});
 await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>_arrivalTimer),null);
 assert.equal(await p.locator('#arrival-welcome').count(),0);
});
