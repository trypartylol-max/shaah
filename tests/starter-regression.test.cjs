const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixture,serverRows,clone}=require('./helpers.cjs');
const {syncBackend}=require('./sync-backend.cjs');
const owner='synthetic-A',day='2026-10-16';
function device(server,id=owner){
 const app=loadApp(undefined,{client:server.clientFor(id)});
 app.run(`USER={id:${JSON.stringify(id)}};CFG=cfgCopy(DEFAULT_CFG);_state={};_starterGate='loading';navigator.onLine=true;`);
 return app;
}
const settings=s=>s.rows.find(r=>r.user_id===owner&&r.date==='settings')?.data._cfg;
test('verified empty account offers a choice without migrations, settings or activity writes',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');
 assert.equal(a.read('_starterGate'),'choose');assert.equal(a.read('_cfgReady'),false);
 assert.deepEqual(s.writes,[]);assert.deepEqual(s.rows,[]);
});
test('one chosen generic habit persists, survives loadAll and never grows Work or junk-food',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');await a.run('starterConfirm()');
 const saved=clone(settings(s));assert.equal(saved.order.length,1);const id=saved.order[0];
 assert.match(id,/^c[a-z0-9]{5}$/);assert.equal(saved.h[id].starterTemplate,'focus');
 assert.equal(saved.starter.view,'simple');assert.deepEqual(saved.routines,{});assert.deepEqual(saved.people,[]);
 assert.equal(a.read('calcScore(todayKey()).max'),10);assert.equal(a.read('calcScore("2026-10-15").max'),0);
 await a.run('loadAll()');await a.run('flushCfgSaves()');
 assert.equal(a.read('CFG.order.length'),1);assert.equal(a.read('!!CFG.h.work'),false);assert.equal(a.read('!!CFG.h.cjunk0'),false);
 assert.deepEqual(a.read('_state'),{});assert.equal(s.writes.length,1);
 const b=device(s);await b.run('loadAll()');assert.equal(b.read('_starterGate'),'ready');assert.equal(b.read('CFG.order[0]'),id);
});
test('skip is a persisted zero-plan profile, not an F grade or fake tutorial completion',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');await a.run('starterConfirm(true)');
 assert.deepEqual(settings(s).order,[]);assert.equal(a.read('calcScore(todayKey()).max'),0);
 assert.equal(a.read('GRADE(0,0).n'),'SIN PLAN');assert.equal(a.read('get(tourKey())'),null);
 await a.run('loadAll()');assert.equal(a.read('_starterGate'),'ready');assert.deepEqual(a.read('CFG.h'),{});
});
test('two simultaneous initializers adopt one CAS winner without merging obligations',async()=>{
 const s=syncBackend(),a=device(s),b=device(s);await Promise.all([a.run('loadAll()'),b.run('loadAll()')]);
 a.run('_starterChoice="move"');b.run('_starterChoice="create"');
 await Promise.all([a.run('starterConfirm()'),b.run('starterConfirm()')]);
 assert.equal(s.writes.length,1);assert.equal(settings(s).order.length,1);
 assert.deepEqual(a.read('CFG'),b.read('CFG'));assert.equal(a.read('_cfgDraft'),null);assert.equal(b.read('_cfgDraft'),null);
});
test('lost acknowledgement is recovered by rereading; failed write stays retryable without activity',async()=>{
 const s=syncBackend(),original=s.clientFor;
 s.clientFor=id=>{const c=original(id),rpc=c.rpc;c.rpc=async(...args)=>{await rpc(...args);return {error:{code:'NETWORK'}}};return c;};
 const a=device(s);await a.run('loadAll()');a.run('_starterChoice="rest"');await a.run('starterConfirm()');
 assert.equal(a.read('_starterGate'),'ready');assert.equal(s.writes.length,1);assert.deepEqual(a.read('_state'),{});
 // A separate empty backend ensures failure does not adopt the first backend.
 const f=syncBackend(),normal=f.clientFor;f.clientFor=id=>Object.assign(Object.create(normal(id)),{rpc:async()=>({error:{code:'NETWORK'}})});
 const b=device(f);await b.run('loadAll()');b.run('_starterChoice="rest"');await b.run('starterConfirm()');
 assert.equal(b.read('_starterGate'),'choose');assert.match(b.read('_starterError'),/Retry/);assert.equal(f.writes.length,0);
});
test('failed/incomplete reads never classify or initialize; local copies veto empty remote',async()=>{
 const s=syncBackend();s.beforeSelect=()=>{throw Error('OFFLINE')};const a=device(s);await a.run('loadAll()');
 assert.equal(a.read('_starterGate'),'error');assert.equal(s.writes.length,0);
 const f=syncBackend(),b=device(f);b.run('set(cfgKey(),CFG)');await b.run('loadAll()');
 assert.notEqual(b.read('_starterGate'),'choose');
});
test('a cached existing account stays usable offline without entering Starter or replacing its plan',async()=>{
 const s=syncBackend(),a=device(s),config=fixture().config;
 a.run(`set(cfgKey(),${JSON.stringify(config)});loadLvl=()=>{};loadSec=()=>{};restoreRoutine=()=>{};restoreAccountLocal()`);
 s.beforeSelect=()=>{throw Error('offline')};await a.run('loadAll()');
 assert.equal(a.read('_starterGate'),'ready');assert.equal(a.read('_cfgReady'),false);assert.deepEqual(a.read('CFG.h'),config.h);assert.equal(s.writes.length,0);
});
test('malformed settings fail closed; valid existing account never sees Starter',async()=>{
 const s=syncBackend([{user_id:owner,date:'settings',data:{broken:true}}]),a=device(s);await a.run('loadAll()');
 assert.equal(a.read('_starterGate'),'error');assert.equal(s.writes.length,0);
 const data=fixture(),existing=syncBackend(serverRows(data).map(r=>({...r,user_id:owner}))),b=device(existing);
 await b.run('loadAll()');assert.equal(b.read('_starterGate'),'ready');
 for(const k of Object.keys(data.days))assert.deepEqual(b.read(`_state[${JSON.stringify(k)}]`),data.days[k]);
});
test('account switching ignores delayed initializer acknowledgement',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');
 let release;const barrier=new Promise(r=>release=r);s.beforeMutation=()=>barrier;
 const flight=a.run('starterConfirm()');await new Promise(r=>setImmediate(r));
 a.run('changeSyncUser({id:"synthetic-B"})');release();await flight;
 assert.equal(a.read('USER.id'),'synthetic-B');assert.equal(a.read('_starterGate'),'loading');assert.equal(a.read('!!CFG.starter'),false);
});
test('expansion, routine and deletion use dated custom IDs and preserve previous day score',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');await a.run('starterConfirm()');
 a.run('first=CFG.order[0];setHabitState(first,todayKey(),true)');assert.equal(a.read('calcScore(todayKey()).score'),10);
 const before=a.read('calcScore("2026-10-15")');a.run('_starterEditor=true;_starterChoice="move"');await a.run('starterConfirm()');
 assert.equal(a.read('calcScore(todayKey()).max'),20);assert.deepEqual(a.read('calcScore("2026-10-15")'),before);
 a.run('starterAddRoutine(first)');assert.equal(a.read('CFG.routines[first].steps.length'),3);assert.equal(a.read('calcScore(todayKey()).max'),20);
 a.run('cfgDel(first)');assert.equal(a.read('CFG.order.length'),1);assert.deepEqual(a.read('calcScore("2026-10-15")'),before);
});
test('Starter export/import accepts both its empty baseline and a skipped zero-habit plan',async()=>{
 for(const choice of ['skip','focus']){
  const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run(`_starterChoice=${JSON.stringify(choice)}`);await a.run(`starterConfirm(${choice==='skip'})`);
  const before=a.read('CFG');a.run('prepared=importPrepare({app:"SHAAH",config:CFG,days:{}})');assert.deepEqual(a.read('prepared.cfg'),before);
 }
});
test('nonempty grades retain their established thresholds and zero plan is the only added grade',()=>{
 const a=loadApp();for(const [points,grade] of [[0,'F'],[14,'F'],[15,'D'],[30,'C'],[45,'B'],[72,'A'],[85,'S'],[95,'S+']])assert.equal(a.read(`GRADE(${points},100).l`),grade);
 assert.equal(a.read('GRADE(0,0).l'),'—');
});
