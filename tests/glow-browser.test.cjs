const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');
for(const width of [320,390,600,879,880,1440])test(`Glow ${width}: native layout, persistence, Work and reduced motion`,async t=>{
 const page=await openApp(t,locationFixture(),{width,height:width<880?844:1000});
 await page.evaluate(async()=>{await flushCfgSaves();setSkin('aurora');setTab('today')});
 const snapshot=()=>page.evaluate(()=>JSON.stringify({config:CFG,days:_state,scores:Object.keys(_state).filter(k=>/^\d{4}-/.test(k)).map(k=>[k,calcScore(k)])}));
 const before=await snapshot(),writes=await page.evaluate(()=>__mockWrites.length);
 const geometry=()=>page.locator('.wg-card').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
 const layout=await geometry();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.locator('[data-skin-choice="glow"]').click();
 await page.evaluate(()=>closeSettings());
 assert.deepEqual(await geometry(),layout,'shared geometry retained');
 assert.equal(await page.locator('.t-ring>svg>circle:last-child').evaluate(el=>getComputedStyle(el).stroke),'rgb(130, 146, 255)');
 assert.equal(await page.locator('.t-ring').evaluate(el=>getComputedStyle(el,'::before').animationName),'shaah-glow-breathe');
 for(const tab of ['log','social','stats','history','today']){
  await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.getElementById('scroll').scrollWidth<=innerWidth),true,`${tab} fits`);
 }
 assert.deepEqual(await page.locator('#nav .nav-btn').evaluateAll(ns=>ns.map(n=>n.dataset.tab)),['today','log','social','stats','history']);
 assert.equal(await snapshot(),before,'Skin leaves data and scores intact');
 assert.equal(await page.evaluate(()=>__mockWrites.length),writes,'Skin writes no account data');
 const past=()=>page.evaluate(()=>JSON.stringify(Object.keys(_state).filter(k=>/^\d{4}-/.test(k)&&k<todayKey()).map(k=>[k,_state[k],calcScore(k)])));
 const history=await past();
 for(const points of [10,20,25,0]){
  await page.locator('.wg-card').click();
  assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),points);
  await page.waitForFunction(()=>!_pending[todayKey()]);
 }
 assert.equal(await past(),history);
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);await page.locator('.nav-btn[data-tab="today"]').click();
 assert.equal(await page.locator('html').getAttribute('data-skin'),'glow');
 assert.equal(await page.evaluate(()=>calcScore(todayKey()).l1),0);
 if([390,1440].includes(width)){
  await page.locator('.wg-card').click();
  assert.equal(await page.locator('.wg-segment.lit').count(),1);
  assert.equal(await page.locator('.wg-segment.lit').first().evaluate(el=>getComputedStyle(el).stroke),'rgb(75, 215, 255)');
  fs.mkdirSync('test-results/glow',{recursive:true});
  await page.screenshot({path:`test-results/glow/today-${width}.png`,animations:'disabled'});
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.locator('[data-skin-choice="glow"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/glow/settings-${width}.png`,animations:'disabled'});
  await page.evaluate(()=>closeSettings());
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.t-ring').evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
 assert.equal(await page.locator('.t-ring>svg>circle:last-child').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 await page.evaluate(()=>setSkin('classic'));
 assert.equal(await page.locator('.t-ring').evaluate(el=>getComputedStyle(el,'::before').content),'none');
});
