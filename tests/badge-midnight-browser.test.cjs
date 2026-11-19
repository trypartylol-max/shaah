const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
// The icon number for the next day is stored on the server for this device so the push cron can set it at midnight.
async function withPushAndBadge(p){
 await p.evaluate(()=>{
  Object.defineProperty(window,'isSecureContext',{configurable:true,get:()=>true});
  const mm=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('standalone')?{matches:true,addEventListener(){},removeEventListener(){}}:mm(q);
  navigator.setAppBadge=async n=>{window.__badge=n};navigator.clearAppBadge=async()=>{window.__badge=0};
  window.__push={subs:[],calls:[],unsubscribed:0};
  const sub={endpoint:'https://push.example.test/dev',toJSON:()=>({endpoint:'https://push.example.test/dev',keys:{p256dh:'p'.repeat(40),auth:'a'.repeat(16)}}),unsubscribe:async()=>{window.__push.unsubscribed++;window.__push.subs=[];return true}};
  const pushManager={getSubscription:async()=>window.__push.subs[0]||null,subscribe:async()=>{window.__push.subs=[sub];return sub}};
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,get:()=>({getRegistration:async()=>({pushManager})})});
  window.PushManager=function(){};
  window.Notification={permission:'granted',requestPermission:async()=>'granted'};
  const rpc=sb.rpc.bind(sb);
  sb.rpc=async(name,args)=>{if(name.startsWith('shaah_push_')){window.__push.calls.push({name,args});return {data:null,error:null}}return rpc(name,args)};
  openSettings();
 });
}
test('the badge stores the next day count for this device, survives turning the reminder off, and clears when off',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await withPushAndBadge(p);
 assert.deepEqual(await p.evaluate(()=>window.__push.calls),[],'nothing sent while the badge was never on');
 await p.locator('.badge-setting:not(.push-setting) .badge-toggle').click();
 await p.waitForFunction(()=>window.__push.calls.some(c=>c.name==='shaah_push_badge'));
 const call=await p.evaluate(()=>window.__push.calls.find(c=>c.name==='shaah_push_badge').args);
 const expected=await p.evaluate(()=>({day:nextDayKey(),count:badgePending(nextDayKey())}));
 assert.equal(call.p_on,true);assert.equal(call.p_next_day,expected.day);assert.equal(call.p_next_count,expected.count);
 assert.ok(expected.count>0);assert.equal(call.p_timezone,'UTC');assert.equal(call.p_endpoint,'https://push.example.test/dev');
 assert.match(call.p_next_day,/^\d{4}-\d{2}-\d{2}$/);
 assert.notEqual(call.p_next_day,await p.evaluate(()=>todayKey()));
 const before=await p.evaluate(()=>window.__push.calls.length);
 await p.evaluate(()=>render());await p.waitForTimeout(100);
 assert.equal(await p.evaluate(()=>window.__push.calls.length),before,'unchanged state is not sent again');
 // Reminder on and then off: the browser subscription stays because the badge still uses it.
 await p.locator('.push-setting .badge-toggle').click();
 await p.waitForFunction(()=>window.__push.calls.some(c=>c.name==='shaah_push_subscribe'));
 await p.waitForFunction(()=>!_push.busy);
 await p.locator('.push-setting .badge-toggle').click();
 await p.waitForFunction(()=>window.__push.calls.some(c=>c.name==='shaah_push_unsubscribe'));
 await p.waitForFunction(()=>!_push.busy);
 assert.equal(await p.evaluate(()=>window.__push.unsubscribed),0);
 await p.locator('.badge-setting:not(.push-setting) .badge-toggle').click();
 await p.waitForFunction(()=>window.__push.calls.some(c=>c.name==='shaah_push_badge'&&c.args.p_on===false));
});
