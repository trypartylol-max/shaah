// No account session and no business writes. Fixed original target only.
const fs=require('node:fs'),assert=require('node:assert/strict'),readline=require('node:readline');
const rl=readline.createInterface({input:process.stdin,terminal:false});
rl.once('line',async line=>{rl.close();process.stdin.pause();process.stdin.unref?.();
 try{
  const {key}=JSON.parse(line);assert.ok(/^sb_publishable_/.test(key));
  const report={projectRef:'llpyxktcfubhmthqujpa',authenticatedAccountUsed:false,writes:0,schemas:[]};
  for(const schema of ['shaah_private','shaah_recovery']){
   const r=await fetch('https://llpyxktcfubhmthqujpa.supabase.co/rest/v1/day_logs?select=id&limit=0',{headers:{apikey:key,'Accept-Profile':schema},redirect:'error',signal:AbortSignal.timeout(15000)});
   const body=await r.json();assert.equal(r.status,406);assert.equal(body.code,'PGRST106');report.schemas.push({schema,status:r.status,code:body.code,exposed:false});
  }
  const auth=await fetch('https://llpyxktcfubhmthqujpa.supabase.co/auth/v1/settings',{headers:{apikey:key},redirect:'error',signal:AbortSignal.timeout(15000)});
  assert.equal(auth.status,200);report.googleProviderConfigured=(await auth.json()).external?.google===true;
  report.status='passed';
  fs.mkdirSync('test-results/production',{recursive:true});fs.writeFileSync('test-results/production/public-target-probe.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
 }catch(e){console.log(JSON.stringify({status:'failed',code:'PRODUCTION_READONLY_PROBE_FAILED',errorType:e.name}));process.exitCode=1;}
});
