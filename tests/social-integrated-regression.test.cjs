const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture,loadApp}=require('./helpers.cjs');
test('single-category editor preserves configured Family points and contact identity',()=>{
 const data=fixture();const family={id:'family',label:'Family',icon:'F',p:2,pWork:2,pVacation:3};
 data.config.subs.push(family);data.config.log.forEach(e=>e.subs.push({...family}));
 data.config.people.push({id:'pfam01',name:'Synthetic family',sub:'family',every:7});
 const app=loadApp(data);const history=app.read('JSON.stringify(_state)');
 app.run("socialEdit('pfam01');socialDraftField('every','10');socialSave();");
 assert.equal(app.read("personById('pfam01').sub"),'family');
 assert.equal(app.read("personById('pfam01').every"),10);
 assert.equal(app.read('JSON.stringify(_state)'),history);
 app.run("socialRecord('pfam01',todayKey())");
 assert.equal(app.read('getSocial(todayKey()).family'),true);
 assert.deepEqual(app.read('getPeople(todayKey())'),['pfam01']);
});
test('cancel and account changes discard drafts without changing saved contact metadata',()=>{
 const app=loadApp();const before=app.read('JSON.stringify(CFG.people)');
 app.run("socialEdit('pold01');socialDraftField('name','Cancelled');socialCancel()");
 assert.equal(app.read('JSON.stringify(CFG.people)'),before);
 app.run("USER={id:'a'};socialEdit('pold01');changeSyncUser({id:'b'})");
 assert.equal(app.read('socialDraft'),null);
});
test('contact edit preserves history and requires frequency for a new contact',()=>{
 const app=loadApp();app.run("socialNew(todayKey());socialDraftField('name','Synthetic new');socialSave()");
 assert.equal(app.read('CFG.people.length'),3);
 app.run("socialDraftField('every','14');socialSave()");
 assert.equal(app.read('CFG.people.length'),4);
 assert.equal(app.read('getPeople(todayKey()).length'),1);
});
