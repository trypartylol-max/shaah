const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');

test('A failed write waits for a successful retry and the milestone appears once',async t=>{
  const p=await openApp(t,undefined,{width:1440,height:1000});
  await p.evaluate(()=>{
    arrivalDismiss();setTab('today');
    const today=todayKey(),id=cfgForDate(today).L2[0].id;
    window.awardTestHabit=id;
    for(let n=1;n<=4;n++)setChecked(keyMinus(today,n),{[id]:true});
    window.originalDaySender=sendDayItem;
    sendDayItem=async()=>{throw Error('simulated offline');};
    toggleHabit(id,today);
  });
  await p.waitForFunction(()=>!_pending[todayKey()]);
  const badge=p.locator('.habit-award-ring');
  assert.equal(await badge.count(),0);
  await p.evaluate(async()=>{sendDayItem=window.originalDaySender;await flushOfflineQueue();});
  await badge.waitFor();
  assert.match(await badge.textContent(),/5 días/);
  await badge.waitFor({state:'detached'});
  await p.evaluate(()=>{toggleHabit(window.awardTestHabit,todayKey());toggleHabit(window.awardTestHabit,todayKey());});
  await p.waitForFunction(()=>!_pending[todayKey()]);
  assert.equal(await badge.count(),0);
});

test('A new personal record uses the card and respects reduced motion',async t=>{
  const p=await openApp(t,undefined,{width:1440,height:1000});
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.evaluate(()=>{
    arrivalDismiss();setTab('today');
    const today=todayKey(),id=cfgForDate(today).L2[0].id;
    for(let n=1;n<=5;n++)setChecked(keyMinus(today,n),{[id]:true});
    toggleHabit(id,today);
  });
  const card=p.getByRole('dialog',{name:'Nuevo récord personal'});
  await card.waitFor();
  assert.match(await card.textContent(),/6 días seguidos/);
  assert.equal(await card.evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await p.locator('.habit-award-ring').count(),0);
  await card.getByRole('button',{name:'Volver a Today'}).click();
  await p.evaluate(()=>{setLayout('pro');setTab('stats');});
  const table=p.locator('.pro-week-comparison table');
  assert.equal(await table.isVisible(),true);
  const label=await p.evaluate(()=>cfgForDate(todayKey()).L2[0].label);
  const row=table.getByRole('row').filter({has:p.getByRole('rowheader',{name:label,exact:true})});
  assert.deepEqual(await row.getByRole('cell').allTextContents(),['6 / 7','0 / 7']);
});
