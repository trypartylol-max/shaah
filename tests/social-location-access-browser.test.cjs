const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('./helpers.cjs');
const {openApp}=require('./browser-helpers.cjs');

test('Strangers respect location and mobile People & Groups remains reachable above the dock',async t=>{
 const data=fixture();
 data.config.locationGroups=[{id:'here',name:'Here'},{id:'away',name:'Away'}];
 data.config.selectedLocation='here';
 data.config.people=[...data.config.people.map(p=>({...p,sub:'friends',locations:['here']})),...Array.from({length:45},(_,i)=>({id:'contact'+i,name:'Contact '+i,sub:i===0?'strangers':'friends',every:14,locations:[i===0?'away':'here']}))];
 const page=await openApp(t,data,{width:390,height:640});
 assert.equal(await page.locator('.sd-contact').count(),47,'out-of-location stranger hidden');
 const before=await page.evaluate(()=>JSON.stringify({people:CFG.people,log:CFG.log,days:_state}));
 await page.locator('select[data-ui-change="locationSelect"]').selectOption('away');
 assert.equal(await page.locator('.sd-contact').count(),1);
 await page.locator('select[data-ui-change="locationSelect"]').selectOption('all');
 assert.equal(await page.locator('.sd-contact').count(),48);
 assert.equal(await page.evaluate(()=>JSON.stringify({people:CFG.people,log:CFG.log,days:_state})),before);
 for(const height of [640,844]){
  await page.setViewportSize({width:390,height});
  await page.locator('#scroll').evaluate(e=>e.scrollTop=e.scrollHeight);
  const toggle=page.locator('.sf-people-toggle');
  const box=await toggle.boundingBox(),nav=await page.locator('#nav').boundingBox();
  assert.ok(box.y>=0&&box.y+box.height<=nav.y,'toggle fully above dock');
  await toggle.click();
  if(await page.locator('#social-directory-toggle').getAttribute('aria-pressed')!=='true')await page.locator('#social-directory-toggle').click();
  await page.locator('.sf-group-add').scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.locator('#scroll').evaluate(e=>e.scrollTop=e.scrollHeight);
  const add=await page.locator('.sf-group-add').boundingBox();
  assert.ok(add.y>=0&&add.y+add.height<=nav.y,'last group action reachable');
  await page.locator('.sf-group-add').click();
  await page.locator('dialog[open]').waitFor();
  await page.keyboard.press('Escape');
  await toggle.click();
 }
});
