// Explicit cleanup of this executor's unpublished synthetic run, never general data.
const fs=require('node:fs'),path=require('node:path');
const {configFromEnv}=require('../supabase/guard.cjs');
const {apiClient}=require('../supabase/api.cjs');
(async()=>{
  if(!process.argv.includes('--preview-unpublished'))throw new Error('QA_PUBLICATION_STATE_REQUIRED');
  const arg=process.argv.find(x=>x.startsWith('--qa-run='))||'',id=arg.slice('--qa-run='.length);
  if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('QA_MANIFEST_REQUIRED');
  const folder=path.join(__dirname,'../../test-results/supabase-phase2/runs',id);
  const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
  if(manifest.projectRef!=='kpnwiwaiwnndpvtxkvva'||manifest.runId!==id)throw new Error('QA_MANIFEST_MISMATCH');
  const config=configFromEnv(),api=apiClient(config),sessions={},owned={};
  for(const who of ['A','B']){
    sessions[who]=await api.login(who);owned[who]=await api.rows(who,sessions[who]);
    const allowed=new Set([...manifest.fixtures,...manifest.possibleRuntimeRows].filter(r=>r.user_id===config.users[who].id).map(r=>r.date));
    if(owned[who].length&&owned[who].find(r=>r.date==='settings')?.data?._cfg?._qaRunId!==id)throw new Error('QA_ORIGIN_UNPROVEN');
    if(owned[who].some(r=>!allowed.has(r.date)))throw new Error('QA_UNKNOWN_ROW_ABORT');
  }
  const changes=[];
  for(const who of ['A','B'])for(const row of owned[who]){
    const result=await api.request('DELETE','/rest/v1/day_logs?user_id=eq.'+config.users[who].id+'&date=eq.'+encodeURIComponent(row.date),sessions[who].access_token);
    if(!result.ok)throw new Error('QA_CLEANUP_REJECTED');
    changes.push({user_id:config.users[who].id,date:row.date});
  }
  for(const who of ['A','B'])if((await api.rows(who,sessions[who])).length)throw new Error('QA_NOT_EMPTY');
  const report={projectRef:config.projectRef,runId:id,scope:'only manifest-owned synthetic fixtures before first preview publication',deleted:changes,status:'passed'};
  fs.writeFileSync(path.join(folder,'cleanup.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'passed',runId:id,deletedRows:changes.length}));
})().catch(e=>{console.log(JSON.stringify({status:'blocked',code:/^QA_[A-Z_]+$/.test(e.message)?e.message:'QA_CLEANUP_FAILED'}));process.exitCode=2;});
