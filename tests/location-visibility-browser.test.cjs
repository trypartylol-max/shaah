const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');
for (const width of [320, 390, 1440]) {
 test(`${width}px: Family filters recommendations only, with fixed toolbar and unchanged Location`, async t => {
  const data=locationFixture();
  data.config.people.push(
   {id:'family-test',name:'Family fixture',sub:'family',relationship:'family',every:30,locations:['pa']},
   {id:'family-legacy',name:'Legacy family fixture',sub:'friends',relationship:'family',every:180,locations:['pa']},
   {id:'family-pending',name:'Pending family fixture',sub:'__family_pending',every:180,locations:['pa']}
  );
  const page=await openApp(t,data,{width,height:900});
  const snapshot=()=>page.evaluate(()=>JSON.stringify({cfg:CFG,state:_state,score:calcScore('2026-09-16'),todayScore:calcScore(todayKey()),writes:window.__mockWrites}));
  const names=()=>page.locator('.w-name').allTextContents();
  const select=page.getByRole('combobox',{name:'Current social location'});
  const button=page.getByRole('button',{name:'Family',exact:true});
  const geometry=async()=>({select:await select.boundingBox(),button:await button.boundingBox()});
  const family=['Family fixture','Legacy family fixture','Pending family fixture'];
  const initial=await names(),friends=initial.filter(n=>!family.includes(n));
  for(const name of family)assert.ok(initial.includes(name));
  const before=await snapshot(),layout=await geometry();
  const onColor=await button.evaluate(e=>getComputedStyle(e).backgroundColor);
  assert.equal(await button.getAttribute('aria-pressed'),'true');
  assert.equal(await button.textContent(),'Family');
  assert.ok(layout.button.x>=layout.select.x+layout.select.width&&Math.abs(layout.button.y-layout.select.y)<10);
  await button.click();
  assert.equal(await button.getAttribute('aria-pressed'),'false');
  assert.notEqual(await button.evaluate(e=>getComputedStyle(e).backgroundColor),onColor);
  assert.deepEqual(await names(),friends);
  assert.equal(await select.isVisible(),true);
  assert.equal(await select.inputValue(),'il');
  assert.deepEqual(await geometry(),layout);
  assert.equal(await snapshot(),before);
  await page.screenshot({path:require('node:path').join(__dirname,'..','docs',`family-off-${width}.png`)});
  await button.press('Enter');
  assert.equal(await button.getAttribute('aria-pressed'),'true');
  assert.deepEqual(await names(),initial);
  assert.deepEqual(await geometry(),layout);
  assert.equal(await snapshot(),before);
  // The location continues to filter non-family contacts in both toggle states.
  await select.selectOption('pa');
  const changed=await snapshot(),paNames=await names();
  await button.click();
  assert.deepEqual(await names(),paNames.filter(n=>!family.includes(n)));
  assert.equal(await select.isVisible(),true);
  assert.equal(await select.inputValue(),'pa');
  assert.equal(await snapshot(),changed);
  await select.selectOption('all');
  for(const name of family)assert.ok(!(await names()).includes(name));
  await button.click();
  for(const name of family)assert.ok((await names()).includes(name));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:require('node:path').join(__dirname,'..','docs',`family-on-${width}.png`)});
 });
}
