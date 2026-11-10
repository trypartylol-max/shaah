const test=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');

// Owner decision 2026-11-10: level 2 and 3 headings use the Social Combo title size.
for(const skin of ['classic','aurora','matrix','minimal'])for(const width of [390,1440])
test(`${skin} ${width}: level headings match the Social Combo title size`,async t=>{
  const page=await openApp(t,locationFixture(),{width,height:1000});
  await page.evaluate(s=>{setSkin(s);setTab('today');},skin);
  const size=selector=>page.locator(selector).first().evaluate(e=>getComputedStyle(e).fontSize);
  const combo=await size('.sf-combo-heading strong');
  assert.equal(await size('.t-lvl2 .lvl-toggle'),combo);
  assert.equal(await size('.t-lvl3 .lvl-toggle'),combo);
});
