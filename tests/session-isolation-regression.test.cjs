const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixture}=require('./helpers.cjs');

function appWithRoutine(){
  const data=fixture();
  data.config.routines={work:{label:'Synthetic A routine',icon:'W',steps:[{label:'Synthetic step',dur:1}]}};
  const app=loadApp(data);
  app.run(`USER={id:'synthetic-A'};
    globalThis.intervalCallbacks=new Map();globalThis.cancelledIntervals=[];globalThis.intervalSequence=0;
    setInterval=fn=>{const id=++intervalSequence;intervalCallbacks.set(id,fn);return id;};
    clearInterval=id=>cancelledIntervals.push(id);
    sessions={work:{q:[0],done:{},secs:60,running:true,endAt:Date.now()+60000}};
    routineId='work';routineView=true;syncFromSession();saveRoutine();ensureTick();`);
  return app;
}

test('switching accounts clears routine controls without copying A activity into B storage',()=>{
  const app=appWithRoutine(),savedA=app.values.get('shaah_routine_synthetic-A');
  app.run(`changeSyncUser({id:'synthetic-B'});saveRoutine();`);
  assert.deepEqual(app.read('Object.keys(sessions)'),[]);
  assert.equal(app.read('routineId'),null);assert.equal(app.read('routineView'),false);
  assert.equal(app.read('timerRunning'),false);assert.equal(app.read('timerInterval'),null);
  assert.equal(app.values.has('shaah_routine_synthetic-B'),false);
  assert.equal(app.values.get('shaah_routine_synthetic-A'),savedA);
});

test('forced sign-out stops routine timers and never creates or adopts anonymous routines',()=>{
  const app=appWithRoutine(),savedA=app.values.get('shaah_routine_synthetic-A');
  app.values.set('shaah_routine_anon',savedA);
  app.run('changeSyncUser(null);saveRoutine();restoreRoutine();startRoutine("work");ensureTick();');
  assert.deepEqual(app.read('Object.keys(sessions)'),[]);
  assert.equal(app.read('timerInterval'),null);
  assert.equal(app.values.get('shaah_routine_synthetic-A'),savedA);
  assert.equal(app.values.get('shaah_routine_anon'),savedA,'Unowned recovery is preserved, never adopted');
});

test('account changes reset derived configuration, dates, selections and editors before loading B',()=>{
  const app=appWithRoutine();
  app.run(`settingsOpen=true;editDayKey='2026-09-15';socialDay='2026-09-15';
    currentTab='history';histMonth='2026-09';histTab='year';reviewOpen=true;tourStep=3;
    bulkPeopleSelection=['synthetic-A-person'];bulkPeopleQuery='Synthetic A';bulkPeopleScope='unassigned';
    peopleSettingsFilter='inactive';lvlOpen={1:false,2:false,3:false};secOpen={hab:false};todayRoutinesOpen=false;
    window.__dayLogActive='synthetic-A-event';window.__dayLogSelectedId='synthetic-A-event';window.__dayLogPanelMode='new';
    changeSyncUser({id:'synthetic-B'});`);
  assert.equal(app.read('settingsOpen||reviewOpen||routineView'),false);
  for(const key of ['editDayKey','socialDay','histMonth','tourStep','window.__dayLogActive','window.__dayLogSelectedId'])assert.equal(app.read(key),null,key);
  assert.equal(app.read('currentTab'),'today');assert.equal(app.read('histTab'),'week');
  assert.equal(app.read('window.__dayLogPanelMode'),'edit');
  assert.deepEqual(app.read('bulkPeopleSelection'),[]);assert.equal(app.read('bulkPeopleQuery'),'');
  assert.equal(app.read('bulkPeopleScope'),'all');assert.equal(app.read('peopleSettingsFilter'),'active');
  assert.deepEqual(app.read('lvlOpen'),{'1':true,'2':true,'3':true});assert.equal(app.read('todayRoutinesOpen'),true);
  assert.equal(app.read('ROUTINES.work?.label||null'),null,'A derived configuration must not survive');
});

test('returning to A restores its own saved routine while B restores only its own preferences',()=>{
  const app=appWithRoutine(),config=app.read('CFG');
  app.values.set('shaah_cfg_synthetic-A',JSON.stringify(config));
  const b=structuredClone(config);b.routines={};
  app.values.set('shaah_cfg_synthetic-B',JSON.stringify(b));
  app.values.set('shaah_lvl_synthetic-B',JSON.stringify({1:false,2:true,3:false}));
  app.values.set('shaah_today_routines_synthetic-B','false');
  app.run(`changeSyncUser({id:'synthetic-B'});restoreAccountLocal();`);
  assert.deepEqual(app.read('Object.keys(sessions)'),[]);assert.equal(app.read('todayRoutinesOpen'),false);
  assert.deepEqual(app.read('lvlOpen'),{'1':false,'2':true,'3':false});
  app.run(`changeSyncUser({id:'synthetic-A'});restoreAccountLocal();`);
  assert.deepEqual(app.read('Object.keys(sessions)'),['work']);assert.equal(app.read('routineId'),'work');
  assert.equal(app.read('routineView'),true);assert.equal(app.read('timerRunning'),true);
  assert.equal(app.read('todayRoutinesOpen'),true);
});

test('same-account token refresh preserves the routine, pending changes and current screen',()=>{
  const app=appWithRoutine();
  const interval=app.read('timerInterval'),epoch=app.read('_syncEpoch');
  app.run(`settingsOpen=true;_cfgDraft={synthetic:'A pending'};changeSyncUser({id:'synthetic-A',email:'new@example.invalid'});`);
  assert.equal(app.read('timerInterval'),interval);assert.equal(app.read('_syncEpoch'),epoch);
  assert.deepEqual(app.read('Object.keys(sessions)'),['work']);assert.equal(app.read('settingsOpen'),true);
  assert.deepEqual(app.read('_cfgDraft'),{synthetic:'A pending'});assert.deepEqual(app.read('cancelledIntervals'),[]);
});

test('an already queued A timer cannot advance B, save B data, or cancel B newer timer',()=>{
  const app=appWithRoutine(),old=app.read('timerInterval');
  app.run(`globalThis.oldTick=intervalCallbacks.get(timerInterval);changeSyncUser({id:'synthetic-B'});
    CFG.routines={work:{label:'Synthetic B routine',icon:'B',steps:[{label:'B step',dur:1}]}};applyCfg();
    sessions={work:{q:[0],done:{},secs:0,running:true,endAt:Date.now()-1000}};
    routineId='work';routineView=true;syncFromSession();ensureTick();`);
  const current=app.read('timerInterval');assert.notEqual(old,current);
  app.run('oldTick()');
  assert.deepEqual(app.read('sessions.work.q'),[0]);assert.equal(app.read('sessions.work.running'),true);
  assert.equal(app.read('timerInterval'),current);assert.equal(app.values.has('shaah_routine_synthetic-B'),false);
  assert.equal(app.read('cancelledIntervals.includes(timerInterval)'),false);
});

test('account switch preserves offline drafts, local recovery and other account copies byte for byte',()=>{
  const app=appWithRoutine();
  for(const key of ['shaah_cfg_pending_synthetic-A','shaah-offline-day-writes:synthetic-A','dayLogV1','dayLogV2','shaah_cache_synthetic-B'])app.values.set(key,'{"synthetic":"preserved"}');
  const before=new Map(app.values);
  app.run(`changeSyncUser({id:'synthetic-B'});changeSyncUser(null);`);
  assert.deepEqual(app.values,before);
});

test('identical routine IDs in two accounts still restore the correct account progress',()=>{
  const app=appWithRoutine(),config=app.read('CFG');
  config.routines.work.label='Synthetic B routine';
  app.values.set('shaah_cfg_synthetic-B',JSON.stringify(config));
  app.values.set('shaah_routine_synthetic-B',JSON.stringify({sessions:{work:{q:[0],done:{},secs:12,running:false,endAt:null}},routineId:'work',routineView:true,day:'2026-10-16'}));
  const savedA=app.values.get('shaah_routine_synthetic-A');
  app.run(`changeSyncUser({id:'synthetic-B'});restoreAccountLocal();`);
  assert.equal(app.read('ROUTINES.work.label'),'Synthetic B routine');
  assert.equal(app.read('timerSecs'),12);assert.equal(app.read('timerRunning'),false);
  assert.equal(app.values.get('shaah_routine_synthetic-A'),savedA);
});

test('a queued callback from an earlier A session remains invalid after returning from B to A',()=>{
  const app=appWithRoutine();
  app.run(`globalThis.oldTick=intervalCallbacks.get(timerInterval);
    changeSyncUser({id:'synthetic-B'});changeSyncUser({id:'synthetic-A'});
    CFG.routines={work:{label:'Synthetic A new session',steps:[{label:'New step',dur:1}]}};applyCfg();
    sessions={work:{q:[0],done:{},secs:0,running:true,endAt:Date.now()-1000}};
    routineId='work';routineView=true;syncFromSession();ensureTick();`);
  const current=app.read('timerInterval');app.run('oldTick()');
  assert.deepEqual(app.read('sessions.work.q'),[0]);assert.equal(app.read('timerInterval'),current);
  assert.equal(app.read('cancelledIntervals.includes(timerInterval)'),false);
});
