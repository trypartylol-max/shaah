const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
// Suggestions that unlock features with use: one card on Today, chosen from what the account does.
async function startFocus(p){
 await p.getByRole('button',{name:/Focus/}).click();await p.getByRole('button',{name:'Start with this'}).click();
 await p.getByRole('button',{name:'Skip / close',exact:true}).click();await p.getByRole('heading',{name:'Your day, at your own pace.'}).waitFor();
}
async function withPush(p){
 await p.evaluate(()=>{
  Object.defineProperty(window,'isSecureContext',{configurable:true,get:()=>true});
  window.__push={calls:[]};const sub={endpoint:'https://push.example.test/t',toJSON:()=>({endpoint:'https://push.example.test/t',keys:{p256dh:'p'.repeat(40),auth:'a'.repeat(16)}}),unsubscribe:async()=>true};
  const pushManager={getSubscription:async()=>null,subscribe:async()=>sub};
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,get:()=>({getRegistration:async()=>({pushManager}),ready:Promise.resolve({getNotifications:async()=>[],showNotification:async()=>{}})})});
  window.PushManager=function(){};window.Notification={permission:'granted',requestPermission:async()=>'granted'};
  const rpc=sb.rpc.bind(sb);sb.rpc=async(n,a)=>{if(n.startsWith('shaah_push_')){window.__push.calls.push({n,a});return {data:null,error:null}}return rpc(n,a)};
  render();
 });
}
const past=n=>`(()=>{const [y,m,d]=todayKey().split('-').map(Number);return new Date(Date.UTC(y,m-1,d-${n})).toISOString().slice(0,10)})()`;
async function markDays(p,days){await p.evaluate(({days})=>{const id=CFG.order[0];
  // The plan starts today in a new account: move its start back so earlier days are scored by it.
  const [y0,m0,d0]=todayKey().split('-').map(Number);const start=new Date(Date.UTC(y0,m0-1,d0-30)).toISOString().slice(0,10);
  for(const e of CFG.log)if(e.from===todayKey())e.from=start;applyCfg();for(const n of days){const [y,m,d]=todayKey().split('-').map(Number);const k=new Date(Date.UTC(y,m-1,d-n)).toISOString().slice(0,10);setChecked(k,{[id]:true});}render();},{days});}

test('the reminder is offered right after starting, at 15:00, and turns the daily reminder on',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await startFocus(p);await withPush(p);
 const card=p.locator('.tip-card[data-tip="remind"]');await card.waitFor();
 assert.equal(await card.locator('select').inputValue(),'15:00');
 await card.getByRole('button',{name:'Remind me'}).click();
 await p.waitForFunction(()=>window.__push.calls.some(c=>c.n==='shaah_push_subscribe'));
 assert.equal(await p.evaluate(()=>window.__push.calls.find(c=>c.n==='shaah_push_subscribe').a.p_remind_at),'15:00');
 await p.waitForFunction(()=>!document.querySelector('.tip-card'));
});
test('"Not now" on the reminder waits for a missed day, and a second "Not now" retires it',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await startFocus(p);await withPush(p);
 await p.locator('.tip-card[data-tip="remind"]').getByRole('button',{name:'Not now'}).click();
 assert.equal(await p.locator('.tip-card').count(),0);
 // Next day, nothing missed (yesterday marked): no offer.
 await p.evaluate(()=>{CFG.tips._lastDay='2000-01-01';CFG.tips.remind.until='2000-01-01';});await markDays(p,[1,2]);
 assert.equal(await p.locator('.tip-card[data-tip="remind"]').count(),0);
 // Yesterday empty after earlier use: offered again with the missed-day text.
 await p.evaluate(()=>{const [y,m,d]=todayKey().split('-').map(Number);const k=new Date(Date.UTC(y,m-1,d-1)).toISOString().slice(0,10);setChecked(k,{});render();});
 const again=p.locator('.tip-card[data-tip="remind"]');await again.waitFor();assert.match(await again.innerText(),/Yesterday slipped by/);
 await again.getByRole('button',{name:'Not now'}).click();
 await p.evaluate(()=>{CFG.tips._lastDay='2000-01-01';CFG.tips.remind.until='2000-01-01';render();});
 assert.equal(await p.locator('.tip-card[data-tip="remind"]').count(),0);
});
test('History appears after 3 days with something marked; routine after 3 days and full view after 7, only once something is marked today',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await startFocus(p);
 assert.equal(await p.locator('#nav .nav-btn[data-tab="history"]').isHidden(),true);
 await markDays(p,[1,2,3]);
 assert.equal(await p.locator('#nav .nav-btn[data-tab="history"]').isHidden(),false);
 assert.equal(await p.locator('.tip-card').count(),0,'nothing before marking today');
 await p.getByRole('button',{name:'Mark as done',exact:true}).click();
 const routine=p.locator('.tip-card[data-tip="routine"]');await routine.waitFor();
 await routine.getByRole('button',{name:'Not now'}).click();
 assert.equal(await p.locator('.tip-card').count(),0,'one suggestion a day at most');
 await p.evaluate(()=>{CFG.tips._lastDay='2000-01-01';CFG.tips.routine.until='2999-01-01';render();});
 await markDays(p,[4,5,6,7]);
 const full=p.locator('.tip-card[data-tip="full"]');await full.waitFor();
 await full.getByRole('button',{name:'Show everything'}).click();
 assert.equal(await p.evaluate(()=>CFG.starter.view),'full');
});
test('an existing full-view account using routines and with the reminder unavailable sees no card',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 assert.equal(await p.locator('.tip-card').count(),0);
 assert.equal(await p.locator('#nav .nav-btn[data-tab="history"]').isHidden(),false);
});
test('desktop full view: no levels, the reminder is a strip under the score, Social Combo counts and everything fits without scrolling',async t=>{
 const p=await openApp(t,undefined,{width:1280,height:720},{emptyAccount:true});
 await startFocus(p);await withPush(p);
 await p.evaluate(()=>{starterView('full');render();});
 const card=p.locator('.tip-card[data-tip="remind"]');await card.waitFor();
 const box=await card.boundingBox(),habits=await p.locator('.t-flat').boundingBox();
 assert.ok(box.width>1000&&box.height<80,'one-line strip across the page');assert.ok(box.y<habits.y,'above the plan');
 assert.equal(await p.locator('.t-lvl1,.t-lvl2,.t-lvl3').count(),0,'no levels until asked for');assert.equal(await p.locator('.t-flat-social .sf-compact-combo').count(),1);
 assert.equal(await p.evaluate(()=>calcScore(todayKey()).max),118);
 assert.equal(await p.evaluate(()=>{const s=document.getElementById('scroll');return s.scrollHeight<=s.clientHeight;}),true);
});
test('mobile: the reminder comes after the plan, so the habit to mark is seen first',async t=>{
 for(const view of ['simple','full']){
  const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
  await startFocus(p);await withPush(p);await p.evaluate(v=>{starterView(v);render();},view);
  const card=p.locator('.tip-card[data-tip="remind"]');await card.waitFor();
  const habit=await p.locator(view==='simple'?'[data-starter-habit]':'.t-flat').first().boundingBox(),box=await card.boundingBox();
  assert.ok(box.y>habit.y+habit.height,view);
 }
});
test('a starter account can switch to levels in Settings and back to a single list',async t=>{
 const p=await openApp(t,undefined,{width:1280,height:900},{emptyAccount:true});
 await startFocus(p);await p.evaluate(()=>{starterView('full');settingsOpen=true;render();});
 await p.getByText('Habits & weights').click();await p.getByRole('button',{name:/Organize into levels/}).click();
 assert.equal(await p.evaluate(()=>CFG.starter.levels),true);
 await p.evaluate(()=>{settingsOpen=false;render();});assert.equal(await p.locator('.t-lvl2').count(),1);assert.equal(await p.locator('.t-flat').count(),0);
 await p.evaluate(()=>starterLevels(false));assert.equal(await p.locator('.t-flat').count(),1);
});
