const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');
function app(){const a=loadApp();a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','synthetic').config;_dayCfgCache={};applyCfg()");return a;}
for(const count of [0,2,3,4,8])test(`${count} milestones: tomorrow, dynamic scores, N+1 reset, reload, unchanged history`,()=>{
 const a=app();a.run("setHabitState('work','2026-10-16',.8)");
 const days=a.read('_state'),today=a.read("calcScore('2026-10-16')"),past=a.read("calcScore('2026-10-15')"),log=a.read('CFG.log');
 const steps=Array.from({length:count},(_,i)=>({amount:(i+1)*100,points:i+1}));
 a.run(`workMilestonesApply(${JSON.stringify(steps)})`);
 assert.deepEqual(a.read('_state'),days);assert.deepEqual(a.read('CFG.log'),log);
 assert.deepEqual(a.read("calcScore('2026-10-16')"),today);assert.deepEqual(a.read("calcScore('2026-10-15')"),past);
 assert.equal(a.read("workMilestonesFor('2026-10-16').length"),3);
 assert.equal(a.read("workMilestonesFor('2026-10-17').length"),count);
 assert.equal(a.read("cfgForDate('2026-10-17').L1.find(i=>i.id==='work').pts"),count*(count+1)/2);
 for(let i=1;i<=count+1;i++){
  a.run("workPhaseAdvance('2026-10-17')");
  assert.equal(a.read("calcScore('2026-10-17').l1"),i<=count?i*(i+1)/2:0);
 }
 const html=a.run("workPhaseCard('2026-10-17',cfgForDate('2026-10-17').L1.find(i=>i.id==='work'))");
 assert.ok(html.includes(`${count} hitos`));assert.ok(!html.includes('undefined'));
 assert.equal((html.match(/wg-segment/g)||[]).length,count);
 if(!count)assert.ok(html.includes('disabled'));
 const b=loadApp({config:a.read('CFG'),days:a.read('_state')});
 assert.equal(b.read("workMilestonesFor('2026-10-17').length"),count);
 assert.deepEqual(b.read("calcScore('2026-10-16')"),today);
});
test('repeat save replaces tomorrow only; vacation and invalid phase do not change checks',()=>{
 const a=app();a.run("workMilestonesApply([]);workMilestonesApply([{amount:200,points:12},{amount:400,points:18}])");
 assert.equal(a.read('CFG.workMilestones.length'),1);
 const state=a.read('_state');a.run("workPhaseSet('2026-10-17',3);workPhaseSet('2026-10-17',-1)");assert.deepEqual(a.read('_state'),state);
 a.run("CFG.travel.mode='vacation';persistTravelMode('vacation');workPhaseAdvance('2026-10-16')");assert.deepEqual(a.read('_state'),state);
});
