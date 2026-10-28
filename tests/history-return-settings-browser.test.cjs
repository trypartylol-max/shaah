const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {fixture,clone}=require('./helpers.cjs');

for(const width of [390,1440])test(`Settings ${width}: pause/resume persists without completions`,async t=>{
  const page=await openApp(t,fixture(),{width,height:1000});
  const before=await page.evaluate(()=>JSON.stringify(_state));
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const section=page.locator('#settings-toggle-hab');
  if(await section.getAttribute('aria-expanded')!=='true')await section.click();
  const habit=page.locator('button[title="Pause this habit"]').first();
  const id=await habit.evaluate(el=>JSON.parse(el.getAttribute('data-ui-click-args'))[0]);
  await habit.click();
  await page.waitForFunction(id=>CFG.h[id].on===false,id);
  await page.locator('button[title="Resume this habit"]').first().click();
  await page.waitForFunction(id=>CFG.h[id].on===true,id);
  await page.waitForFunction(()=>!_cfgDraft);
  assert.equal(await page.evaluate(()=>JSON.stringify(_state)),before);
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
  assert.equal(await page.evaluate(id=>CFG.h[id].on,id),true);
  assert.equal(await page.evaluate(()=>JSON.stringify(_state)),before);
});

function pendingData(){
 const data=fixture();data.config.travelV=9;
 data.config.shaahSocialCoreMigration={version:1,effectiveFrom:'2026-10-16',owner:'regression-user'};
 data.config.travel={mode:'vacation',auto:true,resumeOn:'2026-12-01',modeUpdatedAt:0};
 data.config.log[2].mode='vacation';data.config.log[2].h.work.on=false;return data;
}
for(const email of ['trypartylol@gmail.com','other@example.invalid'])test('loading '+email+' cannot apply the dated repair automatically',async t=>{
 const data=pendingData(),page=await openApp(t,data,undefined,{authEmail:email});
 for(let i=0;i<2;i++){
  assert.equal(await page.evaluate(()=>CFG.travelV),9);
  assert.deepEqual(await page.evaluate(()=>CFG.log),data.config.log);
  assert.equal(await page.evaluate(()=>travelMode()),'vacation');
  assert.equal(await page.evaluate(()=>CFG.travel.auto),true);assert.equal(await page.evaluate(()=>CFG.travel.resumeOn),'2026-12-01');
  const before=await page.evaluate(()=>JSON.stringify({config:CFG,days:_state}));
  const eligible=await page.evaluate(()=>!!ensureWorkReturn2026());assert.equal(eligible,email==='trypartylol@gmail.com');
  assert.equal(await page.evaluate(()=>JSON.stringify({config:CFG,days:_state})),before);
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
 }
});
test('an explicit offline mode remains independent of the paused historical repair',async t=>{
 const data=pendingData(),page=await openApp(t,data,undefined,{authEmail:'trypartylol@gmail.com'});
 await page.evaluate(()=>localStorage.setItem('travelMode:regression-user',JSON.stringify({mode:'work',updatedAt:Date.parse('2026-10-15T12:00:00Z')})));
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await page.evaluate(()=>travelMode()),'work');assert.equal(await page.evaluate(()=>CFG.travelV),9);assert.deepEqual(await page.evaluate(()=>CFG.log),data.config.log);
});
