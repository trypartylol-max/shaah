// HTTP gzip downloads + CPU/network throttling; Auth/database stay synthetic.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
let server,origin;const root=path.resolve(__dirname,'..'),results=[];
before(async()=>{
 server=http.createServer((req,res)=>{
  const resource=new URL(req.url,'http://localhost').pathname.replace(/^\/mobile\//,'');
  const file=resource?path.resolve(root,resource):path.join(root,'index.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  const type={'.html':'text/html','.css':'text/css','.js':'application/javascript','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';
  const body=zlib.gzipSync(fs.readFileSync(file));res.writeHead(200,{'Content-Type':type,'Content-Encoding':'gzip','Content-Length':body.length,'Cache-Control':'max-age=600'});res.end(body);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));});
for(const profile of [
 {name:'mobile-4G',width:390,height:844,cpu:4,latency:150,bytesPerSecond:200000,apiMs:600},
 {name:'small-mobile-constrained',width:320,height:667,cpu:6,latency:400,bytesPerSecond:50000,apiMs:1500}
])test(`${profile.name}: cold load, all tabs, slow saves, offline/reconnect and reload`,async t=>{
 const data=fixture();data.days['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]};
 const page=await openApp(t,data,{width:profile.width,height:profile.height},{nativePerformance:true,stayOnToday:true,realAssets:true,url:origin+'/mobile/',beforePage:async(context,page)=>{
  // Full downloads at 0.4 Mbps can exceed the helper's 10s navigation default.
  // Keep a bounded 30s navigation budget for the declared slow-network profile.
  page.setDefaultNavigationTimeout(30000);
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile.latency,downloadThroughput:profile.bytesPerSecond,uploadThroughput:profile.bytesPerSecond/3});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpu});
  await context.addInitScript(({apiMs})=>{
   window.__mobileMetrics={tabs:[],readyMs:null};
   document.addEventListener('click',e=>{const tab=e.target.closest('.nav-btn[data-tab]');if(!tab)return;const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>__mobileMetrics.tabs.push({tab:tab.dataset.tab,paintMs:performance.now()-start})));},true);
   new MutationObserver(()=>{if(!__mobileMetrics.readyMs&&document.querySelector('.today'))__mobileMetrics.readyMs=performance.now();}).observe(document,{subtree:true,childList:true});
   const create=supabase.createClient;
   supabase.createClient=(...args)=>{const client=create(...args),from=client.from;
    client.from=(...args)=>{const q=from(...args),then=q.then;let action='select',payload;
     for(const op of ['upsert','update','insert','delete']){const fn=q[op];q[op]=(...args)=>{action=op;payload=args[0];return fn(...args);};}
     q.then=(resolve,reject)=>Promise.resolve().then(async()=>{
      await new Promise(r=>setTimeout(r,apiMs));
      if(!navigator.onLine)throw Error('Synthetic offline transport');
      if(action==='upsert'&&payload?.data?._note==='SYNTHETIC held first note'&&window.__holdSlowWrite){window.__slowWriteEntered=true;await new Promise(r=>window.__releaseSlowWrite=r);}
      return then.call(q,resolve,reject);
     }).catch(reject);return q;
    };return client;
   };
  },{apiMs:profile.apiMs});
 }});
 await page.evaluate(async()=>{await flushCfgSaves();window.SHAAHPerformance?.setEnabled(true);});
 const initial=await page.evaluate(()=>({history:JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey()))),fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,readyMs:__mobileMetrics.readyMs}));
 for(const tab of ['social','stats','history','log','today']){
  await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
  await page.waitForFunction(tab=>__mobileMetrics.tabs.some(x=>x.tab===tab),tab);
  assert.equal(await page.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,tab+' has no horizontal overflow');
 }
 await page.evaluate(()=>{window.__holdSlowWrite=true;window.__beforeWriteCount=__mockWrites.length;});
 const note=page.locator('textarea').first();await note.fill('SYNTHETIC held first note');await note.press('Tab');
 await page.waitForFunction(()=>window.__slowWriteEntered);
 await note.fill('SYNTHETIC latest note');await note.press('Tab');await page.waitForTimeout(profile.apiMs+350);
 assert.equal(await note.inputValue(),'SYNTHETIC latest note');
 await page.evaluate(()=>__releaseSlowWrite());
 await page.waitForFunction(()=>!_pending[todayKey()]&&Object.keys(_offlineQueue).length===0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date===todayKey()).data._note),'SYNTHETIC latest note');
 const tabs=await page.evaluate(()=>__mobileMetrics.tabs);
 await page.context().setOffline(true);
 await page.locator('.t-lvl2 .row').filter({hasText:'Meditate'}).click();
 assert.equal(await page.evaluate(()=>getChecked(todayKey()).meditation),true,'habit response is immediate while offline');
 await page.waitForFunction(()=>!_pending[todayKey()]);
 assert.equal(await page.evaluate(()=>!!_offlineQueue[todayKey()]),true);
 await page.context().setOffline(false);
 await page.waitForFunction(()=>Object.keys(_offlineQueue).length===0&&!_pending[todayKey()]);
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await page.evaluate(()=>getChecked(todayKey()).meditation),true);
 assert.equal(await page.evaluate(()=>getNote(todayKey())),'SYNTHETIC latest note');
 assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey())))),initial.history);
 await page.screenshot({path:path.join(root,'docs/mobile-network',profile.name+'.png')});
 results.push({profile,initial:{fcpMs:initial.fcp,readyMs:initial.readyMs},tabs,slowWriteFinal:'latest note preserved',offlineEdit:'persisted after reconnect and reload',historicalDaysPreserved:true,realPhone:false,localDiagnostics:await page.evaluate(()=>window.SHAAHPerformance?.snapshot()||null)});
 fs.writeFileSync(path.join(root,'docs/mobile-network/browser-metrics.json'),JSON.stringify(results,null,2)+'\n');
});

test('cached mobile account exposes retry after a stalled load and late response cannot replace newer data',async t=>{
 const page=await openApp(t,fixture(),{width:390,height:844},{stayOnToday:true});
 await page.evaluate(()=>{
  window.__normalRead=readAccountRows;readAccountRows=()=>new Promise(r=>window.__lateRead=r);
  // Keep the real deadline wrapper around a deliberately stalled adapter.
  const from=sb.from;window.__restoreFrom=()=>sb.from=from;
  sb.from=(...args)=>{const q=from(...args);q.then=(resolve,reject)=>new Promise(r=>window.__releaseLateSelect=()=>r({data:[],count:0,error:null})).then(resolve,reject);return q;};
  readAccountRows=__normalRead;loadAll();
 });
 await page.clock.fastForward(20001);
 await page.waitForFunction(()=>_loadFailed&&!_loadFlight);
 assert.equal(await page.locator('.today').isVisible(),true);
 await page.evaluate(()=>__restoreFrom());
 await page.getByRole('button',{name:'Reintentar carga',exact:true}).click();
 await page.waitForFunction(()=>!_loadFailed&&!_loadFlight);
 await page.evaluate(()=>{_state[todayKey()]={note:'SYNTHETIC newer after retry'};__releaseLateSelect();});
 await page.waitForTimeout(30);
 assert.equal(await page.evaluate(()=>getNote(todayKey())),'SYNTHETIC newer after retry');
 assert.equal(await page.locator('.starter-screen').count(),0);
});
