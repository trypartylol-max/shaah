const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,serverRows,clone}=require('./helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');
const {syncBackend}=require('./sync-backend.cjs');
const owner='synthetic-A',other='synthetic-B',day='2026-10-16';
function appFor(server,id=owner){
  const app=loadApp(locationFixture(),{client:server.clientFor(id)});
  app.contextRow=server.rows.find(r=>r.user_id===id&&r.date==='settings');
  app.run(`USER={id:${JSON.stringify(id)}};`);
  if(app.contextRow) app.run(`rowToState(${JSON.stringify(app.contextRow)});`);
  app.run('_cfgReady=true;');return app;
}
function server(){return syncBackend(serverRows(locationFixture()).map(r=>({...r,user_id:owner})));}
const settings=s=>s.rows.find(r=>r.user_id===owner&&r.date==='settings').data._cfg;

test('opaque DELETE reconciliation removes only absent own days and preserves pending/offline edits',async()=>{
  const s=server(),app=appFor(s);
  s.rows=s.rows.filter(r=>!['2026-09-07','2026-09-08','2026-09-15'].includes(r.date));
  app.run('_pending["2026-09-08"]={};_offlineQueue["2026-09-15"]={data:{_note:"local"}};');
  await app.run('reconcileDeletedDays(USER.id,_syncEpoch)');
  assert.equal(app.run('!!_state["2026-09-07"]'),false);
  assert.equal(app.run('!!_state["2026-09-08"]&&!!_state["2026-09-15"]&&!!_state["2026-09-16"]'),true);
  assert.equal(s.writes.length,0);
});

test('opaque DELETE reconciliation cannot erase a row received after its SELECT began',async()=>{
  const s=server(),app=appFor(s);
  s.rows=s.rows.filter(r=>r.date!=='2026-09-07');
  s.beforeSelect=async()=>app.run('_state["2026-09-07"]={note:"new remote insert"};');
  await app.run('reconcileDeletedDays(USER.id,_syncEpoch)');
  assert.equal(app.read('_state["2026-09-07"].note'),'new remote insert');
});

test('opaque DELETE reconciliation ignores an account change while its SELECT is pending',async()=>{
  const s=server(),app=appFor(s);
  s.rows=s.rows.filter(r=>r.date!=='2026-09-07');
  s.beforeSelect=async()=>app.run('USER={id:"synthetic-B"};_syncEpoch++;_state={"2026-09-07":{note:"B"}};');
  await app.run('reconcileDeletedDays(USER.id,_syncEpoch)');
  assert.deepEqual(app.read('_state'),{'2026-09-07':{note:'B'}});
});

test('opaque DELETE reconciliation preserves state if the RLS read fails',async()=>{
  const s=server(),app=appFor(s),before=app.read('_state');
  s.beforeSelect=async()=>{throw new Error('offline');};
  await app.run('reconcileDeletedDays(USER.id,_syncEpoch)');
  assert.deepEqual(app.read('_state'),before);
});

test('Realtime routes an id-only DELETE through the own-row check and ignores another explicit owner',async()=>{
  const s=server(),subscriptions=[];let callback,reads=0;
  s.client.channel=()=>({on(_event,filter,fn){subscriptions.push(filter);callback=fn;return this;},subscribe(){}});
  s.beforeSelect=async()=>{reads++;};
  const app=appFor(s);app.run('subscribeRealtime()');
  assert.deepEqual(subscriptions.map(s=>s.event),['INSERT','UPDATE','DELETE']);
  assert.equal(subscriptions[0].filter,'user_id=eq.'+owner);
  assert.equal(Object.hasOwn(subscriptions[2],'filter'),false);
  s.rows=s.rows.filter(r=>r.date!=='2026-09-07');
  await callback({eventType:'DELETE',old:{id:123}});
  assert.equal(app.run('!!_state["2026-09-07"]'),false);assert.equal(reads,1);
  await callback({eventType:'DELETE',old:{id:124,user_id:other,date:'2026-09-08'}});
  assert.equal(reads,1);assert.equal(app.run('!!_state["2026-09-08"]'),true);
});

test('offline A data never restores or replays under B and remains available for A',async()=>{
  const s=server(),app=appFor(s);
  app.run('setNote(todayKey(),"A pending");queueOfflineDay(todayKey());changeSyncUser({id:"synthetic-B"});navigator.onLine=true;restoreOfflineQueue();');
  assert.equal(app.read('getNote(todayKey())'),'');
  await app.run('flushOfflineQueue()');
  assert.equal(s.rows.some(r=>r.user_id===other&&r.data._note==='A pending'),false);
  app.run('changeSyncUser({id:"synthetic-A"});restoreOfflineQueue();');
  assert.equal(app.read('getNote(todayKey())'),'A pending');
  await app.run('flushOfflineQueue()');
  assert.equal(s.rows.find(r=>r.user_id===owner&&r.date===day).data._note,'A pending');
});

test('a delayed A write is not submitted as B after switching accounts',async()=>{
  const s=server(),app=appFor(s);
  app.run('setNote(todayKey(),"A delayed");');
  const timer=app.timers.get(app.run('_pending[todayKey()].timer'));
  app.run('USER={id:"synthetic-B"};_state={};');
  await timer.fn();
  assert.equal(s.writes.length,0);
  app.run('USER={id:"synthetic-A"};navigator.onLine=true;');
  await app.run('flushOfflineQueue()');
  assert.equal(s.rows.find(r=>r.user_id===owner&&r.date===day).data._note,'A delayed');
});

test('unowned legacy queue is preserved without restoring or submitting it',async()=>{
  const s=server(),app=appFor(s),legacy=JSON.stringify({[day]:{data:{_note:'unowned'}}});
  app.values.set('shaah-offline-day-writes',legacy);
  app.run('_state={};navigator.onLine=true;restoreOfflineQueue();');
  await app.run('flushOfflineQueue()');
  assert.equal(app.read('getNote(todayKey())'),'');
  assert.equal(app.values.get('shaah-offline-day-writes'),legacy);
  assert.equal(s.writes.length,0);
});

test('concurrent edits to different contacts preserve both settings changes',async()=>{
  const s=server(),a=appFor(s),b=appFor(s);
  a.run('personSet("pold01","name","Concurrent rename");');
  await a.run('flushCfgSaves()');
  b.run('personSet("pold02","every",99);');
  await b.run('flushCfgSaves()');
  assert.equal(settings(s).people.find(p=>p.id==='pold01').name,'Concurrent rename');
  assert.equal(settings(s).people.find(p=>p.id==='pold02').every,99);
});

test('a true field conflict preserves server value and retains the local draft across reload',async()=>{
  const s=server(),a=appFor(s),b=appFor(s);
  a.run('personSet("pold01","name","First writer");');await a.run('flushCfgSaves()');
  b.run('personSet("pold01","name","Second writer");');await b.run('flushCfgSaves()');
  assert.equal(settings(s).people[0].name,'First writer');
  assert.equal(b.read('personById("pold01").name'),'Second writer');
  assert.equal(b.read('_cfgConflict'),true);
  const pending=b.values.get('shaah_cfg_pending_'+owner);
  assert.ok(pending);
  const fresh=loadApp(locationFixture(),{client:s.client});fresh.values.set('shaah_cfg_pending_'+owner,pending);
  fresh.run(`USER={id:"${owner}"};rowToState(${JSON.stringify(s.rows.find(r=>r.date==='settings'))});`);
  assert.equal(fresh.read('personById("pold01").name'),'Second writer');
  assert.equal(fresh.read('_cfgConflict'),true);
});

test('settings CAS retries when another writer changes the row after the read',async()=>{
  const s=server(),a=appFor(s),b=appFor(s);let intercepted=false;
  s.beforeMutation=async ({action})=>{
    if(action==='update'&&!intercepted){intercepted=true;b.run('personSet("pold01","name","Won the race");');await b.run('flushCfgSaves()');}
  };
  a.run('personSet("pold02","every",66);');await a.run('flushCfgSaves()');
  assert.equal(settings(s).people[0].name,'Won the race');
  assert.equal(settings(s).people[1].every,66);
});

test('merging memberships and different contact fields preserves historical configuration and points',async()=>{
  const s=server(),a=appFor(s),b=appFor(s),history=clone(settings(s).log);
  a.run('locationTogglePerson("pold01","il");');await a.run('flushCfgSaves()');
  b.run('locationTogglePerson("pold01","pa");personSetInactive("pold01",true);');await b.run('flushCfgSaves()');
  assert.deepEqual(new Set(settings(s).people[0].locations),new Set(['il','pa']));
  assert.equal(settings(s).people[0].inactive,true);
  assert.deepEqual(settings(s).log,history);
  assert.equal(b.read('calcScore("2026-09-16").score'),7);
  assert.equal(b.read('calcScore("2026-10-08").score'),27);
});

test('a failed in-flight A request keeps its A payload after B signs in',async()=>{
  const s=server(),app=appFor(s);let release,started;
  const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r);
  s.beforeMutation=async()=>{started();await gate;throw new Error('Synthetic offline');};
  app.run('setNote(todayKey(),"A in flight");');
  const task=app.timers.get(app.run('_pending[todayKey()].timer')).fn();await entered;
  app.run('changeSyncUser({id:"synthetic-B"});');release();await task;
  assert.equal(app.read('getNote(todayKey())'),'');
  assert.equal(app.read('Object.keys(_offlineQueue).length'),0);
  assert.equal(JSON.parse(app.values.get('shaah-offline-day-writes:'+owner))[day].data._note,'A in flight');
  assert.equal(s.writes.length,0);
});

test('an edit made during offline replay is not removed by the older acknowledgement',async()=>{
  const s=server(),app=appFor(s);let release,started;
  const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r);
  s.beforeMutation=async()=>{started();await gate;};
  app.run('_state[todayKey()]={note:"Older queued note"};queueOfflineDay(todayKey());navigator.onLine=true;');
  const task=app.run('flushOfflineQueue()');await entered;
  app.run('setNote(todayKey(),"Newer local note");');release();await task;
  assert.equal(app.read('_offlineQueue[todayKey()].data._note'),'Newer local note');
  s.beforeMutation=null;
  await app.timers.get(app.run('_pending[todayKey()].timer')).fn();
  assert.equal(s.rows.find(r=>r.user_id===owner&&r.date===day).data._note,'Newer local note');
  assert.equal(app.read('Object.keys(_offlineQueue).length'),0);
});

test('returning to A before its old acknowledgement cannot erase A newer persisted queue',async()=>{
  const s=server(),app=appFor(s);let release,started;
  const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r);
  s.beforeMutation=async()=>{started();await gate;};
  app.run('_state[todayKey()]={note:"Old A"};queueOfflineDay(todayKey());navigator.onLine=true;');
  const task=app.run('flushOfflineQueue()');await entered;
  app.run('changeSyncUser({id:"synthetic-B"});changeSyncUser({id:"synthetic-A"});setNote(todayKey(),"New A");');
  release();await task;
  assert.equal(JSON.parse(app.values.get('shaah-offline-day-writes:'+owner))[day].data._note,'New A');
  assert.equal(app.read('_offlineQueue[todayKey()].data._note'),'New A');
});

test('late account A load cannot populate B state or enable B config writes',async()=>{
  const s=server(),app=appFor(s);let release,started;
  const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r);
  s.beforeSelect=async()=>{started();await gate;};
  const task=app.run('loadAll()');await entered;
  app.run('changeSyncUser({id:"synthetic-B"});');
  const snapshot=app.read('CFG');release();await task;
  assert.deepEqual(app.read('CFG'),snapshot);
  assert.deepEqual(app.read('_state'),{});
  assert.equal(app.read('_cfgReady'),false);
});

test('queued config writes stay with A across an account switch',async()=>{
  const s=server(),app=appFor(s);
  app.run('personSet("pold01","name","A draft retained");changeSyncUser({id:"synthetic-B"});');
  await app.run('flushCfgSaves()');
  assert.equal(settings(s).people[0].name,'Ana Existing');
  assert.ok(app.values.get('shaah_cfg_pending_'+owner));
  assert.equal(app.values.has('shaah_cfg_pending_'+other),false);
  app.run(`changeSyncUser({id:"${owner}"});rowToState(${JSON.stringify(s.rows.find(r=>r.date==='settings'))});_cfgReady=true;`);
  await app.run('flushCfgSaves()');
  assert.equal(settings(s).people[0].name,'A draft retained');
});

test('Realtime rejects other-owner DELETE/UPDATE and callbacks from a prior account',()=>{
  const s=server(),app=appFor(s);let receive;
  s.client.channel=()=>({on(type,filter,fn){receive=fn;return this;},subscribe(fn){fn('SUBSCRIBED');return this;}});
  app.run('_state[todayKey()]={note:"A retained"};subscribeRealtime();');
  receive({eventType:'DELETE',old:{user_id:other,date:day}});
  receive({eventType:'UPDATE',new:{user_id:other,date:day,data:{_note:'B must not appear'}}});
  receive({eventType:'DELETE',old:{date:day}});
  assert.equal(app.read('getNote(todayKey())'),'A retained');
  receive({eventType:'DELETE',old:{user_id:owner,date:day}});
  assert.equal(app.read('getNote(todayKey())'),'');
  app.run('changeSyncUser({id:"synthetic-B"});_state[todayKey()]={note:"B retained"};');
  receive({eventType:'DELETE',old:{user_id:owner,date:day}});
  assert.equal(app.read('getNote(todayKey())'),'B retained');
});

test('signed-in live Work/Vacation preference is scoped to its account',()=>{
  const app=appFor(server());
  app.run('persistTravelMode("vacation",9999999999999);changeSyncUser({id:"synthetic-B"});CFG.travel={mode:"work",modeUpdatedAt:1};restoreLiveTravelMode();');
  assert.equal(app.read('travelMode()'),'work');
  assert.equal(JSON.parse(app.values.get('travelMode:'+owner)).mode,'vacation');
  assert.equal(JSON.parse(app.values.get('travelMode:'+other)).mode,'work');
});

test('network failures retain the config draft and retry succeeds without losing it',async()=>{
  const s=server(),app=appFor(s);
  s.beforeSelect=()=>{throw new Error('Synthetic network failure');};
  app.run('personSetInactive("pold03",true);');await app.run('flushCfgSaves()');
  assert.equal(app.read('_cfgSaveFailed'),true);
  assert.ok(app.values.get('shaah_cfg_pending_'+owner));
  assert.equal(settings(s).people[2].inactive,false);
  s.beforeSelect=null;await app.run('flushCfgSaves()');
  assert.equal(settings(s).people[2].inactive,true);
  assert.equal(app.read('_cfgSaveFailed'),false);
  assert.equal(app.values.has('shaah_cfg_pending_'+owner),false);
});

test('concurrent contact deletion and modification reports a conflict instead of guessing',async()=>{
  const s=server(),a=appFor(s),b=appFor(s);
  a.run('CFG.people=CFG.people.filter(p=>p.id!=="pold01");saveCfg();');await a.run('flushCfgSaves()');
  b.run('personSet("pold01","name","Still editing this person");');await b.run('flushCfgSaves()');
  assert.equal(settings(s).people.some(p=>p.id==='pold01'),false);
  assert.equal(b.read('_cfgConflict'),true);
  assert.equal(b.read('personById("pold01").name'),'Still editing this person');
});

test('settings edited before the first server read survive reconnect and merge safely',async()=>{
  const s=server(),app=appFor(s);
  app.run('set(cfgKey(),CFG);_cfgReady=false;loadCfgLocal();personSetInactive("pold03",true);');
  assert.ok(app.values.get('shaah_cfg_pending_'+owner));
  assert.equal(settings(s).people[2].inactive,false);
  app.run(`rowToState(${JSON.stringify(s.rows.find(r=>r.date==='settings'))});_cfgReady=true;`);
  await app.run('flushCfgSaves()');
  assert.equal(settings(s).people[2].inactive,true);
});

test('an account without a settings row can create its first configuration without upsert overwrites',async()=>{
  const s=syncBackend(),app=appFor(s);
  app.run('personSet("pold01","name","New settings");');await app.run('flushCfgSaves()');
  assert.equal(settings(s).people[0].name,'New settings');
  assert.equal(s.writes[0].action,'insert');
});

test('legacy day-only accounts keep their day rows when the first settings row is created',async()=>{
  const history=serverRows(locationFixture()).filter(r=>r.date!=='settings').map(r=>({...r,user_id:owner}));
  const s=syncBackend(history),app=loadApp(locationFixture(),{client:s.client});
  app.run('changeSyncUser({id:"synthetic-A"});');
  await app.run('loadAll()');await app.run('flushCfgSaves()');
  assert.deepEqual(s.rows.filter(r=>r.date!=='settings'&&r.date!=='cfgbak'),history.map(r=>({...r,settings_revision:0})));
  assert.ok(settings(s).log.length>0,'legacy adoption keeps its dated scoring baseline');
  assert.ok(settings(s).people.some(p=>p.id==='pold03'),'historical contact IDs remain recoverable');
});

test('an unavailable revision protocol keeps drafts and never falls back to a legacy settings write',async()=>{
  const s=server(),app=appFor(s);delete s.rows.find(r=>r.date==='settings').settings_revision;
  app.run('personSet("pold01","name","Keep this draft");');await app.run('flushCfgSaves()');
  assert.equal(app.read('_cfgSaveFailed'),true);assert.ok(app.values.get('shaah_cfg_pending_'+owner));
  assert.equal(settings(s).people[0].name,'Ana Existing');assert.equal(s.writes.length,0);
});

test('a malformed server acknowledgement cannot discard a pending settings draft',async()=>{
  const s=server(),app=appFor(s);
  app.run('sb.rpc=async()=>({error:null,data:{settings_revision:1,data:{_cfg:{}}}});personSet("pold01","name","Unconfirmed draft");');
  await app.run('flushCfgSaves()');assert.equal(app.read('_cfgSaveFailed'),true);
  assert.equal(app.read('personById("pold01").name'),'Unconfirmed draft');assert.ok(app.values.get('shaah_cfg_pending_'+owner));
});

test('revision CAS detects an intervening write even when data returns to its previous value',async()=>{
  const s=server(),a=appFor(s),b=appFor(s);let intercepted=false,attempts=0;
  s.beforeMutation=async({rpc})=>{
    if(rpc)attempts++;
    if(!intercepted){intercepted=true;b.run('personSet("pold01","name","Interim");');await b.run('flushCfgSaves()');b.run('personSet("pold01","name","Ana Existing");');await b.run('flushCfgSaves()');}
  };
  a.run('personSet("pold02","every",42);');await a.run('flushCfgSaves()');
  assert.equal(attempts,4);assert.equal(s.rows.find(r=>r.date==='settings').settings_revision,3);
  assert.equal(settings(s).people[1].every,42);assert.equal(a.read('_cfgSaveFailed'),false);
});

test('denied settings RPC preserves local edits without issuing direct fallback mutations',async()=>{
  const s=server(),app=appFor(s);
  app.run('sb.rpc=async()=>({data:null,error:{code:"42501"}});personSetInactive("pold03",true);');await app.run('flushCfgSaves()');
  assert.equal(s.writes.length,0);assert.equal(app.read('_cfgSaveFailed'),true);
  assert.equal(app.read('personById("pold03").inactive'),true);assert.ok(app.values.get('shaah_cfg_pending_'+owner));
});

test('a token switch between read and RPC cannot submit an A settings draft as B',async()=>{
  const rows=serverRows(locationFixture()).flatMap(r=>[owner,other].map(id=>({...r,user_id:id}))),s=syncBackend(rows),app=appFor(s);
  const before=clone(s.rows.find(r=>r.user_id===other&&r.date==='settings'));
  const b=s.clientFor(other);
  let submitted=0;
  app.run('sb').rpc=async(name,args)=>{submitted++;assert.equal(args.p_data.owner_id,owner);app.run('changeSyncUser({id:"synthetic-B"});');return b.rpc(name,args);};
  app.run('personSet("pold01","name","A retained across a late token switch");');
  await app.run('flushCfgSaves()');
  assert.equal(submitted,1);
  assert.deepEqual(s.rows.find(r=>r.user_id===other&&r.date==='settings'),before);
  assert.equal(s.writes.length,0);assert.ok(app.values.get('shaah_cfg_pending_'+owner));
});
