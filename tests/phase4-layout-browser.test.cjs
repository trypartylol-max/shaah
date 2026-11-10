const {test}=require('node:test');const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const skins=['classic','aurora','matrix','minimal'];
const snapshot=p=>p.evaluate(()=>JSON.stringify({config:CFG,days:_state,scores:Object.keys(_state).filter(k=>/^\d{4}-/.test(k)).map(k=>[k,calcScore(k)]),writes:__mockWrites.filter(r=>r.date!=='cfgbak')}));
async function warm(p){for(const tab of ['today','log','social','stats','history'])await p.locator(`.nav-btn[data-tab="${tab}"]`).click();await p.getByRole('button',{name:'Settings',exact:true}).click();await p.evaluate(async()=>{await flushCfgSaves();closeSettings()});}

for(const width of [880,1024,1180,1440])test(`Four skins combine with Pro without data writes at ${width}`,async t=>{
 const p=await openApp(t,undefined,{width,height:1000});await warm(p);const before=await snapshot(p);
 const colors=[];
 for(const skin of skins){
  await p.evaluate(s=>{setSkin(s);setLayout('pro')},skin);
  assert.equal(await p.locator('html').getAttribute('data-skin'),skin);
  assert.equal(await p.locator('html').getAttribute('data-layout'),'pro');
  for(const tab of ['today','log','social','stats','history']){
   await p.locator(`.nav-btn[data-tab="${tab}"]`).click();
   assert.equal(await p.evaluate(()=>document.querySelector('#scroll').scrollWidth>document.querySelector('#scroll').clientWidth+1),false,skin+' '+tab);
   if(tab==='today'){
    const box=await p.evaluate(()=>['.t-ring','.t-grade','.today-log-start'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {width:r.width,height:r.height}}));
    assert.ok(box[1].width>box[0].width*1.3,skin+' wide next level');
    if(width>=1180)assert.ok(await p.locator('#nav').evaluate(e=>e.getBoundingClientRect().width<200));
    colors.push(await p.locator('.t-rout .wg-card').evaluate(e=>getComputedStyle(e).backgroundColor));
   }
  }
  assert.equal(await snapshot(p),before,'Presentation leaves account data and history unchanged');
 }
 assert.equal(new Set(colors).size,4,'Four distinct Work surfaces');
 await p.getByRole('button',{name:'Settings',exact:true}).click();
 assert.equal(await p.locator('[data-skin-choice="pro"]').count(),0);
 assert.equal(await p.locator('[data-layout-choice="pro"]').getAttribute('aria-pressed'),'true');
});

for(const width of [320,390,879])test(`Pro preference has no mobile layout or palette effect at ${width}`,async t=>{
 const p=await openApp(t,undefined,{width,height:1000});
 for(const skin of skins){
  await p.evaluate(s=>{setSkin(s);setLayout('standard')},skin);
  for(const tab of ['today','log','social','stats','history']){
   await p.locator(`.nav-btn[data-tab="${tab}"]`).click();
   const appearance=()=>p.locator('#scroll,#nav,.t-ring,.wg-card,.t-lvl,.stats-metric-card').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return [r.x,r.y,r.width,r.height,c.backgroundColor,c.color,c.fontFamily,c.boxShadow]}));
   const before=await appearance();await p.evaluate(()=>setLayout('pro'));
   assert.equal(await p.locator('html').getAttribute('data-layout'),'standard');
   assert.deepEqual(await appearance(),before,skin+' '+tab+' mobile unchanged');
   await p.evaluate(()=>setLayout('standard'));
  }
 }
});

test('Layout persists independently of skin and preview, and follows viewport without saving again',async t=>{
 const p=await openApp(t,undefined,{width:1440,height:1000});
 await p.evaluate(()=>{setSkin('aurora');setLayout('pro');setTab('today')});
 const note=p.locator('.pro-today-grid textarea');await note.fill('Keep layout draft');
 await p.evaluate(()=>{window.__layoutNote=document.querySelector('.pro-today-grid textarea');setLayout('standard');setLayout('pro');previewSkin('matrix');cancelSkinPreview()});
 assert.equal(await note.inputValue(),'Keep layout draft');assert.equal(await note.evaluate(e=>e===window.__layoutNote),true);
 assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'aurora');assert.equal(await p.evaluate(()=>localStorage.getItem(LAYOUT_KEY)),'pro');
 await p.setViewportSize({width:390,height:1000});await p.waitForFunction(()=>document.documentElement.dataset.layout==='standard');
 assert.equal(await p.locator('html').getAttribute('data-skin'),'aurora');
 await p.setViewportSize({width:1440,height:1000});await p.waitForFunction(()=>document.documentElement.dataset.layout==='pro');
 await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await p.locator('html').getAttribute('data-skin'),'aurora');assert.equal(await p.locator('html').getAttribute('data-layout'),'pro');
});

for(const mode of ['normal','blocked-backup'])test(`Legacy Pro is preserved by the ${mode} migration`,async t=>{
 const p=await openApp(t,undefined,{width:1440,height:1000},{beforePage:async context=>{
  await context.addInitScript(mode=>{
   const set=Storage.prototype.setItem;
   if(!localStorage.getItem('phase4-seeded')){set.call(localStorage,'phase4-seeded','1');set.call(localStorage,'shaah:skin:v1','pro');}
   if(mode==='blocked-backup')Storage.prototype.setItem=function(k,v){if(k==='shaah:appearance:legacy-pro:v1')throw new DOMException('blocked','QuotaExceededError');return set.call(this,k,v)};
  },mode);
 }});
 assert.equal(await p.locator('html').getAttribute('data-skin'),'classic');assert.equal(await p.locator('html').getAttribute('data-layout'),'pro');
 assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),mode==='normal'?'classic':'pro');
 if(mode==='normal'){
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(PRO_MIGRATION_KEY)).previousSkin),'pro');
  await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);assert.equal(await p.locator('html').getAttribute('data-layout'),'pro');
 }
});

test('Layout storage failures and remote changes preserve skin and unsaved inputs',async t=>{
 const p=await openApp(t);await p.evaluate(()=>{setSkin('matrix');setLayout('standard')});
 await p.getByRole('button',{name:'Settings',exact:true}).click();
 await p.evaluate(()=>{window.__layoutSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===LAYOUT_KEY)throw new DOMException('blocked','QuotaExceededError');return window.__layoutSet.call(this,k,v)}});
 await p.locator('[data-layout-choice="pro"]').click();
 assert.match(await p.locator('#layout-status').innerText(),/durante esta sesión|for this session/);
 assert.equal(await p.evaluate(()=>localStorage.getItem(LAYOUT_KEY)),'standard');
 assert.equal(await p.locator('html').getAttribute('data-skin'),'matrix');
 await p.evaluate(()=>{Storage.prototype.setItem=window.__layoutSet;closeSettings();setTab('today')});
 const note=p.locator('.pro-today-grid textarea');await note.fill('Remote layout draft');
 const other=await p.context().newPage();await other.goto('http://shaah.test/');await other.waitForFunction(()=>_cfgReady&&_live);await other.evaluate(()=>{setLayout('pro');setLayout('standard')});
 await p.waitForFunction(()=>document.documentElement.dataset.layout==='standard');
 assert.equal(await note.inputValue(),'Remote layout draft');assert.equal(await p.locator('html').getAttribute('data-skin'),'matrix');
});
