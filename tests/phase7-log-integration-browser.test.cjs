const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
test('Work and Pro share the Log card without obstructing its circle',async t=>{
 const p=await openApp(t,undefined,{width:1440,height:900},{stayOnToday:true});
 await p.evaluate(()=>{arrivalDismiss();setLayout('pro');setTab('today');});
 for(const width of [1180,1440,1920]){
  await p.setViewportSize({width,height:900});
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const bounds=await p.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
   return {header:rect('#desktop-status-controls'),log:rect('.today-log-start'),circle:rect('.today-log-start>span')};
  });
  const {header,log,circle}=bounds;
  assert.ok(header.left>=log.left-1&&header.right<=log.right+1&&header.top>=log.top&&header.bottom<circle.top,JSON.stringify({width,bounds}));
 }
 await p.locator('#layout-quick-toggle').click();
 assert.equal(await p.locator('html').getAttribute('data-layout'),'standard');
 await p.locator('#layout-quick-toggle').click();
 await p.locator('.today-log-start').click({position:{x:85,y:120}});
 await p.locator('#logPanelName').waitFor();
});
