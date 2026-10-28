// Existing owner-private QA A/B: no seed, no reset, no configuration writes.
// A --write-probe may touch one preflight-absent, tagged future day for A only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),readline=require('node:readline');
const {chromium}=require('playwright');
const {QA_ORIGIN,QA_REF,LOCAL_ORIGIN,assertQaUrl,temporaryHtml,installBrowserGuard}=require('./guard.cjs');
const root=path.resolve(__dirname,'../..'),SITE='https://shaah-test-location-groups.arviler.chatgpt.site';
const out=path.join(root,'test-results/existing-qa');fs.mkdirSync(out,{recursive:true});
const report={projectRef:QA_REF,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),cases:[],applicationWrites:0,productionRequests:0,existingRowsChanged:false};
const mark=name=>report.cases.push({name,status:'passed'});
const {digest:hash}=require('./probe-integrity.cjs');
console.log('Ready for private Site proof on hidden stdin.');
const rl=readline.createInterface({input:process.stdin,terminal:false});
rl.once('line',async line=>{
 rl.close();process.stdin.pause();process.stdin.unref?.();let browser,scope,request,originalRows;
 try{
  const proof=JSON.parse(line);assert.equal(proof.siteUrl,SITE);assert.ok(proof.serviceToken);
  const site=async(endpoint,options={})=>{
   assert.ok(['/qa/health','/qa/config.js','/qa/session'].includes(endpoint));
   return fetch(SITE+endpoint,{...options,headers:{'OAI-Sites-Authorization':'Bearer '+proof.serviceToken,...options.headers},redirect:'error',signal:AbortSignal.timeout(30000)});
  };
  report.phase='private_health';const healthResponse=await site('/qa/health');assert.equal(healthResponse.status,200);const health=await healthResponse.json();
  assert.equal(health.projectRef,QA_REF);assert.equal(health.credentialsConfigured,true);mark('existing_private_QA_gateway_has_configured_profiles');
  const configResponse=await site('/qa/config.js');assert.equal(configResponse.status,200);const config=await configResponse.text(),key=config.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];assert.ok(key);
  const sessions={};
  for(const who of ['A','B']){
   report.phase='authenticate_'+who;const r=await site('/qa/session',{method:'POST',headers:{Origin:SITE,'Content-Type':'application/json'},body:JSON.stringify({profile:who})});assert.equal(r.status,200);
   sessions[who]=await r.json();assert.ok(sessions[who].access_token&&sessions[who].refresh_token);assert.ok(sessions[who].user.email.startsWith('qa-'+who.toLowerCase()+'-'));
  }
  assert.notEqual(sessions.A.user.id,sessions.B.user.id);mark('both_existing_synthetic_accounts_authenticate');
  request=async(who,method,endpoint,body,extra={})=>{
   const url=QA_ORIGIN+endpoint;assertQaUrl(url);
   if(method!=='GET'&&!['/auth/v1/token','/auth/v1/logout'].includes(new URL(url).pathname)){
    assert.ok(scope&&who==='A');const u=new URL(url);assert.equal(u.pathname,'/rest/v1/day_logs');
    if(method==='DELETE'){assert.equal(u.searchParams.get('user_id'),'eq.'+scope.owner);assert.equal(u.searchParams.get('date'),'eq.'+scope.date);const expected=JSON.parse((u.searchParams.get('data')||'').replace(/^eq\./,''));assert.equal(hash(expected),hash(scope.lastData));assert.ok(expected._note?.startsWith(scope.tag+':'));}
    else{assert.equal(method,'POST');assert.equal(body.user_id,scope.owner);assert.equal(body.date,scope.date);assert.ok(body.data?._note?.startsWith(scope.tag+':'));}
    report.applicationWrites++;if(method==='POST')scope.lastData=structuredClone(body.data);
   }
   const r=await fetch(url,{method,headers:{apikey:key,...(who?{Authorization:'Bearer '+sessions[who].access_token}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
   let data=null;try{data=await r.json();}catch{}return {status:r.status,ok:r.ok,data};
  };
  const rows=async who=>{const r=await request(who,'GET','/rest/v1/day_logs?select=date,data,settings_revision&user_id=eq.'+sessions[who].user.id+'&order=date.asc');assert.ok(r.ok&&Array.isArray(r.data));return r.data;};
  originalRows={A:await rows('A'),B:await rows('B')};
  for(const who of ['A','B']){
   const me=await request(who,'GET','/auth/v1/user');assert.equal(me.data.id,sessions[who].user.id);
   const other=who==='A'?'B':'A';const cross=await request(who,'GET','/rest/v1/day_logs?select=date&user_id=eq.'+sessions[other].user.id+'&limit=1');assert.ok(cross.ok);assert.deepEqual(cross.data,[]);
  }
  mark('real_authenticated_RLS_blocks_cross_account_reads_both_directions');
  const anon=await request(null,'GET','/rest/v1/day_logs?select=date&limit=0');assert.ok([401,403].includes(anon.status));mark('anonymous_table_access_denied');
  const candidate=temporaryHtml(fs.readFileSync(path.join(root,'index.html'),'utf8'),key),sdk=fs.readFileSync(path.join(root,'assets/supabase-2.118.0.js'),'utf8');
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'UTC',serviceWorkers:'block'}),audit={allowedHttp:0,allowedWebSockets:0,blocked:[],blockedWrites:0,realtimeEvents:[]},transport={offline:false};
  await installBrowserGuard(context,{html:candidate,sdk,session:sessions.A,userId:sessions.A.user.id,audit,transport});
  await context.route(LOCAL_ORIGIN+'/assets/**',route=>{
   const url=new URL(route.request().url()),file=path.resolve(root,'.'+url.pathname);assert.ok(file.startsWith(path.join(root,'assets')+path.sep));assert.equal(route.request().method(),'GET');
   return route.fulfill({contentType:file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'application/javascript',body:fs.readFileSync(file)});
  });
  await context.route('**/rest/v1/**',route=>{
   const r=route.request(),u=new URL(r.url());assertQaUrl(r.url());if(r.method()==='GET')return route.fallback();
   let row;try{row=r.postDataJSON();}catch{}
   if(scope?.created&&r.method()==='POST'&&u.pathname==='/rest/v1/day_logs'&&row?.date===scope.date&&row.user_id===scope.owner&&row.data?._note?.startsWith(scope.tag+':')){report.applicationWrites++;scope.lastData=structuredClone(row.data);return route.fallback();}
   audit.blockedWrites++;(audit.blockedOperations||=[]).push({method:r.method(),path:u.pathname,date:typeof row?.date==='string'?row.date:null});return route.abort('blockedbyclient');
  });
  const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',()=>{report.runtimeErrors=(report.runtimeErrors||0)+1});
  report.phase='candidate_boot_A';await page.goto(LOCAL_ORIGIN+'/');await page.waitForFunction(()=>_cfgReady&&_live);
  assert.equal(await page.evaluate(()=>SUPABASE_URL),QA_ORIGIN);assert.equal(await page.evaluate(()=>USER.id),sessions.A.user.id);mark('candidate_loads_real_QA_A_and_subscribes_realtime');
  for(const who of ['B','A']){
   await page.evaluate(session=>sb.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token}),sessions[who]);
   await page.waitForFunction(id=>USER?.id===id&&_cfgReady&&_live,sessions[who].user.id);
   assert.equal(await page.evaluate(async()=>{const r=await sb.from('day_logs').select('data').eq('user_id',USER.id).eq('date','settings');return !r.error&&r.data?.length===1&&cfgEqual(_cfgBase,r.data[0].data)}),true);
  }
  mark('real_candidate_A_B_A_switch_preserves_account_configuration');
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:1000});for(const tab of ['today','social','stats','history']){await page.evaluate(tab=>setTab(tab),tab);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  }
  mark('real_QA_data_renders_mobile_and_desktop');
  if(process.argv.includes('--write-probe')){
   report.phase='bounded_new_day_preflight';const date='2099-'+String(1+crypto.randomInt(12)).padStart(2,'0')+'-'+String(1+crypto.randomInt(28)).padStart(2,'0');
   const existing=await request('A','GET','/rest/v1/day_logs?select=date&user_id=eq.'+sessions.A.user.id+'&date=eq.'+date);assert.deepEqual(existing.data,[]);
   scope={owner:sessions.A.user.id,date,tag:'shaah-validation-'+crypto.randomUUID()};report.probeDate=date;
   const claim=await request('A','POST','/rest/v1/day_logs',{user_id:scope.owner,date,data:{_checks:{},_social:{},_people:[],_note:scope.tag+':claimed'}});assert.equal(claim.status,201);scope.created=true;
   await page.evaluate(({date,note})=>setNote(date,note),{date,note:scope.tag+':online'});await page.waitForFunction(date=>!_pending[date]&&!_offlineQueue[date],date);
   let saved=await request('A','GET','/rest/v1/day_logs?select=data&user_id=eq.'+scope.owner+'&date=eq.'+date);assert.equal(saved.data?.[0]?.data?._note,scope.tag+':online');
   await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);assert.equal(await page.evaluate(date=>getNote(date),date),scope.tag+':online');mark('new_tagged_day_save_survives_real_server_reload');
   transport.offline=true;await context.setOffline(true);await page.evaluate(({date,note})=>setNote(date,note),{date,note:scope.tag+':offline'});await page.waitForFunction(date=>!!_offlineQueue[date]&&!_pending[date],date);
   transport.offline=false;await context.setOffline(false);await page.evaluate(()=>flushOfflineQueue());
   await page.waitForFunction(date=>!_offlineQueue[date],date);saved=await request('A','GET','/rest/v1/day_logs?select=data&user_id=eq.'+scope.owner+'&date=eq.'+date);assert.equal(saved.data?.[0]?.data?._note,scope.tag+':offline');mark('real_offline_retry_preserves_newest_probe_note');
  }
  report.phase='preservation';
  const after={A:await rows('A'),B:await rows('B')};for(const who of ['A','B']){const unchanged=hash(after[who].filter(r=>!scope||who!=='A'||r.date!==scope.date))===hash(originalRows[who]);if(!unchanged)report.existingRowsChanged=true;assert.equal(unchanged,true);}
  mark('all_preexisting_QA_rows_unchanged');assert.equal(report.runtimeErrors||0,0);mark('no_candidate_runtime_errors');
  report.blockedUnexpectedApplicationWrites=audit.blockedWrites;report.blockedOperations=audit.blockedOperations||[];report.candidateHasPendingConfig=await page.evaluate(()=>!!_cfgDraft);report.realtimeSubscriptions=audit.allowedWebSockets;report.status='passed';
 }catch(e){report.status='blocked';report.errorClass=e.name;report.code='QA_EXISTING_PROFILE_CHECK_FAILED';}
 finally{
  if(browser)await browser.close();
  if(scope?.created&&request){try{
   const r=await request('A','GET','/rest/v1/day_logs?select=data&user_id=eq.'+scope.owner+'&date=eq.'+scope.date);const note=r.data?.[0]?.data?._note;
   if(note?.startsWith(scope.tag+':')&&hash(r.data[0].data)===hash(scope.lastData)){const deleted=await request('A','DELETE','/rest/v1/day_logs?user_id=eq.'+scope.owner+'&date=eq.'+scope.date+'&data=eq.'+encodeURIComponent(JSON.stringify(scope.lastData)),undefined,{Prefer:'return=representation'});assert.ok(deleted.ok);assert.equal(deleted.data?.length,1);report.probeCleanup='deleted_only_matching_new_probe';}
   else{report.probeCleanup=r.data?.length?'kept_changed_probe_for_review':'no_probe_row';if(r.data?.length)report.status='blocked';}
  }catch{report.probeCleanup='needs_review';report.status='blocked';}}
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=2;
 }
});
