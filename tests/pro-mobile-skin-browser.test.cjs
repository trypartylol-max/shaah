const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const snapshot=p=>p.locator('#app *').evaluateAll(ns=>ns.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return [e.tagName,e.className,r.x,r.y,r.width,r.height,s.color,s.background,s.borderColor,s.boxShadow,s.filter,s.fontFamily]}));
test('A saved desktop Pro layout never changes mobile geometry or skin paint',async t=>{
 const p=await openApp(t);await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{arrivalDismiss();setTab('today')});await p.locator('#arrival-welcome').waitFor({state:'detached'});
 for(const width of [320,375,390,430,879]){
  await p.setViewportSize({width,height:900});
  for(const skin of ['classic','aurora','matrix','minimal']){
   await p.evaluate(s=>{setSkin(s);setLayout('standard')},skin);
   for(const tab of ['today','log','social','stats','history']){
    await p.evaluate(tab=>setTab(tab),tab);const before=await snapshot(p);
    await p.evaluate(()=>setLayout('pro'));assert.deepEqual(await snapshot(p),before,skin+' '+width+' '+tab);
    assert.equal(await p.locator('html').getAttribute('data-layout'),'standard');
    assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
    await p.evaluate(()=>setLayout('standard'));
   }
  }
 }
});
test('Desktop layout preference preserves mobile drafts, actions and persisted skin',async t=>{
 const p=await openApp(t,undefined,{width:375,height:900});await p.evaluate(()=>{setSkin('aurora');setTab('today')});
 const note=p.locator('textarea:visible').first();await note.fill('Mobile draft');
 const before=await p.evaluate(()=>JSON.stringify({CFG,_state,writes:__mockWrites}));
 await p.evaluate(()=>{window.__note=document.querySelector('.t-note textarea');setLayout('pro');setLayout('standard');setLayout('pro')});
 assert.equal(await note.inputValue(),'Mobile draft');assert.equal(await note.evaluate(e=>e===window.__note),true);
 assert.equal(await p.evaluate(()=>JSON.stringify({CFG,_state,writes:__mockWrites})),before);
 await p.locator('.wg-card:visible').click();assert.ok(await p.evaluate(()=>getChecked(todayKey()).work)>0);
 await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await p.locator('html').getAttribute('data-skin'),'aurora');assert.equal(await p.locator('html').getAttribute('data-layout'),'standard');
 assert.equal(await p.evaluate(()=>localStorage.getItem(LAYOUT_KEY)),'pro');
});
