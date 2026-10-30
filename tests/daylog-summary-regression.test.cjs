const {test}=require('node:test');const assert=require('node:assert/strict');const {loadApp}=require('./helpers.cjs');
test('duration uses elapsed timestamps across midnight and timezone offsets',()=>{
 const a=loadApp();
 assert.equal(a.run("dayLogDuration({type:'manual',start:'2026-10-15T23:00:00Z',end:'2026-10-16T01:00:00Z'})"),120);
 assert.equal(a.run("dayLogDuration({type:'manual',start:'2026-10-25T01:30:00+02:00',end:'2026-10-25T02:30:00+01:00'})"),120);
});
test('open Today activity counts until now without inventing an end in stored data',()=>{
 const a=loadApp();a.run("window.event={id:'open',type:'manual',start:'2026-10-16T10:30:00Z',end:null};window.before=JSON.stringify(window.event)");
 assert.equal(a.run('dayLogDuration(window.event)'),90);assert.equal(a.run('dayLogIsRunning(window.event)'),true);assert.equal(a.run('JSON.stringify(window.event)'),a.read('window.before'));
});
test('old missing ends, future starts and invalid/reversed ranges have unknown duration',()=>{
 const a=loadApp();for(const e of [{start:'2026-10-15T10:00:00Z',end:null},{start:'2026-10-16T13:00:00Z',end:null},{start:'invalid',end:null},{start:'2026-10-16T10:00:00Z',end:'2026-10-16T09:00:00Z'}])assert.equal(a.run(`dayLogDuration(${JSON.stringify(e)})`),null);
});
test('activity totals preserve concurrent activities while Wake/Sleep stay point events',()=>{
 const a=loadApp();a.run("_state[todayKey()]={checks:{},social:blankSocial(),people:[],note:'',_daylog:[{id:'work',type:'manual',start:'2026-10-16T10:00:00Z',end:'2026-10-16T11:00:00Z'},{id:'call',type:'manual',start:'2026-10-16T10:30:00Z',end:'2026-10-16T11:30:00Z'},{id:'wake',type:'habit',sourceId:'sleep',start:'2026-10-16T07:00:00Z',end:null,meta:{sleepRole:'wake'}}]};window.before=JSON.stringify(_state)");
 assert.equal(a.run('dayLogSummary(todayKey()).tracked'),120);assert.equal(a.run('JSON.stringify(_state)'),a.read('window.before'));
});
test('a running activity covers its simultaneous call without creating a false internal gap',()=>{
 const a=loadApp();a.run("_state[todayKey()]={checks:{},social:blankSocial(),people:[],note:'',_daylog:[{id:'work',type:'manual',start:'2026-10-16T10:00:00Z',end:null},{id:'call',type:'manual',start:'2026-10-16T10:30:00Z',end:'2026-10-16T11:00:00Z'}]}");
 assert.equal(a.run('dayLogSummary(todayKey()).tracked'),150);assert.deepEqual(a.read('dayLogGapEvents(todayKey())'),[]);
});
test('reading a summary for a missing day never creates a day record',()=>{
 const a=loadApp();const before=a.read('_state');assert.equal(a.run("dayLogSummary('2025-01-01').events"),0);assert.deepEqual(a.read('_state'),before);
});
test('live refresh never updates the previous account panel during an account transition',()=>{
 const a=loadApp();const before=a.read('_state');a.run("USER={id:'B'};_cfgReady=true;document.visibilityState='visible';document.querySelector=()=>({getAttribute:()=> 'A'});document.querySelectorAll=()=>{throw Error('stale account panel accessed')};dayLogRenderRecap=()=>{throw Error('stale account recap updated')};dayLogRefreshLive()");assert.deepEqual(a.read('_state'),before);
});
