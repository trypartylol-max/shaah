const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
test('Appearance presents four skins and a separate desktop layout selector',async t=>{
 const p=await openApp(t,undefined,{width:1440,height:1000});
 await p.getByRole('button',{name:'Settings',exact:true}).click();
 for(const skin of ['classic','aurora','matrix','minimal']){
  await p.locator(`[data-skin-choice="${skin}"]`).click();
  await p.locator('[data-layout-choice="pro"]').click();
  assert.equal(await p.locator('html').getAttribute('data-skin'),skin);
  assert.equal(await p.locator('html').getAttribute('data-layout'),'pro');
  assert.equal(await p.locator('.skin-options [data-skin-choice]').count(),4);
  assert.equal(await p.locator('[data-layout-choice]').count(),2);
  await p.locator('.skin-settings').screenshot({path:`docs/phase4/${skin}-settings.png`});
  await p.locator('[data-layout-choice="standard"]').click();
  assert.equal(await p.locator('html').getAttribute('data-skin'),skin);
 }
});
