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
  const card=page.locator('.history-week-card, .hw-day').nth(1);
  const box=await card.boundingBox();
  await page.mouse.click(box.x+box.width*0.3,box.y+box.height-12);
  assert.ok(await page.evaluate(()=>!!editDayKey),'edit day opened');
  await page.evaluate(()=>{closeEditDay();});
  await page.locator('.history-week-card, .hw-day').nth(1).focus();await page.keyboard.press('Enter');
  assert.ok(await page.evaluate(()=>!!editDayKey),'keyboard opens too');
});
test('History week (desktop): List by default, switch to Cards / Table; mobile keeps the list without switch',async t=>{
  const page=await openApp(t,undefined,{width:1600,height:900});
  await page.evaluate(()=>{try{localStorage.removeItem('shaah_hist_week_variant')}catch(_){};setTab('history');setHistTab('week');});
  assert.equal(await page.locator('.history-week-card').count(),7);
  assert.equal(await page.locator('.hw-variant button').count(),3);
  await page.locator('.hw-variant button[aria-label="Cards"]').click();
  assert.equal(await page.locator('.hw-day').count(),7);
  await page.locator('.hw-variant button[aria-label="Table"]').click();
  assert.equal(await page.locator('.hm-day').count(),7);
  await page.locator('.hw-variant button[aria-label="Cards"]').click();
  assert.equal(await page.locator('.hw-day').count(),7);
  assert.equal(await page.locator('.hw-stat').count(),4);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  assert.equal(await page.locator('.hw-day').count(),0);
  assert.equal(await page.locator('.history-week-card').count(),7);
  assert.equal(await page.locator('.hw-variant').count(),0);
});
test('History week B: habits x days matrix fills the screen without scrolling',async t=>{
  const page=await openApp(t,undefined,{width:1600,height:900});
  await page.evaluate(()=>{setTab('history');setHistTab('week');setHistWeekVariant('table');});
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.hm-day').count(),7);
  assert.ok(await page.locator('.hm-cell').count()>=7);
  const s=await page.evaluate(()=>{const s=document.getElementById('scroll');return [s.scrollHeight,s.clientHeight]});
  assert.ok(s[0]<=s[1],'no vertical scroll '+s);
  await page.locator('.hm-day').nth(2).click();
  assert.ok(await page.evaluate(()=>!!editDayKey));
  await page.evaluate(()=>{closeEditDay();setHistWeekVariant('list');});
});
test('History week Cards: a Day Note box under each day card, clickable, no page scroll',async t=>{
  const page=await openApp(t,undefined,{width:1600,height:900});
  await page.evaluate(()=>{setTab('history');setHistTab('week');setHistWeekVariant('cards');});
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.hw-noteb').count(),7);
  assert.equal(await page.locator('.hw-day .hw-note').count(),0);
  const s=await page.evaluate(()=>{const s=document.getElementById('scroll');return [s.scrollHeight,s.clientHeight]});
  assert.ok(s[0]<=s[1],'no vertical scroll '+s);
  await page.locator('.hw-noteb').nth(5).click();
  assert.ok(await page.evaluate(()=>!!editDayKey));
  await page.evaluate(()=>{closeEditDay();setHistWeekVariant('list');});
});
test('History week List (desktop): one compact row per day, the 7 days fit without scrolling',async t=>{
  for(const [w,h] of [[1600,900],[1280,720]]){
    const page=await openApp(t,undefined,{width:w,height:h});
    await page.evaluate(()=>{setLayout('pro');setTab('history');setHistTab('week');setHistWeekVariant('list');});
    assert.equal(await page.locator('.history-week-list.hw-wide .history-week-card').count(),7);
    const s=await page.evaluate(()=>{const s=document.getElementById('scroll');return [s.scrollHeight,s.clientHeight]});
    assert.ok(s[0]<=s[1],`no vertical scroll at ${w}x${h}: `+s);
  }
});
test('History week List (mobile): compact cards, the 7 days fit a 390x844 screen',async t=>{
  const page=await openApp(t,undefined,{width:390,height:844});
  await page.evaluate(()=>{setTab('history');setHistTab('week');});
  assert.equal(await page.locator('.history-week-list.hw-compact .history-week-card').count(),7);
  const s=await page.evaluate(()=>{const s=document.getElementById('scroll');return [s.scrollHeight,s.clientHeight]});
  assert.ok(s[0]<=s[1],'no vertical scroll: '+s);
});
