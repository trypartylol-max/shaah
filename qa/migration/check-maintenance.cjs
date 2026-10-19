// Only the unshared migration fixture owners, never the published preview users.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {configFromEnv}=require('../supabase/guard.cjs');
const {apiClient}=require('../supabase/api.cjs');
(async()=>{
  const config=configFromEnv(),arg=process.argv.find(s=>s.startsWith('--run-id=')),runId=arg?.slice(9);
  if(!/^[a-f0-9-]{36}$/.test(runId||''))throw new Error('QA_MANIFEST_REQUIRED');
  const mode=process.argv.includes('--damage')?'damage':process.argv.includes('--paused')?'paused':process.argv.includes('--resumed')?'resumed':null;
  if(!mode)throw new Error('QA_EXPLICIT_PHASE_REQUIRED');
  const folder=path.join(__dirname,'../../test-results/migration-phase3',runId),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
  if(['A','B'].some(w=>manifest.owners[w]!==config.users[w].id))throw new Error('QA_OWNER_MANIFEST_MISMATCH');
  const api=apiClient(config),session=await api.login('A'),before=await api.rows('A',session),owner=config.users.A.id;
  const cfg=before.find(r=>r.date==='settings');if(cfg?.data?._cfg?._qaMigrationId!==runId)throw new Error('QA_SYNTHETIC_PROVENANCE_REQUIRED');
  const read=await api.request('GET','/rest/v1/day_logs?select=data,settings_revision&user_id=eq.'+owner+'&date=eq.settings',session.access_token);assert.ok(read.ok);let current=read.data[0];
  const rpc=(name,body)=>api.request('POST','/rest/v1/rpc/'+name,session.access_token,name==='shaah_save_settings_v1'?{...body,p_data:{owner_id:owner,data:body.p_data}}:body);
  const day='/rest/v1/day_logs?user_id=eq.'+owner+'&date=eq.2026-09-07';
  const report={projectRef:config.projectRef,runId,mode,cases:[]};
  if(mode==='damage'){
    const data=structuredClone(current.data);data._cfg._qaRecoveryDrill=true;
    assert.ok((await rpc('shaah_save_settings_v1',{p_expected_revision:current.settings_revision,p_data:data})).ok);
    assert.ok((await api.request('PATCH',day,session.access_token,{data:{_note:'SHAAH synthetic recovery damage '+runId}})).ok);
    report.cases.push('manifest_owned_synthetic_settings_and_day_damage');
  }else if(mode==='paused'){
    for(const [name,body]of [['shaah_save_settings_v1',{p_expected_revision:current.settings_revision,p_data:current.data}],['shaah_restore_settings_v1',{p_restore_revision:0,p_expected_revision:current.settings_revision}]])assert.equal((await rpc(name,body)).status,403);
    assert.equal((await api.request('POST','/rest/v1/day_logs',session.access_token,{user_id:owner,date:'2099-02-01',data:{_note:'Must be blocked'}})).status,403);
    assert.equal((await api.request('PATCH',day,session.access_token,{data:{_note:'Must be blocked'}})).status,403);
    assert.equal((await api.request('DELETE',day,session.access_token)).status,403);
    assert.ok((await rpc('shaah_settings_backup_v1',{})).ok);assert.deepEqual(await api.rows('A',session),before);
    report.cases.push('settings_save_and_restore_denied','daily_insert_update_delete_denied','reads_and_private_backup_RPC_available','all_rows_unchanged');
  }else{
    const data=structuredClone(current.data);data._cfg.qaLarge='S'.repeat(131072);
    const body={p_expected_revision:current.settings_revision,p_data:data};
    let saved=await rpc('shaah_save_settings_v1',body);assert.ok(saved.ok);assert.equal(saved.data.settings_revision,current.settings_revision+1);
    report.largeOwnerBoundBodyBytes=Buffer.byteLength(JSON.stringify({...body,p_data:{owner_id:owner,data}}));
    const restored=await rpc('shaah_restore_settings_v1',{p_restore_revision:0,p_expected_revision:saved.data.settings_revision});assert.ok(restored.ok);
    const testDate='2099-02-01',url='/rest/v1/day_logs?user_id=eq.'+owner+'&date=eq.'+testDate;
    assert.ok((await api.request('POST','/rest/v1/day_logs',session.access_token,{user_id:owner,date:testDate,data:{_note:'Synthetic resume check'}})).ok);
    assert.ok((await api.request('PATCH',url,session.access_token,{data:{_note:'Synthetic resume edit'}})).ok);
    assert.ok((await api.request('DELETE',url,session.access_token)).ok);assert.deepEqual(await api.rows('A',session),before);
    const rows=await api.rows('A',session),restoredCfg=rows.find(r=>r.date==='settings').data._cfg;
    const recovered={config:restoredCfg,days:Object.fromEntries(rows.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)).map(r=>[r.date,{checks:r.data._checks||{},social:r.data._social||{},people:r.data._people||[],note:r.data._note||'',_daylog:r.data._daylog||[]}]))};
    const app=require('../../tests/helpers.cjs').loadApp(recovered);assert.equal(app.read('calcScore("2026-09-16").score'),7);assert.equal(app.read('calcScore("2026-10-08").score'),27);
    report.recoveredSocialScores={vacation:7,work:27};
    report.cases.push('revision_save_and_restore_resumed','daily_insert_update_delete_resumed','all_business_rows_unchanged','social_scoring_from_recovered_cloud_rows');
  }
  report.status='passed';fs.writeFileSync(path.join(folder,'maintenance-'+mode+'.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
})().catch(e=>{console.log(JSON.stringify({status:'failed',code:/^QA_[A-Z_]+$/.test(e.message)?e.message:e.name==='AssertionError'?'QA_MAINTENANCE_ASSERTION_FAILED':'QA_MAINTENANCE_CHECK_FAILED'}));process.exitCode=1;});
