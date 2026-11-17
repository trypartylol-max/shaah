const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');
test('group focus filters only current Today Friends and leaves recorded encounters and scoring intact',()=>{
 const data=locationFixture();data.days['2026-10-16']={checks:{social:true},social:{friends:true},people:['paway']};
 const app=loadApp(data);
 const snapshot=()=>app.read('({state:_state,log:CFG.log,scores:["2026-09-07","2026-09-08","2026-09-15","2026-09-16","2026-09-17","2026-09-18","2026-10-08",todayKey()].map(calcScore)})');
 const before=snapshot();
 for(const [group,ids] of [['il',['pold02']],['pa',['pold02','paway']],['empty',[]],['all',['pold01','pold02','paway','plegacy']]]){
  app.run(`CFG.selectedLocation=${JSON.stringify(group)}`);
  assert.deepEqual(app.read('comboPeople("friends",todayKey(),false).map(p=>p.id)'),ids);
  assert.equal(app.run('comboPeople("friends","2026-09-16",false).length'),4);
  assert.equal(app.run('comboPeople("friends",todayKey(),true).length'),4);
  assert.equal(app.run('comboPeople("flirt",todayKey(),false).length'),2);
  assert.deepEqual(snapshot(),before);
 }
 app.run('CFG.selectedLocation="deleted"');assert.equal(app.run('comboPeople("friends",todayKey(),false).length'),4);
});
