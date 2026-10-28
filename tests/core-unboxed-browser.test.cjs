const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp,fixture}=require('./helpers.cjs');

test('Core Routines is plain text with independent cards; responsive controls and state are preserved',async t=>{
 const a=loadApp(fixture());
 a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;CFG.h.what={l:'What',p:35,pWork:35,pVacation:35,lv:1,on:true,i:'?'};CFG.order.push('what');CFG.log.at(-1).h.what=CFG.h.what;CFG.log.at(-1).order.push('what');_state['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]}");
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(async()=>{await document.fonts.ready;setSkin('matrix')});
 await page.locator('.nav-btn[data-tab="today"]').click();
 const saved=await page.evaluate(()=>JSON.stringify({cfg:CFG,days:_state,score:calcScore(todayKey())}));
 const geometry=()=>page.evaluate(()=>{
  const style=s=>{const e=document.querySelector(s),c=getComputedStyle(e),r=e.getBoundingClientRect();return {bg:c.backgroundColor,border:c.borderTopWidth,pad:c.padding,shadow:c.boxShadow,x:r.x,y:r.y,w:r.width,h:r.height}};
  return {group:style('.sf-today-v27>.t-rout'),header:style('.t-rout-toggle'),total:style('.sf-core-total'),cards:[...document.querySelectorAll('.t-rout-body>.sf-core-routine')].map(e=>({text:e.textContent,bg:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderTopWidth,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),other:['.t-lvl2','.t-lvl3','.t-social-independent','.t-note'].map(style)};
 });
 for(const width of [320,390,879,880,1440]){
  await page.setViewportSize({width,height:1000});
  const current=await geometry();
  assert.equal(current.group.bg,'rgba(0, 0, 0, 0)');assert.equal(current.group.border,'0px');assert.equal(current.group.pad,'0px');assert.equal(current.group.shadow,'none');
  assert.equal(current.header.bg,'rgba(0, 0, 0, 0)');assert.equal(current.header.border,'0px');
  assert.ok(current.total.y>=current.header.y&&current.total.y+current.total.h<=current.header.y+current.header.h+1,'score shares heading line');
  assert.equal(await page.locator('.sf-core-total').innerText(),'0/60');assert.equal(current.cards.length,2);
  for(const card of current.cards){assert.equal(card.border,'1px');assert.notEqual(card.bg,'rgba(0, 0, 0, 0)');}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow');
  // Compare against the exact CSS served before this change: card content and
  // sizes remain intact, apart from the width recovered from outer padding.
  const sheet=await page.addStyleTag({url:'http://shaah.test/assets/app.669f2fdb1ac44f8a.css'});const before=await geometry();await sheet.evaluate(e=>e.remove());
  for(let i=0;i<current.cards.length;i++)assert.equal(current.cards[i].text,before.cards[i].text);
  for(let i=0;i<current.other.length;i++){
   const {h:height,y,...style}=current.other[i],{h:oldHeight,y:oldY,...oldStyle}=before.other[i];
   assert.deepEqual(style,oldStyle,'unrelated cards keep style and width');
   assert.ok(Math.abs(height-oldHeight)<=2,'legacy typography differs by at most two CSS pixels');
  }
 }
 assert.equal(await page.evaluate(()=>JSON.stringify({cfg:CFG,days:_state,score:calcScore(todayKey())})),saved,'responsive rendering does not alter data or scores');
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:process.env.SHAAH_CORE_DESKTOP_SCREENSHOT||'/tmp/shaah-core-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:process.env.SHAAH_CORE_SCREENSHOT||'/tmp/shaah-core-unboxed.png',fullPage:true});
 await page.locator('.t-rout-toggle').click();assert.equal(await page.locator('.t-rout-body').isVisible(),false);
 await page.locator('.t-rout-toggle').press('Enter');assert.equal(await page.locator('.t-rout-body').isVisible(),true);
 for(const points of [10,20,25,0]){await page.locator('.wg-card').click();assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),points);}
 await page.getByRole('button',{name:'Completar',exact:true}).click();assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),35);
});
