const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');
const snapshot = page => page.evaluate(() => JSON.stringify({config:CFG,days:_state,scores:Object.keys(_state).filter(k=>/^\d{4}-/.test(k)).map(k=>[k,calcScore(k)])}));
for (const width of [320,390,879,880,1440]) test(`Aurora V2 ${width}: navigation, CSP, data, appearance and focus`,async t=>{
 const page=await openApp(t,locationFixture(),{width,height:1000});
 await page.evaluate(async()=>{await flushCfgSaves();setTab('today')});
 const before=await snapshot(page),writes=await page.evaluate(()=>__mockWrites.filter(row=>row.date!=='cfgbak').length);
 const original=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundImage);
 await page.evaluate(()=>setSkin('aurora'));
 assert.equal(await page.locator('#nav button').count(),5);
 assert.equal(await page.locator('.aurora-nav,#aurora-work,#aurora-more,#aurora-more-trigger').count(),0);
 assert.deepEqual(await page.locator('#nav .nav-btn').evaluateAll(nodes=>nodes.map(n=>n.dataset.tab)),['today','log','social','stats','history']);
 for(const tab of ['log','social','stats','history','today']){
   await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
   assert.equal(await page.locator(`.nav-btn[data-tab="${tab}"]`).getAttribute('aria-current'),'page');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.getElementById('scroll').scrollWidth<=innerWidth),true,tab+' fits');
   if([390,1440].includes(width)){
     fs.mkdirSync('test-results/aurora-v2',{recursive:true});
     await page.screenshot({animations:'disabled',path:`test-results/aurora-v2/${tab}-${width}.png`});
   }
 }
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 assert.equal(await page.locator('[data-skin-choice="aurora"]').getAttribute('aria-pressed'),'true');
 if([390,1440].includes(width))await page.screenshot({animations:'disabled',path:`test-results/aurora-v2/settings-${width}.png`});
 await page.locator('[data-skin-choice="classic"]').click();
 assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundImage),original);
 await page.evaluate(()=>closeSettings());
 assert.equal(await page.locator('.aurora-nav,#aurora-work,#aurora-more').count(),0);
 assert.equal(await page.locator('.nav-btn[data-tab="log"]').isVisible(),true);
 assert.equal(await snapshot(page),before,'No changes to configuration, history, scores or daily log');
 assert.equal(await page.evaluate(()=>__mockWrites.filter(row=>row.date!=='cfgbak').length),writes,'No account writes');
 await page.evaluate(()=>setSkin('aurora')); await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await page.locator('html').getAttribute('data-skin'),'aurora');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>setTab('today'));
 assert.equal(await page.locator('.t-ring').evaluate(el=>getComputedStyle(el).filter),'none');
});

test('Aurora: cross-tab skin restore preserves native navigation and mobile night layout', async t=>{
 const page=await openApp(t,locationFixture(),{width:390,height:844});
 await page.clock.setFixedTime(new Date('2026-10-16T22:00:00Z'));
 await page.evaluate(()=>{setSkin('aurora');setTab('today')});
 assert.equal(await page.evaluate(()=>document.getElementById('scroll').scrollWidth<=innerWidth),true);
 const other=await page.context().newPage();await other.goto('http://shaah.test/');await other.waitForFunction(()=>_cfgReady&&_live);
 await other.evaluate(()=>setSkin('classic'));
 await page.waitForFunction(()=>document.documentElement.dataset.skin==='classic');
 assert.equal(await page.locator('#nav .nav-btn').count(),5);
 assert.equal(await page.locator('.aurora-nav,#aurora-work,#aurora-more').count(),0);
});

for(const width of [390,1440])test(`Aurora Work ${width}: native milestones persist and leave historical scores unchanged`,async t=>{
 const page=await openApp(t,locationFixture(),{width,height:1000});
 await page.evaluate(async()=>{await flushCfgSaves();setSkin('aurora');setTab('today')});
 const past=()=>page.evaluate(()=>JSON.stringify(Object.keys(_state).filter(k=>/^\d{4}-/.test(k)&&k<todayKey()).map(k=>[k,_state[k],calcScore(k)])));
 const before=await past();
 for(const points of [10,20,25,0]){
   await page.evaluate(()=>setTab('today'));
   await page.locator('.sf-work-next').click();
   assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),points);
   await page.waitForFunction(()=>!_pending[todayKey()]);
 }
 assert.equal(await past(),before);
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),0);
 assert.equal(await past(),before);
});

test('Aurora preserves the latest OG People / Groups switch without changing data',async t=>{
 const page=await openApp(t,locationFixture(),{width:390,height:844});
 await page.evaluate(async()=>{await flushCfgSaves();setSkin('aurora');setTab('social')});
 const before=await snapshot(page);
 await page.locator('.sf-people-toggle').click();
 await page.locator('#social-directory-toggle').click();
 assert.equal(await page.locator('#social-groups-view').isVisible(),true);
 assert.equal(await page.locator('#social-directory-results').isVisible(),false);
 await page.locator('#social-directory-toggle').click();
 assert.equal(await page.locator('#social-directory-results').isVisible(),true);
 assert.equal(await page.locator('#social-groups-view').isVisible(),false);
 assert.equal(await snapshot(page),before);
});
