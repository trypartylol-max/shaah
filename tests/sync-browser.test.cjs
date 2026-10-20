const test=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');

test('browser: disjoint edits merge; a real conflict survives reload and resolves by user choice',async t=>{
  const a=await openApp(t,locationFixture());
  const b=await a.context().newPage();
  const errors=[];b.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[]));
  b.on('dialog',d=>d.accept());
  // The context already owns the fixed clock installed by openApp. WebKit's
  // initial about:blank page has no controller until its first navigation.
  await b.goto('http://shaah.test/');await b.waitForFunction(()=>_cfgReady&&_live);
  assert.equal(await b.evaluate(()=>new Date().toISOString()),'2026-10-16T12:00:00.000Z');
  await a.evaluate(async()=>{personSet('pold01','name','First shared edit');await flushCfgSaves();});
  await b.evaluate(async()=>{personSet('pold02','every',77);await flushCfgSaves();});
  let remote=await b.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date==='settings').data._cfg);
  assert.equal(remote.people[0].name,'First shared edit');assert.equal(remote.people[1].every,77);
  await a.evaluate(async()=>{personSet('pold01','name','Server choice');await flushCfgSaves();});
  await b.evaluate(async()=>{personSet('pold01','name','Local choice');await flushCfgSaves();});
  assert.match(await b.locator('#sync-notice').innerText(),/Settings changed on another device/);
  await b.reload();await b.waitForFunction(()=>_cfgReady&&_cfgConflict);
  assert.equal(await b.evaluate(()=>personById('pold01').name),'Local choice');
  await b.getByRole('button',{name:'Keep this device’s settings',exact:true}).click();
  await b.waitForFunction(()=>!_cfgDraft&&!_cfgConflict);
  remote=await b.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date==='settings').data._cfg);
  assert.equal(remote.people[0].name,'Local choice');assert.equal(remote.people[1].every,77);
  assert.equal(await b.evaluate(()=>calcScore('2026-09-16').score),7);
  assert.equal(await b.evaluate(()=>calcScore('2026-10-08').score),27);
  await a.reload();await a.waitForFunction(()=>_cfgReady);
  await a.evaluate(async()=>{personSet('pold01','name','Use this server version');await flushCfgSaves();});
  await b.evaluate(async()=>{personSet('pold01','name','Local version for backup');await flushCfgSaves();});
  await b.getByRole('button',{name:'Use saved settings',exact:true}).click();
  await b.waitForFunction(()=>!_cfgDraft&&!_cfgConflict);
  assert.equal(await b.evaluate(()=>personById('pold01').name),'Use this server version');
  assert.equal(await b.evaluate(()=>_bak.some(x=>JSON.parse(x.cfg).people[0].name==='Local version for backup')),true);
});

test('browser: legacy unowned queue is retained, explained and exportable without automatic upload',async t=>{
  const page=await openApp(t,locationFixture(),{width:390,height:844});
  await page.evaluate(()=>{localStorage.setItem('shaah-offline-day-writes',JSON.stringify({'2026-10-16':{data:{_note:'Unowned synthetic note'}}}));render();});
  assert.match(await page.locator('#sync-notice').innerText(),/account could not be verified/);
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export unsynced entries',exact:true}).click();
  const file=await download;assert.equal(file.suggestedFilename(),'shaah-unassigned-unsynced.json');
  const stream=await file.createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  assert.equal(payload.owner,null);assert.equal(payload.offlineWrites['2026-10-16'].data._note,'Unowned synthetic note');
  await page.evaluate(()=>flushOfflineQueue());
  assert.equal(await page.evaluate(()=>window.__mockWrites.some(r=>r.data._note==='Unowned synthetic note')),false);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah-offline-day-writes'))['2026-10-16'].data._note),'Unowned synthetic note');
});
