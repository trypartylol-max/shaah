const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
test('approved Work amounts fit desktop/mobile and retain milestone persistence',async t=>{
 const a=loadApp();
 a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;_state['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]}");
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 await page.locator('.nav-btn[data-tab="today"]').click();
 const old=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey()))));
 for(const width of [320,390,600,879,880,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});
  const g=await page.locator('.sf-work-essential').evaluate(card=>{
   const el=s=>card.querySelector(s),r=s=>el(s).getBoundingClientRect().toJSON();
   return {card:card.getBoundingClientRect().toJSON(),daily:r('.sf-work-daily'),weekly:r('.sf-work-weekly'),divider:r('.sf-work-cash-divider'),button:r('button'),actions:r('.sf-core-actions'),overflow:document.documentElement.scrollWidth>innerWidth,innerOverflow:card.scrollWidth>card.clientWidth+1,dailySize:parseFloat(getComputedStyle(el('.sf-work-daily>strong')).fontSize),weeklySize:parseFloat(getComputedStyle(el('.sf-work-weekly>strong')).fontSize)};
  });
  assert.equal(g.overflow,false,`${width} page fits`);assert.equal(g.innerOverflow,false,`${width} card fits`);
  assert.ok(g.dailySize>g.weeklySize);assert.ok(g.divider.x>g.daily.x&&g.divider.x<g.weekly.x);
  assert.ok(Math.abs(g.divider.x-(g.daily.x+g.weekly.x+g.weekly.width)/2)<2,'centered separator');
  assert.ok(Math.abs(g.button.width-Math.min(390,g.actions.width))<2,'wide action');
 }
 await page.setViewportSize({width:390,height:844});
 for(const [cash,score] of [[400,10],[650,20],[800,25],[0,0]]){
  await page.locator('.sf-work-next').click();
  assert.equal(await page.locator('.sf-work-daily>strong').innerText(),'₪'+cash);
  assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),score);
 }
 await page.locator('.sf-work-next').click();
 await page.reload();await page.locator('.nav-btn[data-tab="today"]').click();
 assert.equal(await page.locator('.sf-work-daily>strong').innerText(),'₪400');
 assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())))),old);
 await page.locator('.sf-work-essential').screenshot({path:'docs/work-essential-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.sf-work-essential').screenshot({path:'docs/work-essential-desktop.png'});
});
