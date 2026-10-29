const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs'),{loadApp}=require('./helpers.cjs');
test('desktop Core header and controls, visible WORK and mobile preservation',async t=>{
 const a=loadApp();a.run(`for(const id of ['production','wod'])CFG.h[id]={...LEGACY_CFG.h[id],pWork:15,pVacation:15};CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order]};CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;`);
 a.run("CFG.workMilestones=[{from:'2026-10-16',steps:[{amount:350,points:10},{amount:650,points:10},{amount:800,points:5}]}]");
 const p=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});await p.evaluate(()=>{setTab('today');todayRoutinesOpen=true;render()});const results=[];
 for(const skin of ['classic','glow','aurora','matrix','minimal'])for(const width of [320,390,879,880,1024,1200,1440,1920]){
  await p.setViewportSize({width,height:1000});await p.evaluate(s=>setSkin(s),skin);
  const m=await p.evaluate(()=>{const b=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cy:r.y+r.height/2}},work=document.querySelector('.wg-card'),svg=work.querySelector('.wg-figure');return {width:innerWidth,triangle:b(svg.querySelector('polygon')),work:b(work),row:b(work.querySelector('.wg-row')),svg:b(svg),cards:[...document.querySelectorAll('.cr-compact-card')].map(e=>({id:e.dataset.routineCard,box:b(e),name:b(e.querySelector('.cr-routine-name')),summary:b(e.querySelector('.r-sub')),metadataFont:parseFloat(getComputedStyle(e.querySelector('.r-sub')).fontSize),pointsFont:parseFloat(getComputedStyle(e.querySelector('.sf-routine-total')).fontSize),font:parseFloat(getComputedStyle(e.querySelector('.cr-routine-name')).fontSize),truncated:e.querySelector('.cr-routine-name').scrollWidth>e.querySelector('.cr-routine-name').clientWidth+1,buttons:[...e.querySelectorAll('button')].map(b),overflow:e.scrollWidth>e.clientWidth+1})),overflow:document.documentElement.scrollWidth>innerWidth}});
  results.push({skin,...m});assert.ok(Math.abs(m.triangle.w-84)<.05);assert.equal(m.overflow,false);
  for(const c of m.cards){assert.equal(c.overflow,false);if(width>=880){if(width>=1200)assert.ok(Math.abs(c.name.cy-c.summary.cy)<2,JSON.stringify({skin,width,c}));assert.ok(c.metadataFont>=14);assert.ok(c.pointsFont>=14);assert.ok(c.buttons.every(b=>b.h>=56));assert.equal(c.truncated,false,JSON.stringify({skin,width,c}));}else assert.ok(c.buttons.every(b=>Math.abs(b.h-44)<1));}
  if(width>=880)assert.ok(Math.abs(m.svg.cy-m.work.cy)<1);
  if(skin==='classic'&&[390,880,1440].includes(width)){fs.mkdirSync('docs/core-header',{recursive:true});await p.locator('.t-rout-body').screenshot({path:`docs/core-header/core-${width}.png`});}
 }
 fs.writeFileSync('docs/core-header/measurements.json',JSON.stringify(results,null,2)+'\n');
});
