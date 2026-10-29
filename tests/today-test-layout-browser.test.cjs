const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
test('TEST desktop grid, real Log navigation and responsive widths',async t=>{
 const page=await openApp(t);await page.evaluate(()=>setTab('today'));
 for(const width of [320,390,879,1024,1180,1440,1920]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.querySelector('#scroll').scrollWidth<=document.querySelector('#scroll').clientWidth+1),true,'overflow '+width);
  if(width>=1180){
   const boxes=await page.evaluate(()=>['.t-rout','.t-lvl2','.t-lvl3','.t-social-independent','.t-note'].map(s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,w:b.width}}));
   assert.ok(Math.abs(boxes[0].y-boxes[1].y)<2&&Math.abs(boxes[1].y-boxes[2].y)<2,JSON.stringify(boxes));
   assert.ok(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x);
   assert.ok(Math.abs(boxes[3].y-boxes[4].y)<2);
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/today-test-desktop.png',fullPage:true});
 await page.locator('.today-log-start').click();assert.equal(await page.evaluate(()=>currentTab),'log');
 await page.locator('#nav [data-tab="today"]').click();assert.equal(await page.evaluate(()=>currentTab),'today');
});
