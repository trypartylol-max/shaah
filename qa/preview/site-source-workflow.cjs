// Native Sites source contract fallback: the bundled helper is not installed.
// Restricted to the separate QA Site checkout. No GitHub pushes or token files.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const readline=require('node:readline');
const ROOT='/workspace/sites/shaah-test-preview';
async function readInput(){
  const rl=readline.createInterface({input:process.stdin,terminal:false});
  const value=await new Promise(r=>{rl.once('line',v=>{r(v);rl.close();process.stdin.pause();});rl.once('close',()=>r(''));});
  process.stdin.unref?.();return JSON.parse(value);
}
async function main(){
  const cfg=await readInput(),manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'.openai/hosting.json'),'utf8'));
  if(cfg.project_id!==manifest.project_id||!cfg.project_id?.startsWith('appgprj_'))throw new Error('SITE_ID_MISMATCH');
  const cred=cfg.credential,url=new URL(cred.remote_url);
  if(url.protocol!=='https:'||url.username||url.password||url.hostname==='github.com'||url.hostname==='gitlab.com'||cred.auth_mode!=='http_extra_header'||/[\r\n]/.test(cred.token))throw new Error('SITE_REMOTE_INVALID');
  const header=/^[A-Za-z-]+: /.test(cred.token)?cred.token:'Authorization: Bearer '+cred.token;
  const env={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.extraHeader',GIT_CONFIG_VALUE_0:header,GIT_TRACE:'0',GIT_TRACE_CURL:'0',GIT_CURL_VERBOSE:'0'};
  let phase='initialize';
  const run=(cmd,args,auth=false)=>{
    const r=cp.spawnSync(cmd,args,{cwd:ROOT,env:auth?env:process.env,encoding:'utf8',maxBuffer:16*1024*1024});
    if(r.status!==0)throw new Error('SITE_'+phase.toUpperCase()+'_FAILED');return r.stdout.trim();
  };
  if(!fs.existsSync(path.join(ROOT,'.git'))){
    run('git',['init','--initial-branch='+cred.branch]);run('git',['remote','add','origin',cred.remote_url]);
    run('git',['config','user.name','SHAAH QA Preview']);run('git',['config','user.email','qa@shaah.invalid']);
    phase='fetch';const refs=run('git',['ls-remote','--heads','origin',cred.branch],true);
    if(refs){run('git',['fetch','origin',cred.branch],true);run('git',['reset','--mixed','FETCH_HEAD']);}
  }
  if(run('git',['remote','get-url','origin'])!==cred.remote_url)throw new Error('SITE_REMOTE_MISMATCH');
  phase='build';run('bash',['scripts/build.sh']);run('node',['scripts/validate-artifact.mjs']);
  phase='commit';run('git',['add','.']);
  if(run('git',['status','--porcelain']))run('git',['commit','-m','Prepare isolated SHAAH-TEST preview']);
  const commit=run('git',['rev-parse','HEAD']);
  phase='push';run('git',['push','origin','HEAD:refs/heads/'+cred.branch],true);
  phase='archive';const archive='/workspace/shaah-test-preview-deploy.tar.gz';run('tar',['-czf',archive,'-C',ROOT,'.openai/hosting.json','dist/server/index.js']);
  console.log(JSON.stringify({project_id:manifest.project_id,commit_sha:commit,archive,sourceBranch:cred.branch,remoteHost:url.hostname}));
}
main().catch(e=>{console.log(JSON.stringify({error:/^SITE_[A-Z_]+$/.test(e.message)?e.message:'SITE_WORKFLOW_FAILED'}));process.exitCode=2;});
