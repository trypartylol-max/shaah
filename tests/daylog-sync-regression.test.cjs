const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');
function app(){
  const a=loadApp();
  a.run("USER={id:'regression-user'};renderDayChange=()=>{};_state[todayKey()]={checks:{},social:blankSocial(),people:[],note:'',_daylog:[]}");
  return a;
}
test('level completion and clearing reconcile links without touching manual events',()=>{
  const a=app();
  a.run("dayLogAdd('Manual',dayLogNowISO(),dayLogNowISO());toggleLevelAll(2,todayKey())");
  assert.equal(a.read("dayLogEvents(todayKey()).filter(e=>e.sourceId==='meditation').length"),1);
  assert.equal(a.read("dayLogFindLinked('habit','meditation').meta.completed"),true);
  a.run('toggleLevelAll(2,todayKey())');
  assert.deepEqual(a.read('dayLogEvents(todayKey()).map(e=>e.title)'),['Manual']);
});
test('reset deletes every day field, including manual and ended-early records',()=>{
  const a=app();
  a.run("dayLogAdd('Manual',dayLogNowISO(),dayLogNowISO());dayLogAdd('Ended early',dayLogNowISO(),dayLogNowISO(),'routine',null,{meta:{endedEarly:true}});dayLogAdd('Stale',dayLogNowISO(),dayLogNowISO(),'habit','removed-habit');setHabitState('meditation',todayKey(),true);resetDay(todayKey())");
  assert.deepEqual(a.read('dayLogEvents(todayKey())'),[]);
  assert.deepEqual(a.read('getChecked(todayKey())'),{});
});
test('fractional milestones retain one event, preserve its times and update completion metadata',()=>{
  const a=app();
  a.run("setHabitState('work',todayKey(),0.4);window.saved=JSON.stringify(dayLogEvents(todayKey()).map(e=>[e.id,e.start,e.end]));setHabitState('work',todayKey(),0.8)");
  assert.equal(a.read('dayLogEvents(todayKey()).length'),1);
  assert.equal(a.read('JSON.stringify(dayLogEvents(todayKey()).map(e=>[e.id,e.start,e.end]))'),a.read('window.saved'));
  assert.equal(a.read("dayLogFindLinked('habit','work').meta.light"),true);
  a.run("setHabitState('work',todayKey(),true)");
  assert.deepEqual(a.read("dayLogFindLinked('habit','work').meta"),{light:false,completed:true});
  a.run("setHabitState('work',todayKey(),false)");
  assert.equal(a.read('dayLogEvents(todayKey()).length'),0);
});
test('historical completion never creates events with invented times or changes Today',()=>{
  const a=app();a.run("window.before=JSON.stringify(_state[todayKey()]);_state['2026-10-15']={checks:{},social:blankSocial(),people:[],note:'',_daylog:[]};setHabitState('meditation','2026-10-15',true);toggleLevelAll(1,'2026-10-15')");
  assert.deepEqual(a.read("dayLogEvents('2026-10-15')"),[]);
  assert.equal(a.read('JSON.stringify(_state[todayKey()])'),a.read('window.before'));
});
test('historical linked events preserve times while completion changes and manual records survive clearing',()=>{
  const a=app();a.run("_state['2026-10-15']={checks:{meditation:true},social:blankSocial(),people:[],note:'',_daylog:[{id:'old',type:'habit',sourceId:'meditation',title:'Old title',start:'2026-10-15T09:00:00Z',end:'2026-10-15T10:00:00Z'},{id:'manual',type:'manual',title:'Manual',start:'2026-10-15T08:00:00Z',end:'2026-10-15T09:00:00Z'}]};setHabitState('meditation','2026-10-15',0.5)");
  const e=a.read("dayLogEvents('2026-10-15')[0]");assert.equal(e.start,'2026-10-15T09:00:00Z');assert.equal(e.end,'2026-10-15T10:00:00Z');assert.equal(e.title,'Old title');assert.equal(e.meta.light,true);
  a.run("setHabitState('meditation','2026-10-15',false)");assert.deepEqual(a.read("dayLogEvents('2026-10-15').map(e=>e.id)"),['manual']);
});
test('Social creates one Combo event; further encounters do not duplicate it or change its time',()=>{
  const a=app();a.run("socialRecord('pold03',todayKey());window.saved=JSON.stringify(dayLogEvents(todayKey()));socialRecord('pold01',todayKey())");
  assert.equal(a.read('dayLogEvents(todayKey()).length'),1);
  assert.equal(a.read('JSON.stringify(dayLogEvents(todayKey()))'),a.read('window.saved'));
  a.run("socialCategoryToggle('flirt',todayKey());socialCategoryToggle('friends',todayKey())");
  assert.equal(a.read('dayLogEvents(todayKey()).length'),0);
});
test('legacy Social controls and historical Social use the same timestamp policy',()=>{
  const a=app();a.run("toggleSub('friends',todayKey())");assert.equal(a.read('dayLogEvents(todayKey()).length'),1);
  a.run("toggleSub('friends',todayKey());togglePerson('pold01',todayKey())");assert.equal(a.read('dayLogEvents(todayKey()).length'),1);
  a.run("_state['2026-10-15']={checks:{},social:blankSocial(),people:[],note:'',_daylog:[]};socialRecord('pold03','2026-10-15')");
  assert.deepEqual(a.read("dayLogEvents('2026-10-15')"),[]);
});
test('deleting a linked event keeps earned credit and does not recreate the event on render',()=>{
  const a=app();a.run("setHabitState('meditation',todayKey(),true);window.score=calcScore(todayKey()).score;dayLogDelete(dayLogEvents(todayKey())[0].id);renderToday(todayKey())");
  assert.equal(a.read('calcScore(todayKey()).score'),a.read('window.score'));
  assert.equal(a.read('getChecked(todayKey()).meditation'),true);
  assert.deepEqual(a.read('dayLogEvents(todayKey())'),[]);
});
test('bulk Sleep completion does not invent Wake/Sleep timestamps',()=>{
  const a=app();a.run("CFG.h.sleep={l:'Sleep',p:5,pWork:5,pVacation:5,lv:1,on:true};CFG.order.push('sleep');for(const e of CFG.log){e.h.sleep={...CFG.h.sleep};e.order.push('sleep')}_dayCfgCache={};applyCfg();toggleLevelAll(1,todayKey())");
  assert.equal(a.read('getChecked(todayKey()).sleep'),true);
  assert.equal(a.read("dayLogEvents(todayKey()).filter(e=>e.sourceId==='sleep').length"),0);
});
