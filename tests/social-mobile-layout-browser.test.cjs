const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { openApp } = require('./browser-helpers.cjs');

test('WHO TO SEE has two mobile rows, proportional pills and unchanged desktop layout', async t => {
  const page = await openApp(t);
  const snapshot = () => page.locator('.sd-contact').evaluateAll(cards => cards.map(c => {
    const rect = s => { const r=c.querySelector(s).getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; };
    return { card:c.getBoundingClientRect().toJSON(), icon:rect('.sd-icon'), name:rect('.w-name'), pill:rect('.sd-time-pill'), edit:rect('.sd-edit'), when:getComputedStyle(c.querySelector('.w-when')).display, fill:c.querySelector('.sd-pill-fill').getBoundingClientRect().width/c.querySelector('.sd-time-pill').clientWidth };
  }));
  const desktop = await snapshot();
  for (const width of [320,390,600]) {
    await page.setViewportSize({width,height:900});
    const cards = await snapshot();
    assert.equal(cards.length,3);
    assert.equal(new Set(cards.map(c=>c.card.y)).size,1,'three contacts in one row');
    for (const [i,c] of cards.entries()) {
      assert.equal(c.when,'none');
      assert.ok(Math.abs(c.name.x+c.name.w/2-(c.card.x+c.card.width/2))<1,'name centered '+JSON.stringify(c));
      assert.ok(c.icon.x<c.name.x,'symbol on left');
      assert.ok(c.pill.y>c.name.y,'pill on second row');
      assert.ok(Math.abs(c.edit.y-c.pill.y)<1,'edit aligned with pill');
      assert.ok(c.pill.x+c.pill.w<=c.edit.x+1,'pill does not overlap edit');
      assert.ok(Math.abs(c.fill-desktop[i].fill)<.02,'proportional fill preserved');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/shaah-who-mobile.png',fullPage:true});
  for (const width of [601,880,1440]) {
    await page.setViewportSize({width,height:1000});
    const current = await snapshot();
    const baselineCSS = fs.readFileSync(require('node:path').join(__dirname,'../assets/app.3c606c176dc83f03.css'),'utf8');
    await page.route('**/assets/app.*.css',route=>route.fulfill({contentType:'text/css',body:baselineCSS}));
    // Remove SRI only in the intercepted test HTML to load the baseline bytes.
    const originalHTML = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
    await page.route('http://shaah.test/',route=>route.fulfill({contentType:'text/html',body:originalHTML.replace(/(<link[^>]*app\.[a-f0-9]+\.css[^>]*?) integrity="[^"]*"/, '$1')}));
    await page.reload();
    await page.waitForFunction(()=>_cfgReady&&_live);
    await page.locator('.nav-btn[data-tab="social"]').click();
    assert.deepEqual(current,await snapshot(),`desktop unchanged at ${width}px`);
    await page.unroute('**/assets/app.*.css');
    await page.unroute('http://shaah.test/');
    await page.reload();
    await page.waitForFunction(()=>_cfgReady&&_live);
    await page.locator('.nav-btn[data-tab="social"]').click();
  }
  await page.setViewportSize({width:390,height:844});
  const history = await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey()))));
  await page.locator('.sd-person').first().click();
  assert.ok((await page.evaluate(()=>getPeople(todayKey()))).length>0,'encounter button works');
  assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey())))),history);
  await page.locator('.sd-edit').first().click();
  assert.ok(await page.locator('.sf-field').count()>0,'edit button opens editor');
});
