const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixture,serverRows}=require('./helpers.cjs');
const {syncBackend}=require('./sync-backend.cjs');
function device(){
  const data=fixture(),server=syncBackend(serverRows(data).map(r=>({...r,user_id:'synthetic-A'})));
  const app=loadApp(data,{client:server.clientFor('synthetic-A')});
  app.run("USER={id:'synthetic-A'};runShaahSocialCoreMigration=()=>false;");
  return {app,server};
}
test('concurrent boot/reconnect loads share one read and preserve dated scores',async()=>{
  const {app,server}=device(),before=app.read('Object.fromEntries(Object.keys(_state).map(k=>[k,calcScore(k)]))');
  let release,reads=0;const gate=new Promise(r=>release=r);
  server.beforeSelect=async({filters})=>{if(!filters.some(([k])=>k==='date')){reads++;await gate;}};
  const first=app.run('loadAll()'),second=app.run('loadAll()');
  assert.equal(first,second);await Promise.resolve();assert.equal(reads,1);
  release();await Promise.all([first,second]);
  assert.deepEqual(app.read('Object.fromEntries(Object.keys(_state).filter(k=>DATE_RE.test(k)).map(k=>[k,calcScore(k)]))'),before);
  assert.equal(app.read('_loadFlight'),null);
  await app.run('loadAll()');assert.equal(reads,2,'later refresh must actually read again');
});
test('failed shared load can retry without clearing local history',async()=>{
  const {app,server}=device(),before=app.read('_state');
  server.beforeSelect=()=>{throw Error('offline');};
  await app.run('loadAll()');assert.equal(app.read('_loadFlight'),null);assert.deepEqual(app.read('_state'),before);
  server.beforeSelect=null;await app.run('loadAll()');assert.equal(app.read('_cfgReady'),true);
});
test('an old account load cannot block or clear the new account flight',async()=>{
  const {app,server}=device();let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
  server.beforeSelect=async({filters})=>{if(filters.some(([k,v])=>k==='user_id'&&v==='synthetic-A')){entered();await gate;}};
  const old=app.run('loadAll()');await started;
  app.run("changeSyncUser({id:'synthetic-B'});");const next=app.run('loadAll()');
  assert.notEqual(old,next);await next;assert.deepEqual(app.read('_state'),{});assert.equal(app.read('_starterGate'),'choose');
  release();await old;assert.deepEqual(app.read('_state'),{});assert.equal(app.read('USER.id'),'synthetic-B');
});
test('repeat subscriptions reuse one channel; account switch creates a new owned channel',()=>{
  const {app,server}=device(),owners=[];let removed=0;
  server.client.channel=name=>{owners.push(name);return {on(){return this;},subscribe(){return this;}};};
  server.client.removeChannel=()=>removed++;
  app.run('subscribeRealtime();subscribeRealtime();');assert.deepEqual(owners,['shaah-synthetic-A']);
  app.run("changeSyncUser({id:'synthetic-B'});subscribeRealtime();");assert.deepEqual(owners,['shaah-synthetic-A','shaah-synthetic-B']);assert.equal(removed,1);
});
test('formatter reuse preserves midnight, explicit timezone changes, DST and invalid-zone fallback',()=>{
  const {app}=device();
  app.run("CFG.tz='Asia/Jerusalem'");
  assert.equal(app.read("dateKey(new Date('2026-10-01T20:59:00Z'))"),'2026-10-01');
  assert.equal(app.read("dateKey(new Date('2026-10-01T21:01:00Z'))"),'2026-10-02');
  assert.equal(app.read("dateKey(new Date('2026-11-01T21:01:00Z'))"),'2026-11-01');
  app.run("CFG.tz='Pacific/Kiritimati'");assert.equal(app.read("dateKey(new Date('2026-11-01T12:00:00Z'))"),'2026-11-02');
  app.run("CFG.tz='not/a-zone'");assert.match(app.read('todayKey()'),/^2026-10-1[56]$/);
});
test('Social last encounter excludes future days and responds immediately to edits',()=>{
  const {app}=device();app.run("setPeople('2026-10-17',['pold01']);setPeople('2026-10-15',['pold01']);");
  assert.equal(app.read("socialLast('pold01')"),'2026-10-15');
  app.run("setPeople('2026-10-16',['pold01']);");assert.equal(app.read("socialLast('pold01')"),'2026-10-16');
  app.run("setPeople('2026-10-16',[]);");assert.equal(app.read("socialLast('pold01')"),'2026-10-15');
});
