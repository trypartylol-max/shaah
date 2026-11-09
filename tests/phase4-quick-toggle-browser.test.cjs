const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
for(const width of [880,1440])test(`Pro quick toggle has one fixed desktop anchor at ${width}`,async t=>{
 const p=await openApp(t,undefined,{width,height:1000});
 await p.evaluate(async()=>{arrivalDismiss();setTab('today');await flushCfgSaves()});
 const before=await p.evaluate(()=>JSON.stringify({CFG,_state,writes:__mockWrites.filter(r=>r.date!=='cfgbak')}));
 for(const skin of ['classic','aurora','matrix','minimal']){
  await p.evaluate(s=>{setSkin(s);setLayout('standard');setTab('today')},skin);
  const button=p.getByRole('button',{name:'Pro Mode',exact:true});
  const bounds=()=>button.evaluate(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
  const standard=await bounds();assert.equal(await button.getAttribute('aria-pressed'),'false');
  const note=p.locator('.t-note textarea');await note.fill('');
  await p.evaluate(()=>window.__quickNote=document.querySelector('.t-note textarea'));
  await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');
  if(width<1180)assert.deepEqual(await bounds(),standard,'Stable position in Standard and compact Pro');
  assert.equal(await note.evaluate(e=>e===window.__quickNote),true);
  assert.equal(await p.locator('html').getAttribute('data-skin'),skin);
  const controls=await p.evaluate(()=>{const a=document.querySelector('#layout-quick-toggle').getBoundingClientRect(),b=document.querySelector('#desktop-work-status').getBoundingClientRect();return {gap:a.left-b.right,top:a.top===b.top}});
  assert.equal(controls.gap,0);assert.equal(controls.top,true);
  for(const tab of ['log','social','stats','history']){
   await p.locator(`.nav-btn[data-tab="${tab}"]`).click();assert.deepEqual(await bounds(),standard);
   assert.equal(await p.locator('#mode-status').isVisible(),true);
   assert.equal(await p.evaluate(()=>document.querySelector('#scroll').scrollWidth>document.querySelector('#scroll').clientWidth+1),false);
  }
  await p.getByRole('button',{name:'Settings',exact:true}).click();
  assert.equal(await p.locator('[data-layout-choice="pro"]').getAttribute('aria-pressed'),'true');
  await p.locator('[data-layout-choice="standard"]').click();await p.evaluate(()=>closeSettings());
  assert.equal(await p.getByRole('button',{name:'Pro Mode',exact:true}).getAttribute('aria-pressed'),'false');
 }
 assert.equal(await p.evaluate(()=>JSON.stringify({CFG,_state,writes:__mockWrites.filter(r=>r.date!=='cfgbak')})),before);
});
test('Pro quick toggle is absent from mobile and leaves the native Work status visible',async t=>{
 const p=await openApp(t,undefined,{width:390,height:1000});await p.evaluate(()=>{setSkin('aurora');setLayout('pro');setTab('today')});
 assert.equal(await p.locator('#layout-quick-toggle').isVisible(),false);assert.equal(await p.locator('#mode-status').isVisible(),true);
 assert.equal(await p.locator('html').getAttribute('data-layout'),'standard');
});
