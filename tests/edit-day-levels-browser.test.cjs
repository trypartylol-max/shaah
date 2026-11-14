const {test}=require('node:test');const assert=require('node:assert');
const {openApp}=require('./browser-helpers.cjs');
for(const [w,h] of [[1280,720],[2560,1440]])test(`Edit day: one screen, levels always open (${w}x${h})`,async t=>{
  const page=await openApp(t,undefined,{width:w,height:h});
  await page.evaluate(()=>{setLayout('pro');lvlOpen={1:true,2:false,3:false};setTab('history');openEditDay('2026-10-15');});
  for(const n of [1,2,3])assert.equal(await page.locator(`.t-lvl${n} .lvl-b`).getAttribute('class'),'lvl-b');
  await page.evaluate(()=>toggleLvl(2));
  assert.equal(await page.locator('.t-lvl2 .lvl-b').getAttribute('class'),'lvl-b');
  assert.equal(await page.locator('.history-day-editor .lvl-ar').first().isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>lvlOpen),{1:true,2:false,3:false});
  assert.equal(await page.evaluate(()=>document.querySelector('.edit-day-screen>div').getBoundingClientRect().top),0);
  const s=await page.evaluate(()=>{const s=document.getElementById('scroll');return [s.scrollHeight,s.clientHeight]});
  assert.ok(s[0]<=s[1],'no vertical scroll '+s);
  assert.equal(await page.locator('#nav').isVisible(),true,'dock / sidebar stays');
});
test('History week: clicking anywhere on a day card opens that day',async t=>{
  const page=await openApp(t,undefined,{width:1440,height:900});
  await page.evaluate(()=>{setTab('history');setHistTab('week');});
  const card=page.locator('.hw-row').nth(1);
  const box=await card.boundingBox();
  await page.mouse.click(box.x+box.width*0.3,box.y+box.height-12);
  assert.ok(await page.evaluate(()=>!!editDayKey),'edit day opened');
  await page.evaluate(()=>{closeEditDay();});
  await page.locator('.hw-row').nth(1).focus();await page.keyboard.press('Enter');
  assert.ok(await page.evaluate(()=>!!editDayKey),'keyboard opens too');
});
