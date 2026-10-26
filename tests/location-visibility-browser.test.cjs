const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');
for (const width of [390, 1440]) {
 test(`${width}px: Location visibility preserves Family, focus, data and scoring`, async t => {
  const data=locationFixture();
  data.config.people.push({id:'family-test',name:'Family fixture',sub:'family',relationship:'family',every:30,locations:['pa']});
  const page=await openApp(t,data,{width,height:900});
  const snapshot=()=>page.evaluate(()=>JSON.stringify({cfg:CFG,state:_state,score:calcScore('2026-09-16'),suggestions:socialSuggestionList(),writes:window.__mockWrites}));
  const before=await snapshot();
  const select=page.getByRole('combobox',{name:'Current social location'});
  assert.equal(await select.inputValue(),'il');
  assert.ok((await page.locator('.w-name').allTextContents()).includes('Family fixture'));
  const box=await select.boundingBox(),button=await page.getByRole('button',{name:'Hide Location',exact:true}).boundingBox();
  assert.ok(button.x>=box.x+box.width&&Math.abs(button.y-box.y)<10);
  await page.getByRole('button',{name:'Hide Location',exact:true}).click();
  assert.equal(await select.isVisible(),false);
  assert.equal(await snapshot(),before);
  await page.getByRole('button',{name:'Show Location',exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.equal(await select.isVisible(),true);
  assert.equal(await select.inputValue(),'il');
  assert.equal(await snapshot(),before);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await select.selectOption('pa');
  const changed=await snapshot();
  await page.getByRole('button',{name:'Hide Location',exact:true}).click();
  await page.getByRole('button',{name:'Show Location',exact:true}).click();
  assert.equal(await select.inputValue(),'pa');
  assert.equal(await snapshot(),changed);
  await page.screenshot({path:require('node:path').join(__dirname,'..','docs',`location-visibility-${width}.png`)});
 });
}
