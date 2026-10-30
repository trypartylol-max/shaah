const {test}=require('node:test');const assert=require('node:assert/strict');const {loadApp}=require('./helpers.cjs');
function app(){const a=loadApp();a.run("USER={id:'regression-user'};renderDayChange=()=>{};CFG.h.sleep={l:'Wake Up and Sleep Early',p:8,pWork:8,pVacation:8,lv:2,on:true};CFG.order.push('sleep');for(const e of CFG.log){e.h.sleep={...CFG.h.sleep};e.order.push('sleep')}_dayCfgCache={};applyCfg();_state[todayKey()]={checks:{},social:blankSocial(),people:[],note:'',_daylog:[]};window.saves=[];dayLogPersist=key=>window.saves.push(key)");return a;}
test('Wake half, complementary Sleep full, then clear: one shared score and two point events',()=>{
 const a=app();a.run("toggleHabit('sleep',todayKey())");assert.equal(a.read('calcScore(todayKey()).score'),4);assert.deepEqual(a.read('dayLogEvents(todayKey()).map(e=>e.meta.sleepRole)'),['wake']);
 assert.equal(a.read('dayLogActiveId()'),null);a.run("toggleHabit('sleep',todayKey())");assert.equal(a.read('calcScore(todayKey()).score'),8);assert.deepEqual(a.read('dayLogEvents(todayKey()).map(e=>e.meta.sleepRole)'),['wake','sleep']);assert.equal(a.read('dayLogSummary(todayKey()).tracked'),0);
 a.run("toggleHabit('sleep',todayKey())");assert.equal(a.read('calcScore(todayKey()).score'),0);assert.deepEqual(a.read('dayLogEvents(todayKey())'),[]);
});
test('legacy root roles retain their meaning even when chronological order is opposite',()=>{
 const a=app();a.run("dayLogEvents(todayKey()).push({id:'w',title:'Wake',type:'habit',sourceId:'sleep',start:'2026-10-16T23:00:00Z',end:null,sleepRole:'wake'},{id:'s',title:'Sleep',type:'habit',sourceId:'sleep',start:'2026-10-16T07:00:00Z',end:null,sleepRole:'sleep'});dayLogNormalizeSleepWake(todayKey())");
 assert.deepEqual(a.read('dayLogEvents(todayKey()).map(e=>[e.id,e.meta.sleepRole,e.start])'),[['w','wake','2026-10-16T23:00:00Z'],['s','sleep','2026-10-16T07:00:00Z']]);
 assert.equal(a.run('dayLogNormalizeSleepWake(todayKey())'),false);assert.equal(a.read('window.saves.length'),1);
});
test('legacy range uses its recorded endpoints, preserves original range and scoring, and normalizes once',()=>{
 const a=app();a.run("getChecked(todayKey()).sleep=true;dayLogEvents(todayKey()).push({id:'old',title:'Legacy',type:'habit',sourceId:'sleep',start:'2026-10-16T07:00:00Z',end:'2026-10-16T23:00:00Z',meta:{custom:'preserved'}});window.score=calcScore(todayKey());window.other=JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())));dayLogNormalizeSleepWake(todayKey())");
 const events=a.read('dayLogEvents(todayKey())');assert.equal(events.length,2);assert.equal(events[0].id,'old');assert.equal(events[0].meta.custom,'preserved');assert.deepEqual(events[0].meta.legacyRange,{start:'2026-10-16T07:00:00Z',end:'2026-10-16T23:00:00Z'});assert.equal(events[1].start,'2026-10-16T23:00:00Z');assert.equal(events[1].meta.sleepRole,'sleep');assert.ok(events.every(e=>e.end===null));
 assert.deepEqual(a.read('calcScore(todayKey())'),a.read('window.score'));assert.equal(a.run('dayLogNormalizeSleepWake(todayKey())'),false);assert.equal(a.read('window.saves.length'),1);
 assert.equal(a.read('JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())))'),a.read('window.other'));
});
test('a single untagged zero-duration completion does not invent a second action or its meaning',()=>{
 const a=app();a.run("dayLogEvents(todayKey()).push({id:'point',title:'Old point',type:'habit',sourceId:'sleep',start:'2026-10-16T07:00:00Z',end:'2026-10-16T07:00:00Z'})");const before=a.read('_state');assert.equal(a.run('dayLogNormalizeSleepWake(todayKey())'),false);assert.deepEqual(a.read('_state'),before);assert.equal(a.run('dayLogSleepRole(dayLogEvents(todayKey())[0])'),null);
});
test('additional legacy records are never silently removed and malformed ranges are untouched',()=>{
 const a=app();a.run("for(let i=0;i<3;i++)dayLogEvents(todayKey()).push({id:'old'+i,title:'Old',type:'habit',sourceId:'sleep',start:'2026-10-16T0'+(i+6)+':00:00Z',end:null});dayLogNormalizeSleepWake(todayKey())");assert.deepEqual(a.read('dayLogEvents(todayKey()).map(e=>e.id)'),['old0','old1','old2']);
 for(const end of ['invalid','2026-10-16T01:00:00Z']){const b=app();b.run(`dayLogEvents(todayKey()).push({id:'bad',type:'habit',sourceId:'sleep',title:'Old',start:'2026-10-16T07:00:00Z',end:${JSON.stringify(end)}})`);const before=b.read('_state');assert.equal(b.run('dayLogNormalizeSleepWake(todayKey())'),false);assert.deepEqual(b.read('_state'),before);assert.deepEqual(b.read('window.saves'),[]);}
});
test('returning to half removes only Sleep, retaining the actual Wake timestamp',()=>{
 const a=app();a.run("toggleHabit('sleep',todayKey());toggleHabit('sleep',todayKey());window.wake=JSON.stringify(dayLogEvents(todayKey())[0]);setHabitState('sleep',todayKey(),0.5)");assert.equal(a.read('dayLogEvents(todayKey()).length'),1);assert.equal(a.read('JSON.stringify(dayLogEvents(todayKey())[0])'),a.read('window.wake'));assert.equal(a.read('calcScore(todayKey()).score'),4);
});
test('full credit without recorded Wake cannot reconstruct two events at the current time',()=>{
 const a=app();a.run("setHabitState('sleep',todayKey(),true)");assert.equal(a.read('calcScore(todayKey()).score'),8);assert.deepEqual(a.read('dayLogEvents(todayKey())'),[]);
});
test('unclassified extra legacy point is displayed and edited without inventing a Wake/Sleep role',()=>{
 const a=app();a.run("for(let i=0;i<3;i++)dayLogEvents(todayKey()).push({id:'old'+i,title:'Old',type:'habit',sourceId:'sleep',start:'2026-10-16T0'+(i+6)+':00:00Z',end:null});window.__dayLogSelectedId='old1';window.__dayLogPanelMode='edit'");
 assert.ok(a.run('renderDayLogTab()').includes('RECORDED TIME'));
 a.run("document.getElementById=id=>({value:id==='logPanelStart'?'07:30':''});dayLogPanelSave(todayKey())");
 assert.equal(a.run("dayLogSleepRole(dayLogEvents(todayKey()).find(e=>e.id==='old1'))"),null);
 assert.equal(a.read('dayLogEvents(todayKey()).length'),3);
});
test('historical half-credit recognizes legacy root Sleep roles without changing recorded Wake time or Today',()=>{
 const a=app();a.run("window.today=JSON.stringify(_state[todayKey()]);_state['2026-10-15']={checks:{sleep:true},social:blankSocial(),people:[],note:'',_daylog:[{id:'w',title:'Old Wake',type:'habit',sourceId:'sleep',sleepRole:'wake',start:'2026-10-15T07:00:00Z',end:null},{id:'s',title:'Old Sleep',type:'habit',sourceId:'sleep',sleepRole:'sleep',start:'2026-10-15T23:00:00Z',end:null}]};setHabitState('sleep','2026-10-15',0.5)");
 assert.deepEqual(a.read("dayLogEvents('2026-10-15').map(e=>[e.id,e.start])"),[['w','2026-10-15T07:00:00Z']]);
 assert.equal(a.read('JSON.stringify(_state[todayKey()])'),a.read('window.today'));
});
