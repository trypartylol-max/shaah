const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
test('Today disclosures shrink, reopen and survive Settings in both appearances',async t=>{
 const a=loadApp();a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config");
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 for(const skin of ['classic','aurora','glow']){
  await page.evaluate(s=>{document.documentElement.dataset.skin=s;document.documentElement.classList.toggle('shaah-aurora',s==='aurora')},skin);
  for(const width of [320,390,879,880,1024,1440]){
   await page.setViewportSize({width,height:1000});
   await page.evaluate(()=>{currentTab='today';lvlOpen={1:true,2:true,3:true};render()});
   for(const n of [2,3]){
    const card=page.locator('.t-lvl'+n),button=card.locator('.lvl-toggle');
    await page.waitForTimeout(350);await button.click();await page.waitForTimeout(50);assert.equal(await card.locator('.lvl-b').isVisible(),false);
    const g=await card.evaluate(e=>({h:e.getBoundingClientRect().height,head:e.querySelector('.lvl-h').getBoundingClientRect().height,pad:parseFloat(getComputedStyle(e).paddingTop)+parseFloat(getComputedStyle(e).paddingBottom)}));
    assert.ok(g.h<=g.head+g.pad+15,`${skin} ${width} collapsed card shrinks: ${JSON.stringify(g)}`);
    await page.waitForTimeout(350);await button.click();await page.waitForTimeout(50);assert.notEqual(await card.locator('.lvl-b').evaluate(e=>getComputedStyle(e).display),'none');
    await page.waitForTimeout(350);await button.focus();await page.keyboard.press('Enter');await page.waitForTimeout(50);assert.equal(await card.locator('.lvl-b').isVisible(),false);
    await page.waitForTimeout(350);await button.focus();await page.keyboard.press('Enter');await page.waitForTimeout(50);assert.notEqual(await card.locator('.lvl-b').evaluate(e=>getComputedStyle(e).display),'none');
   }
   await page.evaluate(()=>{openSettings();closeSettings()});
   assert.equal(await page.locator('.t-lvl2 .lvl-b').isVisible(),true);
   assert.equal(await page.evaluate(()=>document.querySelector('#scroll').scrollWidth<=innerWidth),true);
   if(width<880)assert.ok(await page.locator('.t-note textarea').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
  }
 }
});
