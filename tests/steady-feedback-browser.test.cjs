const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {openApp}=require('./browser-helpers.cjs');
const {fixture,loadApp}=require('./helpers.cjs');

async function open(t,skin='classic',profile='DEFAULT_CFG'){
  const data=fixture();data.config=loadApp().read(profile);
  data.config.people=[];data.config.tz='UTC';data.config.travel={mode:'work',auto:false,resumeOn:'',modeUpdatedAt:1792065600000};
  data.config.log=[{from:'0001-01-01',mode:'work',h:structuredClone(data.config.h),order:[...data.config.order],subs:structuredClone(data.config.subs)}];
  const page=await openApp(t,data,{width:390,height:844});
  await page.evaluate(skin=>{setSkin(skin);setTab('today');},skin);
  await page.waitForFunction(()=>!_cfgFlushPromise);
  return page;
}

for(const skin of ['classic','matrix','minimal'])for(const profile of ['DEFAULT_CFG','LEGACY_CFG'])test(`${skin}/${profile}: complete day stays opaque through refresh, taps and the first save echo`,async t=>{
  const page=await open(t,skin,profile);
  const result=await page.evaluate(async()=>{
    render();const opacity=Number(getComputedStyle(document.querySelector('.today')).opacity);
    const today=document.querySelector('.today'),ring=document.querySelector('.t-ring svg');
    const timings=[];
    for(let i=0;i<5;i++){const start=performance.now();toggleHabit('work',todayKey());timings.push(performance.now()-start);}
    return {opacity,sameToday:today===document.querySelector('.today'),sameRing:ring===document.querySelector('.t-ring svg'),timings};
  });
  assert.equal(result.opacity,1,'No page-wide fade to transparent during a refresh');
  assert.equal(result.sameToday,true);assert.equal(result.sameRing,true);
  await page.waitForFunction(()=>!_pending[todayKey()]);
  const echo=await page.evaluate(()=>{
    const today=document.querySelector('.today'),ring=document.querySelector('.t-ring svg');
    const row=JSON.parse(localStorage.getItem('shaah_mock_rows')).find(r=>r.date===todayKey());row.user_id='regression-user';
    __emitMockRealtime({eventType:'UPDATE',new:row});
    return {sameToday:today===document.querySelector('.today'),sameRing:ring===document.querySelector('.t-ring svg'),opacity:Number(getComputedStyle(document.querySelector('.today')).opacity)};
  });
  assert.equal(echo.sameToday,true,'Saving a fresh day must not rebuild the page');assert.equal(echo.sameRing,true);assert.equal(echo.opacity,1);
  const out=path.join(__dirname,'../test-results/steady-feedback');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,`timing-${process.env.SHAAH_BROWSER_ENGINE||'chromium'}-${skin}-${profile}.json`),JSON.stringify(result)+'\n');
});

test('real remote day changes preserve the screen and update a clean note without sending writes',async t=>{
  const page=await open(t);
  const r=await page.evaluate(()=>{
    window.__steadyToday=document.querySelector('.today');window.__steadyRing=document.querySelector('.t-ring svg');
    const before=__mockWrites.length;
    __emitMockRealtime({eventType:'UPDATE',new:{user_id:'regression-user',date:todayKey(),data:{_checks:{work:true},_social:blankSocial(),_people:[],_daylog:[],_note:'Synthetic remote clean note'}}});
    return {sameToday:__steadyToday===document.querySelector('.today'),sameRing:__steadyRing===document.querySelector('.t-ring svg'),note:document.querySelector('textarea').value,writes:__mockWrites.length-before};
  });
  assert.deepEqual(r,{sameToday:true,sameRing:true,note:'Synthetic remote clean note',writes:0});
  await page.locator('textarea').fill('Synthetic local unfinished draft');
  await page.evaluate(()=>__emitMockRealtime({eventType:'UPDATE',new:{user_id:'regression-user',date:todayKey(),data:{_checks:{work:0.5},_social:blankSocial(),_note:'Synthetic newer remote note'}}}));
  assert.equal(await page.locator('textarea').inputValue(),'Synthetic local unfinished draft');
  assert.equal(await page.locator('textarea').evaluate(node=>node===document.activeElement),true);
});

test('habit and score feedback is immediate and uses short motion without moving the whole page',async t=>{
  const page=await open(t);await page.evaluate(()=>toggleHabit('work',todayKey()));
  assert.equal(await page.evaluate(()=>getChecked(todayKey()).work),0.5);
  const motion=await page.evaluate(()=>({page:getComputedStyle(document.querySelector('.today')).animationName,ring:getComputedStyle(document.querySelector('.t-ring svg circle:last-child')).transitionDuration}));
  assert.equal(motion.page,'none');assert.ok(motion.ring.split(',').every(s=>parseFloat(s)<=0.2));
});
