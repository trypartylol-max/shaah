const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
function proFixture(){
 const a=loadApp();a.run(`
 CFG.h=Object.fromEntries(Object.entries(LEGACY_CFG.h).map(([id,h])=>[id,{...h,pWork:h.p,pVacation:h.p}]));CFG.order=[...LEGACY_CFG.order];
 CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];
 CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));
 for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order];}
 CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;
 _state['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]};`);
 return {config:a.read('CFG'),days:a.read('_state')};
}
const state=page=>page.evaluate(()=>JSON.stringify({config:CFG,days:_state}));
test('Pro Mode picker persists and changes presentation without replacing drafts or writing data',async t=>{
 const p=await openApp(t,proFixture());
 await p.getByRole('button',{name:'Settings',exact:true}).click();
 await p.locator('[data-layout-choice="pro"]').click();
 assert.equal(await p.locator('html').getAttribute('data-layout'),'pro');
 await p.evaluate(()=>{closeSettings();setTab('today')});
 const note=p.locator('textarea:visible').first();await note.fill('Keep my unsaved draft');
 const before=await state(p),writes=await p.evaluate(()=>__mockWrites.length);
 await p.evaluate(()=>{window.__proNote=document.activeElement;setLayout('standard');setLayout('pro')});
 assert.equal(await note.inputValue(),'Keep my unsaved draft');
 assert.equal(await note.evaluate(e=>e===window.__proNote&&e===document.activeElement),true);
 assert.equal(await state(p),before);assert.equal(await p.evaluate(()=>__mockWrites.length),writes);
 await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await p.locator('html').getAttribute('data-layout'),'pro');
});
test('Pro Mode desktop geometry, equal typography, overflow and legacy skin restoration',async t=>{
 const p=await openApp(t,proFixture());
 await p.evaluate(()=>{setLayout('pro');setTab('today');todayRoutinesOpen=true;lvlOpen={1:true,2:true,3:true};render()});
 for(const width of [880,1024,1180,1280,1440,1672,1920]){
  await p.setViewportSize({width,height:1000});
  const m=await p.evaluate(()=>{
   const box=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();const z=parseFloat(getComputedStyle(document.documentElement).zoom)||1;return {x:r.x/z,y:r.y/z,w:r.width/z,h:r.height/z,overflow:e.scrollWidth>e.clientWidth+1}};
   const font=s=>getComputedStyle(document.querySelector(s)).fontSize;
   return {ring:box('.t-ring'),next:box('.t-grade'),log:box('.today-log-start'),status:box('#desktop-status-controls'),nav:box('#nav'),headings:['.t-lvl2 .lvl-toggle','.t-lvl3 .lvl-toggle','.sf-combo-heading strong'].map(font),items:['.t-lvl2 .row>div>span','.t-lvl3 .row>div>span','.sf-category-toggle>span'].map(font),overflow:document.querySelector('#scroll').scrollWidth>document.querySelector('#scroll').clientWidth+1};
  });
  assert.ok(m.next.w>m.ring.w*1.5&&m.next.w>m.log.w*1.5,JSON.stringify(m));
  assert.equal(m.ring.h,m.next.h);
  if(width>=1180){
   // Two independent boxes share the Log column: Work/Pro on top, 8px, Day Log below.
   assert.ok(Math.abs(m.status.y-m.ring.y)<1&&Math.abs(m.log.y+m.log.h-(m.ring.y+m.ring.h))<1,JSON.stringify(m));
   assert.ok(Math.abs(m.log.y-(m.status.y+m.status.h)-8)<1&&Math.abs(m.status.x-m.log.x)<1&&Math.abs(m.status.w-m.log.w)<1,JSON.stringify(m));
  }else{assert.ok(Math.abs(m.next.h-m.log.h-0)<1);assert.ok(Math.abs(m.log.y-m.ring.y-0)<1);}
  assert.equal(m.overflow,false);
  assert.equal(new Set(m.headings).size,1,JSON.stringify(m));assert.equal(new Set(m.items).size,1,JSON.stringify(m));
  if(width>=1180){assert.ok(Math.abs(m.nav.w-176)<.1);assert.ok(m.ring.x>=176);}
  for(const card of await p.locator('.t-rout-body>.sf-core-routine').all())assert.equal(await card.evaluate(e=>e.scrollWidth>e.clientWidth+1),false,JSON.stringify({width,card:await card.evaluate(e=>({text:e.textContent,w:e.clientWidth,s:e.scrollWidth}))}));
  if(width===1672){await p.evaluate(()=>document.querySelector('#scroll').scrollTop=0);await p.waitForTimeout(250);assert.ok(await p.locator('#tb-date').evaluate(e=>e.getBoundingClientRect().x<176));await p.screenshot({path:'test-results/pro-mode-desktop.png'});}
 }
 await p.evaluate(()=>setLayout('standard'));
 assert.ok(await p.locator('#nav').evaluate(e=>e.getBoundingClientRect().width>1000));
 assert.equal(await p.locator('.t-ring').evaluate(e=>getComputedStyle(e).borderTopStyle),'none');
});
test('Pro Mode mobile retains original geometry; desktop controls and routine orb remain usable',async t=>{
 const p=await openApp(t,proFixture(),{width:390,height:844});await p.evaluate(()=>setTab('today'));
 const geometry=()=>p.locator('.t-ring,.t-grade,.t-lvl2,.t-lvl3,#nav').evaluateAll(ns=>ns.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));
 for(const width of [320,390,879]){
  await p.setViewportSize({width,height:900});await p.evaluate(()=>setLayout('standard'));const before=await geometry();
  await p.evaluate(()=>setLayout('pro'));assert.deepEqual(await geometry(),before);
 }
 await p.setViewportSize({width:1440,height:1000});
 await p.evaluate(()=>{todayRoutinesOpen=true;lvlOpen[2]=true;render()});
 const before=await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey()))));
 const work=p.locator('.t-rout .wg-card');await work.click();assert.ok(await p.evaluate(()=>getChecked(todayKey()).work)>0);
 const prod=p.locator('[data-routine-card="production"]');await prod.getByRole('button',{name:'LIGHT',exact:true}).click();assert.equal(await p.evaluate(()=>getChecked(todayKey()).production),.5);
 await prod.getByRole('button',{name:'DONE',exact:true}).click();assert.equal(await p.evaluate(()=>getChecked(todayKey()).production),true);
 await prod.getByRole('button',{name:'PLAY',exact:true}).click();await p.getByRole('button',{name:'Close routine',exact:true}).click();
 assert.equal(await p.locator('.cr-log-orb').isVisible(),true);
 const orb=await p.locator('.cr-log-orb').boundingBox(),next=await p.locator('.t-grade').boundingBox();assert.ok(orb.x>=next.x+next.width);
 await p.locator('.cr-orb-add').click();await p.locator('#logPanelName').waitFor();
 await p.locator('.nav-btn[data-tab="today"]').click();await p.getByRole('button',{name:'Settings',exact:true}).click();
 assert.equal(await p.locator('#nav').isVisible(),false);await p.evaluate(()=>closeSettings());
 for(const tab of ['log','social','stats','history','today']){await p.locator(`.nav-btn[data-tab="${tab}"]`).click();assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);if(tab!=='today'){const tray=await p.locator('#resume').boundingBox();assert.ok(tray.y>=0&&tray.y+tray.height<=1000);}}
 assert.equal(await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())))),before);
});


test('refined sidebar, two-row single-open Social, note and confirmed Reset preserve state',async t=>{
 const data=proFixture();
 const family={id:'family',label:'Family',icon:'👪',p:2,pWork:2,pVacation:2};data.config.subs.push(family);for(const e of data.config.log)e.subs.push({...family});
 data.config.people.push(...Array.from({length:20},(_,i)=>({id:'ref'+i,name:'Person '+i,sub:i<10?'friends':'family',every:14})));
 const p=await openApp(t,data,{width:1440,height:900});
 await p.evaluate(()=>{setLayout('pro');setTab('today');todayRoutinesOpen=true;lvlOpen={1:true,2:true,3:true};render()});
 await p.waitForTimeout(200);await p.screenshot({path:'test-results/pro-refined-desktop.png'});
 const before=await state(p),writes=await p.evaluate(()=>__mockWrites.length);
 const cat=id=>p.locator(`[data-combo-id="${id}"]`);
 await cat('friends').locator('.sf-category-toggle').click();
 assert.equal(await cat('friends').locator('.sf-category-toggle').getAttribute('aria-expanded'),'true');
 await cat('family').locator('.sf-category-toggle').click();
 assert.equal(await cat('friends').locator('.sf-category-toggle').getAttribute('aria-expanded'),'false');
 assert.equal(await cat('family').locator('.sf-category-toggle').getAttribute('aria-expanded'),'true');
 assert.equal(await state(p),before);assert.equal(await p.evaluate(()=>__mockWrites.length),writes);
 const list=cat('family').locator('.sf-buttons');assert.ok(await list.evaluate(e=>e.scrollHeight>e.clientHeight));assert.ok(await list.evaluate(e=>e.clientHeight)<=90);
 const person=cat('family').getByRole('button',{name:'Person 10',exact:true});await person.click();assert.equal(await person.getAttribute('aria-pressed'),'true');assert.equal(await person.innerText(),'Person 10');
 const selected=await p.evaluate(()=>JSON.stringify(getPeople(todayKey())));
 await cat('friends').locator('.sf-category-toggle').click();assert.equal(await p.evaluate(()=>JSON.stringify(getPeople(todayKey()))),selected);
 const note=p.locator('.pro-today-grid textarea');await note.fill('Sidebar note persists');await note.blur();
 assert.equal(await p.evaluate(()=>getNote(todayKey())),'Sidebar note persists');
 const geometry=await p.evaluate(()=>{const r=s=>{const a=document.querySelector(s).getBoundingClientRect();return {x:a.x,y:a.y,b:a.bottom,w:a.width,h:a.height}};return {note:r('.pro-today-grid textarea'),status:r('#desktop-status-controls'),settings:r('.pro-nav-settings'),reset:r('.t-reset'),date:r('#tb-date'),lower:r('.t-lvl2')}});
 assert.ok(geometry.note.x>geometry.settings.x&&geometry.note.h>0);assert.ok(geometry.settings.b<=geometry.reset.y);
 assert.ok(geometry.date.x<176);assert.ok(geometry.lower.b<850,JSON.stringify(geometry));
 const cards=await p.locator('.t-lvl2,.t-lvl3,.t-social-independent').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {y:r.y,w:r.width,h:r.height}}));
 assert.equal(cards.length,3);assert.ok(cards.every(c=>Math.abs(c.y-cards[0].y)<1&&Math.abs(c.w-cards[0].w)<1));assert.ok(cards[0].h>cards[1].h+50,JSON.stringify(cards));
 await p.waitForTimeout(350);const social=p.locator('.t-social-independent');const expandedHeight=(await social.boundingBox()).height;
 await cat('friends').locator('.sf-category-toggle').click();await p.waitForTimeout(350);assert.ok((await social.boundingBox()).height<expandedHeight-30);
 const habits=p.locator('.t-lvl2');const habitsHeight=(await habits.boundingBox()).height;await habits.locator('.lvl-toggle').click();await p.waitForTimeout(350);assert.ok((await habits.boundingBox()).height<habitsHeight-100);await habits.locator('.lvl-toggle').click();
 await p.getByRole('button',{name:'Reset day',exact:true}).click();await p.getByRole('button',{name:'Cancel deletion',exact:true}).click();assert.equal(await p.evaluate(()=>getNote(todayKey())),'Sidebar note persists');
 for(const size of [{width:1180,height:900},{width:1280,height:720},{width:1920,height:1080}]){await p.setViewportSize(size);await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);assert.ok(await p.evaluate(()=>document.querySelector('.nav-btn[data-tab="history"]').getBoundingClientRect().right<=document.querySelector('.pro-today-grid textarea').getBoundingClientRect().left));}
});

test('Pro sidebar shares today note across tabs, aligns tabs and keeps fixed desktop controls in every tab',async t=>{
 const p=await openApp(t,proFixture(),{width:1440,height:900});
 await p.evaluate(()=>{setLayout('pro');setTab('today')});
 const note=()=>p.locator('.pro-today-grid textarea:visible, .pro-sidebar-note textarea:visible');
 await note().fill('One daily note across tabs');await note().blur();
 for(const tab of ['today','log','social','stats','history']){
  await p.locator(`.nav-btn[data-tab="${tab}"]`).click();
  assert.equal(await note().inputValue(),'One daily note across tabs',tab);
  const box=await p.locator('.pro-nav-settings').boundingBox();assert.equal(Math.round(box.y+box.height),tab==='today'?824:884,tab);
  assert.equal(await p.locator('#mode-status').isVisible(),true);
  assert.equal(await p.locator('#sync-status').isVisible(),true);
  if(tab!=='today'){const status=await p.locator('#desktop-status-controls').boundingBox();assert.equal(status.y,20);assert.ok(status.x>1100);}
  if(tab!=='today')assert.ok(await note().evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('.pro-nav-settings').getBoundingClientRect().top));
  assert.ok(await p.locator('#nav .nav-btn').evaluateAll(es=>es.every(e=>getComputedStyle(e).justifyContent==='flex-start')));
  assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
 }
 await note().fill('Edited in History');await note().blur();
 await p.locator('.nav-btn[data-tab="today"]').click();assert.equal(await note().inputValue(),'Edited in History');
 const gap=await p.evaluate(()=>{const s=document.querySelector('.pro-nav-settings').getBoundingClientRect(),r=document.querySelector('.t-reset').getBoundingClientRect();const line=r.top+parseFloat(getComputedStyle(document.querySelector('.t-reset'),'::before').top);return [line-s.bottom,r.top-line]});assert.ok(Math.abs(gap[0]-gap[1])<1,JSON.stringify(gap));
 await p.locator('.nav-btn[data-tab="stats"]').click();
 await p.evaluate(()=>setLayout('standard'));assert.equal(await p.locator('.pro-sidebar-note').isVisible(),false);
 await p.evaluate(()=>setLayout('pro'));assert.equal(await note().inputValue(),'Edited in History');
 await p.setViewportSize({width:390,height:844});assert.equal(await p.locator('.pro-sidebar-note').isVisible(),false);
 await p.setViewportSize({width:1280,height:720});assert.ok(await note().evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.nav-btn[data-tab="history"]').getBoundingClientRect().bottom));
 await p.setViewportSize({width:1440,height:900});await p.screenshot({path:'test-results/pro-sidebar-stats.png'});
 await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);await p.evaluate(()=>setTab('today'));assert.equal(await note().inputValue(),'Edited in History');
});

test('navigation icons stay consistent across all skins on mobile and desktop',async t=>{
 const p=await openApp(t,proFixture());
 await p.evaluate(()=>setTab('today'));
 const writes=await p.evaluate(()=>__mockWrites.length),before=await state(p);
 for(const width of [390,1440]){
  await p.setViewportSize({width,height:900});
  for(const skin of ['classic','glow','matrix','minimal','aurora','pro']){
   await p.evaluate(s=>{setLayout(s==='pro'?'pro':'standard');setSkin(s==='pro'?'classic':s)},skin);
   const ids=await p.locator('#nav .nav-btn[data-tab] .navigation-icon').evaluateAll(es=>es.map(e=>e.dataset.navigationIcon));
   assert.deepEqual(ids,['today','log','social','stats','history']);
   const settings=p.locator(skin==='pro'&&width>=1180?'.pro-nav-settings .navigation-icon':'#gear .navigation-icon');assert.equal(await settings.isVisible(),true,skin+' '+width);
   assert.equal(await p.locator('.reset-day-trigger .navigation-icon[data-navigation-icon="reset"]').isVisible(),true);
   assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
  }
 }
 assert.equal(await state(p),before);assert.equal(await p.evaluate(()=>__mockWrites.length),writes);
 await p.evaluate(()=>setLayout('pro'));
 const aligned=await p.evaluate(()=>{const r=e=>e.getBoundingClientRect();const nav=r(document.querySelector('.nav-btn[data-tab="today"] .navigation-icon')),settings=r(document.querySelector('.pro-nav-settings .navigation-icon')),reset=r(document.querySelector('.reset-day-trigger .navigation-icon'));return [nav.x,settings.x,reset.x]});assert.ok(Math.max(...aligned)-Math.min(...aligned)<1,JSON.stringify(aligned));
 await p.screenshot({path:'test-results/pro-narrow-global-icons.png'});
});
