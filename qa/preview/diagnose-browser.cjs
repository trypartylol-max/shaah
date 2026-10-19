const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {configFromEnv,temporaryHtml,installBrowserGuard,LOCAL_ORIGIN}=require('../supabase/guard.cjs');
const {apiClient}=require('../supabase/api.cjs');
(async()=>{
  const config=configFromEnv(),api=apiClient(config),session=await api.login('A');
  const html=temporaryHtml(fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8'),config.key);
  const sdk=fs.readFileSync(path.join(path.dirname(require.resolve('@supabase/supabase-js')),'umd/supabase.js'),'utf8');
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const results=[];
  try{for(const native of [false,true]){
    const context=await browser.newContext({serviceWorkers:'block',proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}});
    const audit={allowedHttp:0,allowedWebSockets:0,blocked:[]},frames=[],errors=[];
    await installBrowserGuard(context,{html,sdk,session,userId:config.users.A.id,audit,nativeQaWebSockets:native});
    const page=await context.newPage();
    page.on('websocket',socket=>{
      socket.on('socketerror',msg=>errors.push({proxy:/proxy/i.test(msg),timeout:/timed?out/i.test(msg),unauthorized:/401|403/.test(msg),detail:msg.replace(/wss?:\/\/[^\s'\"]+/g,'[QA websocket]').replace(/eyJ[A-Za-z0-9_.-]+/g,'[token]').replace(/sb_publishable_[A-Za-z0-9_-]+/g,'[key]').slice(0,220)}));
      socket.on('framereceived',frame=>{try{const msg=JSON.parse(String(frame.payload));if(['phx_reply','system'].includes(msg.event))frames.push({event:msg.event,status:msg.payload?.status,replyKeys:Object.keys(msg.payload?.response||{}),code:msg.payload?.response?.code});}catch{}});
    });
    await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));await page.goto(LOCAL_ORIGIN+'/');
    await page.waitForFunction(()=>typeof _cfgReady!=='undefined'&&_cfgReady,{},{timeout:12000}).catch(()=>{});
    await page.waitForFunction(()=>_live,{},{timeout:8000}).catch(()=>{});
    const state=await page.evaluate(()=>({signedIn:!!USER,cfgReady:_cfgReady,live:_live,people:peopleList().length,status:_syncText,channels:sb.getChannels().map(c=>({state:c.state,socket:c.socket.connectionState()}))}));
    results.push({nativeQaWebSockets:native,state,audit,frames,errors});await context.close();
  }}finally{await browser.close();}
  const report={projectRef:config.projectRef,keyFormat:config.key.startsWith('sb_publishable_')?'publishable':'legacy_anon',scope:'authenticated browser connection diagnostics; no writes intended',results};
  fs.writeFileSync(path.join(__dirname,'../../test-results/supabase-phase2/browser-diagnostic.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
})().catch(()=>{console.log('QA_BROWSER_DIAGNOSTIC_FAILED');process.exitCode=2;});
