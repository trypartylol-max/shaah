const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixture,serverRows}=require('./helpers.cjs');
const {syncBackend}=require('./sync-backend.cjs');
const owner='synthetic-A',day='2026-10-16';
function device(){
 const data=fixture(),server=syncBackend(serverRows(data).map(r=>({...r,user_id:owner})));
 const app=loadApp(data,{client:server.clientFor(owner)});
 app.run("USER={id:'synthetic-A'};_cfgReady=true;selectOfflineOwner();runShaahSocialCoreMigration=()=>false;");
 return {app,server};
}
const tick=()=>new Promise(r=>setImmediate(r));
const fire=a=>a.timers.get(a.run('_pending[todayKey()].timer')).fn();
for(const initialDelete of [false,true])test(`slow ${initialDelete?'DELETE':'upsert'} cannot overtake a newer same-day upsert`,async()=>{
 const {app,server}=device();let release,entered,held=false;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 server.beforeMutation=async({action,payload})=>{
  if(!held&&((initialDelete&&action==='delete')||payload?.data?._note==='older request')){held=true;entered();await gate;}
 };
 app.run(initialDelete?"_state[todayKey()]={checks:{},social:{},people:[],note:'',_daylog:[]};persistDay(todayKey());":"setNote(todayKey(),'older request');");
 const first=fire(app);await started;
 app.run("setNote(todayKey(),'latest edit');");const second=fire(app);await tick();
 // Release the delayed first write after the newer call was already requested.
 release();await Promise.all([first,second]);
 assert.equal(server.rows.find(r=>r.user_id===owner&&r.date===day).data._note,'latest edit');
 assert.equal(app.read('getNote(todayKey())'),'latest edit');
 assert.deepEqual(app.read('Object.keys(_offlineQueue)'),[]);
 assert.equal(server.writes.length,2);
});
test('offline replay and foreground save share ordering across A→B→A',async()=>{
 const {app,server}=device();let release,entered,held=false;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 server.beforeMutation=async()=>{if(!held){held=true;entered();await gate;}};
 app.run("_state[todayKey()]={note:'older replay'};queueOfflineDay(todayKey());navigator.onLine=true;");
 const first=app.run('flushOfflineQueue()');await started;
 app.run("changeSyncUser({id:'synthetic-B'});changeSyncUser({id:'synthetic-A'});setNote(todayKey(),'latest A edit');");
 const second=fire(app);await tick();release();await Promise.all([first,second]);
 assert.equal(server.rows.find(r=>r.user_id===owner&&r.date===day).data._note,'latest A edit');
 assert.equal(server.rows.some(r=>r.user_id==='synthetic-B'&&r.date===day),false);
 assert.deepEqual(app.read('Object.keys(_offlineQueue)'),[]);
});
test('different days remain independent while the same-day transport is slow',async()=>{
 const {app,server}=device();let release,entered;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 server.beforeMutation=async({payload})=>{if(payload?.date===day){entered();await gate;}};
 app.run("setNote(todayKey(),'held day');");const held=fire(app);await started;
 app.run("setNote('2026-10-15','independent day');");
 await app.timers.get(app.run("_pending['2026-10-15'].timer")).fn();
 assert.equal(server.rows.find(r=>r.date==='2026-10-15').data._note,'independent day');
 release();await held;
});
for(const returnToA of [false,true])test(`queued A DELETE is not sent or acknowledged after ${returnToA?'A→B→A':'A→B'} changes its session`,async()=>{
 const {app,server}=device();let release,entered,held=false;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 server.beforeMutation=async()=>{if(!held){held=true;entered();await gate;}};
 app.run("setNote(todayKey(),'older accepted A');");const first=fire(app);await started;
 app.run("_state[todayKey()]={checks:{},social:{},people:[],note:'',_daylog:[]};persistDay(todayKey());");const second=fire(app);await tick();
 app.run("changeSyncUser({id:'synthetic-B'});");
 if(returnToA)app.run("changeSyncUser({id:'synthetic-A'});");
 release();await Promise.all([first,second]);
 assert.equal(server.writes.length,1,'the queued DELETE never reaches the backend under the replacement session');
 assert.equal(server.rows.find(r=>r.date===day).data._note,'older accepted A');
 assert.equal(JSON.parse(app.values.get('shaah-offline-day-writes:'+owner))[day].delete,true,'unconfirmed A deletion stays durable');
 assert.equal(app.read('_dayWriteFlights.size'),0);
 if(returnToA){
  app.run('restoreOfflineQueue();navigator.onLine=true;');await app.run('flushOfflineQueue()');
  assert.equal(server.rows.some(r=>r.user_id===owner&&r.date===day),false,'A can retry its own retained deletion with its new session');
  assert.deepEqual(app.read('Object.keys(_offlineQueue)'),[]);
 }
});
test('failed earlier write does not poison the latest same-day save',async()=>{
 const {app,server}=device();let release,entered,held=false;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 server.beforeMutation=async()=>{if(!held){held=true;entered();await gate;throw Error('connection lost');}};
 app.run("setNote(todayKey(),'failed old');");const first=fire(app);await started;
 app.run("setNote(todayKey(),'latest succeeds');");const second=fire(app);await tick();release();await Promise.all([first,second]);
 assert.equal(server.rows.find(r=>r.date===day).data._note,'latest succeeds');
 assert.deepEqual(app.read('Object.keys(_offlineQueue)'),[]);
});
test('stalled load reaches a retryable error without initializing or clearing local data; late reply is ignored',async()=>{
 const {app,server}=device(),before=app.read('_state');let release;
 const gate=new Promise(r=>release=r);server.beforeSelect=()=>gate;
 app.run("_starterGate='loading';_cfgReady=false;");const first=app.run('loadAll()');await tick();
 const timeout=[...app.timers.values()].find(x=>x.ms===20000);
 assert.ok(timeout,'account reads must have a finite deadline');
 timeout.fn();await first;
 assert.equal(app.read('_starterGate'),'error');assert.equal(app.read('_cfgReady'),false);
 assert.equal(app.read('_loadFlight'),null);assert.deepEqual(app.read('_state'),before);assert.equal(server.writes.length,0);
 server.beforeSelect=null;await app.run('loadAll()');
 app.run("_state[todayKey()]={note:'newer after retry'};");release();await tick();await tick();
 assert.equal(app.read('getNote(todayKey())'),'newer after retry');assert.equal(app.read('_cfgReady'),true);
});
test('read deadline aborts the pinned SDK transport without dropping cached data',async()=>{
 const {PostgrestClient}=require('@supabase/postgrest-js');let signal;
 const sdk=new PostgrestClient('https://synthetic.invalid/rest/v1',{fetch:async(_url,options)=>{
  signal=options.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
 }});
 const app=loadApp(fixture(),{client:{auth:{onAuthStateChange(){}},from:table=>sdk.from(table)}}),before=app.read('_state');
 app.run("USER={id:'synthetic-A'};_starterGate='loading';");const task=app.run('loadAll()');await tick();
 assert.equal(signal.aborted,false);[...app.timers.values()].find(x=>x.ms===20000).fn();await task;
 assert.equal(signal.aborted,true);assert.equal(app.read('_loadFailed'),true);
 assert.deepEqual(app.read('_state'),before);assert.equal(app.read('_cfgReady'),false);
});
