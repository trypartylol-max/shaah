const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const fs=require('node:fs');
const snapshot=(p,paint=false)=>p.locator('#app *').evaluateAll((ns,paint)=>ns.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return paint?[s.color,s.background,s.borderColor,s.boxShadow,s.filter]:[e.tagName,e.className,r.x,r.y,r.width,r.height,s.display,s.order,s.fontFamily,s.fontSize,s.lineHeight]}),paint);
async function demo(p,on){await p.evaluate(on=>{const sheet=[...document.styleSheets].find(s=>s.href?.includes('pro-mode.css'));if(!window.__mobileRules)window.__mobileRules=[sheet.cssRules[sheet.cssRules.length-2].cssText,sheet.cssRules[sheet.cssRules.length-1].cssText];if(on)for(const rule of window.__mobileRules)sheet.insertRule(rule,sheet.cssRules.length);else {sheet.deleteRule(sheet.cssRules.length-1);sheet.deleteRule(sheet.cssRules.length-1)}},on)}
test('mobile demo preserves all visible metrics; other skins and desktop paint unchanged',async t=>{
 const p=await openApp(t);await p.evaluate(()=>{setSkin('pro');setTab('today');todayRoutinesOpen=true;lvlOpen={1:true,2:true,3:true};render()});
 fs.mkdirSync('test-results/pro-mobile-release',{recursive:true});
 for(const width of [320,375,390,430,879]){
  await p.setViewportSize({width,height:900});
  const after=await snapshot(p);await demo(p,false);assert.deepEqual(await snapshot(p),after,`geometry ${width}`);await demo(p,true);
  for(const tab of ['today','log','social','stats','history']){await p.evaluate(tab=>setTab(tab),tab);assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,`${width} ${tab} overflow`);assert.equal(await p.locator('#scroll').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(12, 14, 24)');const surfaces=await p.locator('.card,.logdesk-list-card,.logdesk-timeline-card,.sf-core-routine,.t-lvl').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));assert.ok(surfaces.every(c=>c==='rgb(22, 25, 39)'),`${width} ${tab} surfaces: ${surfaces}`)}
  await p.evaluate(()=>setTab('today'));await p.screenshot({path:`test-results/pro-mobile-release/pro-${width}.png`,fullPage:true});
 }
 for(const skin of ['classic','aurora','matrix','minimal','glow','pro'])for(const width of skin==='pro'?[880,1180,1440]:[390,1440]){
  await p.setViewportSize({width,height:900});await p.evaluate(skin=>setSkin(skin),skin);await p.waitForTimeout(400);
  const before=await snapshot(p,true);await demo(p,false);assert.deepEqual(await snapshot(p,true),before,`${skin} ${width} paint`);await demo(p,true);
 }
});
test('mobile picker preserves drafts, data and persistent selection',async t=>{
 const p=await openApp(t,undefined,{width:375,height:900});
 await p.getByRole('button',{name:'Settings',exact:true}).click();await p.locator('[data-skin-choice="pro"]').click();await p.evaluate(()=>{closeSettings();setTab('today')});
 const note=p.locator('textarea').first();await note.fill('Mobile draft');
 const before=await p.evaluate(()=>JSON.stringify({CFG,_state,writes:__mockWrites}));
 await p.evaluate(()=>{window.__note=document.querySelector('textarea');setSkin('classic');setSkin('pro')});
 assert.equal(await note.inputValue(),'Mobile draft');assert.equal(await note.evaluate(e=>e===window.__note),true);
 assert.equal(await p.evaluate(()=>JSON.stringify({CFG,_state,writes:__mockWrites})),before);
 await p.locator('.wg-card').click();assert.ok(await p.evaluate(()=>getChecked(todayKey()).work)>0);
 for(const tab of ['log','social','stats','history','today'])await p.locator(`.nav-btn[data-tab="${tab}"]`).click();
 await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);assert.equal(await p.locator('html').getAttribute('data-skin'),'pro');
});
