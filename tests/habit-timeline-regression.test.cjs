const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');

test('level change preserves identity, all day records, past and future eras',()=>{
 const a=loadApp();a.run(`CFG.log.push({...JSON.parse(JSON.stringify(CFG.log[2])),from:'2026-12-01'});window.before=JSON.stringify([_state,CFG.log]);saveCfg=()=>{};cfgLevel('meditation',3);`);
 const [days,eras]=JSON.parse(a.read('window.before'));
 assert.deepEqual(a.read('_state'),days);
 assert.deepEqual(a.read('CFG.log.filter(e=>e.from!==todayKey())'),eras);
 assert.equal(a.read('CFG.h.meditation.lv'),3);
 assert.equal(a.read('cfgForDate("2026-10-15").L2.some(i=>i.id==="meditation")'),true);
 assert.equal(a.read('cfgForDate(todayKey()).L3.some(i=>i.id==="meditation")'),true);
 assert.equal(a.read('cfgForDate("2026-12-01").L2.some(i=>i.id==="meditation")'),true);
 a.run(`cfgLevel('meditation',1);cfgLevel('meditation',9)`);
 assert.equal(a.read('CFG.log.filter(e=>e.from===todayKey()).length'),1);
 assert.equal(a.read('CFG.h.meditation.lv'),1);
});
test('loading, conflict and ambiguous timelines reject edits without mutation',()=>{
 for(const setup of [`USER={id:'A'};_cfgReady=false`, `USER={id:'A'};_cfgReady=true;_cfgConflict=true`, `CFG.log.push(JSON.parse(JSON.stringify(CFG.log[0])))`]){
 const a=loadApp();a.run(`${setup};window.before=JSON.stringify(CFG);cfgLevel('meditation',3)`);
 assert.equal(a.read('JSON.stringify(CFG)'),a.read('window.before'));
 }
});
test('weekly rates use dated eligibility, fractional completion and normalized scores',()=>{
 const a=loadApp();a.run(`
 getDays=()=>Array.from({length:14},(_,i)=>({key:i<7?'2026-10-01':i<10?'2026-10-10':'2026-10-16',data:{score:i<10?10:30,max:i<10?10:60}}));
 cfgForDate=key=>({L1:key==='2026-10-16'?[{id:'new',pts:10}]:[{id:'old',pts:10}],L2:[],L3:[]});
 _state={'2026-10-01':{checks:{old:true}},'2026-10-10':{checks:{old:true}},'2026-10-16':{checks:{new:.5}}};window.review=weekReview();`);
 const r=a.read('window.review');
 assert.equal(r.avg,71);assert.equal(r.pavg,100);
 assert.equal(r.tally.find(x=>x.id==='new').eligible,4);
 assert.equal(r.tally.find(x=>x.id==='new').rate,50);
 assert.equal(r.tally.find(x=>x.id==='old').rate,100);
 assert.equal(r.bestDay.key,'2026-10-10');
});
test('unsorted future era is retained; failed edit rolls back; invalid calendar date rejects',()=>{
 const a=loadApp();a.run(`CFG.log.reverse();saveCfg=()=>{};cfgLevel('meditation',3);`);
 assert.deepEqual(a.read('CFG.log.map(e=>e.from)'),['0001-01-01','2026-09-08','2026-10-08','2026-10-16']);
 a.run(`window.before=JSON.stringify(CFG);try{cfgEdit(()=>{CFG.h.meditation.lv=2;throw Error('abort')})}catch(e){}`);
 assert.equal(a.read('JSON.stringify(CFG)'),a.read('window.before'));
 a.run(`CFG.log.push({...CFG.log[0],from:'2026-02-30'});window.before=JSON.stringify(CFG);cfgLevel('meditation',1)`);
 assert.equal(a.read('JSON.stringify(CFG)'),a.read('window.before'));
});
test('weekly review handles dated pause/add/reweight, zero max and mode changes without mutating history',()=>{
 const a=loadApp();a.run(`
 saveCfg=()=>{};
 const make=(from,mode,h)=>({from,mode,h,order:Object.keys(h),subs:[]});
 const base={old:{l:'Old habit',i:'O',lv:2,on:true,pWork:10,pVacation:20},paused:{l:'Paused',i:'P',lv:1,on:true,pWork:10,pVacation:10}};
 const later=JSON.parse(JSON.stringify(base));later.paused.on=false;later.old.pVacation=40;later.fresh={l:'New habit',i:'N',lv:3,on:true,pWork:5,pVacation:10};
 CFG.log=[make('0001-01-01','work',base),make('2026-10-13','vacation',later)];
 CFG.h=JSON.parse(JSON.stringify(later));CFG.order=Object.keys(CFG.h);CFG.subs=[];_dayCfgCache={};
 _state={};for(let d=3;d<=16;d++){const key='2026-10-'+String(d).padStart(2,'0');_state[key]={checks:{old:d>=13?.5:true,paused:true,fresh:true},social:{},note:'',people:[]};}
 persistTravelMode('vacation');window.before=JSON.stringify([CFG.log,_state]);window.review=weekReview();
 `);
 const r=a.read('window.review');
 assert.equal(r.avg,77);assert.equal(r.pavg,100);assert.equal(r.bestDay.key,'2026-10-10');
 assert.deepEqual(r.tally.map(x=>[x.id,x.eligible,x.done,x.rate]).sort(),[['fresh',4,4,100],['old',7,5,71],['paused',3,3,100]]);
 a.run(`persistTravelMode('vacation');_dayCfgCache={};window.vacationReview=weekReview();persistTravelMode('work');_dayCfgCache={};window.workReview=weekReview();`);
 assert.deepEqual(a.read('window.vacationReview.cur.slice(0,6)'),a.read('window.workReview.cur.slice(0,6)'));
 assert.equal(a.read('JSON.stringify([CFG.log,_state])'),a.read('window.before'));
 a.run(`CFG.log=[{from:'0001-01-01',h:{},order:[],subs:[],mode:'work'}];CFG.h={};CFG.order=[];_dayCfgCache={};window.empty=weekReview();`);
 assert.equal(a.read('window.empty.avg'),0);assert.deepEqual(a.read('window.empty.tally'),[]);
});
test('blocked config edit never queues a settings write and preserves account-owned drafts',()=>{
 const a=loadApp();a.run(`USER={id:'A'};_cfgReady=false;window.before=JSON.stringify(CFG);cfgSet('meditation','pWork','90');`);
 assert.equal(a.read('JSON.stringify(CFG)'),a.read('window.before'));assert.equal(a.read('_cfgDraft'),null);
 assert.deepEqual(a.writes,[]);
 a.run(`_cfgReady=true;_cfgConflict=true;_cfgDraft={marker:'Keep A draft'};cfgLevel('meditation',3);`);
 assert.deepEqual(a.read('_cfgDraft'),{marker:'Keep A draft'});assert.equal(a.read('JSON.stringify(CFG)'),a.read('window.before'));
});
