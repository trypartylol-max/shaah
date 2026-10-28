const {test}=require('node:test');const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
test('milestone editor adds/removes all rows, retains draft inputs, validates, persists tomorrow only',async t=>{
 const a=loadApp();a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config");
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 await page.evaluate(()=>setSkin('matrix'));
 const before=await page.evaluate(()=>({days:JSON.stringify(_state),score:JSON.stringify(calcScore(todayKey())),log:JSON.stringify(CFG.log)}));
 await page.evaluate(()=>{settingsOpen=true;secOpen.rout=true;render();});
 const card=page.locator('.sf-work-settings');
 await card.locator('[data-work-amount]').first().fill('450');
 await card.getByRole('button',{name:'+ Agregar milestone',exact:true}).click();
 assert.equal(await card.locator('.sf-work-settings-row').count(),4);
 assert.equal(await card.locator('[data-work-amount]').first().inputValue(),'450');
 assert.equal(await page.locator('.sf-work-settings').count(),1);
 await card.locator('[data-work-points]').first().fill('11');
 assert.ok((await card.locator('#work-settings-max').innerText()).includes('31'));
 await card.locator('[data-work-amount]').nth(1).fill('1');
 await card.getByRole('button',{name:'Guardar milestones',exact:true}).click();
 assert.ok((await card.locator('[role="alert"]').innerText()).includes('crecientes'));
 for(let n=4;n>0;n--){await card.getByRole('button',{name:'Eliminar milestone 1',exact:true}).click();assert.equal(await card.locator('.sf-work-settings-row').count(),n-1);}
 assert.ok((await card.locator('.sec').innerText()).toLowerCase().includes('0 milestones'),await card.locator('.sec').innerText());
 await card.getByRole('button',{name:'Guardar milestones',exact:true}).click();
 assert.equal(await page.evaluate(()=>workMilestoneRules(keyMinus(todayKey(),-1)).length),0);
 assert.deepEqual(await page.evaluate(()=>({days:JSON.stringify(_state),score:JSON.stringify(calcScore(todayKey())),log:JSON.stringify(CFG.log)})),before);
 await page.waitForTimeout(600);await page.reload();
 assert.equal(await page.evaluate(()=>workMilestoneRules(keyMinus(todayKey(),-1)).length),0);
 for(const count of [0,2,3,4,8])for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:1000});
  const result=await page.evaluate(count=>{
   const key=keyMinus(todayKey(),-1);CFG.workMilestones=[{from:key,steps:Array.from({length:count},(_,i)=>({amount:100*(i+1),points:5}))}];_dayCfgCache={};
   const host=document.createElement('div');host.id='milestone-layout';document.body.append(host);uiHTML(host,workMilestonesSettings()+workPhaseCard(key,cfgForDate(key).L1.find(i=>i.id==='work')));
   const card=host.querySelector('.sf-work');const result={segments:card.querySelectorAll('.wg-segment').length,disabled:card.disabled,overflow:card.scrollWidth>card.clientWidth+1};host.remove();return result;
  },count);
  assert.equal(result.segments,count);assert.equal(result.disabled,count===0);assert.equal(result.overflow,false);
 }
});
