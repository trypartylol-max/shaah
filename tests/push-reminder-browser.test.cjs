const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
// Push needs a secure context, a service worker and PushManager. The test page has none of these, so they are stubbed.
async function withPush(p,{permission='granted'}={}){
 await p.evaluate(perm=>{
  Object.defineProperty(window,'isSecureContext',{configurable:true,get:()=>true});
  window.__push={subs:[],calls:[],permission:perm,unsubscribed:0};
  const sub={endpoint:'https://push.example.test/abc',toJSON:()=>({endpoint:'https://push.example.test/abc',keys:{p256dh:'p'.repeat(40),auth:'a'.repeat(16)}}),unsubscribe:async()=>{window.__push.unsubscribed++;window.__push.subs=[];return true}};
  const pushManager={getSubscription:async()=>window.__push.subs[0]||null,subscribe:async o=>{window.__push.key=o.applicationServerKey.length;window.__push.subs=[sub];return sub}};
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,get:()=>({getRegistration:async()=>({pushManager})})});
  window.PushManager=function(){};
  window.Notification={get permission(){return window.__push.granted?'granted':'default'},requestPermission:async()=>{if(window.__push.permission==='granted')window.__push.granted=true;return window.__push.permission}};
  const rpc=sb.rpc.bind(sb);
  sb.rpc=async(name,args)=>{if(name.startsWith('shaah_push_')){window.__push.calls.push({name,args});return {data:null,error:null}}return rpc(name,args)};
  render();
 },permission);
}
test('the daily reminder is off by default, subscribes this device at the chosen time, and turns off cleanly',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await p.evaluate(()=>openSettings());assert.equal(await p.locator('.push-setting').count(),0,'hidden without push support');
 await withPush(p);
 const toggle=p.locator('.push-setting .badge-toggle');
 assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await p.locator('.push-time').count(),0);
 assert.deepEqual(await p.evaluate(()=>window.__push.calls),[],'nothing sent while off');
 await toggle.click();
 await p.waitForFunction(()=>document.querySelector('.push-setting .badge-toggle').getAttribute('aria-pressed')==='true');
 const first=await p.evaluate(()=>window.__push.calls[0]);
 assert.equal(first.name,'shaah_push_subscribe');assert.equal(first.args.p_remind_at,'20:00');assert.equal(first.args.p_timezone,'UTC');
 assert.equal(first.args.p_lang,'en');assert.equal(first.args.p_endpoint,'https://push.example.test/abc');
 assert.equal(await p.evaluate(()=>window.__push.key),65,'uses the 65-byte VAPID public key');
 assert.equal(await p.locator('.push-time select option').count(),96,'quarter-hour steps');
 await p.locator('.push-time select').selectOption('08:30');
 await p.waitForFunction(()=>window.__push.calls.some(c=>c.args.p_remind_at==='08:30'),null,{timeout:3000}).catch(async()=>{throw new Error('calls '+JSON.stringify(await p.evaluate(()=>window.__push.calls.map(c=>c.name+':'+c.args.p_remind_at)))+' busy '+await p.evaluate(()=>_push.busy))});
 await p.waitForFunction(()=>!_push.busy);
 await p.locator('.push-setting .badge-toggle').click();
 await p.waitForFunction(()=>document.querySelector('.push-setting .badge-toggle').getAttribute('aria-pressed')==='false');
 assert.deepEqual(await p.evaluate(()=>{const c=window.__push.calls.at(-1);return [c.name,c.args.p_endpoint,window.__push.unsubscribed]}),['shaah_push_unsubscribe','https://push.example.test/abc',1]);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('shaah_push_regression-user')).time),'08:30','keeps the chosen time');
});
test('a refused permission leaves the reminder off and says why',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await p.evaluate(()=>openSettings());await withPush(p,{permission:'denied'});
 await p.locator('.push-setting .badge-toggle').click();
 await p.locator('.push-error').waitFor();
 assert.match(await p.locator('.push-error').innerText(),/blocked/);
 assert.equal(await p.locator('.push-setting .badge-toggle').getAttribute('aria-pressed'),'false');
 assert.deepEqual(await p.evaluate(()=>window.__push.calls),[]);
});
test('on iPhone the reminder is offered only inside the installed app',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await p.evaluate(()=>{Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1'});openSettings()});
 await withPush(p);assert.equal(await p.locator('.push-setting').count(),0);
 await p.evaluate(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});render()});
 assert.equal(await p.locator('.push-setting').count(),1);
});
