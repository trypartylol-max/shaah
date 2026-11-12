const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
// Same routine fixture as core-start: Production available as a Core routine.
function fixture(){const a=loadApp();a.run(`for(const id of ['production','wod'])CFG.h[id]={...LEGACY_CFG.h[id],pWork:15,pVacation:15};CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;`);return {config:a.read('CFG'),days:a.read('_state')};}
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const rect=(p,s)=>p.evaluate(s=>{const e=[...document.querySelectorAll(s)].find(x=>x.getClientRects().length);if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}},s);
async function withOrb(p){await p.evaluate(()=>{if(!sessions.production){startRoutine('production');routineToggle();exitRoutine();}render()});await p.waitForTimeout(700);}

test('Pro Day Log box: no label, centred larger circle, X top-start and + in the opposite corner',async t=>{
 const p=await openApp(t,fixture(),{width:1440,height:900},{stayOnToday:true});
 await p.evaluate(()=>{arrivalDismiss?.();setLayout('pro');setTab('today');});await withOrb(p);
 for(const [width,min] of [[1180,100],[1440,116],[1920,116]]){
  await p.setViewportSize({width,height:900});await frame(p);
  const card=await rect(p,'.cr-log-orb'),circle=await rect(p,'.cr-orb-button'),x=await rect(p,'.product-orb-close'),plus=await rect(p,'.cr-orb-add'),status=await rect(p,'#desktop-status-controls');
  const ctx=JSON.stringify({width,card,circle,x,plus,status});
  assert.equal(await p.locator('.cr-log-orb .cr-orb-label').isVisible(),false,ctx);
  assert.ok(circle.w>=min&&Math.abs(circle.w-circle.h)<1,ctx);
  assert.ok(Math.abs((circle.l+circle.r)/2-(card.l+card.r)/2)<1.5&&Math.abs((circle.t+circle.b)/2-(card.t+card.b)/2)<1.5,ctx);
  assert.ok(x.l>=card.l&&x.t>=card.t&&x.l-card.l<16&&x.t-card.t<16,ctx);
  assert.ok(plus.r<=card.r&&plus.b<=card.b&&card.r-plus.r<16&&card.b-plus.b<16,ctx);
  assert.ok(status.b<card.t&&x.t>status.b,ctx);
 }
 await p.locator('.cr-orb-add').click();await p.locator('#logPanelName').waitFor();
});

test('Standard Today desktop: Work/Pro in the header corner like the gear; Log 8-20% smaller than the ring, idle and with a routine',async t=>{
 const p=await openApp(t,fixture(),{width:1440,height:900},{stayOnToday:true});
 await p.evaluate(()=>{arrivalDismiss?.();setLayout('standard');setTab('today');});
 for(const orb of [false,true]){
  if(orb)await withOrb(p);
  for(const [width,height] of [[880,900],[1180,900],[1440,900],[1920,1000],[1366,768],[1280,680]]){
   await p.setViewportSize({width,height});await frame(p);
   const status=await rect(p,'#desktop-status-controls'),gear=await rect(p,'#gear'),ring=await rect(p,'.t-ring>svg'),log=await rect(p,orb?'.cr-orb-button':'.today-log-start');
   const vw=await p.evaluate(()=>document.querySelector('#scroll').getBoundingClientRect().right);
   const ctx=JSON.stringify({orb,width,height,status,gear,ring,log});
   assert.ok(Math.abs(status.t-gear.t)<1.5&&Math.abs(status.h-gear.h)<1.5,ctx);
   assert.ok(Math.abs((vw-status.r)-gear.l)<2,ctx); // mirrors the gear's inset
   const ratio=log.w/ring.w;assert.ok(ratio>=0.8&&ratio<=0.92,ctx+' ratio '+ratio);
   assert.ok(Math.abs((log.t+log.b)/2-(ring.t+ring.b)/2)<2,ctx);
  }
  if(orb)assert.equal(await p.locator('.cr-log-orb .cr-orb-label').isVisible(),false);
 }
 await p.locator('#layout-quick-toggle').click();assert.equal(await p.locator('html').getAttribute('data-layout'),'pro');
});

test('Work/Pro scrolls away with the page on every tab instead of floating over it',async t=>{
 const p=await openApp(t,fixture(),{width:1280,height:520},{stayOnToday:true});
 for(const layout of ['standard','pro'])for(const tab of ['today','stats','history','social']){
  await p.evaluate(({layout,tab})=>{arrivalDismiss?.();setLayout(layout);setTab(tab);document.querySelector('#scroll').scrollTop=0},{layout,tab});await frame(p);
  const before=(await rect(p,'#desktop-status-controls')).t;
  const moved=await p.evaluate(()=>{const s=document.querySelector('#scroll');s.scrollTop=120;return s.scrollTop});await frame(p);
  const after=(await rect(p,'#desktop-status-controls')).t;
  if(moved>0)assert.ok(Math.abs(before-moved-after)<1.5,JSON.stringify({layout,tab,before,moved,after}));
 }
});

test('Collapsed Core Routines in Pro leaves no reserved space',async t=>{
 const p=await openApp(t,fixture(),{width:1280,height:900},{stayOnToday:true});
 await p.evaluate(()=>{arrivalDismiss?.();setLayout('pro');setTab('today');todayRoutinesOpen=false;render()});await frame(p);
 const rout=await rect(p,'.t-rout'),toggle=await rect(p,'.t-rout-toggle'),lvl2=await rect(p,'.t-lvl2');
 assert.ok(rout.b-toggle.b<12&&lvl2.t-rout.b<24,JSON.stringify({rout,toggle,lvl2}));
 await p.evaluate(()=>{todayRoutinesOpen=true;render()});await frame(p);
 assert.ok((await rect(p,'.t-rout')).h>100);
});
