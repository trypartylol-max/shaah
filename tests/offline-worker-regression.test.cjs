const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const worker=fs.readFileSync(require('node:path').join(__dirname,'..','sw.js'),'utf8');
function load(fail=false){
 const handlers={},stored=new Map(),deleted=[],fetched=[];const ctx={URL,Request,Set,self:{location:{href:'https://example.test/shaah/sw.js'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}}},caches:{open:async name=>({addAll:async reqs=>{stored.set(name,reqs);if(fail)throw Error('missing font')},match:async url=>url}),delete:async name=>{deleted.push(name);stored.delete(name)},keys:async()=>[...stored.keys()]},fetch:req=>{fetched.push(req);return 'network'}};vm.runInNewContext(worker,ctx);return {handlers,stored,deleted,fetched,ctx};
}
test('offline release installation checks integrity for every file and removes partial cache on failure',async()=>{
 const good=load();let task;good.handlers.install({waitUntil:p=>task=p});await task;
 const reqs=[...good.stored.values()][0];assert.ok(reqs.length>20);assert.ok(reqs.every(r=>r.integrity.startsWith('sha384-')&&r.url.startsWith('https://example.test/shaah/')));
 const bad=load(true);bad.handlers.install({waitUntil:p=>task=p});await assert.rejects(task,/missing font/);assert.equal(bad.stored.size,0);assert.equal(bad.deleted.length,1);
});
test('worker never intercepts auth/API traffic, mutations, control pages or unrelated URLs',()=>{
 const a=load();for(const [url,method,mode] of [['https://project.supabase.co/rest/v1/day_logs','GET','cors'],['https://example.test/shaah/control/','GET','navigate'],['https://example.test/shaah/?code=private','POST','navigate'],['https://example.test/other/','GET','navigate'],['https://example.test/shaah/assets/not-in-manifest.js','GET','cors']])a.handlers.fetch({request:{url,method,mode},respondWith:()=>assert.fail('private/unlisted request intercepted')});
});
test('auth query parameters are never cache keys and cache cleanup respects other scopes',async()=>{
 const a=load();let task;a.handlers.fetch({request:{url:'https://example.test/shaah/?code=private',method:'GET',mode:'navigate'},respondWith:p=>task=p});assert.equal(await task,'https://example.test/shaah/index.html');
 a.stored.set('shaah:/other/:release:old',[]);a.stored.set('shaah:/shaah/:release:old',[]);a.handlers.activate({waitUntil:p=>task=p});await task;assert.ok(a.stored.has('shaah:/other/:release:old'));assert.ok(!a.stored.has('shaah:/shaah/:release:old'));
});
test('a waiting release takes over only when the page asks for it',()=>{
 let skipped=0;const a=load();a.ctx.self.skipWaiting=()=>{skipped++;return Promise.resolve()};
 assert.equal(typeof a.handlers.message,'function');
 a.handlers.message({data:'something-else'});assert.equal(skipped,0);
 a.handlers.message({data:'SKIP_WAITING'});assert.equal(skipped,1);
 assert.doesNotMatch(require('node:fs').readFileSync(require('node:path').join(__dirname,'..','sw.js'),'utf8').split("addEventListener('install'")[1].split('\n});')[0],/skipWaiting/);
});
