// Live owner-private preview checks. Service token goes only to this Site;
// Supabase sees only its public key and the synthetic user's normal JWT.
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {assertQaUrl,QA_ORIGIN,PRODUCTION_REF}=require('../supabase/guard.cjs');
const {bridgeQaWebSocket}=require('../supabase/websocket-bridge.cjs');
const SITE='https://shaah-test-location-groups.arviler.chatgpt.site';
async function readInput(){const rl=readline.createInterface({input:process.stdin,terminal:false});const text=await new Promise(r=>{rl.once('line',v=>{r(v);rl.close();process.stdin.pause();});rl.once('close',()=>r(''));});process.stdin.unref?.();return JSON.parse(text);}
(async()=>{
  const cfg=await readInput();if(cfg.siteUrl!==SITE||!cfg.serviceToken)throw new Error('QA_SITE_ACCESS_INVALID');
  const report={siteUrl:SITE,projectRef:'kpnwiwaiwnndpvtxkvva',cases:[],runtimeErrors:0,forwardedToProduction:0};
  const record=(name)=>report.cases.push({name,status:'passed'});
  const output=path.join(__dirname,'../../test-results/preview-site');fs.mkdirSync(output,{recursive:true});
  let browser,activePage;
  try{
    report.phase='health';const probe=await fetch(SITE+'/qa/health',{headers:{'OAI-Sites-Authorization':'Bearer '+cfg.serviceToken},redirect:'error',signal:AbortSignal.timeout(20000)});
    assert.equal(probe.status,200);const health=await probe.json();assert.equal(health.projectRef,report.projectRef);assert.equal(health.credentialsConfigured,true);
    const expectedHash=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../../index.html'))).digest('hex');
    assert.equal(health.settingsProtocol,'revision_v1');assert.equal(health.appSourceSha256,expectedHash);report.sourceSha256=expectedHash;report.settingsProtocol=health.settingsProtocol;record('private_site_health_runtime_secrets_and_exact_source');
    const anon=await fetch(SITE+'/',{redirect:'manual',signal:AbortSignal.timeout(20000)});assert.ok([302,303,307,308,401,403].includes(anon.status));report.unauthenticatedStatus=anon.status;record('owner_private_access_gate');
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const audits=[];
    async function open(viewport){
      const context=await browser.newContext({viewport,serviceWorkers:'block',proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}});
      const audit={allowedHttp:0,allowedWebSockets:0,blocked:[],realtimeEvents:[]},sockets=new Set();audits.push(audit);
      await context.route('**/*',async route=>{
        const url=new URL(route.request().url());let headers=route.request().headers();
        if(url.origin===SITE)headers={...headers,'OAI-Sites-Authorization':'Bearer '+cfg.serviceToken};
        else{try{assertQaUrl(url.href);}catch{audit.blocked.push({production:url.hostname===PRODUCTION_REF+'.supabase.co'});return route.abort();}delete headers['oai-sites-authorization'];}
        audit.allowedHttp++;
        try{const response=await route.fetch({headers,maxRedirects:0,timeout:20000});if(response.status()>=300&&response.status()<400)return route.abort();return await route.fulfill({response});}
        catch{return route.abort('failed').catch(()=>{});}
      });
      await context.routeWebSocket('**/*',ws=>{
        try{assertQaUrl(ws.url(),true);}catch{audit.blocked.push({production:new URL(ws.url()).hostname===PRODUCTION_REF+'.supabase.co'});return ws.close({code:1008,reason:'QA target blocked'});}
        audit.allowedWebSockets++;const socket=bridgeQaWebSocket(ws,{audit,transport:{offline:false}});if(socket){sockets.add(socket);socket.on('close',()=>sockets.delete(socket));}
      });
      context.on('close',()=>{for(const socket of sockets)socket.terminate();});
      const page=await context.newPage();activePage=page;page.setDefaultTimeout(20000);page.on('pageerror',()=>report.runtimeErrors++);
      report.phase='browser_navigation';const response=await page.goto(SITE+'/');assert.equal(response.status(),200);
      report.csp=response.headers()['content-security-policy'];
      assert.ok((response.headers()['content-security-policy']||'').includes('connect-src'));
      report.phase='QA_A_button';await page.getByRole('button',{name:'Entrar como QA A',exact:true}).click();
      report.phase='QA_A_ready';await page.waitForFunction(()=>USER&&_cfgReady&&_live);
      report.phase='QA_A_settings_confirmed';await page.waitForFunction(()=>!_cfgDraft&&!_cfgSaveFailed&&!_cfgConflict);
      assert.equal(await page.evaluate(()=>SUPABASE_URL),QA_ORIGIN);assert.equal(await page.evaluate(()=>USER.email.startsWith('qa-a-')),true);
      // After publication, QA profiles may contain the owner's manual edits.
      // Check against their own server state instead of reseeding/counting fixtures.
      const matches=await page.evaluate(async()=>{const r=await sb.from('day_logs').select('data').eq('user_id',USER.id).eq('date','settings');return !r.error&&r.data?.length===1&&cfgEqual(_cfgBase,r.data[0].data);});
      assert.equal(matches,true);report.savedConfiguration=await page.evaluate(()=>({habits:Object.keys(CFG.h||{}).length,routines:Object.keys(CFG.routines||{}).length,contacts:peopleList().length}));
      return {page,context,audit};
    }
    const desktop=await open({width:1440,height:1000});record('desktop_QA_A_login_saved_configuration_and_realtime');
    await desktop.page.getByRole('button',{name:'QA B',exact:true}).click();await desktop.page.waitForFunction(()=>USER?.email?.startsWith('qa-b-')&&_cfgReady&&_live);
    assert.equal(await desktop.page.evaluate(async()=>{const r=await sb.from('day_logs').select('data').eq('user_id',USER.id).eq('date','settings');return !r.error&&r.data?.length===1&&cfgEqual(_cfgBase,r.data[0].data);}),true);
    await desktop.page.getByRole('button',{name:'QA A',exact:true}).click();await desktop.page.waitForFunction(()=>USER?.email?.startsWith('qa-a-')&&_cfgReady&&_live);record('QA_profile_switch_A_B_A');
    const blocked=await desktop.page.evaluate(async target=>{
      let http=false,ws=false;try{await fetch('https://'+target+'.supabase.co/rest/v1/day_logs');}catch{http=true;}
      try{new WebSocket('wss://'+target+'.supabase.co/realtime/v1/websocket');}catch{ws=true;}
      const oauth=await sb.auth.signInWithOAuth({provider:'google'});return {http,ws,oauthDisabled:!!oauth.error};
    },PRODUCTION_REF);
    assert.deepEqual(blocked,{http:true,ws:true,oauthDisabled:true});record('production_connections_and_personal_OAuth_blocked_before_send');
    await desktop.page.screenshot({path:path.join(output,'desktop.png'),animations:'disabled'});
    const mobile=await open({width:390,height:844}),social=mobile.page.locator('.nav-btn[data-tab="social"]');
    const socialEnabled=await social.count()>0;if(socialEnabled)await social.click();
    assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.page.screenshot({path:path.join(output,'mobile.png'),animations:'disabled'});record(socialEnabled?'mobile_social_and_location_UI':'mobile_layout_with_saved_social_visibility');
    assert.equal(report.runtimeErrors,0);record('no_browser_runtime_errors');report.audits=audits;report.status='passed';
  }catch(e){report.status='blocked';report.code=/^QA_[A-Z_]+$/.test(e.message)?e.message:e.name==='AssertionError'?'QA_PREVIEW_ASSERTION_FAILED':'QA_PREVIEW_CHECK_FAILED';
    report.errorClass=e.name;report.detail=e.message.split(cfg.serviceToken).join('[service-token]').replace(/eyJ[A-Za-z0-9_.-]+/g,'[token]').replace(/https?:\/\/[^\s'\"]+/g,'[URL]').slice(0,450);
    if(activePage)try{report.browserState=await activePage.evaluate(()=>({title:document.title,configLoaded:!!window.SHAAH_QA_CONFIG,appUserDefined:typeof USER!=='undefined',signedIn:typeof USER!=='undefined'&&!!USER,cfgReady:typeof _cfgReady!=='undefined'&&_cfgReady,live:typeof _live!=='undefined'&&_live,cfgSaveFailed:typeof _cfgSaveFailed!=='undefined'&&_cfgSaveFailed,cfgConflict:typeof _cfgConflict!=='undefined'&&_cfgConflict,hasCfgDraft:typeof _cfgDraft!=='undefined'&&!!_cfgDraft,qaButtons:[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('QA A')).length}));await activePage.screenshot({path:path.join(output,'failure.png'),animations:'disabled'});}catch{}
  }
  finally{if(browser)await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=2;}
})().catch(()=>{console.log('QA_PREVIEW_CHECK_FAILED');process.exitCode=2;});
