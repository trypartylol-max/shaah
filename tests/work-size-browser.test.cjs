const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const {loadApp}=require('./helpers.cjs');
test('WORK visible size and grid across skins and responsive boundaries',async t=>{
 const a=loadApp();a.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config");
 const p=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 await p.locator('.nav-btn[data-tab="today"]').click();
 await p.evaluate(()=>{todayRoutinesOpen=true;render();});
 const measures=[];
 for(const skin of ['classic','glow','aurora','matrix','minimal'])for(const width of [320,375,390,600,879,880,1024,1440]){
  await p.setViewportSize({width,height:1000});await p.evaluate(s=>setSkin(s),skin);
  const m=await p.locator('.wg-card').evaluate(e=>{const s=e.querySelector('.wg-figure'),r=s.getBoundingClientRect(),c=e.getBoundingClientRect(),p=s.querySelector('polygon').getBoundingClientRect();return {triangleWidth:p.width,triangleHeight:p.height,triangleInside:p.left-4>=c.left&&p.right+4<=c.right&&p.top-4>=c.top&&p.bottom+4<=c.bottom,w:r.width,h:r.height,top:r.top-c.top,bottom:r.bottom-c.bottom,card:c.height,track:getComputedStyle(e.querySelector('.wg-row')).gridTemplateColumns.split(' ')[1],overflow:e.scrollWidth>e.clientWidth+1||document.documentElement.scrollWidth>innerWidth,inside:r.top>=c.top&&r.bottom<=c.bottom,visible:getComputedStyle(s).visibility};});
  measures.push({skin,width,...m});
  assert.equal(m.w,84,JSON.stringify({skin,width,m}));assert.ok(Math.abs(m.triangleWidth-(84))<.05,JSON.stringify({skin,width,m}));assert.equal(m.triangleInside,true,JSON.stringify({skin,width,m}));assert.equal(m.h,m.w);assert.equal(m.track,m.w+'px');assert.equal(m.overflow,false);assert.equal(m.inside,true,JSON.stringify({skin,width,m}));assert.equal(m.visible,'visible');
  if(skin==='classic'&&[390,1440].includes(width)){fs.mkdirSync('docs/work-size',{recursive:true});await p.locator('.wg-card').screenshot({path:`docs/work-size/work-${width}.png`});}
 }
 fs.writeFileSync('docs/work-size/measurements.json',JSON.stringify(measures,null,2)+'\n');
});
