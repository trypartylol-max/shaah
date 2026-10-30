const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixture,clone}=require('./helpers.cjs');

test('deleted contact stays deleted through history recovery and stale cache rescue',()=>{
  const app=loadApp();
  const before=app.read('_state');
  app.run('const stale=JSON.parse(JSON.stringify(CFG)); personDel("pold03"); const remote=JSON.parse(JSON.stringify(CFG)); set(cfgKey(),stale); rowToState({date:"settings",data:{_cfg:remote}}); recoverPeopleFromDays();');
  assert.equal(app.run('personById("pold03")'),null);
  assert.equal(app.run('personWasDeleted("pold03")'),true);
  assert.deepEqual(app.read('_state'),before);
});

test('deletion markers survive cache reload but do not suppress unrelated recovery',()=>{
  const app=loadApp();
  app.run('personDel("pold03"); set(cfgKey(),CFG); CFG=JSON.parse(JSON.stringify(DEFAULT_CFG)); loadCfgLocal(); CFG.people=CFG.people.filter(p=>p.id!=="pold01"); _state[todayKey()]={people:["pold01"]}; recoverPeopleFromDays();');
  assert.equal(app.run('personById("pold03")'),null);
  assert.equal(app.run('personById("pold01").id'),'pold01');
});

test('deletion marker import validates values and explicit people import restores a contact',()=>{
  const data=fixture(); data.config.deletedPeople={pold03:true};
  // Old fixtures intentionally have legacy Day Log times; only settings are imported here.
  const app=loadApp();
  app.run(`importPrepare(${JSON.stringify({config:data.config})})`);
  data.config.deletedPeople.pold03=false;
  assert.throws(()=>app.run(`importPrepare(${JSON.stringify({config:data.config})})`));
  app.run('personDel("pold03"); importApply({people:[{id:"pold03",name:"Restored",sub:"flirt"}]});');
  assert.equal(app.run('personById("pold03").name'),'Restored');
  assert.equal(app.run('personWasDeleted("pold03")'),false);
});

test('stats include recorded zero days and exclude empty and future days without changing score history',()=>{
  const data=fixture(); data.days={
    '2026-10-10':{note:'Recorded zero'},
    '2026-10-11':{people:['pold01']},
    '2026-10-12':{checks:{work:true}},
    '2026-10-13':{checks:{work:false},note:'',people:[],_daylog:[]},
    '2026-10-14':{_daylog:[{id:'a',title:'Recorded',type:'manual',start:'2026-10-14T12:00:00Z',end:'2026-10-14T13:00:00Z'}]},
    '2026-10-17':{note:'Future'}
  };
  const app=loadApp(data),before=app.read('_state');
  assert.deepEqual(Object.keys(app.read('getStatsHistory()')),['2026-10-10','2026-10-11','2026-10-12','2026-10-14']);
  assert.deepEqual(Object.keys(app.read('getHistory()')),['2026-10-12']);
  assert.equal(app.run('avgW(getDays(7))'),11);
  assert.deepEqual(app.read('_state'),before);
});

test('zero-only statistics render data and zero-average trends remain meaningful',()=>{
  const data=fixture();data.days={'2026-10-03':{note:'Previous'},'2026-10-10':{checks:{work:true}}};
  const app=loadApp(data);
  assert.deepEqual(app.read('weekTrend()'),{prev:0,cur:42,diff:42});
  app.run('_state={"2026-10-09":{checks:{work:true}},"2026-10-10":{note:"Zero"}};');
  assert.deepEqual(app.read('weekTrend()'),{prev:42,cur:0,diff:-42});
  app.run('_state={"2026-10-10":{note:"Zero"}};');
  assert.ok(!app.run('renderStats()').includes('NO DATA YET'));
  assert.equal(app.run('weekdayAvg().reduce((n,d)=>n+d.n,0)'),1);
});
