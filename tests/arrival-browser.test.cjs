const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
for(const width of [390,1440])test(`returning account opens directly without a welcome at ${width}px`,async t=>{
 const p=await openApp(t,undefined,{width,height:900},{stayOnToday:true});
 const before=await p.evaluate(()=>JSON.stringify({cfg:CFG,state:_state}));
 assert.equal(await p.locator('#arrival-welcome').count(),0);
 assert.equal(await p.locator('#nav').isVisible(),true);
 await p.evaluate(()=>{render();__emitMockAuth('TOKEN_REFRESHED',USER);__emitMockAuth('SIGNED_IN',{...USER,last_sign_in_at:'next-sign-in'})});
 assert.equal(await p.locator('#arrival-welcome').count(),0);
 assert.equal(await p.evaluate(()=>JSON.stringify({cfg:CFG,state:_state})),before);
 await p.reload();await p.waitForFunction(()=>_cfgReady);
 assert.equal(await p.locator('#arrival-welcome').count(),0);
 assert.equal(await p.locator('#tour.on').count(),0);
});
test('new account gets one automatic tour from exclusive initialization; refresh/new browser never replays it',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 assert.equal(await p.locator('#arrival-welcome').count(),0);assert.equal(await p.locator('#tour.on').count(),0);
 await p.getByRole('button',{name:/Focus/}).click();await p.getByRole('button',{name:'Start with this'}).click();
 await p.locator('#tour.on').waitFor();
 assert.equal(await p.evaluate(()=>CFG.starter.tutorial.state),'presented');
 fs.mkdirSync('test-results',{recursive:true});await p.waitForTimeout(200);await p.screenshot({path:'test-results/first-tutorial-mobile.png'});
 assert.equal(await p.evaluate(()=>__mockWrites.length),1);
 const before=await p.evaluate(()=>JSON.stringify({cfg:CFG,state:_state}));
 await p.getByRole('button',{name:'Skip / close',exact:true}).click();
 assert.equal(await p.evaluate(()=>tourStep),null);assert.equal(await p.locator('#tour.on').count(),0);
 await p.waitForTimeout(180);assert.equal(await p.locator('.arrival-tour-ghost').count(),0);
 assert.equal(await p.evaluate(()=>JSON.stringify({cfg:CFG,state:_state})),before);
 await p.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('shaah_auto_tour_')||k.startsWith('shaah_tour_')||k.startsWith('shaah_arrival_'))localStorage.removeItem(k)});
 await p.reload();await p.waitForFunction(()=>_cfgReady);
 assert.equal(await p.locator('#tour.on').count(),0);assert.equal(await p.locator('#arrival-welcome').count(),0);
});
test('reduced motion skips arrival, tutorial entry and exit animations',async t=>{
 const p=await openApp(t);await p.emulateMedia({reducedMotion:'reduce'});
 await p.evaluate(()=>{arrivalDismiss();arrivalReset();del(arrivalSeenKey());arrivalPlanExisting();render()});
 assert.equal(await p.locator('#arrival-welcome').count(),0);

 await p.evaluate(()=>startTour());assert.equal(await p.locator('#tour .tour-card').evaluate(n=>n.getAnimations().length),0);
 await p.getByRole('button',{name:'Skip / close',exact:true}).click();assert.equal(await p.locator('.arrival-tour-ghost').count(),0);
});
test('sign-out and account switch remove the outgoing welcome and any exiting tour copy',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true,syntheticAccounts:{'other-user':fixture()}});
 await p.evaluate(()=>{startTour();tourDone();localStorage.setItem('shaah_mock_rows:other-user','[]');__emitMockAuth('SIGNED_IN',{id:'other-user'})});
 await p.waitForFunction(()=>_starterGate==='choose');assert.equal(await p.locator('#arrival-welcome').count(),0);assert.equal(await p.locator('.arrival-tour-ghost').count(),0);
 assert.equal(await p.locator('#tour.on').count(),0);
 await p.evaluate(()=>__emitMockAuth('SIGNED_OUT',null));assert.equal(await p.evaluate(()=>USER),null);
});
