const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
for(const width of [320,390,768,880,1440])test(`Stats Minimal readable and read-only at ${width}px`,async t=>{
 const page=await openApp(t,undefined,{width,height:1000});
 await page.waitForTimeout(2300);
 await page.evaluate(()=>setTab('stats'));
 const before=await page.evaluate(()=>JSON.stringify({state:_state,cfg:CFG}));
 for(const skin of ['classic','aurora','glow','matrix','minimal']){
  await page.evaluate(skin=>setSkin(skin),skin);
  assert.equal(await page.locator('.stats-four-grid .stats-metric-card').count(),4);
  assert.equal(await page.locator('.stats-details:not(.pro-week-comparison)').getAttribute('open'),null);
  await page.locator('.stats-details:not(.pro-week-comparison) summary').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.stats-details:not(.pro-week-comparison)').getAttribute('open'),'');
  assert.equal(await page.getByText('MOST CONSISTENT',{exact:true}).count(),1);
  assert.equal(await page.getByText('NEEDS WORK',{exact:true}).count(),1);
  const issues=await page.evaluate(()=>({overflow:document.querySelector('#scroll').scrollWidth>innerWidth,clipped:[...document.querySelectorAll('.stats-four-grid .stats-metric-label,.stats-four-grid .stats-metric-sub')].filter(el=>el.scrollWidth>el.clientWidth+1||parseFloat(getComputedStyle(el).fontSize)<13).map(el=>el.textContent)}));
  assert.deepEqual(issues,{overflow:false,clipped:[]},skin);
  await page.keyboard.press('Enter');
 }
 // Skin changes may alter preferences, so compare recorded history separately.
 assert.equal(await page.evaluate(()=>JSON.stringify(_state)),JSON.stringify(JSON.parse(before).state));
 if(width===390||width===1440)await page.screenshot({path:`docs/stats-minimal-${width}.png`,fullPage:true});
});
