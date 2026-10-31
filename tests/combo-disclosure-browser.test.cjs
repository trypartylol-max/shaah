const {test}=require('node:test'),assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs'),{fixture}=require('./helpers.cjs');
for(const width of [390,1440])test(`Social disclosure is independent of theme and credit at ${width}px`,async t=>{
 const data=fixture();data.config.people.push(...Array.from({length:80},(_,i)=>({id:'combo'+i,name:'Contact '+i,sub:i<40?'friends':'strangers',every:14})));
 const p=await openApp(t,data,{width,height:1000});await p.evaluate(()=>flushCfgSaves());
 const state=()=>p.evaluate(()=>JSON.stringify({cfg:CFG,days:_state}));const before=await state(),writes=await p.evaluate(()=>__mockWrites.filter(x=>x.date!=='cfgbak').length);
 for(const skin of ['classic','glow','matrix','minimal','aurora','pro']){
  await p.evaluate(s=>setSkin(s),skin);
  for(const tab of ['today','social']){
   await p.evaluate(t=>setTab(t),tab);
   const panel=p.locator('.sf-compact-combo'),friends=panel.locator('[data-combo-id="friends"]'),strangers=panel.locator('[data-combo-id="strangers"]');
   if(await friends.locator('.sf-category-toggle').getAttribute('aria-expanded')==='true')await friends.locator('.sf-category-toggle').click();
   await friends.locator('.sf-category-toggle').focus();await p.keyboard.press('Enter');
   assert.equal(await friends.locator('.sf-category-toggle').getAttribute('aria-expanded'),'true');
   await strangers.locator('.sf-category-toggle').click();
   assert.equal(await friends.locator('.sf-category-toggle').getAttribute('aria-expanded'),'false');
   assert.equal(await strangers.locator('.sf-category-toggle').getAttribute('aria-expanded'),'true');
   assert.equal(await panel.locator('.sf-reveal.is-open').count(),1);
   const m=await strangers.locator('.sf-buttons').evaluate(e=>{const rows=[...new Set([...e.children].map(x=>Math.round(x.offsetTop)))].sort((a,b)=>a-b);return {h:e.clientHeight,scroll:e.scrollHeight,third:rows[2],top:e.offsetTop}});
   assert.ok(m.scroll>m.h,JSON.stringify({skin,tab,m}));
   const option=await strangers.locator('.sf-button').first().boundingBox();assert.ok(option.height>=38);
   assert.equal(await state(),before);assert.equal(await p.evaluate(()=>__mockWrites.filter(x=>x.date!=='cfgbak').length),writes);
  }
 }
 await p.evaluate(()=>{setSkin('classic');setTab('social')});
 const friends=p.locator('[data-combo-id="friends"]');await friends.locator('.sf-category-toggle').click();
 await friends.getByRole('button',{name:'Ana Existing',exact:true}).click();assert.equal(await p.evaluate(()=>getPeople(todayKey()).includes('pold01')),true);
 await p.locator('[data-combo-id="strangers"] .sf-category-toggle').click();assert.equal(await p.evaluate(()=>getPeople(todayKey()).includes('pold01')),true);
 await p.evaluate(()=>setSkin('pro'));assert.equal(await p.locator('[data-combo-id="strangers"] .sf-category-toggle').getAttribute('aria-expanded'),'true');
 await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);assert.equal(await p.evaluate(()=>getPeople(todayKey()).includes('pold01')),true);
});
