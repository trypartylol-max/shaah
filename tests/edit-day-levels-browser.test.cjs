const {test}=require('node:test');const assert=require('node:assert');
const {openApp}=require(process.cwd()+'/tests/browser-helpers.cjs');
test('edit day levels',async t=>{
  const page=await openApp(t,undefined,{width:2560,height:1440});
  await page.evaluate(()=>{setLayout('pro');lvlOpen={1:true,2:false,3:false};setTab('history');openEditDay('2026-10-15');});
  for(const n of [1,2,3])assert.equal(await page.locator(`.t-lvl${n} .lvl-b`).getAttribute('class'),'lvl-b');
  await page.click('.t-lvl2 .lvl-toggle');
  assert.equal(await page.locator('.t-lvl2 .lvl-b').getAttribute('class'),'lvl-b cl');
  assert.deepEqual(await page.evaluate(()=>lvlOpen),{1:true,2:false,3:false});
  assert.equal(await page.evaluate(()=>document.querySelector('.edit-day-screen>div').getBoundingClientRect().top),0);
  await page.evaluate(()=>{closeEditDay();setTab('today');});
  assert.equal(await page.locator('.t-lvl2 .lvl-b').first().getAttribute('class'),'lvl-b cl');
});
