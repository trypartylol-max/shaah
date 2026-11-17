const {test}=require('node:test');const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');
// Settings → Routines: add, delete and reorder steps; locked while a session of that routine exists.
function app(){const a=loadApp();a.run(`Math.random=()=>0.123456;USER={id:'regression-user'};_cfgReady=true;_cfgConflict=false;unlockAudio=()=>{};audioKeepAlive=()=>{};chime=()=>{};confirm=()=>true;
 CFG.h.production={l:'Create',p:15,pWork:15,pVacation:15,lv:1,on:true,routine:true};CFG.order.push('production');
 CFG.routines.production={label:'Create',icon:'C',col:'#a78bfa',steps:[{id:'a',label:'First',icon:'1',dur:2},{id:'b',label:'Second',icon:'2',dur:3},{id:'c',label:'Third',icon:'3',dur:4}]};
 for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};applyCfg();`);return a;}
const labels=a=>a.read(`CFG.routines.production.steps.map(s=>s.label)`);
test('add appends a step with a new unique id and it reaches ROUTINES',()=>{const a=app();a.run(`stepAdd('production')`);
 assert.equal(a.read(`CFG.routines.production.steps.length`),4);
 const ids=a.read(`CFG.routines.production.steps.map(s=>s.id)`);assert.equal(new Set(ids).size,4);assert.ok(!['a','b','c'].includes(ids[3]));
 assert.equal(a.read(`ROUTINES.production.steps.length`),4);});
test('delete removes the chosen step and never leaves a routine empty',()=>{const a=app();a.run(`stepDel('production',1)`);assert.deepEqual(labels(a),['First','Third']);
 a.run(`stepDel('production',0)`);assert.deepEqual(labels(a),['Third']);a.run(`stepDel('production',0)`);assert.deepEqual(labels(a),['Third']);});
test('delete asks first and does nothing when cancelled',()=>{const a=app();a.run(`confirm=()=>false;stepDel('production',0)`);assert.deepEqual(labels(a),['First','Second','Third']);});
test('move swaps neighbours and ignores out-of-range moves',()=>{const a=app();a.run(`stepMove('production',0,1)`);assert.deepEqual(labels(a),['Second','First','Third']);
 a.run(`stepMove('production',0,-1);stepMove('production',2,1);stepMove('production',1,5)`);assert.deepEqual(labels(a),['Second','First','Third']);});
test('add, delete and move are blocked while the routine has a session; rename and minutes still work',()=>{const a=app();a.run(`startRoutine('production')`);
 a.run(`stepAdd('production');stepDel('production',0);stepMove('production',0,1)`);assert.deepEqual(labels(a),['First','Second','Third']);
 a.run(`stepSet('production',0,'label','Renamed');stepSet('production',0,'dur','7');stepSet('production',0,'icon','★')`);
 assert.deepEqual(a.read(`CFG.routines.production.steps[0]`),{id:'a',label:'Renamed',icon:'★',dur:7});
 a.run(`delete sessions.production;routineId=null`);a.run(`stepAdd('production')`);assert.equal(a.read(`CFG.routines.production.steps.length`),4);});
test('settings render the step tools, and the lock message instead while active',()=>{const a=app();
 const html=a.read(`renderSettings()`);assert.match(html,/stepAdd/);assert.match(html,/stepDel/);assert.match(html,/stepMove/);assert.doesNotMatch(html,/rt-steps-locked/);
 a.run(`startRoutine('production')`);const locked=a.read(`renderSettings()`);assert.match(locked,/rt-steps-locked/);assert.doesNotMatch(locked,/'stepAdd'|stepAdd&quot;|data-ui[^>]*stepAdd/);});
