const test=require('node:test');const assert=require('node:assert/strict');
const {loadApp,fixture}=require('./helpers.cjs');

test('blank and zero frequency save as zero; scheduled contacts can opt out and opt back in',()=>{
 const a=loadApp();const past=a.read('_state');
 for(const value of ['', '0', '  ']){
  a.run(`socialEdit('pold01');socialDraftField('every',${JSON.stringify(value)});socialSave();`);
  assert.equal(a.run('personById("pold01").every'),0);
  assert.equal(a.run('socialDraft'),null);
  a.run('socialEdit("pold01")');assert.equal(a.run('socialDraft.every'),'');
 }
 a.run('socialDraftField("every","7");socialSave()');
 assert.equal(a.run('personById("pold01").every'),7);
 assert.deepEqual(a.read('_state'),past);
});

test('invalid frequency never mutates contact or history',()=>{
 for(const value of ['-1','1.5','3651','nope']){
  const a=loadApp(),before=a.read('({people:CFG.people,days:_state})');
  a.run(`socialEdit('pold01');socialDraftField('every',${JSON.stringify(value)});socialSave()`);
  assert.deepEqual(a.read('({people:CFG.people,days:_state})'),before);
  assert.ok(a.run('socialFormError.length')>0);
 }
});

test('unscheduled contacts stay available with neutral pill and no overdue ranking',()=>{
 const a=loadApp();a.run('CFG.people[0].every=0;CFG.people[2].every=0;');
 const statuses=a.read('peopleStatus()'),suggestions=a.read('socialSuggestionList()');
 for(const list of [statuses,suggestions])for(const p of list.filter(p=>p.every===0)){
  assert.equal(p.ratio,-1);assert.equal(p.overdue,null);
  const pill=a.run(`socialTimePill(${JSON.stringify(p)})`);
  assert.equal(pill.label,'Free');assert.equal(pill.fill,0);assert.equal(pill.description,'No frequency');
 }
 assert.equal(suggestions[0].id,'pold02');assert.equal(suggestions.length,3);
 assert.ok(a.run('socialTile(personById("pold01"),todayKey(),true)').includes('No frequency'));
 a.run('socialRecord("pold01",todayKey())');
 assert.ok(a.read('getPeople(todayKey())').includes('pold01'));
});

test('legacy missing frequency retains default while explicit zero survives people import and cache reload',()=>{
 const a=loadApp();
 assert.equal(a.run('contactInterval(undefined)'),14);
 assert.equal(a.run('contactInterval(0)'),0);
 a.run('importApply({people:[{id:"new-zero",name:"No timer",every:0,sub:"friends"}]});set(cfgKey(),CFG);loadCfgLocal();');
 assert.equal(a.run('personById("new-zero").every'),0);
});

test('cancelled deletion keeps edit draft; confirmed deletion closes it and preserves encounters',()=>{
 const a=loadApp(),before=a.read('_state');
 a.run('socialEdit("pold03");confirm=()=>false;personDel("pold03")');
 assert.equal(a.run('socialDraft.id'),'pold03');assert.ok(a.run('personById("pold03")'));
 a.run('confirm=()=>true;personDel("pold03");recoverPeopleFromDays()');
 assert.equal(a.run('socialDraft'),null);assert.equal(a.run('personById("pold03")'),null);
 assert.equal(a.run('personWasDeleted("pold03")'),true);assert.deepEqual(a.read('_state'),before);
});
