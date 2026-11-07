const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
function fixture(){const a=loadApp();a.run(`for(const id of ['production','wod'])CFG.h[id]={...LEGACY_CFG.h[id],pWork:15,pVacation:15};CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;`);return {config:a.read('CFG'),days:a.read('_state')};}
for(const width of [390,879,880,1440])test(`global disclosure ${width}px preserves data and individual control`,async t=>{
 const page=await openApp(t,fixture(),{width,height:1000});await page.evaluate(()=>setTab('today'));
 for(const skin of ['classic','glow','aurora']){
 await page.evaluate(s=>{document.documentElement.dataset.skin=s;document.documentElement.classList.toggle('shaah-aurora',s==='aurora');todaySectionsSession=true;todayRoutinesOpen=true;lvlOpen={1:true,2:true,3:true};render();},skin);
 const snapshot=()=>page.evaluate(()=>JSON.stringify({CFG,state:_state,storage:{...localStorage},sessions,writes:window.__mockWrites,score:calcScore(todayKey())}));
 const before=await snapshot();
 const geometry=()=>page.locator('.today').evaluate(root=>[...root.children].map(e=>({cls:e.className,x:e.getBoundingClientRect().x,w:e.getBoundingClientRect().width,y:e.getBoundingClientRect().y,h:e.getBoundingClientRect().height})));
 const boxes=await geometry();const button=page.locator('.today-sections-toggle');
 assert.equal(await button.locator('span').isVisible(),width>=880);
 const label=await page.locator('.today-routines-label').boundingBox(),b=await button.boundingBox();assert.ok(b.x>=label.x+label.width-1);assert.ok(Math.abs((label.y+label.height/2)-(b.y+b.height/2))<2);
 await button.focus();await page.keyboard.press('Enter');assert.equal(await button.getAttribute('aria-label'),'Expand All');assert.equal(await button.evaluate(e=>e===document.activeElement),true);
 await page.waitForFunction(()=>[...document.querySelectorAll('.lvl-b')].every(e=>e.getBoundingClientRect().height===0));
 assert.equal(await page.locator('.t-rout-body').isVisible(),false);assert.equal(await page.locator('.lvl-b').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height===0)),true);
 await page.locator('.t-lvl2 .lvl-toggle').click();assert.equal(await page.locator('.t-lvl2 .lvl-toggle').getAttribute('aria-expanded'),'true');
 await button.click();await button.click();assert.equal(await button.getAttribute('aria-label'),'Collapse All');assert.equal(await page.locator('.t-rout-body').isVisible(),true);
 await page.locator('.today-routines-label').click();assert.equal(await page.locator('.t-rout-body').isVisible(),false);await page.locator('.today-routines-label').click();
 await page.waitForTimeout(350);assert.equal(await snapshot(),before);assert.deepEqual(await geometry(),boxes);
 await page.evaluate(()=>{loadLvl();loadTodayRoutines();render();});assert.equal(await button.getAttribute('aria-label'),'Collapse All');
 }
});
