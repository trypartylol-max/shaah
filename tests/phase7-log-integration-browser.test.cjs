const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
test('Work/Pro and Day Log are two separate boxes in the Log column',async t=>{
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
  assert.ok(Math.abs(header.left-log.left)<1&&Math.abs(header.right-log.right)<1&&Math.abs(log.top-header.bottom-8)<1&&header.bottom<circle.top,JSON.stringify({width,bounds}));
 }
 await p.locator('#layout-quick-toggle').click();
 assert.equal(await p.locator('html').getAttribute('data-layout'),'standard');
 await p.locator('#layout-quick-toggle').click();
 await p.locator('.today-log-start').click({position:{x:85,y:120}});
 await p.locator('#logPanelName').waitFor();
});

test('Hebrew Pro keeps the mirrored Work/Pro box above the Log box',async t=>{
 const page=await openApp(t,undefined,{width:1440,height:900},{stayOnToday:true});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.locator('[data-interface-language]').selectOption('he');
 await page.getByRole('button',{name:'חזרה',exact:true}).click();
 await page.evaluate(()=>{arrivalDismiss();setLayout('pro');setTab('today');});
 for(const width of [1180,1440,1920]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const header=await page.locator('#desktop-status-controls').boundingBox();
  const log=await page.locator('.today-log-start').boundingBox();
  const circle=await page.locator('.today-log-start>span').boundingBox();
  assert.ok(Math.abs(header.x-log.x)<1&&Math.abs(header.width-log.width)<1&&Math.abs(log.y-(header.y+header.height)-8)<1&&header.y+header.height<circle.y,JSON.stringify({width,header,log,circle}));
 }
 await page.locator('.today-log-start').click({position:{x:85,y:120}});
 await page.locator('#logPanelName').waitFor();
});
