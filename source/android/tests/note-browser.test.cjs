const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('../../../tests/browser-helpers.cjs');
test('installed Android app shows pending count as a silent notification, updates, clears on opt-out and logout',async t=>{
  const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
  await p.evaluate(()=>{
    history.replaceState(null,'','/shaah/');
    Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>'Mozilla/5.0 (Linux; Android 15; Redmi) Chrome/142 Mobile'});
    const mm=window.matchMedia.bind(window);window.matchMedia=q=>q.includes('standalone')?{matches:true,addEventListener(){},removeEventListener(){}}:mm(q);
    Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});
    window.__notes=new Map();window.__log=[];
    const reg={showNotification:async(title,o)=>{window.__notes.set(o.tag,{title,...o});window.__log.push(['show',title,o.silent]);},
      getNotifications:async({tag})=>[...window.__notes.values()].filter(n=>n.tag===tag).map(n=>({close:()=>{window.__notes.delete(n.tag);window.__log.push(['close']);}}))};
    Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{ready:Promise.resolve(reg)}});
    openSettings();
  });
  const toggle=p.locator('.badge-setting').filter({has:p.getByText(/silent notification/)}).locator('.badge-toggle');
  assert.equal(await toggle.count(),1);
  await toggle.click();
  await p.waitForFunction(()=>window.__notes.has('shaah-pending'));
  const n=await p.evaluate(()=>badgePending());
  assert.ok(n>0);
  assert.match(await p.evaluate(()=>window.__notes.get('shaah-pending').title),new RegExp('^'+n+' habits? left today$'));
  assert.equal(await p.evaluate(()=>window.__notes.get('shaah-pending').silent),true);
  const first=[...(await p.evaluate(()=>cfgForDate(todayKey()).L1.filter(i=>i.pts>0).map(i=>i.id)))][0];
  await p.evaluate(id=>{setChecked(todayKey(),{[id]:true});render();},first);
  await p.waitForFunction(m=>window.__notes.get('shaah-pending')?.title.startsWith(String(m-1)),n);
  await toggle.click();
  await p.waitForFunction(()=>!window.__notes.has('shaah-pending'));
  await toggle.click();await p.waitForFunction(()=>window.__notes.has('shaah-pending'));
  await p.evaluate(()=>{USER=null;updateBadge();});
  await p.waitForFunction(()=>!window.__notes.has('shaah-pending'));
});
