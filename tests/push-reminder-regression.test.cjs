const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const worker=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
function load(windows=[]){
 const handlers={},shown=[],opened=[],focused=[];
 const ctx={URL,Request,Set,self:{location:{href:'https://example.test/shaah/sw.js'},addEventListener:(name,fn)=>handlers[name]=fn,
  registration:{showNotification:async(title,options)=>{shown.push({title,options})}},
  clients:{claim:async()=>{},matchAll:async()=>windows.map(url=>({url,focus:async()=>{focused.push(url)}})),openWindow:async url=>{opened.push(url)}}},
  caches:{open:async()=>({}),keys:async()=>[]},fetch:()=>null};
 vm.runInNewContext(worker,ctx);return {handlers,shown,opened,focused};
}
const run=async(handler,event)=>{let task;handler({...event,waitUntil:p=>task=p});await task;};
test('a reminder push shows one SHAAH notification with the sent text, and survives a malformed payload',async()=>{
 const w=load();
 await run(w.handlers.push,{data:{json:()=>({title:'SHAAH',body:'Your day is still open.'})}});
 assert.equal(w.shown.length,1);assert.equal(w.shown[0].title,'SHAAH');assert.equal(w.shown[0].options.body,'Your day is still open.');
 assert.equal(w.shown[0].options.tag,'shaah-daily');assert.equal(w.shown[0].options.icon,'https://example.test/shaah/assets/icon-192.png');
 await run(w.handlers.push,{data:{json:()=>{throw new SyntaxError('bad')}}});
 assert.equal(w.shown.length,2);assert.equal(w.shown[1].title,'SHAAH');
 await run(w.handlers.push,{data:{json:()=>({title:'x'.repeat(500),body:'y'.repeat(900)})}});
 assert.equal(w.shown[2].title.length,60);assert.equal(w.shown[2].options.body.length,200);
});
test('tapping the notification focuses an open SHAAH window, or opens one',async()=>{
 const open=load(['https://example.test/other/','https://example.test/shaah/']);let closed=0;
 await run(open.handlers.notificationclick,{notification:{close:()=>closed++}});
 assert.equal(closed,1);assert.deepEqual(open.focused,['https://example.test/shaah/']);assert.deepEqual(open.opened,[]);
 const none=load([]);
 await run(none.handlers.notificationclick,{notification:{close:()=>{}}});
 assert.deepEqual(none.opened,['https://example.test/shaah/']);
});
test('the server sends reminders only after the time, once a day, and never on a day with points',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20261117120000_push_reminders.sql'),'utf8');
 assert.match(sql,/n\.ts::time>=s\.remind_at/);
 assert.match(sql,/s\.last_sent_on is null or s\.last_sent_on<n\.ts::date/);
 assert.match(sql,/not exists\(select 1 from public\.day_logs d where d\.user_id=s\.user_id/);
 assert.match(sql,/revoke all on function public\.shaah_push_run\(text\) from public, anon, authenticated/);
 assert.doesNotMatch(sql,/vault\.create_secret/,'secrets never live in the repository');
});
