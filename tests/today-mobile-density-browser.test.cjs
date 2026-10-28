const {test}=require('node:test');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');
test('Today density visual audit',async t=>{
 const a=loadApp();a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config");
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 await page.evaluate(()=>setTab('today'));
 fs.mkdirSync('docs/mobile-density',{recursive:true});
 for(const [w,h] of [[390,844],[375,667],[1440,1000]]){
 await page.setViewportSize({width:w,height:h});
 await page.evaluate(()=>{setSkin('glow');todayRoutinesOpen=false;lvlOpen={1:false,2:false,3:false};render()});
 const social=page.locator('.sf-combo-heading');if(await social.getAttribute('aria-expanded')==='true')await social.click();
 await page.evaluate(()=>document.querySelector('#scroll').scrollTop=0);await page.waitForTimeout(400);
 if(w<880){
 const m=await page.evaluate(()=>{const r=document.querySelector('.t-reset').getBoundingClientRect(),n=document.querySelector('#nav').getBoundingClientRect(),c=getComputedStyle(document.querySelector('.t-rout'));return {reset:r.bottom,nav:n.top,navBottom:n.bottom,position:getComputedStyle(document.querySelector('#nav')).position,overflow:document.querySelector('#scroll').scrollWidth>innerWidth,background:c.backgroundColor,border:c.borderTopWidth,shadow:c.boxShadow}});
 assert.ok(m.reset<=m.nav,JSON.stringify(m));assert.equal(m.navBottom,h);assert.equal(m.position,'fixed');assert.equal(m.overflow,false);assert.equal(m.background,'rgba(0, 0, 0, 0)');assert.equal(m.border,'0px');assert.equal(m.shadow,'none');
 }

 await page.screenshot({path:`docs/mobile-density/closed-${w}.png`});
 await page.evaluate(()=>{todayRoutinesOpen=true;lvlOpen={1:true,2:true,3:true};render()});
 if(w<880&&await social.getAttribute('aria-expanded')==='false')await social.click();
 await page.evaluate(()=>document.querySelector('#scroll').scrollTop=0);await page.waitForTimeout(200);
 assert.equal(await page.locator('.t-rout-body').isVisible(),true);
 assert.equal(await page.locator('.t-lvl2 .lvl-b').isVisible(),true);
 assert.notEqual(await page.locator('.t-lvl3 .lvl-b').evaluate(e=>getComputedStyle(e).display),'none');
 assert.equal(await page.evaluate(()=>document.querySelector('#scroll').scrollWidth<=innerWidth),true);
 await page.screenshot({path:`docs/mobile-density/open-${w}.png`});
 }
});
