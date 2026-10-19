// Authenticated migration/recovery rehearsal on NEW synthetic identities only.
// Preparation precedes schema installation; verification resumes its manifest.
// This script never applies DDL, reads other owners, or touches published QA A/B.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {configFromEnv,QA_REF}=require('../supabase/guard.cjs');
const {apiClient}=require('../supabase/api.cjs');
const {locationFixture}=require('../../tests/location-fixtures.cjs');
const {serverRows,loadApp}=require('../../tests/helpers.cjs');
const copy=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):value);
const digest=value=>crypto.createHash('sha256').update(canonical(value)).digest('hex');
function readSnapshot(folder,manifest){
  const snapshot=JSON.parse(fs.readFileSync(path.join(folder,'baseline.json'),'utf8'));
  if(snapshot.projectRef!==QA_REF||snapshot.runId!==manifest.runId||digest(snapshot)!==manifest.baselineSha256)throw new Error('QA_BACKUP_INTEGRITY_FAILED');
  return snapshot;
}
(async()=>{
  const config=configFromEnv();if(!config.ready)throw new Error('QA_SECRETS_REQUIRED');
  const prepare=process.argv.includes('--prepare'),verify=process.argv.includes('--verify'),currentProtocol=process.argv.includes('--verify-current');
  if(prepare===verify)throw new Error('QA_EXPLICIT_PHASE_REQUIRED');
  const arg=process.argv.find(s=>s.startsWith('--run-id='));
  const runId=prepare?crypto.randomUUID():arg?.slice(9);
  if(!/^[a-f0-9-]{36}$/.test(runId||''))throw new Error('QA_MANIFEST_REQUIRED');
  const folder=path.join(__dirname,'../../test-results/migration-phase3',runId);
  fs.mkdirSync(folder,{recursive:true,mode:0o700});
  let report={projectRef:QA_REF,runId,remoteExecuted:true,cases:[],status:'preparing',currentProtocolRecheck:currentProtocol,sourceSha256:require('../supabase/guard.cjs').fileHash(path.join(__dirname,'../../index.html'))};
  if(verify&&process.argv.includes('--resume-failed')){
    const previous=JSON.parse(fs.readFileSync(path.join(folder,'report.json'),'utf8'));
    if(previous.status!=='failed'||previous.runId!==runId)throw new Error('QA_FAILED_RUN_REQUIRED');
    fs.writeFileSync(path.join(folder,'previous-attempt-'+Date.now()+'.json'),JSON.stringify(previous,null,2)+'\n',{mode:0o600});
    report={...previous,status:'resuming',attempts:(previous.attempts||1)+1};
  }
  const save=()=>fs.writeFileSync(path.join(folder,currentProtocol?'current-protocol-report.json':'report.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  const api=apiClient(config),sessions={};
  for(const who of ['A','B'])sessions[who]=await api.login(who);
  const rpc=(who,name,body={})=>api.request('POST','/rest/v1/rpc/'+name,sessions[who].access_token,name==='shaah_save_settings_v1'?{...body,p_data:{owner_id:config.users[who].id,data:body.p_data}}:body);
  const settings=async who=>{
    const r=await api.request('GET','/rest/v1/day_logs?select=data,settings_revision&date=eq.settings&user_id=eq.'+config.users[who].id,sessions[who].access_token);
    assert.ok(r.ok&&r.data?.length===1);return r.data[0];
  };
  let manifest,snapshot;
  if(prepare){
    for(const who of ['A','B'])if((await api.rows(who,sessions[who])).length)throw new Error('QA_EXISTING_DATA_ABORT');
    manifest={projectRef:QA_REF,runId,owners:Object.fromEntries(['A','B'].map(who=>[who,config.users[who].id])),fixtures:[],reservedDates:['2099-02-01'],scope:'new unshared synthetic migration users only; retained fixtures'};
    for(const who of ['A','B']){
      const f=locationFixture();f.config._qaMigrationId=runId;
      for(const p of f.config.people)p.name='Migration '+who+' '+p.name;
      for(const d of Object.values(f.days))d.note='Synthetic migration '+who+' '+runId;
      const rows=serverRows(f).map(row=>({...row,user_id:config.users[who].id}));
      manifest.fixtures.push(...rows.map(row=>({user_id:row.user_id,date:row.date})));
      fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
      const r=await api.request('POST','/rest/v1/day_logs',sessions[who].access_token,rows,{Prefer:'return=minimal'});
      if(!r.ok)throw new Error('QA_LEGACY_BASELINE_SEED_REJECTED');
    }
    snapshot={projectRef:QA_REF,runId,profiles:{}};
    for(const who of ['A','B'])snapshot.profiles[who]=await api.rows(who,sessions[who]);
    manifest.baselineSha256=digest(snapshot);
    fs.writeFileSync(path.join(folder,'baseline.json'),JSON.stringify(snapshot,null,2)+'\n',{mode:0o600});
    fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
    assert.deepEqual(readSnapshot(folder,manifest),snapshot);
    report.status='prepared_not_verified';report.baselineSha256=manifest.baselineSha256;report.baselineRows=Object.values(snapshot.profiles).reduce((n,r)=>n+r.length,0);save();console.log(JSON.stringify(report));return;
  }
  manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
  if(manifest.projectRef!==QA_REF||manifest.runId!==runId||['A','B'].some(who=>manifest.owners[who]!==config.users[who].id))throw new Error('QA_OWNER_MANIFEST_MISMATCH');
  snapshot=readSnapshot(folder,manifest);
  for(const who of ['A','B'])if(snapshot.profiles[who].find(r=>r.date==='settings')?.data?._cfg?._qaMigrationId!==runId)throw new Error('QA_SYNTHETIC_PROVENANCE_REQUIRED');
  async function step(name,fn){if(report.cases.some(c=>c.name===name&&c.status==='passed'))return;report.phase=name;save();await fn();report.cases.push({name,status:'passed'});save();}
  let current;
  try{
    await step('migration_preserves_every_baseline_row',async()=>{
      for(const who of ['A','B']){assert.deepEqual(await api.rows(who,sessions[who]),snapshot.profiles[who]);const revision=(await settings(who)).settings_revision;if(currentProtocol)assert.ok(Number.isSafeInteger(revision)&&revision>=0);else assert.equal(revision,0);}
    });
    await step(currentProtocol?'current_revision_keeps_the_legacy_baseline':'first_revision_archives_the_exact_legacy_configuration',async()=>{
      const old=await settings('A'),data=copy(old.data);data._cfg.people[0].name='Migration A first revision';
      const r=await rpc('A','shaah_save_settings_v1',{p_expected_revision:old.settings_revision,p_data:data});assert.ok(r.ok);assert.equal(r.data.settings_revision,old.settings_revision+1);
      const bak=await rpc('A','shaah_settings_backup_v1');assert.ok(bak.ok);assert.ok(bak.data.length>=2);assert.deepEqual(bak.data.find(b=>b.settings_revision===0).data,old.data);
      current=await settings('A');assert.deepEqual(current,r.data);assert.deepEqual(await api.rows('B',sessions.B),snapshot.profiles.B);
    });
    await step('legacy_upsert_patch_delete_and_primary_key_rename_cannot_replace_settings',async()=>{
      const before=await settings('A'),url='/rest/v1/day_logs?user_id=eq.'+config.users.A.id+'&date=eq.settings';
      const old=await api.request('POST','/rest/v1/day_logs?on_conflict=user_id,date',sessions.A.access_token,{user_id:config.users.A.id,date:'settings',data:{_cfg:{people:[]}}},{Prefer:'resolution=merge-duplicates,return=representation'});assert.equal(old.ok,false);
      const patch=await api.request('PATCH',url,sessions.A.access_token,{data:{_cfg:{people:[]}},settings_revision:999999},{Prefer:'return=representation'});assert.ok(!patch.ok||patch.data.length===0);
      const deletion=await api.request('DELETE',url,sessions.A.access_token,undefined,{Prefer:'return=representation'});assert.ok(!deletion.ok||deletion.data.length===0);
      const rename=await api.request('PATCH',url,sessions.A.access_token,{date:'2099-02-01'},{Prefer:'return=representation'});assert.ok(!rename.ok||rename.data.length===0);
      assert.deepEqual(await settings('A'),before);
    });
    await step('legacy_daily_writes_remain_compatible_and_owner_scoped',async()=>{
      const date='2099-02-01',url='/rest/v1/day_logs?user_id=eq.'+config.users.A.id+'&date=eq.'+date;
      assert.ok((await api.request('POST','/rest/v1/day_logs',sessions.A.access_token,{user_id:config.users.A.id,date,data:{_note:'Synthetic legacy daily write'}})).ok);
      const rename=await api.request('PATCH',url,sessions.A.access_token,{date:'settings'});assert.equal(rename.ok,false);
      assert.ok((await api.request('PATCH',url,sessions.A.access_token,{data:{_note:'Synthetic legacy daily edit'}})).ok);
      assert.ok((await api.request('DELETE',url,sessions.A.access_token)).ok);
      assert.deepEqual(await api.rows('B',sessions.B),snapshot.profiles.B);
    });
    await step('simultaneous_same_revision_writes_have_one_winner',async()=>{
      current=await settings('A');const expected=current.settings_revision,a=copy(current.data),b=copy(current.data);a._cfg.people[1].every=31;b._cfg.people[1].every=32;
      const results=await Promise.all([a,b].map(data=>rpc('A','shaah_save_settings_v1',{p_expected_revision:current.settings_revision,p_data:data})));
      assert.equal(results.filter(r=>r.ok).length,1);assert.equal(results.filter(r=>!r.ok&&r.status===409&&r.data?.code==='PT409').length,1);
      current=await settings('A');assert.equal(current.settings_revision,expected+1);
    });
    await step('large_configuration_uses_request_body_with_a_short_fixed_URL',async()=>{
      const data=copy(current.data);data._cfg.qaLarge='S'.repeat(131072);
      const body={p_expected_revision:current.settings_revision,p_data:data};
      const r=await rpc('A','shaah_save_settings_v1',body);assert.ok(r.ok);assert.deepEqual(r.data.data,data);
      report.largeConfigurationBodyBytes=Buffer.byteLength(JSON.stringify({...body,p_data:{owner_id:config.users.A.id,data:body.p_data}}));report.writeUrlBytes=Buffer.byteLength(config.origin+'/rest/v1/rpc/shaah_save_settings_v1');
      assert.ok(report.largeConfigurationBodyBytes>131072);assert.ok(report.writeUrlBytes<120);current=r.data;
    });
    await step('backups_are_owner_scoped_and_private_schema_is_not_exposed',async()=>{
      const old=await settings('B');assert.ok((await rpc('B','shaah_save_settings_v1',{p_expected_revision:old.settings_revision,p_data:old.data})).ok);
      for(const who of ['A','B']){const b=await rpc(who,'shaah_settings_backup_v1');assert.ok(b.ok&&b.data.length>=2);assert.ok(b.data.every(v=>v.data._cfg.people[0].name.startsWith('Migration '+who+' ')));}
      const privateRead=await api.request('GET','/rest/v1/day_logs?select=data',sessions.A.access_token,undefined,{'Accept-Profile':'shaah_private'});
      assert.equal(privateRead.status,406);assert.equal(privateRead.data?.code,'PGRST106');
    });
    await step('anonymous_RPC_calls_are_denied_without_changing_data',async()=>{
      const before=await settings('A');
      for(const [name,body]of [['shaah_save_settings_v1',{p_expected_revision:before.settings_revision,p_data:before.data}],['shaah_settings_backup_v1',{}],['shaah_restore_settings_v1',{p_restore_revision:0,p_expected_revision:before.settings_revision}]]){
        const r=await api.request('POST','/rest/v1/rpc/'+name,null,body);assert.ok([401,403].includes(r.status));
      }
      assert.deepEqual(await settings('A'),before);
    });
    await step('settings_recovery_is_exact_and_keeps_a_monotonic_revision',async()=>{
      const before=await settings('A'),baseline=snapshot.profiles.A.find(r=>r.date==='settings').data;
      const stale=await rpc('A','shaah_restore_settings_v1',{p_restore_revision:0,p_expected_revision:0});assert.equal(stale.ok,false);assert.equal(stale.status,409);assert.equal(stale.data?.code,'PT409');assert.deepEqual(await settings('A'),before);
      const restored=await rpc('A','shaah_restore_settings_v1',{p_restore_revision:0,p_expected_revision:before.settings_revision});assert.ok(restored.ok);assert.equal(restored.data.settings_revision,before.settings_revision+1);assert.deepEqual(restored.data.data,baseline);
    });
    await step('verified_export_recovers_a_damaged_day_and_the_complete_profile',async()=>{
      const date='2026-09-07',url='/rest/v1/day_logs?user_id=eq.'+config.users.A.id+'&date=eq.'+date;
      assert.ok((await api.request('PATCH',url,sessions.A.access_token,{data:{_note:'Synthetic damage for recovery drill'}})).ok);
      assert.notDeepEqual(await api.rows('A',sessions.A),snapshot.profiles.A);
      const verified=readSnapshot(folder,manifest),days=verified.profiles.A.filter(r=>r.date!=='settings');
      assert.ok((await api.request('POST','/rest/v1/day_logs?on_conflict=user_id,date',sessions.A.access_token,days,{Prefer:'resolution=merge-duplicates,return=minimal'})).ok);
      for(const who of ['A','B'])assert.deepEqual(await api.rows(who,sessions[who]),verified.profiles[who]);
      const recovered=await api.rows('A',sessions.A);
      const fixture={config:recovered.find(r=>r.date==='settings').data._cfg,days:Object.fromEntries(recovered.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)).map(r=>[r.date,{checks:r.data._checks||{},social:r.data._social||{},people:r.data._people||[],note:r.data._note||'',_daylog:r.data._daylog||[]}]))};
      const app=loadApp(fixture);assert.equal(app.read('calcScore("2026-09-16").score'),7);assert.equal(app.read('calcScore("2026-10-08").score'),27);
      report.recoveredProfileSha256=digest(verified.profiles.A);report.recoveredRows=verified.profiles.A.length;
    });
    await step('a_corrupted_export_is_rejected_before_recovery',async()=>{
      const original=fs.readFileSync(path.join(folder,'baseline.json'),'utf8');
      try{const broken=JSON.parse(original);broken.profiles.A[0].data._note='Synthetic corruption';fs.writeFileSync(path.join(folder,'baseline.json'),JSON.stringify(broken),{mode:0o600});assert.throws(()=>readSnapshot(folder,manifest),/QA_BACKUP_INTEGRITY_FAILED/);}
      finally{fs.writeFileSync(path.join(folder,'baseline.json'),original,{mode:0o600});}
      assert.deepEqual(readSnapshot(folder,manifest),snapshot);
    });
    report.status='passed';delete report.code;delete report.errorClass;report.productionRequests=0;report.nodeRequests=api.audit.requests;report.fixturesRetained=true;save();console.log(JSON.stringify(report,null,2));
  }catch(e){report.status='failed';report.code=/^QA_[A-Z_]+$/.test(e.message)?e.message:e.name==='AssertionError'?'QA_REHEARSAL_ASSERTION_FAILED':'QA_REHEARSAL_STEP_FAILED';report.errorClass=e.name;save();console.log(JSON.stringify(report,null,2));process.exitCode=1;}
})().catch(e=>{console.log(JSON.stringify({status:'blocked',code:/^QA_[A-Z_]+$/.test(e.message)?e.message:'QA_REHEARSAL_FAILED'}));process.exitCode=2;});
