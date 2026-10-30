const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
for(const width of [320,390,879,880,1440])test(`hybrid tutorial: eight safe steps at ${width}px`,async t=>{
 const page=await openApp(t,undefined,{width,height:844});
 // Let the existing startup migration/backup finish before measuring tutorial writes.
 await page.waitForTimeout(2300);
 await page.waitForFunction(()=>!_cfgFlushPromise&&!_cfgDraft);
 await page.evaluate(()=>setTab('today'));
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const snapshot=()=>page.evaluate(()=>JSON.stringify({cfg:CFG,state:_state,sessions,queue:_offlineQueue,rows:localStorage.getItem('shaah_mock_rows')}));
 const before=await snapshot(),writes=await page.evaluate(()=>window.__mockWrites.length);
 await page.getByRole('button',{name:/VIEW TUTORIAL/}).click();
 for(const skin of ['classic','aurora','glow','matrix','minimal']){
  await page.evaluate(id=>setSkin(id),skin);
  for(let step=0;step<8;step++){
   assert.equal(await page.evaluate(()=>tourStep),step);
   const box=await page.locator('.tour-card').boundingBox();
   assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=845,`${skin}/${step}: card fits ${JSON.stringify(box)}`);
   assert.equal(await page.locator('#scroll').evaluate(el=>el.inert),true);
   if(step===1)assert.equal(await page.locator('#tour-hole').isVisible(),true);
   if(step===3){await page.locator('#tour-practice').click();assert.equal(await page.locator('#tour-practice').getAttribute('aria-pressed'),'true');await page.locator('#tour-practice').click();}
   if(step===4){await page.locator('#tour-practice').click();await page.locator('#tour-practice').click();await page.getByRole('status').filter({hasText:'Example routine complete'}).waitFor();}
   if(step===5){
    await page.locator('#tour-activity').fill('<img src=x onerror=alert(1)>');await page.locator('#tour-activity').press('Enter');
    assert.equal(await page.locator('.tour-demo img').count(),0);
    await page.locator('#tour-back').click();await page.locator('#tour-next').click();assert.equal(await page.locator('#tour-activity').inputValue(),'<img src=x onerror=alert(1)>');
    await page.locator('#tour-activity').focus();await page.evaluate(()=>render());assert.equal(await page.locator('#tour-activity').evaluate(el=>el===document.activeElement),true);
   }
   assert.ok((await snapshot())===before,'No account/config/history/session/queue changes');
   assert.equal(await page.evaluate(()=>window.__mockWrites.length),writes,'No backend writes');
   if(step===7)break;
   await page.locator('#tour-next').click();
  }
  await page.locator('#tour-next').click();
  assert.equal(await page.locator('#scroll').evaluate(el=>el.inert),false);
  assert.equal(await page.evaluate(()=>settingsOpen),true);
  assert.equal(await page.getByRole('button',{name:/VIEW TUTORIAL/}).evaluate(el=>el===document.activeElement),true);
  assert.ok((await snapshot())===before);
  await page.getByRole('button',{name:/VIEW TUTORIAL/}).click();
 }
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#tour')),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('[role=dialog]').count(),0);
 assert.equal(await page.evaluate(()=>settingsOpen),true);assert.ok((await snapshot())===before);
});
test('tutorial cleanup on account reset and absent spotlight target',async t=>{
 const page=await openApp(t);
 await page.evaluate(()=>{startTour();tourGo(4);document.querySelector('.t-rout-toggle')?.remove();tourPosition();});
 assert.equal(await page.locator('#tour-hole').isVisible(),false);
 await page.evaluate(()=>{tourDemo.log='private example';changeSyncUser(null);render();});
 assert.equal(await page.locator('#tour .tour-card').count(),0);
 assert.equal(await page.locator('#scroll').evaluate(el=>el.inert),false);
 assert.deepEqual(await page.evaluate(()=>tourDemo),{});
});
for(const width of [390,1440])test(`tutorial visual preview and short viewport at ${width}px`,async t=>{
 const page=await openApp(t,undefined,{width,height:844});
 await page.evaluate(()=>{startTour();tourGo(3);});
 await page.screenshot({path:`docs/tutorial-${width}.png`});
 await page.setViewportSize({width,height:400});
 await page.evaluate(()=>tourGo(5));
 const card=await page.locator('.tour-card').boundingBox();
 assert.ok(card.y>=0&&card.y+card.height<=401);
 await page.locator('#tour-activity').fill('Reading');
 await page.locator('#tour-practice').click();
 assert.equal(await page.getByRole('status').filter({hasText:'Added to demo: Reading'}).count(),1);
});
