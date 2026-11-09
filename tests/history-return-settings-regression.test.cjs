const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {loadApp,fixture,clone}=require('./helpers.cjs');
const source=fs.readFileSync(path.join(__dirname,'../source/app.js'),'utf8');
function migration({later='2026-11-01',version=9,now,user={id:'synthetic-owner'},flag=true}={}){
 const data=fixture();data.config.travelV=version;if(flag!==null)data.config.repairWorkReturn2026=flag;
 data.config.travel={mode:'vacation',auto:true,resumeOn:'2026-12-01',modeUpdatedAt:0};data.config.h.work.on=false;
 data.config.log.push({...clone(data.config.log[1]),from:later});data.config.log[2].mode='vacation';data.config.log[2].h.work.on=false;
 const app=loadApp(data,{source,now});app.run(`USER=${JSON.stringify(user)}`);return app;
}
test('repair proposes only dated boundaries and never mutates live state, storage or day rows',()=>{
 const a=migration(),before=a.read('({config:CFG,days:_state,cache:_dayCfgCache})'),values=[...a.values];
 const plan=a.read('ensureWorkReturn2026()');
 assert.equal(plan.after.log[1].mode,'vacation');assert.equal(plan.after.log[2].mode,'work');assert.equal(plan.after.log[2].h.work.on,true);
 assert.deepEqual(plan.after.log[3],before.config.log[3]);assert.deepEqual(plan.after.travel,before.config.travel);assert.equal(plan.after.h.work.on,false);
 assert.equal(plan.after.travelV,10);assert.deepEqual(a.read('({config:CFG,days:_state,cache:_dayCfgCache})'),before);assert.deepEqual([...a.values],values);assert.deepEqual(a.writes,[]);
 assert.equal(a.run(`ensureWorkReturn2026(${JSON.stringify(plan.after)})`),null);
});
test('proposal seals missing vacation/return boundaries with independent copies',()=>{
 const a=migration();a.run('CFG.log.splice(1,2)');
 const plan=a.read('ensureWorkReturn2026()');assert.deepEqual(plan.after.log.map(e=>e.from),['0001-01-01','2026-09-08','2026-10-08','2026-11-01']);
 a.run('var proposed=ensureWorkReturn2026();proposed.after.log[2].h.meditation.l="Changed"');
 assert.notEqual(a.run('proposed.after.log[1].h.meditation.l'),'Changed');assert.notEqual(a.run('CFG.log[0].h.meditation.l'),'Changed');
});
for(const [name,options] of [['no signed-in user',{user:null}],['flag absent',{flag:null}],['flag false',{flag:false}],['flag as text',{flag:'true'}],['flag as number',{flag:1}]])test('no proposal when the repair is not enabled in the account configuration: '+name,()=>{
 const a=migration(options);assert.equal(a.run('ensureWorkReturn2026()'),null);
});
test('an email address never enables the repair; enabled, pre-return and completed versions behave',()=>{
 assert.equal(migration({flag:null,user:{id:'owner',email:'someone@example.invalid'}}).run('ensureWorkReturn2026()'),null);
 assert.ok(migration({user:{id:'owner'}}).read('ensureWorkReturn2026()'));
 for(const options of [{version:10},{now:'2026-10-07T12:00:00Z'}])assert.equal(migration(options).run('ensureWorkReturn2026()'),null);
});
test('uncertain timelines are rejected instead of inventing an earlier baseline',()=>{
 const a=migration();a.run("CFG.log=[{from:'2026-10-12',mode:'work',h:CFG.h,order:CFG.order}]");assert.throws(()=>a.run('ensureWorkReturn2026()'));
});
test('Settings disable/re-enable does not create completions',()=>{
 const a=loadApp(fixture(),{source}),days=a.read('_state');a.run('cfgToggle("meditation")');assert.equal(a.run('CFG.h.meditation.on'),false);
 a.run('cfgToggle("meditation");cfgToggle("missing")');assert.equal(a.run('CFG.h.meditation.on'),true);assert.deepEqual(a.read('_state'),days);
});
