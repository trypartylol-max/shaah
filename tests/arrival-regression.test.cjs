const test=require('node:test'),assert=require('node:assert/strict');
const {loadApp,fixture,serverRows}=require('./helpers.cjs'),{syncBackend}=require('./sync-backend.cjs');
const id='synthetic-A';
function device(server){const a=loadApp(undefined,{client:server.clientFor(id)});a.run(`USER={id:'${id}'};CFG=cfgCopy(DEFAULT_CFG);_state={};_starterGate='loading';navigator.onLine=true`);return a}
test('exclusive starter claim records one account tutorial; only winning device queues presentation',async()=>{
 const server=syncBackend(),a=device(server),b=device(server);
 await Promise.all([a.run('loadAll()'),b.run('loadAll()')]);a.run('_starterChoice="focus"');b.run('_starterChoice="rest"');
 await Promise.all([a.run('starterConfirm()'),b.run('starterConfirm()')]);
 assert.equal(server.writes.length,1);assert.equal(server.rows[0].data._cfg.starter.tutorial.state,'presented');
 assert.equal([a.read('_arrivalTutorial'),b.read('_arrivalTutorial')].filter(Boolean).length,1);
 const clean=device(server);await clean.run('loadAll()');assert.equal(clean.read('_arrivalTutorial'),false);assert.equal(clean.read('_arrivalWelcome'),true);
});
test('existing account arrival is transient and never edits settings or historical fixtures',async()=>{
 const data=fixture(),server=syncBackend(serverRows(data).map(r=>({...r,user_id:id}))),a=device(server);
 const before=JSON.parse(JSON.stringify(server.rows.filter(r=>/^\d{4}-/.test(r.date))));await a.run('loadAll()');
 assert.equal(a.read('_arrivalWelcome'),true);assert.equal(a.read('_arrivalTutorial'),false);
 assert.deepEqual(server.rows.filter(r=>/^\d{4}-/.test(r.date)),before);
 for(const k of Object.keys(data.days))assert.deepEqual(a.read(`_state[${JSON.stringify(k)}]`),data.days[k]);
 a.run('set(arrivalSeenKey(),1);_arrivalResolved=false;_arrivalWelcome=false;arrivalPlanExisting()');assert.equal(a.read('_arrivalWelcome'),false);
 a.run("USER={id:'synthetic-A',last_sign_in_at:'next-sign-in'};_arrivalResolved=false;arrivalPlanExisting()");assert.equal(a.read('_arrivalWelcome'),true);
});
test('late boot snapshot cannot resurrect a signed-out account or overwrite a newer identity',async()=>{
 for(const next of [null,{id:'synthetic-B'}]){
  const a=device(syncBackend());a.run("location={search:'',hash:'',pathname:'/'};initSkin=()=>{};var releaseSession;sb.auth.getSession=()=>new Promise(r=>releaseSession=r)");
  const boot=a.run('boot()');a.run(`_arrivalAuthRevision++;activateAccountSession(${next?JSON.stringify({user:next}):'null'})`);
  a.run(`releaseSession({data:{session:{user:{id:'${id}'}}}})`);await boot;
  assert.equal(a.run('USER?.id||null'),next?.id||null);
 }
});
test('duplicate auth events schedule one account activation and switching clears pending arrival',()=>{
 const a=device(syncBackend());a.run("changeSyncUser(null);activateAccountSession({user:{id:'A'}});activateAccountSession({user:{id:'A'}})");
 assert.equal([...a.timers.values()].filter(x=>x.ms===0).length,1);
 a.run("_arrivalTutorial=true;_arrivalWelcome=true;changeSyncUser({id:'B'})");
 assert.equal(a.read('_arrivalTutorial'),false);assert.equal(a.read('_arrivalWelcome'),false);assert.equal(a.read('_arrivalActivation'),null);
});
