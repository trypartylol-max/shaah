const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');

test('Stats only transitions changed bars and respects quiet preferences',async t=>{
 const page=await openApp(t,undefined,{width:1440,height:900},{stayOnToday:true});
 await page.evaluate(()=>{arrivalDismiss();setSkin('classic');setTab('stats');});
 const active=()=>[...document.querySelectorAll('[data-stats-bar]')].filter(node=>node.getAnimations().length).length;
 assert.equal(await page.evaluate(active),0);
 await page.locator('.stats-details:not(.pro-week-comparison) summary').click();
 const moving=await page.evaluate(()=>{
  setChecked(todayKey(),{meditation:true});render();
  return [...document.querySelectorAll('[data-stats-bar]')].filter(node=>node.getAnimations().length).length;
 });
 assert.ok(moving>0);
 assert.equal(await page.locator('.stats-details:not(.pro-week-comparison)').evaluate(node=>node.open),true);
 const quiet=async skin=>page.evaluate(skin=>{
  setSkin(skin);
  setChecked(todayKey(),{meditation:!getChecked(todayKey()).meditation});render();
  return [...document.querySelectorAll('[data-stats-bar]')].some(node=>node.getAnimations().length);
 },skin);
 assert.equal(await quiet('minimal'),false);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await quiet('classic'),false);
});
