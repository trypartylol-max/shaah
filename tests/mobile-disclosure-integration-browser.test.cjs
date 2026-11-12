const test=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
for(const width of [390,879])test(`integrated mobile ${width}: disclosures hide content and preserve data across rendering`,async t=>{
 const app=loadApp();app.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config");
 const page=await openApp(t,{config:app.read('CFG'),days:app.read('_state')},{width,height:844});
 await page.evaluate(async()=>{await flushCfgSaves();setTab('today');});
 const snapshot=()=>page.evaluate(()=>JSON.stringify({config:CFG,days:_state,scores:Object.keys(_state).map(k=>calcScore(k))}));
 const before=await snapshot();
 const core=page.locator('.today > .t-rout'),body=core.locator(':scope > .t-rout-body');
 if(await core.evaluate(n=>n.classList.contains('collapsed')))await core.locator('.today-routines-label').click();
 assert.equal(await body.isVisible(),true);
 await core.locator('.today-routines-label').click();assert.equal(await body.isVisible(),false);
 await core.locator('.today-routines-label').click();assert.equal(await body.isVisible(),true);
 // The whole Social Combo heading row forwards to the box disclosure (arrow before the title, like LVL 2/3).
 const combo=page.locator('.today > [data-today-box="social"] > .today-box-disclosure'),cats=page.locator('.today > .t-social-independent .sf-combo-category').first();
 await page.locator('.today > [data-today-box="social"] .sf-combo-heading > span').last().click();assert.equal(await combo.getAttribute('aria-expanded'),'false');
 assert.equal(await cats.isVisible(),false);
 await page.evaluate(()=>render());assert.equal(await combo.getAttribute('aria-expanded'),'false');
 await combo.press('Enter');assert.equal(await combo.getAttribute('aria-expanded'),'true');
 assert.equal(await cats.isVisible(),true);
 await combo.press('Space');assert.equal(await combo.getAttribute('aria-expanded'),'false');
 await combo.click();assert.equal(await cats.isVisible(),true);
 assert.equal(await snapshot(),before);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.getElementById('scroll').scrollWidth<=innerWidth),true);
});
