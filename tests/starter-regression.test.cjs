const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixture,serverRows,clone}=require('./helpers.cjs');
const {syncBackend}=require('./sync-backend.cjs');
const owner='synthetic-A',day='2026-10-16';
function device(server,id=owner){
 const app=loadApp(undefined,{client:server.clientFor(id)});
 app.run(`USER={id:${JSON.stringify(id)}};CFG=cfgCopy(DEFAULT_CFG);_state={};_starterGate='loading';navigator.onLine=true;`);
 return app;
}
const settings=s=>s.rows.find(r=>r.user_id===owner&&r.date==='settings')?.data._cfg;
test('verified empty account offers a choice without migrations, settings or activity writes',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');
 assert.equal(a.read('_starterGate'),'choose');assert.equal(a.read('_cfgReady'),false);
 assert.deepEqual(s.writes,[]);assert.deepEqual(s.rows,[]);
});
test('one chosen generic habit persists, survives loadAll and never grows Work or junk-food',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');await a.run('starterConfirm()');
 const saved=clone(settings(s));assert.deepEqual(saved.order.slice(1),['social']);const id=saved.order[0];
 assert.match(id,/^c[a-z0-9]{5}$/);assert.equal(saved.h[id].starterTemplate,'focus');
 assert.equal(saved.starter.view,'simple');assert.deepEqual(saved.routines,{});assert.deepEqual(saved.people,[]);
 assert.equal(saved.h[id].p,100);assert.equal(saved.h.social.combo,true);assert.equal(saved.subs.reduce((n,x)=>n+x.p,0),18);
 assert.equal(a.read('calcScore(todayKey()).max'),118);assert.equal(a.read('calcScore("2026-10-15").max'),0);
 await a.run('loadAll()');await a.run('flushCfgSaves()');
 assert.equal(a.read('CFG.order.length'),2);assert.equal(a.read('!!CFG.h.work'),false);assert.equal(a.read('!!CFG.h.cjunk0'),false);
 assert.deepEqual(a.read('_state'),{});assert.equal(s.writes.length,1);
 const b=device(s);await b.run('loadAll()');assert.equal(b.read('_starterGate'),'ready');assert.equal(b.read('CFG.order[0]'),id);
});
test('skip is a persisted zero-plan profile, not an F grade or fake tutorial completion',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');await a.run('starterConfirm(true)');
 assert.deepEqual(settings(s).order,[]);assert.equal(a.read('calcScore(todayKey()).max'),0);
 assert.equal(a.read('GRADE(0,0).n'),'SIN PLAN');assert.equal(a.read('get(tourKey())'),null);
 await a.run('loadAll()');assert.equal(a.read('_starterGate'),'ready');assert.deepEqual(a.read('CFG.h'),{});
});
test('two simultaneous initializers adopt one CAS winner without merging obligations',async()=>{
 const s=syncBackend(),a=device(s),b=device(s);await Promise.all([a.run('loadAll()'),b.run('loadAll()')]);
 a.run('_starterChoice="move"');b.run('_starterChoice="create"');
 await Promise.all([a.run('starterConfirm()'),b.run('starterConfirm()')]);
 assert.equal(s.writes.length,1);assert.equal(settings(s).order.length,2);
 assert.deepEqual(a.read('CFG'),b.read('CFG'));assert.equal(a.read('_cfgDraft'),null);assert.equal(b.read('_cfgDraft'),null);
});
test('lost acknowledgement is recovered by rereading; failed write stays retryable without activity',async()=>{
 const s=syncBackend(),original=s.clientFor;
 s.clientFor=id=>{const c=original(id),rpc=c.rpc;c.rpc=async(...args)=>{await rpc(...args);return {error:{code:'NETWORK'}}};return c;};
 const a=device(s);await a.run('loadAll()');a.run('_starterChoice="rest"');await a.run('starterConfirm()');
 assert.equal(a.read('_starterGate'),'ready');assert.equal(s.writes.length,1);assert.deepEqual(a.read('_state'),{});
 // A separate empty backend ensures failure does not adopt the first backend.
 const f=syncBackend(),normal=f.clientFor;f.clientFor=id=>Object.assign(Object.create(normal(id)),{rpc:async()=>({error:{code:'NETWORK'}})});
 const b=device(f);await b.run('loadAll()');b.run('_starterChoice="rest"');await b.run('starterConfirm()');
 assert.equal(b.read('_starterGate'),'choose');assert.match(b.read('_starterError'),/Retry/);assert.equal(f.writes.length,0);
});
test('failed/incomplete reads never classify or initialize; local copies veto empty remote',async()=>{
 const s=syncBackend();s.beforeSelect=()=>{throw Error('OFFLINE')};const a=device(s);await a.run('loadAll()');
 assert.equal(a.read('_starterGate'),'error');assert.equal(s.writes.length,0);
 const f=syncBackend(),b=device(f);b.run('set(cfgKey(),CFG)');await b.run('loadAll()');
 assert.notEqual(b.read('_starterGate'),'choose');
});
test('a cached existing account stays usable offline without entering Starter or replacing its plan',async()=>{
 const s=syncBackend(),a=device(s),config=fixture().config;
 a.run(`set(cfgKey(),${JSON.stringify(config)});loadLvl=()=>{};loadSec=()=>{};restoreRoutine=()=>{};restoreAccountLocal()`);
 s.beforeSelect=()=>{throw Error('offline')};await a.run('loadAll()');
 assert.equal(a.read('_starterGate'),'ready');assert.equal(a.read('_cfgReady'),false);assert.deepEqual(a.read('CFG.h'),config.h);assert.equal(s.writes.length,0);
});
test('malformed settings fail closed; valid existing account never sees Starter',async()=>{
 const s=syncBackend([{user_id:owner,date:'settings',data:{broken:true}}]),a=device(s);await a.run('loadAll()');
 assert.equal(a.read('_starterGate'),'error');assert.equal(s.writes.length,0);
 const data=fixture(),existing=syncBackend(serverRows(data).map(r=>({...r,user_id:owner}))),b=device(existing);
 await b.run('loadAll()');assert.equal(b.read('_starterGate'),'ready');
 for(const k of Object.keys(data.days))assert.deepEqual(b.read(`_state[${JSON.stringify(k)}]`),data.days[k]);
});
test('account switching ignores delayed initializer acknowledgement',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');
 let release;const barrier=new Promise(r=>release=r);s.beforeMutation=()=>barrier;
 const flight=a.run('starterConfirm()');await new Promise(r=>setImmediate(r));
 a.run('changeSyncUser({id:"synthetic-B"})');release();await flight;
 assert.equal(a.read('USER.id'),'synthetic-B');assert.equal(a.read('_starterGate'),'loading');assert.equal(a.read('!!CFG.starter'),false);
});
test('expansion, routine and deletion use dated custom IDs and preserve previous day score',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');await a.run('starterConfirm()');
 a.run('first=CFG.order[0];setHabitState(first,todayKey(),true)');assert.equal(a.read('calcScore(todayKey()).score'),100);
 const before=a.read('calcScore("2026-10-15")');a.run('_starterEditor=true;_starterChoice="move"');await a.run('starterConfirm()');
 assert.equal(a.read('calcScore(todayKey()).max'),118);assert.equal(a.read('CFG.h[first].p'),50);assert.deepEqual(a.read('calcScore("2026-10-15")'),before);
 a.run('starterAddRoutine(first)');assert.equal(a.read('CFG.routines[first].steps.length'),3);assert.equal(a.read('calcScore(todayKey()).max'),118);
 a.run('cfgDel(first)');assert.equal(a.read('CFG.order.length'),2);assert.equal(a.read('calcScore(todayKey()).max'),118);assert.deepEqual(a.read('calcScore("2026-10-15")'),before);
});
test('Starter export/import accepts both its empty baseline and a skipped zero-habit plan',async()=>{
 for(const choice of ['skip','focus']){
  const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run(`_starterChoice=${JSON.stringify(choice)}`);await a.run(`starterConfirm(${choice==='skip'})`);
  const before=a.read('CFG');a.run('prepared=importPrepare({app:"SHAAH",config:CFG,days:{}})');assert.deepEqual(a.read('prepared.cfg'),before);
 }
});
test('nonempty grades retain their established thresholds and zero plan is the only added grade',()=>{
 const a=loadApp();for(const [points,grade] of [[0,'F'],[14,'F'],[15,'D'],[30,'C'],[45,'B'],[72,'A'],[85,'S'],[95,'S+']])assert.equal(a.read(`GRADE(${points},100).l`),grade);
 assert.equal(a.read('GRADE(0,0).l'),'—');
});

test('skipped plan gets the Social Combo with its first habit, and old starter plans rebalance to 118 from today',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');await a.run('starterConfirm(true)');
 assert.equal(a.read('calcScore(todayKey()).max'),0);
 a.run('_starterEditor=true;_starterChoice="move"');await a.run('starterConfirm()');
 assert.equal(a.read('calcScore(todayKey()).max'),118);assert.equal(a.read('!!CFG.h.social'),true);
 const o=syncBackend(),b=device(o);await b.run('loadAll()');b.run('_starterChoice="focus"');await b.run('starterConfirm()');
 b.run('id=CFG.order[0];delete CFG.h.social;CFG.order=[id];CFG.subs=[];for(const k of [id])CFG.h[k].p=CFG.h[k].pWork=CFG.h[k].pVacation=10;delete CFG.starter.balanceV;CFG.log=[{from:CFG_EPOCH,h:{},order:[],subs:[],mode:"work"},{from:"2026-10-01",h:cfgCopy(CFG.h),order:[id],subs:[],mode:"work"}];_dayCfgCache={};applyCfg()');
 assert.equal(b.read('calcScore("2026-10-15").max'),10);
 assert.equal(b.read('starterBalanceOnce()'),true);
 assert.equal(b.read('calcScore(todayKey()).max'),118);assert.equal(b.read('calcScore("2026-10-15").max'),10);
 assert.equal(b.read('starterBalanceOnce()'),false);
});
test('daily max can switch between 118 (default) and 100 from today, keeping past days and custom weights in proportion',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');await a.run('starterConfirm()');
 a.run('_starterEditor=true;_starterChoice="move"');await a.run('starterConfirm()');
 assert.equal(a.read('calcScore(todayKey()).max'),118);assert.equal(a.read('starterTarget()'),118);
 a.run('starterSetMax(100)');
 assert.equal(a.read('calcScore(todayKey()).max'),100);assert.equal(a.read('CFG.subs.reduce((n,x)=>n+x.p,0)'),15);
 assert.deepEqual(a.read('CFG.order.filter(id=>!CFG.h[id].combo).map(id=>CFG.h[id].p)'),[43,42]);
 assert.equal(a.read('calcScore("2026-10-15").max'),0);
 a.run('const [x,y]=CFG.order.filter(id=>!CFG.h[id].combo);cfgSet(x,"pWork",60);cfgSet(y,"pWork",25)');
 a.run('starterSetMax(118)');assert.equal(a.read('calcScore(todayKey()).max'),118);
 assert.deepEqual(a.read('CFG.order.filter(id=>!CFG.h[id].combo).map(id=>CFG.h[id].p)'),[71,29]);
 a.run('starterSetMax(77)');assert.equal(a.read('starterTarget()'),118);
 a.run('_starterEditor=true;_starterChoice="rest"');a.run('starterSetMax(100)');await a.run('starterConfirm()');
 assert.equal(a.read('calcScore(todayKey()).max'),100);
});
test('the full SHAAH plan starts set up: 3 levels, routines and Social Combo at 118, with no migrations',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run(`_starterChoice="full"`);await a.run("starterConfirm()");
 const saved=clone(settings(s));
 assert.equal(saved.starter.view,'full');assert.equal(saved.starter.levels,true);assert.equal(saved.starter.template,'full');
 assert.deepEqual(Object.keys(saved.routines).sort(),['production','wod']);
 assert.equal(saved.order.filter(id=>saved.h[id].on!==false).length,9);
 assert.equal(a.read('calcScore(todayKey()).max'),118);assert.equal(a.read('calcScore("2026-10-15").max'),0);
 assert.equal(a.read('!!CFG.shaahSocialCoreMigration'),false);assert.equal(a.read('!!CFG.h.cjunk0'),false);
 await a.run('loadAll()');assert.equal(a.read('calcScore(todayKey()).max'),118);assert.equal(s.writes.length,1);
 a.run('starterSetMax(100)');assert.equal(a.read('calcScore(todayKey()).max'),100);
});
test('Flirting becomes Partner once, in every era, for existing and new accounts; a renamed category is kept',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');await a.run('starterConfirm()');
 assert.equal(a.read('CFG.subs.find(x=>x.id==="flirt").label'),'Partner');
 a.run('CFG.subs.find(x=>x.id==="flirt").label="Flirting";for(const e of CFG.log)for(const x of (e.subs||[]))if(x.id==="flirt")x.label="Flirting";delete CFG.partnerV');
 assert.equal(a.read('partnerLabelOnce()'),true);
 assert.equal(a.read('CFG.subs.find(x=>x.id==="flirt").label'),'Partner');
 assert.equal(a.read('CFG.log.flatMap(e=>e.subs||[]).filter(x=>x.id==="flirt"&&x.label!=="Partner").length'),0);
 assert.equal(a.read('partnerLabelOnce()'),false);
 a.run('CFG.subs.find(x=>x.id==="flirt").label="Dates";delete CFG.partnerV;partnerLabelOnce()');
 assert.equal(a.read('CFG.subs.find(x=>x.id==="flirt").label'),'Dates');
});
test('factory category names follow the interface language; stored names and custom names are untouched',async()=>{
 const s=syncBackend(),a=device(s);await a.run('loadAll()');a.run('_starterChoice="focus"');await a.run('starterConfirm()');
 a.run('interfaceLanguage="es";_dayCfgCache={}');
 assert.deepEqual(a.read('cfgForDate(todayKey()).subs.map(x=>x.label)'),['Pareja','Desconocidos','Amigos']);
 assert.deepEqual(a.read('socialCategories().map(x=>x.label)'),['Pareja','Desconocidos','Amigos']);
 assert.deepEqual(a.read('CFG.subs.map(x=>x.label)'),['Partner','Strangers','Friends']);
 a.run(`CFG.subs[1].label="Gente nueva";for(const e of CFG.log)if(e.subs&&e.subs[1])e.subs[1].label="Gente nueva";_dayCfgCache={}`);
 assert.equal(a.read('cfgForDate(todayKey()).subs[1].label'),'Gente nueva');
 a.run('interfaceLanguage="en";_dayCfgCache={}');
 assert.equal(a.read('cfgForDate(todayKey()).subs[0].label'),'Partner');
});
