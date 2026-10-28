const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');

for(const width of [320,390,600,879,1440])test(`Social capsules preserve geometry and enlarge only labels at ${width}px`,async t=>{
 const page=await openApp(t,undefined,{width,height:1000});
 for(const skin of ['classic','aurora','glow','matrix','minimal']){
  await page.evaluate(id=>{setSkin(id);setTab('social');},skin);
  const beforeData=await page.evaluate(()=>JSON.stringify({cfg:CFG,state:_state}));
  const measure=()=>page.locator('.sd-contact').evaluateAll(els=>els.map(el=>{
   const pill=el.querySelector('.sd-time-pill'),label=pill.querySelector('.sd-pill-label'),s=getComputedStyle(pill),l=getComputedStyle(label),r=pill.getBoundingClientRect(),row=el.getBoundingClientRect();
   return {width:r.width,height:r.height,padding:s.padding,rowWidth:row.width,rowHeight:row.height,font:parseFloat(l.fontSize),background:s.backgroundColor,opacity:getComputedStyle(pill.querySelector('.sd-pill-fill')).opacity,labelColor:l.color};
  }));
  await page.locator('link[href*="social-capsules-20261029.css"]').evaluate(el=>el.disabled=true);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const baseline=await measure();
  await page.locator('link[href*="social-capsules-20261029.css"]').evaluate(el=>el.disabled=false);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const updated=await measure();
  assert.ok(updated.length>0);
  for(let i=0;i<updated.length;i++){
   for(const key of ['width','height','padding','rowWidth','rowHeight'])assert.equal(updated[i][key],baseline[i][key],`${skin}: ${key}`);
   assert.ok(Math.abs(updated[i].font/baseline[i].font-1.175)<.001,`${skin}: exact font increase ${updated[i].font}/${baseline[i].font}`);
   assert.equal(updated[i].background,'rgb(16, 24, 43)');assert.equal(updated[i].opacity,'0.18');
  }
  assert.equal(await page.evaluate(()=>document.getElementById('scroll').scrollWidth<=innerWidth),true);
  assert.equal(await page.evaluate(()=>JSON.stringify({cfg:CFG,state:_state})),beforeData);
 }
});
