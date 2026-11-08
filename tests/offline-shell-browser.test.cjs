const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const {openApp}=require('./browser-helpers.cjs');
async function serve(t){
 const root=path.join(__dirname,'..');const requests=[];
 const server=http.createServer((req,res)=>{
  requests.push(req.url);const url=new URL(req.url,'http://localhost');
  let name=url.pathname.replace(/^\/shaah\//,'');if(!name||name==='index.html')name='index.html';
  if(!url.pathname.startsWith('/shaah/')||!(/^(index\.html|sw\.js|assets\/[\w.-]+)$/.test(name))){res.writeHead(404);res.end();return;}
  const file=path.join(root,name);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('content-type',name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':'application/javascript');res.end(fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return {url:`http://127.0.0.1:${server.address().port}/shaah/`,requests};
}
test('installed shell cold-opens offline at a subpath, queues changes, reconnects and respects signout',async t=>{
 const {url}=await serve(t),p=await openApp(t,undefined,{width:390,height:844},{url,httpServer:true,serviceWorkers:'allow'});
 await p.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
 const cacheURLs=await p.evaluate(async()=>{const result=[];for(const name of await caches.keys())for(const req of await (await caches.open(name)).keys())result.push(req.url);return result;});
 assert.ok(cacheURLs.some(u=>u.includes('/assets/supabase-')));assert.ok(cacheURLs.some(u=>u.endsWith('.woff2')));assert.ok(cacheURLs.every(u=>u.startsWith(url)&&!u.includes('auth-token')));
 await p.evaluate(()=>{set(AUTH_STORAGE_KEY,{user:USER,access_token:'synthetic-only',refresh_token:'synthetic-only',expires_at:1});saveCache();set(cfgKey(),CFG);});
 const context=p.context();await context.setOffline(true);await p.close();const q=await context.newPage();await q.goto(url);await q.waitForFunction(()=>_offlineBoot&&_cfgReady);
 assert.equal(await q.evaluate(()=>USER.id),'regression-user');await q.locator('.nav-btn[data-tab="log"]').click();assert.ok(await q.getByRole('region',{name:'Day summary'}).isVisible());
 await q.evaluate(()=>{setNote(todayKey(),'Offline edit survives restart');});await q.waitForTimeout(500);
 assert.equal(await q.evaluate(()=>__mockWrites.length),0);assert.ok(await q.evaluate(()=>Object.keys(_offlineQueue).length)>0);
 await q.reload();await q.waitForFunction(()=>_offlineBoot&&_cfgReady);assert.equal(await q.evaluate(()=>getNote(todayKey())),'Offline edit survives restart');
 await context.setOffline(false);await q.evaluate(()=>reconnectOfflineAccount());await q.waitForFunction(()=>!_offlineBoot&&_live&&Object.keys(_offlineQueue).length===0);
 assert.equal(await q.evaluate(()=>getNote(todayKey())),'Offline edit survives restart');
 await q.evaluate(()=>{localStorage.removeItem(AUTH_STORAGE_KEY);sessionStorage.setItem('shaah_mock_signedout','1')});await context.setOffline(true);await q.reload();await q.getByRole('button',{name:'Continue with Google'}).waitFor();assert.equal(await q.evaluate(()=>USER),null);
});
test('real pinned SDK with an expired saved session can cold-open offline without authenticating another account',async t=>{
 const {fixture}=require('./helpers.cjs');const {url}=await serve(t);
 const p=await openApp(t,undefined,{width:390,height:844},{url,httpServer:true,serviceWorkers:'allow'});
 const context=await p.context().browser().newContext({serviceWorkers:'allow',timezoneId:'UTC'});t.after(()=>context.close());
 await context.route('https://*.supabase.co/**',route=>route.abort());
 let q=await context.newPage();await q.goto(url);await q.getByRole('button',{name:'Continue with Google'}).waitFor();
 await q.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));});
 await q.evaluate(data=>{
  const id='synthetic-expired-owner';localStorage.setItem('sb-llpyxktcfubhmthqujpa-auth-token',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeW50aGV0aWMtZXhwaXJlZC1vd25lciIsImV4cCI6MX0.synthetic',refresh_token:'synthetic-not-valid',expires_at:1,expires_in:3600,token_type:'bearer',user:{id,email:'synthetic@example.invalid'}}));
  localStorage.setItem('shaah_cfg_'+id,JSON.stringify(data.config));localStorage.setItem('shaah_cache_'+id,JSON.stringify(data.days));localStorage.setItem('shaah_tour_'+id,'1');
 },fixture());
 await context.setOffline(true);await q.close();q=await context.newPage();await q.goto(url);await q.waitForFunction(()=>_offlineBoot&&_cfgReady);assert.equal(await q.evaluate(()=>USER.id),'synthetic-expired-owner');
 await q.evaluate(()=>setNote(todayKey(),'Offline with expired session'));await q.waitForTimeout(500);assert.ok(await q.evaluate(()=>Object.keys(_offlineQueue).length)>0);assert.equal(await q.evaluate(()=>_offlineBoot),true);
});
