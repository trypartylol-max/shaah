const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');

for(const skin of ['matrix','minimal'])test(`${skin}: real incoming changes keep the screen and clean/dirty notes consistent`,async t=>{
  const page=await openApp(t,fixture(),{width:390,height:844});
  await page.evaluate(skin=>{setSkin(skin);setTab('today');window.__screen=document.querySelector('.today');window.__ring=document.querySelector('.t-ring svg');},skin);
  await page.evaluate(()=>__emitMockRealtime({eventType:'UPDATE',new:{user_id:'regression-user',date:todayKey(),data:{_checks:{work:true},_social:blankSocial(),_note:'Synthetic incoming note'}}}));
  assert.equal(await page.locator('textarea').inputValue(),'Synthetic incoming note');
  await page.locator('textarea').fill('Synthetic pending draft');
  await page.evaluate(()=>__emitMockRealtime({eventType:'UPDATE',new:{user_id:'regression-user',date:todayKey(),data:{_checks:{work:0.5},_social:blankSocial(),_note:'Synthetic second incoming note'}}}));
  assert.equal(await page.locator('textarea').inputValue(),'Synthetic pending draft');
  assert.equal(await page.evaluate(()=>__screen===document.querySelector('.today')&&__ring===document.querySelector('.t-ring svg')),true);
  assert.equal(await page.locator('.today').evaluate(node=>getComputedStyle(node).opacity),'1');
  assert.equal(await page.evaluate(()=>__mockWrites.length),0);
});
