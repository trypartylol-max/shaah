// First-publication demo initialization. Only the just-created QA users and
// settings stamped by the successful synthetic run are eligible; no other data.
const fs=require('node:fs'),path=require('node:path');
const {configFromEnv}=require('../supabase/guard.cjs');
const {apiClient}=require('../supabase/api.cjs');
const {loadApp,clone}=require('../../tests/helpers.cjs');
const {locationFixture}=require('../../tests/location-fixtures.cjs');
(async()=>{
  if(!process.argv.includes('--preview-unpublished'))throw new Error('QA_PUBLICATION_STATE_REQUIRED');
  const arg=process.argv.find(x=>x.startsWith('--qa-run='))||'',runId=arg.slice('--qa-run='.length);
  if(!/^[a-f0-9-]{36}$/.test(runId))throw new Error('QA_RUN_REQUIRED');
  const config=configFromEnv(),api=apiClient(config),report={projectRef:config.projectRef,runId,profiles:[]};
  for(const who of ['A','B']){
    const session=await api.login(who),rows=await api.rows(who,session),old=rows.find(r=>r.date==='settings')?.data;
    if(old?._cfg?._qaRunId!==runId&&!(old?._cfg?._qaRunId==='preview-demo-'+runId&&old?._cfg?._qaSynthetic===true))throw new Error('QA_ORIGIN_UNPROVEN');
    const fixture=locationFixture(),app=loadApp(fixture);
    app.run('CFG=cfgCopy(DEFAULT_CFG);applyCfg();migrateCfg();ensureBaseline();');
    const cfg=app.read('CFG'),snap=app.read('cfgSnap()');
    cfg.people=clone(fixture.config.people).map(p=>({...p,name:'QA '+who+' '+p.name.replace('Existing','Demo')}));
    cfg.locationGroups=clone(fixture.config.locationGroups);cfg.selectedLocation='il';cfg.socialTab=true;
    cfg.log=[{...clone(snap),from:'0001-01-01',mode:'work'},{...clone(snap),from:'2026-09-08',mode:'vacation'},{...clone(snap),from:'2026-10-08',mode:'work'}];
    cfg.travel={mode:'work',auto:false,resumeOn:'',modeUpdatedAt:Date.now()};cfg.travelV=10;
    cfg._qaRunId='preview-demo-'+runId;cfg._qaSynthetic=true;
    const data={_cfg:cfg};
    const filter='/rest/v1/day_logs?user_id=eq.'+config.users[who].id+'&date=eq.settings&data=eq.'+encodeURIComponent(JSON.stringify(old))+'&select=data';
    const result=await api.request('PATCH',filter,session.access_token,{data},{Prefer:'return=representation'});
    if(!result.ok||result.data?.length!==1)throw new Error('QA_DEMO_INITIALIZATION_FAILED');
    // Exercise the actual size of a normal full configuration before handing it over.
    const smoke=clone(data);smoke._cfg._qaConditionalWriteVerified=true;
    const fullFilter='/rest/v1/day_logs?user_id=eq.'+config.users[who].id+'&date=eq.settings&data=eq.'+encodeURIComponent(JSON.stringify(data))+'&select=data';
    const update=await api.request('PATCH',fullFilter,session.access_token,{data:smoke},{Prefer:'return=representation'});
    report.profiles.push({profile:who,habits:Object.keys(cfg.h).length,routines:Object.keys(cfg.routines||{}).length,contacts:cfg.people.length,encodedFilterBytes:Buffer.byteLength(fullFilter),conditionalHttpStatus:update.status,conditionalWritePassed:update.ok&&update.data?.length===1});
    fs.writeFileSync(path.join(__dirname,'../../test-results/supabase-phase2/demo-initialization.json'),JSON.stringify(report,null,2)+'\n');
    if(!update.ok||update.data?.length!==1)throw new Error('QA_FULL_SETTINGS_CONDITIONAL_WRITE_FAILED');
    const backup=await api.request('POST','/rest/v1/day_logs?on_conflict=user_id,date',session.access_token,{user_id:config.users[who].id,date:'cfgbak',data:{_bak:[{t:new Date().toISOString(),cfg:JSON.stringify(smoke._cfg)}]}},{Prefer:'resolution=merge-duplicates,return=minimal'});
    if(!backup.ok)throw new Error('QA_DEMO_BACKUP_FAILED');
  }
  report.status='passed';fs.writeFileSync(path.join(__dirname,'../../test-results/supabase-phase2/demo-initialization.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.log(JSON.stringify({status:'blocked',code:/^QA_[A-Z_]+$/.test(e.message)?e.message:'QA_DEMO_FAILED'}));process.exitCode=2;});
