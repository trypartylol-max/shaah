const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('../../../tests/browser-helpers.cjs');
test('verified host channel exposes Android settings and follows count, opt-out and logout',async t=>{
  const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
  await p.evaluate(()=>{
    history.replaceState(null,'','/shaah/');
    Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted'}});
    window.__counts=[];
    const channel=new MessageChannel();window.__counterPort=channel.port2;
    channel.port2.onmessage=e=>window.__counts.push(JSON.parse(e.data));
    window.dispatchEvent(new MessageEvent('message',{origin:location.origin,data:'shaah.badge.ready.v1',ports:[channel.port1]}));
    openSettings();
  });
  await p.waitForFunction(()=>window.__counts.length>0);
  const toggle=p.locator('.badge-setting').filter({has:p.getByText(/Uses a visible Android notification/)}).locator('.badge-toggle');
  assert.equal(await toggle.count(),1);
  await toggle.click();
  await p.waitForFunction(()=>window.__counts.at(-1).enabled);
  assert.equal(await p.evaluate(()=>window.__counts.at(-1).pending),await p.evaluate(()=>badgePending()));
  await p.evaluate(()=>{setChecked(todayKey(),Object.fromEntries([...cfgForDate(todayKey()).L1,...cfgForDate(todayKey()).L2,...cfgForDate(todayKey()).L3].map(i=>[i.id,true])));render();});
  await p.waitForFunction(()=>window.__counts.at(-1).pending===0);
  await toggle.click();await p.waitForFunction(()=>!window.__counts.at(-1).enabled);
  await p.evaluate(()=>{USER=null;updateBadge();});
  assert.equal(await p.evaluate(()=>window.__counts.at(-1).pending),0);
});
