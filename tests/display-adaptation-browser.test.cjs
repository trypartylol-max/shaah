const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const geometry=p=>p.locator('#app,#nav,.t-ring,.t-grade,.ls-path,.ls-bar').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height]}));
test('global monitor adaptation spans every skin and view, and restores laptop geometry',async t=>{
 const p=await openApp(t,undefined,{width:1440,height:900});await p.evaluate(()=>{setSkin('pro');setTab('today')});
 const laptop=await geometry(p);
 await p.setViewportSize({width:2560,height:1440});await p.waitForFunction(()=>document.documentElement.style.getPropertyValue('--app-display-scale')==='1.6');
 for(const skin of ['classic','glow','matrix','minimal','aurora','pro']){
  await p.evaluate(s=>setSkin(s),skin);
  for(const tab of ['today','log','social','stats','history']){
   await p.evaluate(s=>setTab(s),tab);
   assert.equal(await p.locator('#app').evaluate(e=>Math.round(e.getBoundingClientRect().height)),1440);
   assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,skin+' '+tab);
  }
 }
 await p.evaluate(()=>{setSkin('pro');setTab('today')});
 assert.ok(await p.locator('.ls-bar').evaluate(e=>e.getBoundingClientRect().height>30));
 await p.setViewportSize({width:1440,height:900});await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-wide-display'));
 assert.deepEqual(await geometry(p),laptop);
});
