const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
for(const width of [320,390,879])test(`Transparent Aurora score strip and white progress at ${width}`,async t=>{
  const p=await openApp(t,undefined,{width,height:1000});
  await p.evaluate(()=>{setSkin('aurora');setTab('today')});
  const inspect=()=>p.locator('#tb-score').evaluate(e=>{
    const css=getComputedStyle(e),fill=getComputedStyle(e.querySelector('.ts-bar>i'));
    return {background:css.backgroundColor,image:css.backgroundImage,blur:css.backdropFilter,border:css.borderBottomColor,fill:fill.backgroundColor,percentage:getComputedStyle(e.querySelector('.ts-p')).color,height:e.getBoundingClientRect().height,overflow:document.querySelector('#scroll').scrollWidth>innerWidth};
  });
  const state=await inspect();
  assert.equal(state.background,'rgba(0, 0, 0, 0)');assert.equal(state.image,'none');assert.equal(state.blur,'none');assert.equal(state.border,'rgba(0, 0, 0, 0)');
  assert.equal(state.fill,'rgb(255, 255, 255)');assert.equal(state.percentage,'rgb(255, 255, 255)');assert.equal(state.height,44);assert.equal(state.overflow,false);
  if(width===390)await p.screenshot({path:'docs/phase2/aurora-transparent-empty-390.png'});
  await p.locator('.wg-card').click();
  await p.waitForFunction(()=>!_pending[todayKey()]);
  assert.equal((await inspect()).fill,'rgb(255, 255, 255)');
  if(width===390){
    await p.screenshot({path:'docs/phase2/aurora-transparent-progress-390.png'});
    await p.locator('#tb-score').screenshot({path:'docs/phase2/aurora-transparent-strip.png'});
  }
});
