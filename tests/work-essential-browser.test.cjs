const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
test('shared Work amounts fit every skin and viewport and retain milestone persistence',async t=>{
 const a=loadApp();
 a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;_state['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]}");
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 await page.locator('.nav-btn[data-tab="today"]').click();
 const history=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey()))));
 for(const skin of ['classic','matrix','minimal','glow','aurora']){
  await page.evaluate(skin=>setSkin(skin),skin);
  for(const width of [320,390,600,879,880,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   const g=await page.locator('.wg-card').evaluate(card=>{
    const r=s=>card.querySelector(s).getBoundingClientRect().toJSON();
    return {card:card.getBoundingClientRect().toJSON(),daily:r('.wg-daily'),weekly:r('.wg-weekly'),figure:r('.wg-figure'),overflow:document.documentElement.scrollWidth>innerWidth,innerOverflow:card.scrollWidth>card.clientWidth+1};
   });
   assert.equal(g.overflow,false,`${skin}/${width}: page fits`);assert.equal(g.innerOverflow,false,`${skin}/${width}: Work fits`);
   assert.ok(g.daily.x+g.daily.width<=g.figure.x+1);assert.ok(g.figure.x+g.figure.width<=g.weekly.x+1);
   assert.ok(g.card.height>=44,'whole card is a touch target');
  }
 }
 await page.setViewportSize({width:390,height:844});
 for(const [cash,score] of [[400,10],[650,20],[800,25],[0,0]]){
  await page.locator('.wg-card').click();
  assert.equal(await page.locator('.wg-daily>strong').innerText(),'₪'+cash);
  assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),score);
 }
 await page.locator('.wg-card').click();await page.waitForFunction(()=>!_pending[todayKey()]);
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);await page.locator('.nav-btn[data-tab="today"]').click();
 assert.equal(await page.locator('.wg-daily>strong').innerText(),'₪400');
 assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey())))),history);
});
