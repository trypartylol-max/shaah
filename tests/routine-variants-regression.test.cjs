const {test}=require('node:test');const assert=require('node:assert/strict');const{loadApp}=require('./helpers.cjs');
// Production in three versions: Sketch (base), Mínimo and Finish. Any version marks Production done.
function app(){const a=loadApp();a.run(`USER={id:'variants-user'};unlockAudio=()=>{};audioKeepAlive=()=>{};chime=()=>{};haptic=()=>{};CFG.h.production={...LEGACY_CFG.h.production,pWork:15,pVacation:15};CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));delete CFG.prodV;_dayCfgCache={};applyCfg()`);return a;}
test('productionVariantsOnce turns Production into Sketch and adds Mínimo and Finish once',()=>{
  const a=app();
  assert.equal(a.read('productionVariantsOnce()'),true);
  assert.equal(a.read('CFG.prodV'),1);
  assert.equal(a.read('routineMinutes(ROUTINES.production)'),72);
  assert.equal(a.read('routineMinutes(ROUTINES.production_min)'),20);
  assert.equal(a.read('routineMinutes(ROUTINES.production_finish)'),115);
  assert.deepEqual(a.read('routineFamily("production")'),['production','production_min','production_finish']);
  assert.equal(a.read('ROUTINES.production.short'),'Sketch');
  a.run('ROUTINES.production_min.steps[0].dur=9;CFG.routines.production_min.steps[0].dur=9');
  assert.equal(a.read('productionVariantsOnce()'),false);
  assert.equal(a.read('CFG.routines.production_min.steps[0].dur'),9);
});
test('finishing the Mínimo version marks Production done and logs it under Production',()=>{
  const a=app();a.run('productionVariantsOnce();startRoutine("production_min")');
  assert.equal(a.read('routineHabit("production_min")'),'production');
  a.run('for(let i=0;i<3;i++)advanceSession("production_min")');
  assert.equal(a.read('getChecked(todayKey()).production'),true);
  assert.equal(a.read('!!sessions.production_min'),false);
  const log=a.read('dayLogFindLinked("routine","production")');
  assert.ok(log);assert.equal(log.label||log.title||log.name,'Production · Mínimo');
});
test('Today DONE on Production closes a running Finish session',()=>{
  const a=app();a.run('productionVariantsOnce();startRoutine("production_finish");exitRoutine();setHabitState("production",todayKey(),true)');
  assert.equal(a.read('!!sessions.production_finish'),false);
  assert.equal(a.read('getChecked(todayKey()).production'),true);
});
test('stored config with routine versions passes import validation',()=>{
  const a=app();a.run('productionVariantsOnce()');
  assert.doesNotThrow(()=>a.run('importPrepare({config:JSON.parse(JSON.stringify(CFG))})'));
  assert.throws(()=>a.run('const c=JSON.parse(JSON.stringify(CFG));c.routines.production_min.of=7;importPrepare({config:c})'));
});
