// Real Auth/API/Realtime on a dedicated synthetic table, SHAAH-TEST only.
// Private Site proof on hidden stdin; never print sessions, keys or user data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),readline=require('node:readline'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {temporaryHtml,LOCAL_ORIGIN,QA_ORIGIN,PRODUCTION_REF}=require('../supabase/guard.cjs');
const {bridgeQaWebSocket}=require('../supabase/websocket-bridge.cjs');
const TABLE='shaah_legacy_probe_day_logs',SITE='https://shaah-test-location-groups.arviler.chatgpt.site',TAG='legacy-production-shape-20261018';
const folder=path.resolve(__dirname,'../../test-results/production-legacy');fs.mkdirSync(folder,{recursive:true});
const rl=readline.createInterface({input:process.stdin,terminal:false});
rl.once('line',async line=>{rl.close();process.stdin.pause();process.stdin.unref?.();let browser;
 const report={projectRef:'kpnwiwaiwnndpvtxkvva',table:TABLE,productionConnections:0,cases:[],runtimeErrors:0};
 try{
  const {serviceToken}=JSON.parse(line);assert.ok(serviceToken);
  const siteFetch=async(url,options={})=>{
   assert.ok(url.startsWith(SITE+'/qa/'));
   for(let attempt=0;attempt<3;attempt++){
    const r=await fetch(url,{...options,headers:{'OAI-Sites-Authorization':'Bearer '+serviceToken,...options.headers},redirect:'error',signal:AbortSignal.timeout(20000)});
    if(![502,503,504].includes(r.status)||attempt===2)return r;
    await r.arrayBuffer();await new Promise(done=>setTimeout(done,1000));
   }
  };
  report.phase='private_config';const conf=await siteFetch(SITE+'/qa/config.js');assert.equal(conf.status,200);
  const keyMatch=(await conf.text()).match(/sb_publishable_[A-Za-z0-9_-]+/);assert.ok(keyMatch);const key=keyMatch[0],sessions={};
  for(const who of ['A','B']){
   report.phase='synthetic_login_'+who;
   const r=await siteFetch(SITE+'/qa/session',{method:'POST',headers:{Origin:SITE,'Content-Type':'application/json'},body:JSON.stringify({profile:who})});
   assert.equal(r.status,200);sessions[who]=await r.json();assert.ok(sessions[who].access_token&&sessions[who].user.email.startsWith('qa-'+who.toLowerCase()+'-'));
  }
  async function request(who,method,endpoint,body,extra={}){
   const url=new URL(endpoint,QA_ORIGIN);assert.equal(url.origin,QA_ORIGIN);
   assert.ok(url.pathname==='/rest/v1/'+TABLE||/^\/rest\/v1\/rpc\/shaah_probe_(save_settings|settings_backup|restore_settings)_v1$/.test(url.pathname));
   const r=await fetch(url,{method,headers:{apikey:key,...(who?{Authorization:'Bearer '+sessions[who].access_token}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(20000)});
   let data=null;const text=await r.text();if(text)data=JSON.parse(text);return {status:r.status,ok:r.ok,data};
  }
  const rows=async who=>{const r=await request(who,'GET','/rest/v1/'+TABLE+'?select=*&user_id=eq.'+sessions[who].user.id+'&order=date.asc');assert.ok(r.ok);return r.data;};
  const record=name=>report.cases.push({name,status:'passed'});
  const baselineFile=path.join(folder,'baseline.json');
  if(process.argv.includes('--prepare')){
   const baseline={};
   for(const who of ['A','B']){
    assert.equal((await rows(who)).length,0);
    const f=require('../../tests/location-fixtures.cjs').locationFixture();f.config._qaLegacyProbe=TAG;
    f.config.people.forEach(p=>p.name='QA '+who+' '+p.name);
    const data=require('../../tests/helpers.cjs').serverRows(f).map(r=>({...r,user_id:sessions[who].user.id}));
    assert.ok((await request(who,'POST','/rest/v1/'+TABLE,data)).ok);
    baseline[who]=await rows(who);
   }
   fs.writeFileSync(baselineFile,JSON.stringify(baseline,null,2)+'\n',{mode:0o600});
   record('fresh_synthetic_fixture_rows_match_original_nullable_identity_schema');
   report.rows=Object.values(baseline).reduce((n,r)=>n+r.length,0);
  }else{
   if(!process.argv.includes('--browser-only')){
   const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
   for(const who of ['A','B']){
    assert.deepEqual((await rows(who)).map(({settings_revision,...r})=>r),baseline[who]);
   }
   record('all_original_ids_timestamps_and_business_values_preserved');
   const anon=await request(null,'GET','/rest/v1/'+TABLE+'?select=id&limit=0');
   assert.ok([401,403].includes(anon.status));assert.equal(anon.data.code,'42501');
   assert.deepEqual((await request('A','GET','/rest/v1/'+TABLE+'?select=id&user_id=eq.'+sessions.B.user.id)).data,[]);
   assert.equal((await request('A','POST','/rest/v1/'+TABLE,{user_id:sessions.B.user.id,date:'2099-01-01',data:{_note:TAG}})).status,403);
   record('anonymous_and_cross_owner_access_denied');
   const filter='/rest/v1/'+TABLE+'?user_id=eq.'+sessions.A.user.id+'&date=eq.settings';
   const prior=await rows('A');
   assert.equal((await request('A','POST','/rest/v1/'+TABLE+'?on_conflict=user_id,date',{user_id:sessions.A.user.id,date:'settings',data:{_cfg:{bad:true}}},{Prefer:'resolution=merge-duplicates'})).status,403);
   assert.deepEqual((await request('A','PATCH',filter,{data:{_cfg:{bad:true}}},{Prefer:'return=representation'})).data,[]);
   assert.deepEqual((await request('A','DELETE',filter,null,{Prefer:'return=representation'})).data,[]);
   assert.deepEqual(await rows('A'),prior);record('legacy_settings_upsert_patch_delete_cannot_change_data');
   const rpc=(who,name,body)=>request(who,'POST','/rest/v1/rpc/shaah_probe_'+name+'_v1',body||{});
   const old=prior.find(r=>r.date==='settings'),payload={...old.data,_cfg:{...old.data._cfg,qaRace:'winner'}};
   const calls=await Promise.all([1,2].map(()=>rpc('A','save_settings',{p_expected_revision:0,p_data:{owner_id:sessions.A.user.id,data:payload}})));
   assert.deepEqual(calls.map(r=>r.status).sort(),[200,409]);assert.equal(calls.find(r=>r.status===409).data.code,'PT409');
   const after=(await rows('A')).find(r=>r.date==='settings');
   assert.equal(after.id,old.id);assert.equal(after.created_at,old.created_at);assert.equal(after.settings_revision,1);
   record('atomic_revision_race_preserves_surrogate_id_and_timestamp');
   const bBefore=await rows('B');
   assert.equal((await rpc('B','save_settings',{p_expected_revision:0,p_data:{owner_id:sessions.A.user.id,data:payload}})).status,403);
   assert.deepEqual(await rows('B'),bBefore);record('owner_envelope_rejects_A_payload_under_B_JWT');
   const backup=await rpc('A','settings_backup');assert.equal(backup.status,200);assert.equal(backup.data.length,2);
   assert.equal((await rpc('A','restore_settings',{p_restore_revision:0,p_expected_revision:0})).status,409);
   assert.equal((await rpc('A','restore_settings',{p_restore_revision:0,p_expected_revision:1})).status,200);
   assert.deepEqual((await rows('A')).find(r=>r.date==='settings').data,old.data);
   record('baseline_backup_and_restore_keep_monotonic_revision');
   }
   const source=fs.readFileSync(path.resolve(__dirname,'../../index.html'),'utf8');
   report.sourceSha256=crypto.createHash('sha256').update(source).digest('hex');
   let html=temporaryHtml(source,key).replaceAll("'day_logs'","'"+TABLE+"'").replaceAll('shaah_save_settings_v1','shaah_probe_save_settings_v1');
   assert.ok(!html.includes(PRODUCTION_REF));
   const sdk=fs.readFileSync(path.join(path.dirname(require.resolve('@supabase/supabase-js')),'umd/supabase.js'),'utf8');
   browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
   const events=[];report.events=events;
   async function open(who){
    const c=await browser.newContext({serviceWorkers:'block',timezoneId:'UTC',proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}});
    await c.route('**/*',async route=>{
     const url=new URL(route.request().url());
     if(url.href===LOCAL_ORIGIN+'/')return route.fulfill({contentType:'text/html',body:html});
     if(url.href===LOCAL_ORIGIN+'/sdk.js')return route.fulfill({contentType:'application/javascript',body:sdk});
     const allowed=url.origin===QA_ORIGIN&&[...['/auth/v1/token','/auth/v1/user','/auth/v1/logout'], '/rest/v1/'+TABLE,'/rest/v1/rpc/shaah_probe_save_settings_v1'].includes(url.pathname);
     if(!allowed)return route.abort();
     try{const r=await route.fetch({maxRedirects:0,timeout:20000});return route.fulfill({response:r});}catch{return route.abort();}
    });
    const audit={realtimeEvents:events},sockets=new Set();
    await c.routeWebSocket('**/*',route=>{const s=bridgeQaWebSocket(route,{audit,transport:{offline:false},table:TABLE});if(s){sockets.add(s);s.on('close',()=>sockets.delete(s));}});
    c.on('close',()=>{for(const s of sockets)s.terminate();});
    await c.addInitScript(({session,ref})=>{localStorage.setItem('sb-'+ref+'-auth-token',JSON.stringify(session));localStorage.setItem('shaah_tour_'+session.user.id,'1');},{session:sessions[who],ref:'kpnwiwaiwnndpvtxkvva'});
    const page=await c.newPage();page.setDefaultTimeout(25000);page.on('pageerror',()=>report.runtimeErrors++);
    page.on('websocket',s=>s.on('framereceived',f=>{try{const raw=JSON.parse(String(f.payload)),p=Array.isArray(raw)?raw[4]:raw.payload;if(p?.data?.table===TABLE)events.push({type:p.data.type,oldKeys:Object.keys(p.data.old_record||{}).sort()});}catch{}}));
    await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));await page.goto(LOCAL_ORIGIN+'/');
    await page.waitForFunction(()=>typeof USER!=='undefined'&&USER&&_cfgReady&&_live);
    await page.waitForFunction(()=>!_cfgDraft&&!_cfgSaveFailed&&!_cfgConflict);
    return {page,context:c};
   }
   report.phase='open_A';const a=await open('A');report.phase='open_B';const b=await open('B');
   assert.equal(await a.page.evaluate(()=>calcScore('2026-09-16').score),7);
   assert.equal(await a.page.evaluate(()=>calcScore('2026-10-08').score),27);
   await a.page.evaluate(async()=>{bulkPeopleToggle('pold01',true);bulkPeopleApply('pa','add');await flushCfgSaves();});
   assert.equal((await rows('A')).find(r=>r.date==='settings').data._cfg.people.find(p=>p.id==='pold01').locations.includes('pa'),true);
   record('actual_app_settings_save_location_groups_and_mode_scores');
   const date='2099-01-02',target=who=>'/rest/v1/'+TABLE+'?user_id=eq.'+sessions[who].user.id+'&date=eq.'+date;
   for(const who of ['A','B']){
    const prior=(await rows(who)).find(r=>r.date===date);
    if(prior){assert.match(prior.data._note,/^QA [AB] (legacy delete|updated)$/);assert.ok((await request(who,'DELETE',target(who))).ok);}
   }
   for(const who of ['A','B'])assert.ok((await request(who,'POST','/rest/v1/'+TABLE,{user_id:sessions[who].user.id,date,data:{_note:'QA '+who+' legacy delete'}})).ok);
   report.phase='insert_events';await a.page.waitForFunction(d=>getNote(d)==='QA A legacy delete',date);await b.page.waitForFunction(d=>getNote(d)==='QA B legacy delete',date);
   assert.ok((await request('A','PATCH',target('A'),{data:{_note:'QA A updated'}})).ok);
   report.phase='update_event';await a.page.waitForFunction(d=>getNote(d)==='QA A updated',date);
   assert.ok((await request('A','DELETE',target('A'))).ok);
   report.phase='opaque_delete_event_A';await a.page.waitForFunction(d=>!_state[d],date);
   assert.equal(await b.page.evaluate(d=>getNote(d),date),'QA B legacy delete');
   assert.ok(events.some(e=>e.type==='DELETE'&&JSON.stringify(e.oldKeys)==='["id"]'));
   report.deleteEventOldKeys=['id'];record('real_identity_only_DELETE_reconciles_A_and_preserves_B');
   assert.ok((await request('B','DELETE',target('B'))).ok);
   report.phase='opaque_delete_event_B';await b.page.waitForFunction(d=>!_state[d],date);
   assert.equal(report.runtimeErrors,0);record('no_browser_runtime_errors_or_production_connections');
   report.phase='completed';
  }
  report.status='passed';
 }catch(e){report.status='failed';report.errorType=e.name;report.code='QA_LEGACY_REHEARSAL_FAILED';report.failedAfter=report.cases.length;report.detail=String(e.message).replace(/eyJ[A-Za-z0-9_.-]+/g,'[token]').replace(/sb_publishable_[A-Za-z0-9_-]+/g,'[key]').slice(0,280);}
 finally{if(browser)await browser.close();const file=path.join(folder,process.argv.includes('--prepare')?'prepare.json':process.argv.includes('--browser-only')?'browser-report.json':'report.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));if(report.status!=='passed')process.exitCode=1;}
});
