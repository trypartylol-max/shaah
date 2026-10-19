const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const source=fs.readFileSync('/workspace/sites/shaah-test-preview/dist/server/index.js','utf8');
  assert.equal(source.includes('llpyxktcfubhmthqujpa'),false);
  const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
  const env={SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'};
  for(const who of ['A','B'])for(const field of ['ID','EMAIL','PASSWORD'])env['SHAAH_TEST_USER_'+who+'_'+field]='synthetic-'+who+'-'+field;
  const origin='https://preview.invalid';
  const root=await worker.fetch(new Request(origin+'/'),env);
  assert.equal(root.status,200);assert.match(root.headers.get('Content-Security-Policy'),/connect-src 'self' https:\/\/kpnwiwaiwnndpvtxkvva.supabase.co wss:\/\/kpnwiwaiwnndpvtxkvva.supabase.co;/);
  const html=await root.text();assert.equal(html.includes('cdn.jsdelivr.net'),false);assert.equal(html.includes('fonts.googleapis.com'),false);
  const config=await worker.fetch(new Request(origin+'/qa/config.js'),env);const text=await config.text();
  assert.ok(text.includes('sb_publishable_synthetic'));assert.ok(!text.includes(env.SHAAH_TEST_USER_A_PASSWORD));
  const rejected=await worker.fetch(new Request(origin+'/qa/config.js'),{...env,SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY:'sb_secret_forbidden'});
  assert.equal(rejected.status,503);assert.equal((await rejected.text()).includes('sb_secret_forbidden'),false);
  assert.equal((await worker.fetch(new Request(origin+'/qa/session'),env)).status,405);
  assert.equal((await worker.fetch(new Request(origin+'/qa/session',{method:'POST',headers:{Origin:'https://foreign.invalid'},body:'{}'}),env)).status,403);
  assert.equal((await worker.fetch(new Request(origin+'/qa/session',{method:'POST',body:JSON.stringify({profile:'ADMIN'})}),env)).status,400);
  const original=global.fetch;let calls=0;
  global.fetch=async(url,options)=>{
    calls++;assert.equal(url,'https://kpnwiwaiwnndpvtxkvva.supabase.co/auth/v1/token?grant_type=password');assert.equal(options.redirect,'manual');
    const who=JSON.parse(options.body).email.includes('-B-')?'B':'A';
    return new Response(JSON.stringify({access_token:'synthetic-access',refresh_token:'synthetic-refresh',user:{id:env['SHAAH_TEST_USER_'+who+'_ID'],email:env['SHAAH_TEST_USER_'+who+'_EMAIL']}}));
  };
  try{for(const who of ['A','B']){
    const response=await worker.fetch(new Request(origin+'/qa/session',{method:'POST',headers:{Origin:origin},body:JSON.stringify({profile:who})}),env);
    assert.equal(response.status,200);const body=await response.text();assert.equal(body.includes('PASSWORD'),false);assert.equal(response.headers.get('Cache-Control'),'no-store');
  }}finally{global.fetch=original;}
  assert.equal(calls,2);
  console.log(JSON.stringify({status:'passed',scope:'QA Worker route, secret isolation, CSP, public-key validation and profile routing; stubbed Auth response'}));
})().catch(()=>{console.log('QA_SITE_CHECK_FAILED');process.exitCode=2;});
