// Authorized synthetic configuration probe. No writes to existing day_logs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),readline=require('node:readline');
const {chromium}=require('playwright');
const {prepare}=require('./config-probe-plan.cjs');
const {digest}=require('./probe-integrity.cjs');
const {temporaryHtml,QA_REF,QA_ORIGIN,LOCAL_ORIGIN,PRODUCTION_REF}=require('./guard.cjs');
const {bridgeQaWebSocket}=require('./websocket-bridge.cjs');
const root=path.resolve(__dirname,'../..');
const folder=path.join(root,'docs/qa-habits-2026-10-28/config-probe');
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
const plan=prepare(manifest);
assert.equal(plan.table,manifest.table);assert.equal(plan.marker,manifest.marker);
assert.deepEqual(plan.sources,manifest.sources);
assert.equal(plan.install,fs.readFileSync(path.join(folder,'install.sql'),'utf8'));
const SITE='https://shaah-test-location-groups.arviler.chatgpt.site';
const rl=readline.createInterface({input:process.stdin,terminal:false});
console.log('Ready for private Site proof on hidden stdin.');
rl.once('line',async line=>{
 rl.close();process.stdin.pause();process.stdin.unref?.();
 const report={projectRef:QA_REF,table:plan.table,status:'running',cases:[],productionRequests:0,originalTableWrites:0,runtimeErrors:0};
 const audits=[];let browser,request,original,verifyExisting;
 const mark=name=>report.cases.push({name,status:'passed'});
 try{
  const {siteUrl,serviceToken}=JSON.parse(line);assert.equal(siteUrl,SITE);assert.ok(serviceToken);
  const siteFetch=async(endpoint,options={})=>{
   assert.ok(['/qa/health','/qa/config.js','/qa/session'].includes(endpoint));
   return fetch(SITE+endpoint,{...options,headers:{'OAI-Sites-Authorization':'Bearer '+serviceToken,...options.headers},redirect:'error',signal:AbortSignal.timeout(30000)});
  };
  report.phase='login';
  const health=await siteFetch('/qa/health');assert.ok(health.ok);assert.equal((await health.json()).projectRef,QA_REF);
  const conf=await siteFetch('/qa/config.js');assert.ok(conf.ok);const key=(await conf.text()).match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];assert.ok(key);
  const sessions={};
  for(const who of ['A','B']){
   const r=await siteFetch('/qa/session',{method:'POST',headers:{Origin:SITE,'Content-Type':'application/json'},body:JSON.stringify({profile:who})});
   assert.ok(r.ok);sessions[who]=await r.json();assert.ok(sessions[who].access_token);assert.ok(sessions[who].user.email.startsWith('qa-'+who.toLowerCase()+'-'));
  }
  assert.notEqual(sessions.A.user.id,sessions.B.user.id);
  const tablePath='/rest/v1/'+plan.table;
  const rpcPaths=Object.values(plan.rpc).map(name=>'/rest/v1/rpc/'+name);
  function allow(url,method){
   assert.equal(url.origin,QA_ORIGIN);
   if(url.pathname==='/rest/v1/day_logs'){assert.equal(method,'GET');return;}
   assert.ok([tablePath,...rpcPaths,'/auth/v1/token','/auth/v1/user','/auth/v1/logout'].includes(url.pathname));
  }
  request=async(who,method,endpoint,body,extra={})=>{
   const url=new URL(endpoint,QA_ORIGIN);allow(url,method);
   const r=await fetch(url,{method,headers:{apikey:key,...(who?{Authorization:'Bearer '+sessions[who].access_token}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
   const text=await r.text();return {ok:r.ok,status:r.status,data:text?JSON.parse(text):null};
  };
  const rows=async(who,table=plan.table)=>{const r=await request(who,'GET','/rest/v1/'+table+'?select=date,data,settings_revision&user_id=eq.'+sessions[who].user.id+'&order=date.asc');assert.ok(r.ok&&Array.isArray(r.data));return r.data;};
  const rpc=(who,name,body={})=>request(who,'POST','/rest/v1/rpc/'+plan.rpc[name],body);
  const save=(who,revision,data)=>rpc(who,'save',{p_expected_revision:revision,p_data:{owner_id:sessions[who].user.id,data}});
  original={A:await rows('A','day_logs'),B:await rows('B','day_logs')};
  verifyExisting=async()=>{for(const who of ['A','B'])assert.equal(digest(await rows(who,'day_logs')),digest(original[who]));};
  report.originalHashes={A:digest(original.A),B:digest(original.B)};
  report.phase='fresh_scope';
  for(const who of ['A','B'])assert.deepEqual(await rows(who),[]);
  const f=require('../../tests/helpers.cjs').fixture();
  f.config.log.push({...structuredClone(f.config.log.at(-1)),from:'2026-12-01',mode:'vacation'});
  f.config.log.at(-1).h.meditation.pWork=37;
  f.config._qaConfigProbe=plan.marker;
  for(const who of ['A','B']){
   assert.equal((await save(who,null,{_cfg:f.config,_qaConfigProbe:plan.marker})).status,200);
   const days=require('../../tests/helpers.cjs').serverRows(f).filter(r=>r.date!=='settings').map(r=>({...r,user_id:sessions[who].user.id}));
   assert.equal((await request(who,'POST',tablePath,days)).status,201);
  }
  mark('fresh_synthetic_configuration_and_history_only_in_isolated_table');
  assert.ok([401,403].includes((await request(null,'GET',tablePath+'?select=date&limit=0')).status));
  for(const who of ['A','B']){
   const other=who==='A'?'B':'A';
   assert.deepEqual((await request(who,'GET',tablePath+'?select=date&user_id=eq.'+sessions[other].user.id)).data,[]);
  }
  const aInitial=await rows('A'),bInitial=await rows('B');
  assert.equal((await rpc('B','save',{p_expected_revision:1,p_data:{owner_id:sessions.A.user.id,data:{_cfg:f.config}}})).status,403);
  assert.deepEqual(await rows('B'),bInitial);mark('anonymous_cross_account_and_wrong_request_owner_denied');
  const direct=await request('A','PATCH',tablePath+'?user_id=eq.'+sessions.A.user.id+'&date=eq.settings',{data:{_cfg:{bad:true}}},{Prefer:'return=representation'});
  assert.ok(direct.ok);assert.deepEqual(direct.data,[]);assert.deepEqual(await rows('A'),aInitial);mark('direct_settings_overwrite_blocked');
  const raceData={_cfg:{...f.config,_qaRace:'winner'},_qaConfigProbe:plan.marker};
  const race=await Promise.all([save('A',1,raceData),save('A',1,raceData)]);
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  assert.equal(race.find(r=>r.status===409).data.code,'PT409');
  const backup=await rpc('A','backup');assert.ok(backup.ok);assert.equal(backup.data.length,2);
  assert.equal((await rpc('A','restore',{p_restore_revision:1,p_expected_revision:1})).status,409);
  assert.equal((await rpc('A','restore',{p_restore_revision:1,p_expected_revision:2})).status,200);
  mark('atomic_revision_race_rejects_stale_save_and_restore_preserves_history');
  const source=fs.readFileSync(path.join(root,'index.html'),'utf8');report.sourceSha256=require('node:crypto').createHash('sha256').update(source).digest('hex');
  let html=temporaryHtml(source,key).replaceAll("'day_logs'","'"+plan.table+"'");
  for(const [kind,name] of Object.entries({save:'shaah_save_settings_v1',backup:'shaah_settings_backup_v1',restore:'shaah_restore_settings_v1'}))html=html.replaceAll(name,plan.rpc[kind]);
  assert.ok(!html.includes(PRODUCTION_REF));assert.ok(!html.includes("'day_logs'"));
  const sdk=fs.readFileSync(path.join(root,'assets/supabase-2.118.0.js'));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
  async function open(who){
   const context=await browser.newContext({serviceWorkers:'block',timezoneId:'UTC',viewport:{width:390,height:844}});
   const audit={allowedHttp:0,allowedWebSockets:0,blocked:0,realtimeEvents:[],offlineFailures:0};audits.push(audit);
   const sockets=new Set(),transport={offline:false};
   const offline=value=>{transport.offline=value;if(value)for(const socket of sockets)socket.close();};
   await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.href===LOCAL_ORIGIN+'/')return route.fulfill({contentType:'text/html',body:html});
    if(url.href===LOCAL_ORIGIN+'/sdk.js')return route.fulfill({contentType:'application/javascript',body:sdk});
    if(url.origin===LOCAL_ORIGIN&&url.pathname.startsWith('/assets/')&&req.method()==='GET'){
     const file=path.resolve(root,'.'+url.pathname);assert.ok(file.startsWith(path.join(root,'assets')+path.sep));
     return route.fulfill({contentType:file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'application/javascript',body:fs.readFileSync(file)});
    }
    try{allow(url,req.method());assert.notEqual(url.pathname,'/rest/v1/day_logs');}catch{
     audit.blocked++;if(url.hostname===PRODUCTION_REF+'.supabase.co')report.productionRequests++;
     return route.abort('blockedbyclient');
    }
    if(transport.offline){audit.offlineFailures++;return route.abort('internetdisconnected');}
    audit.allowedHttp++;
    try{const r=await route.fetch({maxRedirects:0,timeout:25000});assert.ok(r.status()<300||r.status()>=400);return route.fulfill({response:r});}
    catch{return route.abort('failed');}
   });
   await context.routeWebSocket('**/*',route=>{
    try{const socket=bridgeQaWebSocket(route,{audit,transport,table:plan.table});audit.allowedWebSockets++;
     if(socket){sockets.add(socket);socket.on('close',()=>sockets.delete(socket));}
    }catch{audit.blocked++;route.close({code:1008,reason:'Target blocked'});}
   });
   context.on('close',()=>{for(const socket of sockets)socket.terminate();});
   await context.addInitScript(({session,ref})=>{
    if(location.origin!=='http://127.0.0.1:4179')return;
    if(!localStorage.getItem('shaah_config_probe_initialized')){
     localStorage.setItem('sb-'+ref+'-auth-token',JSON.stringify(session));localStorage.setItem('shaah_tour_'+session.user.id,'1');localStorage.setItem('shaah_config_probe_initialized','1');
    }
   },{session:sessions[who],ref:QA_REF});
   const page=await context.newPage();page.setDefaultTimeout(35000);page.on('pageerror',()=>report.runtimeErrors++);page.on('dialog',d=>d.accept());
   await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));await page.goto(LOCAL_ORIGIN+'/');
   await page.waitForFunction(()=>_cfgReady&&_live&&!_cfgDraft&&!_cfgFlushPromise&&!_cfgConflict);
   assert.equal(await page.evaluate(()=>USER.id),sessions[who].user.id);
   return {page,context,audit,offline};
  }
  report.phase='browser_move';const a=await open('A');
  const history=p=>p.evaluate(()=>({days:_state,eras:CFG.log.filter(e=>e.from!==todayKey()),scores:['2026-09-07','2026-09-08','2026-10-08','2026-10-15'].map(k=>calcScore(k))}));
  const before=await history(a.page),habit=await a.page.evaluate(()=>CFG.h.meditation);
  const level=p=>p.locator('select[data-ui-change="cfgLevel"][data-ui-change-args=\'["meditation"]\']');
  const settings=async p=>{await p.getByRole('button',{name:'Settings',exact:true}).click();const toggle=p.locator('#settings-toggle-hab');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();};
  const settled=p=>p.waitForFunction(()=>_cfgReady&&!_cfgDraft&&!_cfgFlushPromise&&!_cfgConflict&&!_cfgSaveFailed);
  await settings(a.page);await level(a.page).selectOption('3');await settled(a.page);
  assert.equal((await rows('A')).find(r=>r.date==='settings').data._cfg.h.meditation.lv,3);
  await a.page.reload();await settled(a.page);assert.equal(await a.page.evaluate(()=>CFG.h.meditation.lv),3);
  assert.deepEqual(await history(a.page),before);
  assert.deepEqual(await a.page.evaluate(()=>{const h={...CFG.h.meditation};delete h.lv;return h;}),Object.fromEntries(Object.entries(habit).filter(([k])=>k!=='lv')));
  mark('actual_habit_move_save_and_reload_preserves_identity_days_past_and_future');
  report.phase='disjoint_merge';const b=await open('A');b.offline(true);
  await b.page.evaluate(async()=>{personSet('pold02','every',77);await flushCfgSaves();});await b.page.waitForFunction(()=>_cfgSaveFailed&&!!_cfgDraft&&!_cfgFlushPromise);
  await a.page.evaluate(async()=>{personSet('pold01','name','Synthetic remote edit');await flushCfgSaves();});await settled(a.page);
  b.offline(false);await b.page.evaluate(()=>flushCfgSaves());await settled(b.page);
  let saved=(await rows('A')).find(r=>r.date==='settings').data._cfg;
  assert.equal(saved.people.find(p=>p.id==='pold01').name,'Synthetic remote edit');assert.equal(saved.people.find(p=>p.id==='pold02').every,77);
  mark('real_disjoint_session_edits_merge_after_connection_failure');
  report.phase='level_conflict';await a.page.reload();await settled(a.page);await b.page.reload();await settled(b.page);
  b.offline(true);await settings(b.page);await level(b.page).selectOption('2');await b.page.waitForFunction(()=>_cfgSaveFailed&&!!_cfgDraft&&!_cfgFlushPromise);
  await settings(a.page);await level(a.page).selectOption('1');await settled(a.page);
  b.offline(false);await b.page.evaluate(()=>flushCfgSaves());await b.page.waitForFunction(()=>_cfgConflict&&!_cfgFlushPromise);
  assert.equal(await b.page.evaluate(()=>CFG.h.meditation.lv),2);
  assert.equal((await rows('A')).find(r=>r.date==='settings').data._cfg.h.meditation.lv,1);
  const draft=await b.page.evaluate(()=>JSON.stringify(_cfgDraft));await level(b.page).selectOption('3');assert.equal(await b.page.evaluate(()=>JSON.stringify(_cfgDraft)),draft);
  await b.page.reload();await b.page.waitForFunction(()=>_cfgReady&&_cfgConflict);
  assert.equal(await b.page.evaluate(()=>CFG.h.meditation.lv),2);
  await b.page.getByRole('button',{name:'Keep this device’s settings',exact:true}).click();await settled(b.page);
  assert.equal((await rows('A')).find(r=>r.date==='settings').data._cfg.h.meditation.lv,2);
  assert.deepEqual(await history(b.page),before);
  mark('real_level_conflict_blocks_edits_survives_reload_and_keeps_explicit_local_choice');
  report.phase='server_choice';await a.page.reload();await settled(a.page);await b.page.reload();await settled(b.page);
  b.offline(true);await b.page.evaluate(async()=>{personSet('pold01','name','Synthetic local backup');await flushCfgSaves();});await b.page.waitForFunction(()=>_cfgSaveFailed&&!_cfgFlushPromise);
  await a.page.evaluate(async()=>{personSet('pold01','name','Synthetic server choice');await flushCfgSaves();});await settled(a.page);
  b.offline(false);await b.page.evaluate(()=>flushCfgSaves());await b.page.waitForFunction(()=>_cfgConflict&&!_cfgFlushPromise);
  await b.page.getByRole('button',{name:'Use saved settings',exact:true}).click();await settled(b.page);
  assert.equal(await b.page.evaluate(()=>personById('pold01').name),'Synthetic server choice');
  assert.equal(await b.page.evaluate(()=>_bak.some(x=>JSON.parse(x.cfg).people.find(p=>p.id==='pold01').name==='Synthetic local backup')),true);
  mark('saved_settings_choice_preserves_discarded_local_version_in_backup');
  report.phase='realtime';const c=await open('B');
  const current=(await rows('B')).find(r=>r.date==='settings');
  const realtimeData=structuredClone(current.data);realtimeData._cfg.h.meditation.l='Synthetic realtime meditation';
  assert.equal((await save('B',current.settings_revision,realtimeData)).status,200);
  await c.page.waitForFunction(()=>CFG.h.meditation.l==='Synthetic realtime meditation');
  assert.ok(c.audit.realtimeEvents.some(e=>e.type==='UPDATE'&&e.date==='settings'));
  assert.notEqual(await a.page.evaluate(()=>CFG.h.meditation.l),'Synthetic realtime meditation');
  mark('actual_realtime_settings_update_reaches_only_own_account');
  const after={A:await rows('A','day_logs'),B:await rows('B','day_logs')};assert.equal(digest(after.A),digest(original.A));assert.equal(digest(after.B),digest(original.B));
  report.afterHashes={A:digest(after.A),B:digest(after.B)};
  mark('all_existing_QA_A_B_application_rows_unchanged');
  assert.equal(report.runtimeErrors,0);assert.equal(report.productionRequests,0);assert.ok(audits.every(a=>a.blocked===0));
  mark('no_runtime_errors_or_connections_outside_isolated_QA_scope');report.status='passed';report.phase='completed';
 }catch(e){report.status='failed';report.errorClass=e.name;report.failedPhase=report.phase;report.error=String(e.message).replace(/eyJ[A-Za-z0-9_.-]+/g,'[token]').replace(/sb_publishable_[A-Za-z0-9_-]+/g,'[key]').slice(0,280);}
 finally{
  if(browser)await browser.close();
  // Remote namespace deletion is a separate catalog-checked SQL operation.
  report.namespaceCleanup='pending_guarded_SQL';report.audits=audits;
  if(verifyExisting){try{
   await verifyExisting();report.finalPreservation='passed';
  }catch{report.finalPreservation='failed_or_unavailable';report.status='failed';}}
  fs.writeFileSync(path.join(folder,'real-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.status!=='passed')process.exitCode=1;
 }
});
