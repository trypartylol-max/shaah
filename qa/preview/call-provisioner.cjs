// Only stdin carries the proof and synthetic passwords. No credential output.
const readline = require('node:readline');
const ORIGIN='https://kpnwiwaiwnndpvtxkvva.supabase.co';
async function main(){
  const input=readline.createInterface({input:process.stdin,terminal:false});
  const line=await new Promise(resolve=>{input.once('line',v=>{resolve(v);input.close();process.stdin.pause();});input.once('close',()=>resolve(''));});
  process.stdin.unref?.();
  const cfg=JSON.parse(line);
  if(!/^shaah-qa-provision-[a-f0-9]{12}$/.test(cfg.functionName))throw new Error('QA_FUNCTION_INVALID');
  const tokenBody=JSON.parse(Buffer.from(cfg.anonKey.split('.')[1],'base64url'));
  if(tokenBody.role!=='anon'||tokenBody.ref!=='kpnwiwaiwnndpvtxkvva')throw new Error('QA_KEY_INVALID');
  const url=ORIGIN+'/functions/v1/'+cfg.functionName;
  const call=proof=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+cfg.anonKey,apikey:cfg.anonKey,'Content-Type':'application/json','x-shaah-provision-proof':proof},body:JSON.stringify(proof===cfg.proof?{passwords:cfg.passwords}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
  const denied=await call('0'.repeat(64));
  if(denied.status!==401)throw new Error('QA_PROVISION_GUARD_FAILED');
  const response=await call(cfg.proof);
  const body=await response.json();
  const result={guardHttpStatus:denied.status,provisionHttpStatus:response.status,projectRef:body.projectRef,users:body.users||body.created||{},error:body.error||null};
  console.log(JSON.stringify(result));
  if(!response.ok)process.exitCode=2;
}
main().catch(()=>{console.log(JSON.stringify({error:'QA_PROVISION_CALL_FAILED'}));process.exitCode=2;});
