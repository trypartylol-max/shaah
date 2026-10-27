const {test}=require('node:test');const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');const {loadApp}=require('./helpers.cjs');
test('desktop Production/WOD are readable and closed levels are header-sized',async t=>{
 const a=loadApp();a.run(`
 for(const id of ['production','wod']){CFG.h[id]={...LEGACY_CFG.h[id],pWork:LEGACY_CFG.h[id].p,pVacation:LEGACY_CFG.h[id].p};}
 CFG.order=['work','production','wod',...CFG.order.filter(id=>!['work','production','wod'].includes(id))];
 CFG.routines=JSON.parse(JSON.stringify(LEGACY_CFG.routines));
 for(const e of CFG.log){e.h=JSON.parse(JSON.stringify(CFG.h));e.order=[...CFG.order];}
 CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;
 _state['2026-10-16']={checks:{},social:{},people:[],note:'',_daylog:[]};`);
 const page=await openApp(t,{config:a.read('CFG'),days:a.read('_state')});
 await page.evaluate(()=>setTab('today'));
 const history=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey()))));
 for(const skin of ['classic','glow','aurora']){
  await page.evaluate(s=>{document.documentElement.dataset.skin=s;document.documentElement.classList.toggle('shaah-aurora',s==='aurora')},skin);
  for(const width of [880,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   await page.evaluate(()=>{lvlOpen={1:true,2:false,3:false};render()});
   for(const n of [2,3]){
    const card=page.locator('.t-lvl'+n);
    const size=await card.evaluate(e=>({h:e.getBoundingClientRect().height,header:e.querySelector('.lvl-h').getBoundingClientRect().height}));
    assert.ok(size.h<=size.header+28,`${skin} ${width}: header only ${JSON.stringify(size)}`);
    await card.locator('.lvl-toggle').click();assert.equal(await card.locator('.lvl-b').evaluate(e=>getComputedStyle(e).display!=='none'),true);
    await card.locator('.lvl-toggle').click();
   }
   assert.equal(await page.locator('.t-lvl2 .lvl-toggle').evaluate(e=>getComputedStyle(e).fontSize),await page.locator('.sf-combo-heading strong').evaluate(e=>getComputedStyle(e).fontSize));
   assert.equal(await page.locator('.t-lvl3 .lvl-toggle').evaluate(e=>getComputedStyle(e).fontSize),await page.locator('.sf-combo-heading strong').evaluate(e=>getComputedStyle(e).fontSize));
   const routines=page.locator('.t-rout-body>div.sf-core-routine');assert.equal(await routines.count(),2);
   for(const card of await routines.all()){
    const m=await card.evaluate(e=>({title:parseFloat(getComputedStyle(e.querySelector('.r-lab')).fontSize),meta:parseFloat(getComputedStyle(e.querySelector('.r-sub')).fontSize),step:parseFloat(getComputedStyle(e.querySelector('.r-step')).fontSize),buttons:[...e.querySelectorAll('.r-btn')].map(b=>({h:b.getBoundingClientRect().height,font:parseFloat(getComputedStyle(b).fontSize)})),overflow:e.scrollWidth>e.clientWidth+1}));
    assert.ok(m.title>=18&&m.meta>=17&&m.step>=16,JSON.stringify(m));assert.ok(m.buttons.every(b=>b.h>=44&&b.font>=16));assert.equal(m.overflow,false);
   }
   assert.equal(await page.evaluate(()=>document.querySelector('#scroll').scrollWidth<=innerWidth),true);
   if(width===1440&&skin==='glow'){await page.evaluate(()=>document.querySelector('#scroll').scrollTop=0);await page.waitForTimeout(400);await page.screenshot({path:'docs/today-desktop-routines-glow.png'});}
  }
 }
 for(const id of ['production','wod']){
  const card=page.locator('.t-rout-body>div.sf-core-routine').filter({has:page.locator(`[data-ui-click="startRoutine"][data-ui-click-args='["${id}"]']`)});
  await card.getByRole('button',{name:'½ LIGHT',exact:true}).click();assert.equal(await page.evaluate(id=>getChecked(todayKey())[id],id),0.5);
  await page.locator('.t-rout-body>div.sf-core-routine').filter({has:page.locator('[title="Upgrade to full credit"]')}).getByRole('button',{name:'⬆ FULL',exact:true}).click();assert.equal(await page.evaluate(id=>getChecked(todayKey())[id],id),true);
  await page.locator('[aria-label="Clear completed routine"]').click();assert.equal(await page.evaluate(id=>getChecked(todayKey())[id],id),false);
  await card.getByRole('button',{name:'▶ START',exact:true}).click();await page.locator('[aria-label="Back, timer keeps running"]').click();
  await page.evaluate(id=>closeRoutine(id),id);
 }
 await page.evaluate(()=>{openSettings();closeSettings()});
 assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([k])=>k!==todayKey())))),history);
 for(const width of [320,390,879]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.querySelector('#scroll').scrollWidth<=innerWidth),true);}
});
