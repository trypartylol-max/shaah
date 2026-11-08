const {test}=require('node:test');const assert=require('node:assert/strict');const {loadApp,fixture}=require('./helpers.cjs');
function app(){const a=loadApp();a.run("document.querySelector=()=>null;window.localStorage=localStorage;set(AUTH_STORAGE_KEY,{user:{id:'A'},access_token:'synthetic',refresh_token:'synthetic'});set('shaah_cfg_A',CFG);set('shaah_cache_A',_state)");return a;}
test('offline startup uses only the saved session owner and its configuration and days',()=>{
 const a=app();a.run("set('shaah_cfg_B',{h:{wrong:{}},order:['wrong']});set('shaah_cache_B',{wrong:{note:'B'}})");
 assert.equal(a.run('openOfflineAccount()'),true);assert.equal(a.run('USER.id'),'A');assert.equal(a.run('_offlineBoot'),true);assert.equal(a.run('_cfgReady'),true);assert.equal(a.run("Object.hasOwn(_state,'wrong')"),false);assert.equal(a.writes.length,0);
});
test('logged-out, missing-cache and malformed-session startup does not adopt other saved accounts',()=>{
 for(const code of ["del(AUTH_STORAGE_KEY)","del('shaah_cfg_A')","del('shaah_cache_A')","set(AUTH_STORAGE_KEY,{user:{id:'B'},access_token:'x',refresh_token:'x'})"]){const a=app();a.run(code);assert.equal(a.run('openOfflineAccount()'),false);assert.equal(a.run('USER'),null);}
});
test('offline startup restores pending edits and keeps writes local until session verification',async()=>{
 const a=app();a.run("set(_offlineKey+':A',{'2026-10-16':{data:{_note:'pending offline',_checks:{},_daylog:[]}}});openOfflineAccount();navigator.onLine=true");
 assert.equal(a.run("_state['2026-10-16'].note"),'pending offline');await assert.rejects(a.run("sendDayItem('A','2026-10-16',{data:{}})"),/OFFLINE_LOCAL_ONLY/);
 await a.run('flushOfflineQueue()');assert.equal(a.writes.length,0);assert.equal(a.run('Object.keys(_offlineQueue).length'),1);
});
test('reconnecting as B never uploads A local work or installs it into B',async()=>{
 const a=app();a.run("openOfflineAccount();setNote(todayKey(),'A draft');navigator.onLine=true;sb.auth.getSession=async()=>({data:{session:{user:{id:'B'}}}})");
 await a.run('reconnectOfflineAccount()');assert.equal(a.run('USER.id'),'B');assert.equal(a.run('_offlineBoot'),false);assert.deepEqual(a.read('_state'),{});assert.equal(a.writes.length,0);
 assert.ok(a.values.get('shaah-offline-day-writes:A').includes('A draft'));
});
test('reconnection failure preserves the local owner, data and durable queue',async()=>{
 const a=app();a.run("openOfflineAccount();setNote(todayKey(),'offline draft');navigator.onLine=true;sb.auth.getSession=async()=>{throw Error('offline')}");await a.run('reconnectOfflineAccount()');
 assert.equal(a.run('_offlineBoot'),true);assert.equal(a.run('USER.id'),'A');assert.equal(a.run('getNote(todayKey())'),'offline draft');assert.equal(a.writes.length,0);
});
test('a misleading online indicator and failed account read still restore only the saved owner',async()=>{
 const a=app();a.run("changeSyncUser({id:'A'});restoreAccountLocal();navigator.onLine=true;sb.from=()=>{throw Error('network unavailable')}");await a.run('loadAll()');assert.equal(a.run('_offlineBoot'),true);assert.equal(a.run('_cfgReady'),true);assert.equal(a.run('USER.id'),'A');assert.equal(a.writes.length,0);
});
test('stalled auth read has a finite deadline and leaves cached account data intact',async()=>{
 const a=app(),before=a.read('_state');a.run("sb.auth.getSession=()=>new Promise(()=>{})");const task=a.run('localSessionWithDeadline()');[...a.timers.values()].find(t=>t.ms===8000).fn();await assert.rejects(task,/AUTH_TIMEOUT/);assert.deepEqual(a.read('_state'),before);assert.equal(a.writes.length,0);
});
