const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
const level=page=>page.locator('select[data-ui-change="cfgLevel"][data-ui-change-args=\'["meditation"]\']');
async function settings(page){
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const toggle=page.locator('#settings-toggle-hab');
 if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
}
function data(){
 const d=fixture();
 d.config.log.push({...structuredClone(d.config.log.at(-1)),from:'2026-12-01',mode:'vacation'});
 d.config.log.at(-1).h.meditation.pWork=37;
 return d;
}
const history=page=>page.evaluate(()=>JSON.stringify({days:_state,eras:CFG.log.filter(e=>e.from!==todayKey()),scores:['2026-09-07','2026-09-08','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-10-08'].map(k=>calcScore(k))}));
for(const skin of ['classic','aurora'])for(const width of [320,390,879,880,1440])test(`habit levels: ${skin} ${width}px keyboard, history, future era and reload`,async t=>{
 const page=await openApp(t,data(),{width,height:1000});
 await page.evaluate(async s=>{await flushCfgSaves();setSkin(s)},skin);
 const before=await history(page);
 const habit=await page.evaluate(()=>({...CFG.h.meditation}));
 await settings(page);
 const select=level(page);
 assert.equal(await select.isVisible(),true);
 for(const target of [3,1,2]){
  await select.selectOption(String(target));
  await page.waitForFunction(()=>!_cfgDraft&&!_cfgFlushPromise);
  assert.equal(await page.evaluate(()=>CFG.h.meditation.lv),target);
  assert.deepEqual(await page.evaluate(()=>{const h={...CFG.h.meditation};delete h.lv;return h}),Object.fromEntries(Object.entries(habit).filter(([k])=>k!=='lv')));
  assert.equal(await history(page),before);
 }
 await page.waitForFunction(()=>!_syncRenderQueued);
 await select.focus();assert.equal(await select.evaluate(n=>n===document.activeElement),true);
 await page.keyboard.press('Tab');assert.equal(await select.evaluate(n=>n===document.activeElement),false);
 await select.selectOption('3');await page.waitForFunction(()=>CFG.h.meditation.lv===3&&!_cfgDraft&&!_cfgFlushPromise);
 const geometry=await select.evaluate(n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,width:innerWidth,overflow:document.getElementById('scroll').scrollWidth>innerWidth}});
 assert.ok(geometry.left>=0&&geometry.right<=geometry.width,JSON.stringify(geometry));
 assert.equal(geometry.overflow,false,'Expanded Settings has no horizontal overflow');
 const row=select.locator('..').locator('..');
 const controls=await row.evaluate(n=>{const box=n.getBoundingClientRect();return [...n.querySelectorAll('button,input,select')].map(c=>{const r=c.getBoundingClientRect();return {tag:c.tagName,field:c.getAttribute('data-ui-change'),width:r.width,left:r.left,right:r.right,rowRight:box.right}})});
 for(const c of controls){assert.ok(c.width>0&&c.left>=0&&c.right<=c.rowRight+1,JSON.stringify(c));}

 // WebKit screenshot synchronization injects inline CSS; retain strict CSP
 // and all functional assertions, collecting these optional images in Chrome.
 if(process.env.SHAAH_BROWSER_ENGINE!=='webkit'&&(width===320||width===1440)){fs.mkdirSync('test-results/habit-safety',{recursive:true});await page.screenshot({path:`test-results/habit-safety/settings-${skin}-${width}.png`});}
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await page.evaluate(()=>CFG.h.meditation.lv),3);
 assert.equal(await history(page),before);
 assert.equal(await page.evaluate(()=>cfgForDate('2026-12-01').L2.some(i=>i.id==='meditation')),true);
 await settings(page);assert.equal(await level(page).inputValue(),'3');
 await page.getByRole('button',{name:'Back',exact:true}).click();
 for(const hour of [12,22]){
  await page.clock.setFixedTime(new Date(`2026-10-16T${hour}:00:00Z`));
  await page.locator('.nav-btn[data-tab="today"]').click();
  assert.equal(await page.evaluate(()=>document.getElementById('scroll').scrollWidth<=innerWidth),true);
 }
});
test('habit level: failed save survives refresh then retries without changing historical/future eras',async t=>{
 const page=await openApp(t,data());await page.evaluate(()=>flushCfgSaves());const before=await history(page);
 await settings(page);
 await page.evaluate(()=>{window.originalRpc=sb.rpc;sb.rpc=async()=>({error:{code:'SYNTHETIC_OFFLINE'}})});
 await level(page).selectOption('3');await page.waitForFunction(()=>_cfgSaveFailed&&!!_cfgDraft&&!_cfgFlushPromise);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(cfgPendingKey())).draft.h.meditation.lv),3);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date==='settings').data._cfg.h.meditation.lv),2);
 assert.equal(await history(page),before);
 await page.reload();await page.waitForFunction(()=>_cfgReady&&!_cfgDraft&&!_cfgFlushPromise);
 assert.equal(await page.evaluate(()=>CFG.h.meditation.lv),3);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date==='settings').data._cfg.h.meditation.lv),3);
 assert.equal(await history(page),before);
});
test('habit level: two sessions conflict without losing either choice, then explicit resolution',async t=>{
 const a=await openApp(t,data());await a.evaluate(()=>flushCfgSaves());const before=await history(a);
 const b=await a.context().newPage();await b.goto('http://shaah.test/');await b.waitForFunction(()=>_cfgReady&&_live);
 b.on('pageerror',error=>assert.fail(error.message));b.on('dialog',dialog=>dialog.accept());
 await settings(a);await settings(b);
 await level(a).selectOption('1');await a.waitForFunction(()=>!_cfgDraft&&!_cfgFlushPromise);
 await level(b).selectOption('3');await b.waitForFunction(()=>_cfgConflict);
 assert.equal(await b.evaluate(()=>CFG.h.meditation.lv),3);
 assert.equal(await b.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date==='settings').data._cfg.h.meditation.lv),1);
 const draft=await b.evaluate(()=>JSON.stringify(_cfgDraft));
 await level(b).selectOption('2');assert.equal(await b.evaluate(()=>JSON.stringify(_cfgDraft)),draft);
 await b.reload();await b.waitForFunction(()=>_cfgReady&&_cfgConflict);
 await b.getByRole('button',{name:'Keep this device’s settings',exact:true}).click();
 await b.waitForFunction(()=>!_cfgDraft&&!_cfgConflict);
 assert.equal(await b.evaluate(()=>CFG.h.meditation.lv),3);
 assert.equal(await history(b),before);
});
test('Stats shows dated eligible denominators and fractional completion',async t=>{
 const d=data();
 const recent=structuredClone(d.config.log[2]);recent.from='2026-10-13';recent.h.meditation.on=false;
 recent.h.fresh={l:'Fresh',i:'N',p:5,pWork:5,pVacation:5,lv:2,on:true};recent.order.push('fresh');d.config.log.splice(3,0,recent);
 d.config.h=structuredClone(recent.h);d.config.order=[...recent.order];
 d.days['2026-10-10']={checks:{meditation:.5},social:{},people:[],note:''};
 const page=await openApp(t,d);await page.locator('.nav-btn[data-tab="stats"]').click();
 const review=await page.evaluate(()=>weekReview());
 for(const [label,item] of [['MOST CONSISTENT',review.best],['NEEDS WORK',review.worst]]){
  const card=page.locator('.stats-metric-card').filter({has:page.locator('.stats-metric-label',{hasText:label})});
  assert.equal(await card.locator('.stats-metric-value').innerText(),`${item.done}/${item.eligible}`);
 }
 assert.equal(review.tally.find(x=>x.id==='meditation').eligible,3);
 assert.equal(review.tally.find(x=>x.id==='fresh').eligible,4);
 assert.equal(review.tally.find(x=>x.id==='meditation').done,.5);
});
