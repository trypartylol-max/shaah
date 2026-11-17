const {test}=require('node:test');const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
// Play on Production opens a picker (Sketch / Mínimo / Finish); each starts its own runner.
// Mínimo gives half credit, the others full credit.
test('Production version chips start the chosen routine and fit on desktop and mobile', async t=>{
 const a=loadApp();a.run(`
 for(const id of ['production','wod']){CFG.h[id]={...LEGACY_CFG.h[id],pWork:LEGACY_CFG.h[id].p,pVacation:LEGACY_CFG.h[id].p};}
 CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];
 CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));
 for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order];}
 CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;
 for(const id of ['production_min','production_finish'])CFG.routines[id]=JSON.parse(JSON.stringify(PRODUCTION_VARIANTS[id]));
 CFG.routines.production.short='Sketch';CFG.routines.production.steps=JSON.parse(JSON.stringify(PRODUCTION_VARIANTS.production.steps));
 _state['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]};`);
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 await page.evaluate(()=>setTab('today'));
 for(const [width,height,name] of [[1440,1000,'desktop'],[390,844,'mobile']]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{todayRoutinesOpen=true;_routinePick=null;render()});
  assert.equal(await page.locator('[data-routine-card="production"] .cr-variant').count(),0);
  const cardBefore=(await page.locator('[data-routine-card="production"]').boundingBox()).height;
  await page.locator('[data-routine-card="production"] .sf-routine-primary').click();
  await page.waitForTimeout(250); // let the reveal animation settle
  const chips=page.locator('[data-routine-card="production"] .cr-variant');
  assert.equal(await chips.count(),3);
  assert.deepEqual(await chips.locator('b').allTextContents(),['Sketch','Mínimo','Finish']);
  // Chips sit on top of the ◐ ▶ ✓ row: same box, the card does not grow.
  const row=await page.locator('[data-routine-card="production"] .cr-compact-actions').boundingBox();
  const pick=await page.locator('[data-routine-card="production"] .cr-variants').boundingBox();
  assert.ok(Math.abs(pick.y-row.y)<1&&Math.abs(pick.height-row.height)<1,`${name}: picker covers the action row ${JSON.stringify([row,pick])}`);
  assert.ok(Math.abs((await page.locator('[data-routine-card="production"]').boundingBox()).height-cardBefore)<1,`${name}: card height unchanged`);
  const box=await page.locator('[data-routine-card="production"]').boundingBox();
  for(const b of await chips.evaluateAll(n=>n.map(e=>e.getBoundingClientRect().toJSON())))
   assert.ok(b.left>=box.x-1&&b.right<=box.x+box.width+1,`${name}: chip inside card`);
  if(process.env.SHAAH_SHOTS)await page.locator('[data-routine-card="production"]').screenshot({path:`${process.env.SHAAH_SHOTS}/variants-${name}.png`});
  if(name==='desktop'){await page.locator('[data-routine-card="production"] .cr-variant-close').click();assert.equal(await chips.count(),0);}
 }
 await page.locator('[data-routine-card="production"] .cr-variant',{hasText:'Mínimo'}).click();
 assert.equal(await page.evaluate(()=>routineId),'production_min');
 assert.match(await page.locator('#cr-dialog').textContent(),/Open DAW/);
 if(process.env.SHAAH_SHOTS)await page.screenshot({path:`${process.env.SHAAH_SHOTS}/variants-runner.png`});
 await page.evaluate(()=>{for(let i=0;i<3;i++)advanceSession('production_min');render()});
 assert.equal(await page.evaluate(()=>getChecked(todayKey()).production),0.5);
 assert.equal(await page.locator('[data-routine-card="production"] .cr-variant').count(),0);
});
