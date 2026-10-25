const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');
function app(){const a=loadApp();a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','synthetic-A').config;_dayCfgCache={};applyCfg()");return a;}
test('one Work control cycles 400/650/800 with cumulative 10/20/25 then undo of the last level only',()=>{
 const a=app(),history=a.read("_state['2026-10-15']");
 for(const [phase,points,label] of [[0,0,'Completar ₪400'],[1,10,'Completar ₪650'],[2,20,'Completar ₪800+'],[3,25,'Deshacer último nivel'],[4,20,'Completar ₪800+']]){
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
