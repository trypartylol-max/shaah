const test=require('node:test'),assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
for(const width of [390,1440])test(`sign-out and fresh sign-in preserve data and skip the welcome at ${width}px`,async t=>{
 const p=await openApp(t,undefined,{width,height:900},{stayOnToday:true});
 const before=await p.evaluate(()=>JSON.stringify({cfg:CFG,days:_state}));
 await p.evaluate(()=>{window.returningUser={...USER,last_sign_in_at:'new-session'};__emitMockAuth('SIGNED_OUT',null)});
 assert.equal(await p.evaluate(()=>USER),null);
 await p.evaluate(()=>__emitMockAuth('SIGNED_IN',returningUser));
 await p.waitForFunction(()=>_cfgReady);
 assert.equal(await p.locator('#arrival-welcome').count(),0);
 assert.equal(await p.evaluate(()=>JSON.stringify({cfg:CFG,days:_state})),before);
 await p.locator('.nav-btn[data-tab="social"]').click();
 assert.equal(await p.evaluate(()=>currentTab),'social');
 assert.equal(await p.locator('#arrival-welcome').count(),0);
 assert.equal(await p.evaluate(()=>_arrivalTimer),null);
});
