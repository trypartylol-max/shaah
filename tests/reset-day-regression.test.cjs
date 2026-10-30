const {test}=require('node:test');const assert=require('node:assert/strict');const {loadApp}=require('./helpers.cjs');
function app(){const a=loadApp();a.run("USER={id:'regression-user'};renderDayChange=()=>{};window.others=JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())));window.config=JSON.stringify(CFG);_state[todayKey()]={checks:{meditation:true},social:{friends:true},people:['pold01'],note:'Synthetic note',_daylog:[{id:'manual',title:'Synthetic',type:'manual',start:dayLogNowISO(),end:null}]};dayLogSaveLocal()");return a;}
test('full reset clears day data and owned cache, queues deletion and preserves other days/config',()=>{
 const a=app();a.run('resetDay(todayKey());dayLogMigrateLocal()');
 assert.deepEqual(a.read('_state[todayKey()]'),{checks:{},social:{flirt:false,strangers:false,friends:false},people:[],note:'',_daylog:[]});
 assert.equal(a.read('_offlineQueue[todayKey()].delete'),true);
 assert.equal(a.read('JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())))'),a.read('window.others'));
 assert.equal(a.read('JSON.stringify(CFG)'),a.read('window.config'));
 assert.equal(a.read('dayLogActiveId()'),null);
 assert.equal(JSON.parse(a.values.get('dayLogV2:regression-user'))['2026-10-16'],undefined);
});
test('opening confirmation does not delete; stale or foreign confirmations cannot reset a day',()=>{
 for(const invalidation of ["USER={id:'another-user'}","_syncEpoch++","resetDayRequest=null"]){
  const a=app();const before=a.read('_state');a.run('requestResetDay(todayKey())');assert.deepEqual(a.read('_state'),before);
  a.run(invalidation+';confirmResetDay(todayKey())');assert.deepEqual(a.read('_state'),before);
 }
});
test('confirmation is one-use and stops running/paused sessions without producing a final event',()=>{
 const a=app();a.run("sessions={synthetic:{q:[0],done:{},secs:60,running:true},paused:{q:[0],done:{},secs:20,running:false}};window.__dayLogActive='manual';window.__dayLogSelectedId='manual';requestResetDay(todayKey());confirmResetDay(todayKey())");
 assert.deepEqual(a.read('sessions'),{});assert.equal(a.read('window.__dayLogActive'),null);assert.equal(a.read('window.__dayLogSelectedId'),null);
 assert.deepEqual(a.read('dayLogEvents(todayKey())'),[]);
 a.run("setNote(todayKey(),'New note after reset');confirmResetDay(todayKey())");assert.equal(a.read('getNote(todayKey())'),'New note after reset');
});
