const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
test('Social header geometry and navigation at mobile and desktop widths',async t=>{
 const page=await openApp(t);
 const snap=()=>page.evaluate(()=>{
  const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
  return {bar:rect('.sd-bar'),title:rect('section[aria-label="Who to See"]>h2'),parent:rect('.soc>div:first-child'),pct:getComputedStyle(document.querySelector('.sd-pts')).display,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 const state=await page.evaluate(()=>JSON.stringify(_state));
 for(const width of [320,390,600,879,880,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});
  // display-adaptation.js re-zooms large viewports on resize; let it settle so both snapshots share the same zoom.
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,60)))));
  const current=await snap();
  const baseline=await page.evaluate(()=>{
   const sheet=[...document.styleSheets].find(s=>s.href&&s.href.includes('/assets/app.'));
   // The header rule is the last one of the base stylesheet, just before the first merged section.
   window.headerIndex=[...sheet.cssRules].findIndex(r=>/^shaah-section\[/.test(r.selectorText||''))-1;
   window.headerRule=sheet.cssRules[window.headerIndex].cssText;
   sheet.deleteRule(window.headerIndex);
  });
  const old=await snap();
  await page.evaluate(()=>{const sheet=[...document.styleSheets].find(s=>s.href&&s.href.includes('/assets/app.'));sheet.insertRule(window.headerRule,window.headerIndex)});
  if(width<880)assert.deepEqual(current,old,'mobile unchanged by desktop rule');
  {
   assert.ok(Math.abs(current.bar.x+current.bar.width/2-current.parent.x-current.parent.width/2)<1,'centered selector');
   assert.ok(Math.abs(current.bar.y+current.bar.height/2-current.title.y-current.title.height/2)<1,'same row');
   assert.equal(current.title.x,old.title.x,'title horizontal position preserved');
   assert.equal(current.pct,'none');assert.equal(current.overflow,false);
   await page.locator('.sd-nav').first().click();
   assert.equal(await page.locator('.sd-nav').last().isEnabled(),true);
   const historical=await snap();
   assert.ok(Math.abs(historical.bar.x+historical.bar.width/2-historical.parent.x-historical.parent.width/2)<1,'historical selector centered');
   assert.ok(!historical.overflow,'no historical overflow');
   await page.locator('.sd-hoy').click();
   assert.equal(await page.locator('.sd-day').textContent(),'TODAY');
  }
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(_state)),state,'navigation does not change records');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/social-header-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:'test-results/social-header-desktop.png',fullPage:true});
});
