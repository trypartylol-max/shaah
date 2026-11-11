const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
// A fuller Today: three routines, four LVL 2 habits, three LVL 3 habits and four Social parts.
function fixture(){const a=loadApp();a.run(`for(const id of ['production','wod'])CFG.h[id]={...LEGACY_CFG.h[id],pWork:15,pVacation:15};CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;const add={nofap:['Habit A',10,2],sleep:['Habit B',8,2],pray:['Habit C',8,2],clean:['Bonus A',5,3],nosmoke:['Bonus B',6,3],extra:['Bonus C',3,3]};for(const [k,[l,p,lv]] of Object.entries(add)){CFG.h[k]={l,p,pWork:p,pVacation:p,lv,on:true,i:'*'};CFG.order.push(k)}CFG.subs.push({id:'family',label:'Family',icon:'F',p:2,pWork:2,pVacation:2});for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order];if(e.subs)e.subs=JSON.parse(JSON.stringify(CFG.subs))}`);return {config:a.read('CFG'),days:a.read('_state')};}
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const measure=p=>p.evaluate(()=>{
 const s=document.querySelector('#scroll');s.scrollTop=0;const today=document.querySelector('.today');
 const shown=[...today.children].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0);
 const nav=document.querySelector('#nav').getBoundingClientRect();
 const r=sel=>{const e=[...document.querySelectorAll(sel)].find(x=>x.getClientRects().length);if(!e)return null;const q=e.getBoundingClientRect();return {l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width,h:q.height}};
 return {bottom:Math.max(...shown.map(e=>e.getBoundingClientRect().bottom)),limit:nav.top>innerHeight/2?nav.top:innerHeight,
  wide:s.scrollWidth>innerWidth+1,buttons:[...document.querySelectorAll('[data-routine-card] button')].map(b=>b.getBoundingClientRect().height),
  rows:[...document.querySelectorAll('.today .t-lvl .lvl-b>.row')].filter(e=>e.getClientRects().length).length,
  note:!!document.querySelector('.today .pro-today-grid textarea, .today .t-note:not(.today-box-collapsed) textarea'),
  next:r('.t-grade'),footer:r('.t-grade .ls-footer'),orbCard:r('.cr-log-orb'),orb:r('.cr-orb-button')};
});
for(const [width,height] of [[1280,720],[1366,768],[1280,640],[1440,610]]){
 test(`Today fits one ${width}x${height} screen: Pro with everything open, Standard with only the Day Note closed`,async t=>{
  const p=await openApp(t,fixture(),{width,height},{stayOnToday:true});
  for(const layout of ['pro','standard']){
   for(const orb of [false,true]){
    await p.evaluate(([l,o])=>{arrivalDismiss?.();setLayout(l);setTab('today');todayRoutinesOpen=true;lvlOpen={1:true,2:true,3:true};todayBoxesOpen={social:true,daylog:true,note:l==='pro'};if(o&&!sessions.production){startRoutine('production');routineToggle();exitRoutine();}render()},[layout,orb]);
    await p.waitForTimeout(orb?700:50);await frame(p);
    const m=await measure(p);const ctx=JSON.stringify({layout,orb,width,height,...m});
    assert.ok(m.bottom<=m.limit+1,ctx);
    assert.equal(m.wide,false,ctx);
    assert.equal(m.rows,7,ctx);
    assert.ok(m.buttons.length>=6&&m.buttons.every(h=>h>=44),ctx);
    assert.ok(m.footer.b<=m.next.b+1,ctx);
    if(layout==='pro')assert.equal(m.note,true,ctx);
    if(orb&&layout==='pro')assert.ok(m.orb.t>=m.orbCard.t&&m.orb.b<=m.orbCard.b&&Math.abs(m.orb.w-m.orb.h)<1,ctx);
   }
   await p.evaluate(()=>{if(sessions.production)closeRoutine('production');render()});
  }
 });
}
