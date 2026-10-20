const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, fixture } = require('./helpers.cjs');

function privacyApp(signOutResult = async () => ({ error: null })) {
  const calls = [];
  const app = loadApp(fixture(), { client: { auth: { onAuthStateChange() {}, async signOut(options) {
    calls.push(JSON.parse(JSON.stringify(options))); return signOutResult();
  } }, from() { throw new Error('No server data request is allowed in local privacy tests'); } } });
  app.run(`USER={id:'A'};globalThis.reloads=0;globalThis.notices={};
    globalThis.location={reload(){reloads++}};
    globalThis.sessionStorage={getItem:key=>notices[key]||null,setItem:(key,value)=>notices[key]=value,removeItem:key=>delete notices[key]};`);
  for (const [key,value] of Object.entries({ shaah_cache_A:{synthetic:'cached day'}, shaah_cfg_A:{synthetic:'config'}, shaah_bak_A:[{synthetic:'local backup'}], 'dayLogV2:A':{'2026-10-15':[]}, shaah_cache_B:{synthetic:'other account'}, dayLogV2:{'2026-10-15':[{synthetic:'unlinked recovery'}]}, 'shaah:skin:v1':'matrix' })) app.values.set(key,JSON.stringify(value));
  return { ...app, calls };
}

test('explicit removal clears only the signed-out account copies, preserving other accounts, recovery and skin', async () => {
  const app=privacyApp();
  assert.equal(await app.run('signOut(true)'),true);
  assert.deepEqual(app.calls,[{scope:'local'}]);
  for(const key of ['shaah_cache_A','shaah_cfg_A','shaah_bak_A','dayLogV2:A'])assert.equal(app.values.has(key),false,key);
  for(const key of ['shaah_cache_B','dayLogV2','shaah:skin:v1'])assert.equal(app.values.has(key),true,key);
  assert.equal(app.read('reloads'),1);assert.equal(app.read('notices[SIGNOUT_NOTICE_KEY]'),'cleared');
});

test('ordinary sign out keeps recovery copies and uses only the current session scope', async () => {
  const app=privacyApp();const before=new Map(app.values);
  assert.equal(await app.run('signOut()'),true);
  assert.deepEqual(app.values,before);assert.deepEqual(app.calls,[{scope:'local'}]);
  assert.equal(app.read('notices[SIGNOUT_NOTICE_KEY]'),'kept');
});
test('logout notices accept only their explicit fixed message codes',()=>{
  const app=privacyApp();
  for(const code of ['__proto__','constructor','toString','unrecognized'])assert.equal(app.run(`signOutNoticeFor(${JSON.stringify(code)})`),'');
  assert.match(app.run("signOutNoticeFor('cleared')"),/were removed/);
});

for(const [label,key,value] of [
  ['offline day writes','shaah-offline-day-writes:A',JSON.stringify({'2026-10-16':{delete:false,data:{_note:'Synthetic unsynced draft'}}})],
  ['settings draft','shaah_cfg_pending_A',JSON.stringify({base:{},draft:{synthetic:'pending edit'}})],
  ['active routine','shaah_routine_A',JSON.stringify({rid:'synthetic-active-routine'})],
  ['malformed recovery record','shaah-offline-day-writes:A','incomplete JSON']
])test(`removal is blocked before Auth for ${label}`,async()=>{
  const app=privacyApp();app.values.set(key,value);const before=new Map(app.values);
  assert.equal(await app.run('signOut(true)'),false);assert.equal(app.calls.length,0);
  assert.deepEqual(app.values,before);assert.equal(app.read('reloads'),0);assert.match(app.read('_signOutStatus'),/Sync your pending changes/);
});

test('an in-memory pending edit blocks removal even before it reaches storage',async()=>{
  const app=privacyApp();app.run('_cfgDraft={synthetic:"unsaved"}');
  assert.equal(await app.run('signOut(true)'),false);assert.equal(app.calls.length,0);assert.equal(app.values.has('shaah_cache_A'),true);
});

test('a live routine blocks removal even when browser storage could not retain its copy',async()=>{
  const app=privacyApp();app.run('sessions={synthetic:{q:[0],done:{},secs:60,running:true}}');
  assert.equal(app.values.has('shaah_routine_A'),false);
  assert.equal(await app.run('signOut(true)'),false);assert.equal(app.calls.length,0);
  assert.equal(app.values.has('shaah_cache_A'),true);
  assert.match(app.read('_signOutStatus'),/Sync your pending changes/);
});

test('cancelling removal leaves the session and all saved copies intact',async()=>{
  const app=privacyApp();app.run('confirm=()=>false');const before=new Map(app.values);
  assert.equal(await app.run('signOut(true)'),false);assert.deepEqual(app.values,before);assert.equal(app.calls.length,0);
});

test('a failed sign-out does not erase local copies or falsely report success',async()=>{
  const app=privacyApp(async()=>({error:{message:'Synthetic network failure'}}));const before=new Map(app.values);
  assert.equal(await app.run('signOut(true)'),false);assert.deepEqual(app.values,before);
  assert.equal(app.read('USER.id'),'A');assert.equal(app.read('reloads'),0);assert.match(app.read('_signOutStatus'),/Could not sign out/);
});

test('a late A sign-out acknowledgement cannot clear or reload the newer B session',async()=>{
  let finish;const app=privacyApp(()=>new Promise(resolve=>finish=resolve));
  const task=app.run('signOut(true)');app.run("changeSyncUser({id:'B'})");finish({error:null});await task;
  assert.equal(app.read('USER.id'),'B');assert.equal(app.read('reloads'),0);
  assert.equal(app.values.has('shaah_cache_A'),true);assert.equal(app.values.has('shaah_cache_B'),true);
});

test('edits arriving while sign-out waits are retained instead of being cleared',async()=>{
  let finish;const app=privacyApp(()=>new Promise(resolve=>finish=resolve));const task=app.run('signOut(true)');
  app.values.set('shaah_cfg_pending_A',JSON.stringify({base:{},draft:{synthetic:'new edit'}}));finish({error:null});await task;
  assert.equal(app.values.has('shaah_cache_A'),true);assert.equal(app.values.has('shaah_cfg_pending_A'),true);
  assert.equal(app.read('notices[SIGNOUT_NOTICE_KEY]'),'pending');
});

test('storage removal failure is surfaced without claiming that account copies were cleared',async()=>{
  const app=privacyApp();app.run('localStorage.removeItem=()=>{throw new Error("Synthetic storage denial")}');
  await app.run('signOut(true)');assert.equal(app.values.has('shaah_cache_A'),true);
  assert.equal(app.read('notices[SIGNOUT_NOTICE_KEY]'),'failed');
});

test('new Day Log copies are isolated by account and anonymous writes create no shared copy',()=>{
  const app=privacyApp();const legacy=app.values.get('dayLogV2');
  app.run('dayLogSaveLocal()');assert.equal(app.values.has('dayLogV2:A'),true);assert.equal(app.values.get('dayLogV2'),legacy);
  app.run("USER={id:'B'};_state={};dayLogMigrateLocal()");assert.deepEqual(app.read('_state'),{});
  app.run("USER={id:'A'};dayLogMigrateLocal()");assert.equal(app.read('_state["2026-10-15"]._daylog[0].title'),'Synthetic visit');
  app.run('USER=null');assert.equal(app.run('dayLogSaveLocal()'),false);assert.equal(app.values.get('dayLogV2'),legacy);
});

test('unowned legacy Day Log data stays available for recovery without being assigned to A or B',()=>{
  const app=privacyApp();app.values.set('dayLogV1',JSON.stringify({'2026-01-01':[{title:'Synthetic legacy activity'}]}));
  const oldV1=app.values.get('dayLogV1'),oldV2=app.values.get('dayLogV2');app.values.delete('dayLogV2:A');
  for(const owner of ['A','B']){app.run(`USER={id:'${owner}'};_state={};dayLogMigrateLocal()`);assert.deepEqual(app.read('_state'),{});}
  assert.equal(app.values.get('dayLogV1'),oldV1);assert.equal(app.values.get('dayLogV2'),oldV2);
  assert.deepEqual(app.read('Object.keys(unownedDayLogCopies()).sort()'),['dayLogV1','dayLogV2']);
});

test('a scoped Day Log cache cannot resurrect an explicitly empty saved activity list',()=>{
  const app=privacyApp();app.values.set('dayLogV2:A',JSON.stringify({'2026-10-15':[{title:'Synthetic stale copy'}]}));
  app.run('_state={"2026-10-15":{_daylog:[]}};dayLogMigrateLocal()');assert.deepEqual(app.read('_state["2026-10-15"]._daylog'),[]);
});
