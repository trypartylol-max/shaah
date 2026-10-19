const readline=require('node:readline');
const SITE='https://shaah-test-location-groups.arviler.chatgpt.site';
const rl=readline.createInterface({input:process.stdin,terminal:false});
rl.once('line',async line=>{
  rl.close();process.stdin.pause();process.stdin.unref?.();
  try{const cfg=JSON.parse(line),cases=[];
    for(const withOrigin of [false,true]){
      const r=await fetch(SITE+'/qa/session',{method:'POST',headers:{'OAI-Sites-Authorization':'Bearer '+cfg.serviceToken,'Content-Type':'application/json',...(withOrigin?{Origin:SITE}:{})},body:JSON.stringify({profile:'A'}),redirect:'error',signal:AbortSignal.timeout(20000)});
      let data={};try{data=await r.json();}catch{}
      cases.push({withOrigin,httpStatus:r.status,error:typeof data.error==='string'&&/^[A-Z_]+$/.test(data.error)?data.error:null,upstreamStatus:Number.isInteger(data.upstreamStatus)?data.upstreamStatus:null,errorType:['TypeError','TimeoutError','Error'].includes(data.errorType)?data.errorType:null,sessionPresent:!!data.access_token});
    }
    console.log(JSON.stringify({site:SITE,cases}));
  }catch{console.log('QA_SITE_LOGIN_PROBE_FAILED');process.exitCode=2;}
});
