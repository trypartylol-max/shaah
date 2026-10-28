const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');
test('editing legacy membership preserves unknown category, relationship, metadata and historical scoring',()=>{
 const a=loadApp();a.run(`saveCfg=()=>{};CFG.people[0]={...CFG.people[0],sub:'retired',relationship:'legacy',customMetadata:{keep:true},locations:['retired-location']};window.before=JSON.stringify([_state,CFG.log,calcScore('2026-09-16')]);socialEdit('pold01');socialDraft.name='Edited legacy person';socialSave();`);
 assert.equal(a.read('personById("pold01").sub'),'retired');assert.equal(a.read('personById("pold01").relationship'),'legacy');
 assert.deepEqual(a.read('personById("pold01").customMetadata'),{keep:true});assert.deepEqual(a.read('personById("pold01").locations'),['retired-location']);
 assert.equal(a.read('JSON.stringify([_state,CFG.log,calcScore("2026-09-16")])'),a.read('window.before'));
});
test('legacy exception never permits assigning a new invalid category to existing or new contacts',()=>{
 for(const id of ['pold01',null]){
  const a=loadApp();a.run(`saveCfg=()=>{};window.before=JSON.stringify(CFG.people);socialDraft={id:${JSON.stringify(id)},name:'Invalid category',every:7,sub:'never-configured',locations:[]};socialSave();`);
  assert.equal(a.read('JSON.stringify(CFG.people)'),a.read('window.before'));assert.notEqual(a.read('socialFormError'),'');
 }
});
