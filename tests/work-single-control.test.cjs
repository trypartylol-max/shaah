const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');
function app(){const a=loadApp();a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','synthetic-A').config;_dayCfgCache={};applyCfg()");return a;}
test('one Work control cycles 400/650/800 with cumulative 10/20/25 then resets to zero on the fourth tap',()=>{
 const a=app(),history=a.read("_state['2026-10-15']");
 for(const [phase,points,label] of [[0,0,'Completar ₪400'],[1,10,'Completar ₪650'],[2,20,'Completar ₪800+'],[3,25,'Reiniciar avance'],[4,0,'Completar ₪400'],[5,10,'Completar ₪650']]){
  if(phase)a.run("workPhaseAdvance('2026-10-16')");
  assert.equal(a.read("calcScore('2026-10-16').l1"),points);
  const html=a.run("workPhaseCard('2026-10-16',cfgForDate('2026-10-16').L1.find(i=>i.id==='work'))");
  assert.equal((html.match(/<button /g)||[]).length,1);assert.ok(html.includes(label));
 }
 assert.deepEqual(a.read("_state['2026-10-15']"),history);
});
test('legacy partial Work remains until explicit advance; Vacation cannot advance',()=>{
 const a=app();a.run("setHabitState('work','2026-10-16',.5)");
 assert.equal(a.read("getChecked('2026-10-16').work"),.5);
 assert.ok(a.run("workPhaseCard('2026-10-16',cfgForDate('2026-10-16').L1[0])").includes('Avance previo conservado'));
 a.run("workPhaseAdvance('2026-10-16')");assert.equal(a.read("calcScore('2026-10-16').l1"),20);
 a.run("CFG.travel.mode='vacation';persistTravelMode('vacation');_dayCfgCache={};workPhaseAdvance('2026-10-16')");
 assert.equal(a.read("getChecked('2026-10-16').work"),.8);
});
test('custom Work milestones apply from tomorrow, preserve past scores and retain the four-tap cycle',()=>{
 const a=app();a.run("setHabitState('work','2026-10-15',.4)");
 const history=a.read("calcScore('2026-10-15')"),days=a.read('_state');
 a.run("workMilestonesApply([{amount:500,points:7},{amount:900,points:8},{amount:1200,points:15}])");
 assert.deepEqual(a.read("calcScore('2026-10-15')"),history);assert.deepEqual(a.read('_state'),days);
 assert.equal(a.read("cfgForDate('2026-10-17').L1.find(i=>i.id==='work').pts"),30);
 for(const points of [7,15,30,0]){a.run("workPhaseAdvance('2026-10-17')");assert.equal(a.read("calcScore('2026-10-17').l1"),points);}
 assert.ok(a.run("workMilestonesFor('2026-10-17').at(-1)[0]").includes('₪1200+'));
 const other=app();assert.equal(other.read("workMilestonesFor('2026-10-16')[2][1]"),25);
 a.run("CFG.travel.mode='vacation';persistTravelMode('vacation');workPhaseAdvance('2026-10-17')");assert.equal(a.read("getChecked('2026-10-16').work||false"),false);
});
test('weekly cash uses Sunday–Saturday, one highest milestone per day and dated amounts',()=>{
 const a=app();a.run("_state={};setHabitState('work','2026-10-10',true);setHabitState('work','2026-10-11',true);setHabitState('work','2026-10-12',.4);setHabitState('work','2026-10-15',.8);setHabitState('work','2026-10-17',true)");
 assert.equal(a.read("workWeeklyCash('2026-10-16').from"),'2026-10-11');
 assert.equal(a.read("workWeeklyCash('2026-10-16').to"),'2026-10-17');
 assert.equal(a.read("workWeeklyCash('2026-10-16').total"),1850);
 a.run("workMilestonesApply([{amount:500,points:7},{amount:900,points:8},{amount:1200,points:15}]);workPhaseAdvance('2026-10-16')");
 assert.equal(a.read("workWeeklyCash('2026-10-16').total"),2250);
 a.run("CFG.travel.mode='vacation';persistTravelMode('vacation')");assert.equal(a.read("workWeeklyCash('2026-10-16').total"),1850);
 assert.equal(app().read("workWeeklyCash('2026-10-16').total"),800);
});
