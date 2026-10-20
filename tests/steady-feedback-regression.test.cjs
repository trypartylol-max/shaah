const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');

for(const missing of ['people','_daylog','both'])test(`an acknowledgement filling absent ${missing} defaults is not a visible day change`,()=>{
  const app=loadApp();
  app.run(`_state['2026-10-16']={checks:{work:0.5},social:blankSocial(),note:'',people:[],_daylog:[]};`);
  if(missing==='both')app.run("delete _state['2026-10-16'].people;delete _state['2026-10-16']._daylog;");
  else app.run(`delete _state['2026-10-16'][${JSON.stringify(missing)}];`);
  const changed=app.run("rowToState({date:'2026-10-16',data:{_checks:{work:0.5},_social:blankSocial(),_note:'',_people:[],_daylog:[]}})");
  assert.equal(changed,false);
  assert.equal(app.read("getChecked('2026-10-16').work"),0.5);
});

test('a genuinely new empty day remains a real change',()=>{
  const app=loadApp();assert.equal(app.run("rowToState({date:'2026-10-16',data:{}})"),true);
});
