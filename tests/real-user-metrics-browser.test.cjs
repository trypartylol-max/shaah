const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
const {control}=require('./ui-helpers.cjs');
const reportRoot=path.join(__dirname,'../docs/real-user-metrics');
fs.mkdirSync(reportRoot,{recursive:true});
const nextPaint=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function settings(page){await page.getByRole('button',{name:'Settings',exact:true}).first().click();}
test('optional local panel measures real browser actions, survives reload and exports only aggregate timings',async t=>{
  const page=await openApp(t,undefined,{width:390,height:844},{nativePerformance:true,stayOnToday:true});
  assert.equal(await page.evaluate(()=>SHAAHPerformance.snapshot().enabled),false);
  await settings(page);await page.getByRole('button',{name:'Activar medición local',exact:true}).click();
  assert.equal(await page.evaluate(()=>SHAAHPerformance.snapshot().enabled),true);
  await page.locator('.settings-back').click();
  await control(page,'click','toggleHabit',['meditation','2026-10-16']).click();await nextPaint(page);
  for(const tab of ['social','stats','history','log','today']){await page.locator('.nav-btn[data-tab="'+tab+'"]').click();await nextPaint(page);}
  let report=await page.evaluate(()=>SHAAHPerformance.snapshot());
  assert.ok(report.metrics.find(m=>m.key==='habit_response').count>0);
  for(const name of ['tab_social','tab_stats','tab_history','tab_log','tab_today'])assert.ok(report.metrics.find(m=>m.key===name).count>0,name);
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);await nextPaint(page);
  report=await page.evaluate(()=>SHAAHPerformance.snapshot());
  assert.ok(report.metrics.find(m=>m.key==='app_ready').count>0);assert.ok(report.metrics.find(m=>m.key==='data_load').count>0);
  await settings(page);await page.getByRole('button',{name:'Actualizar informe',exact:true}).click();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar informe de tiempos',exact:true}).click();
  const file=await (await download).path(),exported=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(exported.scope,'this-device-only');assert.doesNotMatch(JSON.stringify(exported),/regression-user|example|Synthetic|meditation|pold|https?:|_checks|_note|user_id/);
  fs.writeFileSync(path.join(reportRoot,'sample-report.json'),JSON.stringify(exported,null,2));
  await page.locator('#settings-toggle-performance').evaluate(node=>{node.scrollIntoView({block:'start'});document.getElementById('scroll').scrollTop-=80;});
  await page.screenshot({path:path.join(reportRoot,'panel-mobile.png')});
  const days=await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows')));
  await page.getByRole('button',{name:'Desactivar medición local',exact:true}).click();
  await page.getByRole('button',{name:'Borrar mediciones',exact:true}).click();
  assert.ok((await page.evaluate(()=>SHAAHPerformance.snapshot())).metrics.every(m=>m.count===0));
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('shaah_mock_rows'))),days);
});
test('browser account changes isolate preferences and reports without adding diagnostic backend rows',async t=>{
  const page=await openApp(t,undefined,{width:1440,height:900},{nativePerformance:true,stayOnToday:true,syntheticAccounts:{'synthetic-B':fixture()}});
  const before=await page.evaluate(()=>({a:localStorage.getItem('shaah_mock_rows'),b:localStorage.getItem('shaah_mock_rows:synthetic-B')}));
  await page.evaluate(()=>{SHAAHPerformance.setEnabled(true);setTab('stats');});await nextPaint(page);
  assert.ok((await page.evaluate(()=>SHAAHPerformance.snapshot())).metrics.some(m=>m.count>0));
  await page.evaluate(()=>__emitMockAuth('SIGNED_IN',{id:'synthetic-B',email:'synthetic-b@example.invalid'}));
  await page.waitForFunction(()=>USER.id==='synthetic-B'&&_cfgReady&&_live);
  assert.equal(await page.evaluate(()=>SHAAHPerformance.snapshot().enabled),false);
  assert.ok((await page.evaluate(()=>SHAAHPerformance.snapshot())).metrics.every(m=>m.count===0));
  await page.evaluate(()=>__emitMockAuth('SIGNED_IN',{id:'regression-user',email:'synthetic@example.invalid'}));
  await page.waitForFunction(()=>USER.id==='regression-user'&&_cfgReady&&_live);await nextPaint(page);
  assert.equal(await page.evaluate(()=>SHAAHPerformance.snapshot().enabled),true);
  assert.ok((await page.evaluate(()=>SHAAHPerformance.snapshot())).metrics.some(m=>m.key==='tab_stats'&&m.count>0));
  const after=await page.evaluate(()=>({a:localStorage.getItem('shaah_mock_rows'),b:localStorage.getItem('shaah_mock_rows:synthetic-B')}));
  // Existing migration writes can occur on first load; diagnostics never add a row.
  assert.deepEqual(JSON.parse(after.a).map(r=>r.date).sort(),JSON.parse(before.a).map(r=>r.date).sort());
  assert.deepEqual(JSON.parse(after.b).map(r=>r.date).sort(),JSON.parse(before.b).map(r=>r.date).sort());
});
test('measurement disabled/enabled has bounded cost under mobile CPU throttling',async t=>{
  const page=await openApp(t,undefined,{width:390,height:844},{nativePerformance:true,stayOnToday:true,beforePage:async(context,page)=>{
    const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  }});
  const timings=await page.evaluate(async()=>{
    const samples=[];
    for(let round=0;round<7;round++)for(const enabled of [false,true]){
      SHAAHPerformance.setEnabled(enabled);const start=performance.now();
      for(let i=0;i<10000;i++){const token=SHAAHPerformance.start('habit_response');SHAAHPerformance.finish(token);}
      samples.push({enabled,ms:performance.now()-start});
      await new Promise(r=>requestAnimationFrame(r));
    }
    SHAAHPerformance.setEnabled(false);SHAAHPerformance.clear();return samples;
  });
  const median=list=>list.sort((a,b)=>a-b)[Math.floor(list.length/2)];
  const off=median(timings.filter(x=>!x.enabled).map(x=>x.ms)),on=median(timings.filter(x=>x.enabled).map(x=>x.ms));
  const result={profile:'390x844,4x CPU;7 paired rounds;10000 timing start/finish calls per round',offMedianMs:off,onMedianMs:on,additionalMsPerAction:(on-off)/10000,samples:timings};
  fs.writeFileSync(path.join(reportRoot,'overhead.json'),JSON.stringify(result,null,2));
  assert.ok((on-off)/10000<1,'diagnostic overhead stays below 1ms per timed action under 4x CPU');
});
