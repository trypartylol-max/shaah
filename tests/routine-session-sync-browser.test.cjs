const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp,serverRows}=require('./helpers.cjs');
const {syncBackend}=require('./sync-backend.cjs');
function fixture(){const a=loadApp();a.run(`for(const id of ['production','wod'])CFG.h[id]={...LEGACY_CFG.h[id],pWork:15,pVacation:15};CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;`);return {config:a.read('CFG'),days:a.read('_state')};}
async function bind(page,backend){
 if(!page.__sharedBound)await page.exposeFunction('__sharedRoutineQuery',async ({table,calls})=>{
  let query=backend.client.from(table);for(const [method,args] of calls)query=query[method](...args);return await query;
 });
 page.__sharedBound=true;
 await page.evaluate(()=>{
  sb.from=table=>{const calls=[];const query={};for(const method of ['select','eq','like','insert','update','upsert','delete'])query[method]=(...args)=>{calls.push([method,args]);return query;};query.then=(resolve,reject)=>window.__sharedRoutineQuery({table,calls}).then(resolve,reject);return query;};
 });
 await page.evaluate(()=>refreshRoutineCloud());
}
async function realtime(page,backend,id){const row=backend.rows.find(r=>r.date==='routine:'+id);await page.evaluate(row=>window.__emitMockRealtime({eventType:'UPDATE',new:row}),row);}
test('desktop and mobile share timer, pause, resume, next, early finish and cold reopening',async t=>{
 const data=fixture(),backend=syncBackend(serverRows(data).map(r=>({...r,user_id:'regression-user'})));
 const desktop=await openApp(t,data,{width:1440,height:1000}),mobile=await openApp(t,data,{width:390,height:844});
 await bind(desktop,backend);await bind(mobile,backend);
 await desktop.evaluate(()=>setTab('today'));await mobile.evaluate(()=>setTab('today'));
 await desktop.evaluate(()=>{startRoutine('production');routineToggle()});await desktop.evaluate(()=>flushRoutineCloud());await realtime(mobile,backend,'production');
 assert.equal(await mobile.evaluate(()=>!!sessions.production),true,JSON.stringify(backend.rows.filter(r=>r.date.startsWith('routine:'))));
 assert.equal(await mobile.locator('.cr-log-orb').count(),1,await mobile.evaluate(()=>JSON.stringify({sessions,tab:currentTab,pending:_routinePending,seen:_routineSeen})));
 assert.equal(await mobile.locator('#cr-dialog').count(),0);
 assert.equal(await mobile.evaluate(()=>sessions.production.endAt),await desktop.evaluate(()=>sessions.production.endAt));
 await mobile.locator('.cr-orb-button').click();await mobile.locator('#cr-dialog').getByRole('button',{name:'Pause',exact:true}).click();await mobile.evaluate(()=>flushRoutineCloud());await realtime(desktop,backend,'production');
 assert.equal(await desktop.locator('#cr-dialog').getByRole('button',{name:'Resume',exact:true}).count(),1);
 await desktop.locator('#cr-dialog').getByRole('button',{name:'Resume',exact:true}).click();await desktop.evaluate(()=>flushRoutineCloud());await realtime(mobile,backend,'production');
 assert.equal(await mobile.locator('#cr-dialog').getByRole('button',{name:'Pause',exact:true}).count(),1);
 await mobile.locator('#cr-dialog').getByRole('button',{name:'Next →',exact:true}).click();await mobile.waitForFunction(()=>sessions.production.q[0]===1&&!_routineClaims.production);await realtime(desktop,backend,'production');
 assert.ok((await desktop.locator('.cr-step-label').innerText()).startsWith('STEP 2 / '+await desktop.evaluate(()=>ROUTINES.production.steps.length)));
 await desktop.evaluate(()=>exitRoutine());
 await desktop.reload();await desktop.waitForFunction(()=>_cfgReady&&USER);await bind(desktop,backend);await desktop.evaluate(()=>setTab('today'));
 assert.equal(await desktop.evaluate(()=>sessions.production.q[0]),1);
 assert.equal(await desktop.evaluate(()=>sessions.production.endAt),await mobile.evaluate(()=>sessions.production.endAt));
 await mobile.screenshot({path:'test-results/routine-session-sync-mobile.png'});
 await desktop.screenshot({path:'test-results/routine-session-sync-desktop.png'});
 await mobile.locator('#cr-dialog .cr-session-menu summary').click();await mobile.locator('#cr-dialog').getByRole('button',{name:'Finalizar antes',exact:true}).click();await mobile.evaluate(()=>flushRoutineCloud());await realtime(desktop,backend,'production');
 assert.equal(await desktop.locator('.cr-log-orb').count(),0);assert.equal(await desktop.evaluate(()=>!!sessions.production),false);
 assert.equal(await mobile.evaluate(()=>getChecked(todayKey()).production||false),false);
});
