const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {fixture}=require('./helpers.cjs');
const { openApp } = require('./browser-helpers.cjs');

test('WHO TO SEE has two mobile rows, proportional pills and unchanged desktop layout', async t => {
  const page = await openApp(t);
  const snapshot = (target=page) => target.locator('.sd-contact').evaluateAll(cards => cards.map(c => {
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
  const baseline=await openApp(t,fixture(),{width:601,height:1000},{htmlFile:path.join(__dirname,'fixtures/production-before-pr16.html'),assetsRoot:path.join(__dirname,'..')});
  for(const target of [page,baseline]){await target.emulateMedia({reducedMotion:'reduce'});await target.evaluate(()=>document.fonts.ready);}
  for(const width of [601,880,1440]){
    await page.setViewportSize({width,height:1000});await baseline.setViewportSize({width,height:1000});
    assert.deepEqual(await snapshot(),await snapshot(baseline),`desktop unchanged at ${width}px`);
  }
  await page.setViewportSize({width:390,height:844});
  const history = await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey()))));
  await page.locator('.sd-person').first().click();
  assert.ok((await page.evaluate(()=>getPeople(todayKey()))).length>0,'encounter button works');
  assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey())))),history);
  await page.locator('.sd-edit').first().click();
  assert.ok(await page.locator('.sf-field').count()>0,'edit button opens editor');
});
