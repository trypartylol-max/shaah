const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
test('Social mobile header geometry, navigation and desktop parity',async t=>{
 const page=await openApp(t);
 const snap=()=>page.evaluate(()=>{
  const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
  return {bar:rect('.sd-bar'),title:rect('section[aria-label="Who to See"]>h2'),pct:getComputedStyle(document.querySelector('.sd-pts')).display,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 const state=await page.evaluate(()=>JSON.stringify(_state));
 for(const width of [320,390,600,879,880,1440]){
  await page.setViewportSize({width,height:1000});
  const current=await snap();
  const baseline=await page.evaluate(()=>{
   const sheet=[...document.styleSheets].find(s=>s.href&&s.href.includes('/assets/app.'));
   window.headerRule=sheet.cssRules[sheet.cssRules.length-1].cssText;
   sheet.deleteRule(sheet.cssRules.length-1);
  });
  const old=await snap();
  await page.evaluate(()=>{const sheet=[...document.styleSheets].find(s=>s.href&&s.href.includes('/assets/app.'));sheet.insertRule(window.headerRule,sheet.cssRules.length)});
  if(width>=880)assert.deepEqual(current,old,'desktop unchanged');
  else{
   assert.ok(Math.abs(current.bar.x+current.bar.width/2-width/2)<1,'centered selector');
   assert.ok(Math.abs(current.bar.y+current.bar.height/2-current.title.y-current.title.height/2)<1,'same row');
   assert.equal(current.title.x,old.title.x,'title horizontal position preserved');
   assert.equal(current.pct,'none');assert.equal(current.overflow,false);
   await page.locator('.sd-nav').first().click();
   assert.equal(await page.locator('.sd-nav').last().isEnabled(),true);
   await page.locator('.sd-hoy').click();
   assert.equal(await page.locator('.sd-day').textContent(),'TODAY');
  }
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(_state)),state,'navigation does not change records');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'docs/social-header-mobile.png',fullPage:true});
});
