const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
test('first session uses a real habit and real Day Log, survives refresh, automatic tour only on first initialization',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 assert.equal(await p.locator('#tour.on').count(),0);assert.equal(await p.evaluate(()=>__mockWrites.length),0);
 assert.equal(await p.locator('#starter-confirm').isDisabled(),true);
 fs.mkdirSync('test-results',{recursive:true});await p.screenshot({path:'test-results/starter-choose-mobile.png'});
 await p.getByRole('button',{name:/Focus/}).click();await p.getByRole('button',{name:'Start with this'}).click();await p.getByRole('button',{name:'Skip / close',exact:true}).click();
 await p.getByRole('heading',{name:'Your day, at your own pace.'}).waitFor();assert.equal(await p.locator('[data-starter-habit]').count(),1);
 await p.getByRole('button',{name:'Mark as done',exact:true}).click();assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),100);
 assert.equal(await p.locator('#tb-score').innerText(),'1 of 1 in your plan');
 await p.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),0);
 await p.getByRole('button',{name:'Break into steps · optional'}).click();await p.getByRole('button',{name:'Add this routine'}).click();
 assert.equal(await p.evaluate(()=>Object.keys(CFG.routines).length),1);assert.equal(await p.evaluate(()=>calcScore(todayKey()).max),118);
 await p.evaluate(()=>flushCfgSaves());await p.reload();await p.getByRole('heading',{name:'Your day, at your own pace.'}).waitFor();
 assert.equal(await p.locator('#tour.on').count(),0);assert.equal(await p.locator('[data-starter-habit]').count(),1);
 await p.getByRole('button',{name:'Add another habit'}).click();await p.getByRole('button',{name:'Movement',exact:false}).click();await p.getByRole('button',{name:'Add to my plan'}).click();
 assert.equal(await p.locator('[data-starter-habit]').count(),2);assert.equal(await p.evaluate(()=>calcScore(todayKey()).max),118);
 assert.equal(await p.evaluate(()=>!!CFG.h.work||!!CFG.h.cjunk0),false);
 assert.equal(await p.getByRole('button',{name:'Log an activity',exact:true}).count(),0,'Day Log stays in the full view');
 assert.equal(await p.locator('#nav .nav-btn[data-tab="log"]').isHidden(),true);
});
test('skip stays neutral across refresh; custom name is escaped and editable',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await p.getByRole('button',{name:'Continue without choosing'}).click();await p.getByRole('button',{name:'Skip / close',exact:true}).click();await p.getByRole('heading',{name:'Your day starts here.'}).waitFor();
 assert.equal(await p.locator('#tb-score').innerText(),'No habit plan');await p.reload();await p.getByRole('heading',{name:'Your day starts here.'}).waitFor();
 await p.getByRole('button',{name:'Choose my first habit'}).click();await p.getByRole('button',{name:'Write my own'}).click();
 await p.getByLabel('My commitment',{exact:true}).fill('<img src=x onerror=alert(1)> Leer');await p.getByRole('button',{name:'Add to my plan'}).click();
 assert.equal(await p.locator('[data-starter-habit] img').count(),0);assert.match(await p.locator('[data-starter-habit] h2').innerText(),/<img/);
 await p.getByRole('button',{name:'Change',exact:true}).click();await p.getByLabel('My commitment',{exact:true}).fill('Leer una página');await p.getByRole('button',{name:'Save change'}).click();
 assert.equal(await p.locator('[data-starter-habit]').count(),1);assert.match(await p.locator('[data-starter-habit] h2').innerText(),/Leer una página/);
});
test('responsive Starter is usable in six skins; full/simple switches keep all active habits',async t=>{
 const p=await openApp(t,undefined,{width:1440,height:900},{emptyAccount:true});
 fs.mkdirSync('test-results',{recursive:true});
 for(const skin of ['classic','aurora','glow','matrix','minimal','pro']){
  await p.evaluate(s=>setSkin(s),skin);
  for(const width of [320,390,879,880,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,skin+' '+width);}
 }
 await p.evaluate(()=>setSkin('classic'));await p.getByRole('button',{name:/Focus/}).click();await p.getByRole('button',{name:'Start with this'}).click();await p.getByRole('button',{name:'Skip / close',exact:true}).click();
 for(const skin of ['classic','aurora','glow','matrix','minimal','pro']){await p.evaluate(s=>setSkin(s),skin);for(const width of [320,390,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,skin+' Today '+width);assert.equal(await p.getByRole('button',{name:'Mark as done'}).isVisible(),true);assert.ok(await p.locator('[data-starter-habit]').evaluate(e=>e.getBoundingClientRect().width)>Math.min(240,width-40),skin+' readable card '+width);}}
 await p.screenshot({path:'test-results/starter-today-desktop.png'});await p.getByRole('button',{name:'Show full view'}).click();
 assert.equal(await p.evaluate(()=>CFG.starter.view),'full');await p.evaluate(()=>starterView('simple'));assert.equal(await p.locator('[data-starter-habit]').count(),1);
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:'test-results/starter-today-mobile.png'});
});
test('optional generic routine opens the existing runner without duplicate points; tutorial stays a memory demo',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await p.getByRole('button',{name:/Focus/}).click();await p.getByRole('button',{name:'Start with this'}).click();await p.getByRole('button',{name:'Skip / close',exact:true}).click();
 await p.getByRole('button',{name:'Break into steps · optional'}).click();await p.getByRole('button',{name:'Add this routine'}).click();
 await p.getByRole('button',{name:'Start routine',exact:true}).click();await p.locator('#cr-dialog').waitFor();
 assert.equal(await p.evaluate(()=>ROUTINES[CFG.order[0]].steps.length),3);assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),0);
 await p.getByRole('button',{name:'Close routine',exact:true}).click();await p.getByRole('button',{name:'Mark as done'}).click();
 assert.equal(await p.evaluate(()=>Object.keys(sessions).length),0);assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),100);
 await p.getByRole('button',{name:'Show tutorial',exact:true}).click();await p.locator('#tour.on').waitFor();
 await p.getByRole('button',{name:'Skip / close',exact:true}).click();assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),100);
});
test('new browser for an existing account never starts the old automatic tutorial',async t=>{
 const p=await openApp(t);await p.evaluate(()=>localStorage.removeItem(tourKey()));await p.reload();await p.waitForFunction(()=>_cfgReady);
 assert.equal(await p.locator('.starter-screen').count(),0);assert.equal(await p.locator('#tour.on').count(),0);
});
test('a new account gets the three-step tour, no Social tab and no contradictory Stats card until it asks for more',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await p.getByRole('button',{name:/Focus/}).click();await p.getByRole('button',{name:'Start with this'}).click();
 await p.locator('#tour.on').waitFor();assert.equal(await p.locator('#tour .tour-dot').count(),3);
 assert.match(await p.locator('#tour .tour-meta').innerText(),/STEP 1 OF 3/);
 await p.locator('#tour-next').click();await p.locator('#tour-next').click();assert.equal(await p.locator('#tour-next').innerText(),'Finish');
 await p.locator('#tour-next').click();assert.equal(await p.locator('#tour.on').count(),0);
 assert.equal(await p.locator('.nav-btn[data-tab="social"]').isVisible(),false);
 assert.deepEqual(await p.evaluate(()=>tabsOrder()),['today','stats'],'History waits for three days with something marked');
 await p.getByRole('button',{name:'Mark as done',exact:true}).click();
 await p.locator('.nav-btn[data-tab="stats"]').click();
 assert.equal(await p.getByText('MOST CONSISTENT').count(),1);// Social Combo counts from day one (118 = 100 + 18), so unmarked it is what needs work.
 assert.equal(await p.getByText('NEEDS WORK').count(),1);
 // The full tutorial stays one tap away, and the full view brings Social back.
 await p.locator('.nav-btn[data-tab="today"]').click();await p.getByRole('button',{name:'Show tutorial'}).click();
 assert.equal(await p.locator('#tour .tour-dot').count(),9);await p.getByRole('button',{name:'Skip / close',exact:true}).click();
 await p.getByRole('button',{name:'Show full view'}).click();
 assert.equal(await p.locator('.nav-btn[data-tab="social"]').isVisible(),true);
});
test('the sign-in screen says what SHAAH is before asking for an account',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{loggedOut:true});
 assert.match(await p.locator('#scroll').innerText(),/A habit tracker that scores your day/);
});
test('a returning simple account sees its streak, or a fresh start after a gap; nothing on a first day not yet done',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await p.getByRole('button',{name:/Focus/}).click();await p.getByRole('button',{name:'Start with this'}).click();await p.getByRole('button',{name:'Skip / close',exact:true}).click();
 assert.equal(await p.locator('.starter-continuity').count(),0);
 await p.getByRole('button',{name:'Mark as done',exact:true}).click();
 assert.equal(await p.locator('.starter-continuity').innerText(),'First day done. See you tomorrow.');
 const next=async iso=>{await p.waitForTimeout(2600);await p.clock.setFixedTime(new Date(iso));await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);};
 await next('2026-10-17T07:30:00Z');
 assert.equal(await p.locator('.starter-continuity').innerText(),'🔥 1-day streak. Today keeps it going.');
 await p.getByRole('button',{name:'Mark as done',exact:true}).click();
 assert.equal(await p.locator('.starter-continuity').innerText(),'🔥 2-day streak. See you tomorrow.');
 await next('2026-10-20T07:30:00Z');
 assert.equal(await p.locator('.starter-continuity').innerText(),'Welcome back. Today is a fresh start.');
});
