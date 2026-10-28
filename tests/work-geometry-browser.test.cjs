const {test}=require('node:test');const assert=require('node:assert/strict');
const root=process.cwd();const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
test('WORK geometry, exact activation, dated points, persistence and skins',async t=>{
 const a=loadApp();a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;_state['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]}");
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')},undefined,process.env.STANDALONE?{htmlFile:process.env.STANDALONE}:{});await page.locator('.nav-btn[data-tab="today"]').click();
 const history=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey()))));
 const others=await page.locator('.sf-core-routine:not(.sf-work)').evaluateAll(es=>es.map(e=>e.outerHTML));
 for(const width of [320,390,879,880,1440]){await page.setViewportSize({width,height:1000});const g=await page.locator('.wg-card').evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth}));assert.ok(g.sw<=g.w+1);assert.equal(g.overflow,false);assert.ok(g.h<125);}
 for(const n of [0,1,2,3,4,5,8]){
  await page.evaluate(n=>{CFG.workMilestones=[{from:todayKey(),steps:Array.from({length:n},(_,i)=>({amount:350+i*300,points:5+i}))}];_dayCfgCache={};setHabitState('work',todayKey(),false);render();},n);
  assert.equal(await page.locator('.wg-segment').count(),n);
  if(!n){assert.equal(await page.locator('.wg-card').isDisabled(),true);continue;}
  for(let i=1;i<=n;i++){
   await page.locator(i%2?'.wg-head':'.wg-figure').click();assert.equal(await page.locator('.wg-segment.lit').count(),i);
   assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),Array.from({length:i},(_,j)=>5+j).reduce((a,b)=>a+b,0));
  }
  assert.equal(await page.locator('.wg-figure.complete').count(),1);
  await page.locator('.wg-card').press('Enter');assert.equal(await page.locator('.wg-segment.lit').count(),0);assert.equal(await page.evaluate(()=>getChecked(todayKey()).work),false);
 }
 await page.locator('.wg-card').press('Space');assert.equal(await page.locator('.wg-segment.lit').count(),1);
 await page.reload();await page.locator('.nav-btn[data-tab="today"]').click();assert.ok(await page.evaluate(()=>doneFrac(getChecked(todayKey()).work)>0));
 await page.evaluate(()=>window.__workCard=document.querySelector('.wg-card'));
 for(const skin of ['matrix','minimal','glow','aurora']){await page.evaluate(s=>setSkin(s),skin);assert.equal(await page.locator('.wg-card').count(),1);assert.equal(await page.locator('.sf-work-next').count(),0);assert.equal(await page.evaluate(()=>__workCard===document.querySelector('.wg-card')),true,'skin changes keep the live control');}
 await page.evaluate(()=>setSkin('classic'));assert.deepEqual(await page.locator('.sf-core-routine:not(.sf-work)').evaluateAll(es=>es.map(e=>e.outerHTML)),others);
 await page.evaluate(()=>{setHabitState('work',todayKey(),false);workPhaseAdvance(todayKey());});await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.wg-segment.latest').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.setViewportSize({width:390,height:844});
 const before=await page.locator('.wg-segment.lit').count(),box=await page.locator('.wg-figure').boundingBox(),cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+24,y:box.y+24}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await page.locator('.wg-segment.lit').count(),before+1);await cdp.detach();
 assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())))),history);
 await page.locator('.wg-card').screenshot({path:root+'/test-results/work-geometry-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.locator('.wg-card').screenshot({path:root+'/test-results/work-geometry-desktop.png'});
});
