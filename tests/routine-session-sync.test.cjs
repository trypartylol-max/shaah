const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadApp}=require('./helpers.cjs');
const {syncBackend}=require('./sync-backend.cjs');
const source=fs.readFileSync(path.join(__dirname,'../source/app.js'),'utf8');
function device(server,owner='synthetic-A'){
 const a=loadApp(undefined,{client:server.client,source});
 a.run(`USER={id:${JSON.stringify(owner)}};unlockAudio=()=>{};audioKeepAlive=()=>{};chime=()=>{};renderSyncedState=()=>{};for(const id of ['production','wod'])CFG.h[id]={...LEGACY_CFG.h[id],pWork:15,pVacation:15};CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16',USER.id).config;applyCfg();navigator.onLine=true;`);
 return a;
}
async function flush(a){await a.run('flushRoutineCloud()');}
function receive(a,server){a.run(`hydrateRoutineRows(${JSON.stringify(server.rows.filter(r=>r.user_id===a.read('USER.id')))})`);}
async function running(a,id='production'){
 a.run(`startRoutine('${id}');routineToggle();`);await flush(a);
}
test('start, running countdown, pause, reset and Next transfer across isolated devices',async()=>{
 const b=syncBackend(),desktop=device(b),mobile=device(b);
 await running(desktop);receive(mobile,b);
 assert.equal(mobile.read('sessions.production.running'),true);
 assert.equal(mobile.read('sessions.production.endAt'),desktop.read('sessions.production.endAt'));
 assert.equal(mobile.read('routineView'),false,'remote session does not force a modal');
 mobile.run("openRoutine('production');routineToggle()");await flush(mobile);receive(desktop,b);
 assert.equal(desktop.read('sessions.production.paused'),true);
 assert.equal(desktop.read('sessions.production.secs'),mobile.read('sessions.production.secs'));
 await mobile.run('routineNext()');receive(desktop,b);
 assert.equal(desktop.read('sessions.production.q[0]'),1);
 assert.equal(desktop.read('sessions.production.endAt'),mobile.read('sessions.production.endAt'));
 mobile.run('routineReset()');await flush(mobile);receive(desktop,b);
 assert.equal(desktop.read('sessions.production.running'),false);
 assert.equal(desktop.read('sessions.production.secs'),desktop.read('ROUTINES.production.steps[1].dur*60'));
 assert.equal(desktop.read('getChecked(todayKey()).production||false'),false);
});
test('concurrent different routines do not overwrite one another',async()=>{
 const b=syncBackend(),a=device(b),c=device(b);
 await Promise.all([running(a,'production'),running(c,'wod')]);receive(a,b);receive(c,b);
 for(const app of [a,c])assert.deepEqual(app.read('Object.keys(sessions).sort()'),['production','wod']);
 assert.equal(b.rows.length,2);
});
test('a stale offline action cannot resurrect an ended routine',async()=>{
 const b=syncBackend(),a=device(b),c=device(b);await running(a);receive(c,b);
 c.run("navigator.onLine=false;openRoutine('production');routineToggle()");
 a.run("closeRoutine('production')");await flush(a);
 c.run('navigator.onLine=true');await flush(c);
 assert.equal(c.read('!!sessions.production'),false);
 assert.equal(b.rows[0].data.session,null);
});
test('simultaneous final expiry is claimed once before completion effects',async()=>{
 const b=syncBackend(),a=device(b),c=device(b);await running(a);
 a.run("sessions.production.q=[ROUTINES.production.steps.length-1];sessions.production.endAt=Date.now()-1000;saveRoutine()");await flush(a);receive(c,b);
 await Promise.all([a.run("advanceSharedRoutine('production')"),c.run("advanceSharedRoutine('production')")]);
 assert.equal(b.rows.find(r=>r.date==='routine:production').data.session,null);
 assert.equal(a.read('!!sessions.production'),false);assert.equal(c.read('!!sessions.production'),false);
 assert.equal(a.read('dayLogEvents(todayKey()).filter(e=>e.sourceId==="production").length')+c.read('dayLogEvents(todayKey()).filter(e=>e.sourceId==="production").length'),1);
});
test('older remote snapshots cannot rewind a newer known revision',async()=>{
 const b=syncBackend(),a=device(b),c=device(b);await running(a);const old=JSON.parse(JSON.stringify(b.rows[0]));receive(c,b);
 a.run('routineToggle()');await flush(a);receive(c,b);
 c.run(`receiveRoutineRow(${JSON.stringify(old)})`);
 assert.equal(c.read('sessions.production.paused'),true);
});
test('account change rejects delayed responses and preserves owner-scoped drafts',async()=>{
 const b=syncBackend(),a=device(b);let release;const barrier=new Promise(r=>release=r);
 b.beforeMutation=()=>barrier;
 a.run("startRoutine('production')");const flight=a.run('flushRoutineCloud()');
 a.run("changeSyncUser({id:'synthetic-B'})");release();await flight;
 assert.equal(a.read('USER.id'),'synthetic-B');assert.deepEqual(a.read('sessions'),{});assert.deepEqual(a.read('_routineBase'),{});
 assert.equal(b.rows[0].user_id,'synthetic-A');
});
test('offline pending state survives reload with its CAS base',async()=>{
 const b=syncBackend(),a=device(b);await running(a);
 a.run('navigator.onLine=false;routineToggle()');
 const pending=a.read('get(routineQueueKey())'),cached=a.read('get(RKEY())');
 const c=device(b);c.run('navigator.onLine=false');
 c.run(`set(RKEY(),${JSON.stringify(cached)});set(routineQueueKey(),${JSON.stringify(pending)});restoreRoutine();hydrateRoutineRows([])`);
 assert.equal(c.read('sessions.production.paused'),true);
 c.run('navigator.onLine=true');await flush(c);
 assert.equal(b.rows[0].data.session.paused,true);
});
test('session records stay outside scored days and ignore other owners or malformed sessions',async()=>{
 const b=syncBackend(),a=device(b),c=device(b,'synthetic-B');await running(a);
 c.run(`rowToState(${JSON.stringify(b.rows[0])})`);assert.deepEqual(c.read('sessions'),{});
 receive(a,b);assert.equal(a.read('Object.keys(_state).some(k=>k.startsWith("routine:"))'),false);
 const bad=JSON.parse(JSON.stringify(b.rows[0]));bad.data.session.q=[999];
 a.run(`receiveRoutineRow(${JSON.stringify(bad)})`);assert.equal(a.read('sessions.production.q[0]'),0);
});
test('failed writes remain queued and retry publishes the latest local action',async()=>{
 const b=syncBackend(),a=device(b);b.beforeMutation=()=>{throw Error('synthetic network loss')};
 await running(a);assert.equal(a.read('!!_routinePending.production'),true);
 a.run('routineToggle()');await flush(a);assert.equal(a.read('sessions.production.paused'),true);
 b.beforeMutation=null;await flush(a);
 assert.equal(b.rows[0].data.session.paused,true);assert.equal(a.read('Object.keys(_routinePending).length'),0);
});
test('edits during an in-flight write are serialized without losing the last pause',async()=>{
 const b=syncBackend(),a=device(b);let release;const wait=new Promise(r=>release=r);b.beforeMutation=()=>wait;
 a.run("startRoutine('production');routineToggle();routineToggle()");
 release();await flush(a);
 assert.equal(b.rows[0].data.session.paused,true);assert.equal(b.rows[0].data.session.running,false);
 assert.equal(a.read('Object.keys(_routinePending).length'),0);
});
test('fallback refresh discovers a session without a realtime event and unchanged reads never write',async()=>{
 const b=syncBackend(),a=device(b),c=device(b);await running(a);
 await c.run('refreshRoutineCloud()');assert.equal(c.read('sessions.production.running'),true);
 const writes=b.writes.length;await c.run('refreshRoutineCloud()');await c.run('refreshRoutineCloud()');
 assert.equal(b.writes.length,writes);
});
test('cloud tombstone supersedes a stale local cache on first hydration; an explicit restart is allowed',async()=>{
 const b=syncBackend(),a=device(b);await running(a);const stale=a.read('get(RKEY())');
 a.run("closeRoutine('production')");await flush(a);
 const c=device(b);c.run(`set(RKEY(),${JSON.stringify(stale)});restoreRoutine()`);receive(c,b);
 assert.equal(c.read('!!sessions.production'),false);
 await running(c);assert.equal(b.rows[0].data.session.running,true);
});
test('account day rollover clears old sessions while retaining their CAS base for a new start',async()=>{
 const b=syncBackend(),a=device(b);await running(a);receive(a,b);
 a.run("CFG.tz='Pacific/Kiritimati'");receive(a,b);
 assert.equal(a.read('todayKey()'),'2026-10-17');assert.equal(a.read('!!sessions.production'),false);
 await running(a);assert.equal(b.rows[0].data.day,'2026-10-17');
});
test('the pinned PostgREST SDK sends an owner-scoped JSONB compare-and-swap with returned rows',async()=>{
 const {PostgrestClient}=require('@supabase/postgrest-js');const requests=[];
 const client=new PostgrestClient('https://routine-test.invalid/rest/v1',{fetch:async(url,init)=>{
  const query=new URL(url),body=JSON.parse(init.body);requests.push({query,init,body});
  return new Response(JSON.stringify([{date:body.date||'routine:production',data:body.data}]),{status:200,headers:{'content-type':'application/json'}});
 }});
 const a=device({client:{auth:{onAuthStateChange(){}},from:table=>client.from(table)}});
 await running(a);a.run('routineToggle()');await flush(a);
 const patch=requests.filter(r=>r.init.method==='PATCH').at(-1);assert.ok(patch);
 assert.equal(patch.query.searchParams.get('user_id'),'eq.synthetic-A');
 assert.equal(patch.query.searchParams.get('date'),'eq.routine:production');
 assert.equal(JSON.parse(patch.query.searchParams.get('data').slice(3)).revision,requests.at(-2).body.data.revision);
 assert.equal(patch.body.data.session.paused,true);
 assert.equal(patch.query.searchParams.get('select'),'date,data');
});
