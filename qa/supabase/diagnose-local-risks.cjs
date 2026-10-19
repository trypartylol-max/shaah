// Real app functions with an in-memory PostgREST backend. No remote certification.
const fs=require('node:fs');
const path=require('node:path');
const {loadApp,serverRows}=require('../../tests/helpers.cjs');
const {locationFixture}=require('../../tests/location-fixtures.cjs');
const {syncBackend}=require('../../tests/sync-backend.cjs');
function context(server){
  const app=loadApp(locationFixture(),{client:server.client});
  app.run('USER={id:"synthetic-A"};');
  app.run('rowToState('+JSON.stringify(server.rows.find(r=>r.date==='settings'))+');_cfgReady=true;');
  return app;
}
(async()=>{
  const server=syncBackend(serverRows(locationFixture()).map(row=>({...row,user_id:'synthetic-A'})));
  const app=context(server);
  app.run('setNote(todayKey(),"QA_A_PENDING");changeSyncUser({id:"synthetic-B"});navigator.onLine=true;');
  await app.run('flushOfflineQueue()');
  const noBWrite=!server.rows.some(r=>r.user_id==='synthetic-B'&&r.data._note==='QA_A_PENDING');
  app.run('changeSyncUser({id:"synthetic-A"});restoreOfflineQueue();');
  await app.run('flushOfflineQueue()');
  const replay=server.rows.find(r=>r.date==='2026-10-16'&&r.data._note==='QA_A_PENDING');
  const a=context(server),b=context(server);
  a.run('personSet("pold01","name","QA renamed concurrently");');await a.run('flushCfgSaves()');
  b.run('personSet("pold02","every",99);');await b.run('flushCfgSaves()');
  const cfg=server.rows.find(r=>r.date==='settings').data._cfg;
  const evidence={
    scope:'local application functions; in-memory PostgREST; no network',
    offlineCrossAccount:{status:noBWrite&&replay?.user_id==='synthetic-A'?'passed_locally':'defect_reproduced',queuedOwner:'synthetic-A',submittedOwner:replay?.user_id,otherOwnerWrites:server.rows.filter(r=>r.user_id==='synthetic-B').length},
    staleWholeConfigWrite:{status:cfg.people[0].name==='QA renamed concurrently'&&cfg.people[1].every===99?'passed_locally':'defect_reproduced'}
  };
  const output=path.join(__dirname,'../../test-results/supabase-phase2');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'local-risk-diagnostics.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if([evidence.offlineCrossAccount,evidence.staleWholeConfigWrite].some(x=>x.status!=='passed_locally'))process.exitCode=1;
})().catch(()=>{console.log('LOCAL_DIAGNOSTIC_ERROR');process.exitCode=2;});
