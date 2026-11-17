const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {openApp}=require('./browser-helpers.cjs');
const asIPhone=p=>p.evaluate(()=>{Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});render();});
test('the install hint shows only in iPhone Safari, outside the installed app, until dismissed',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 assert.equal(await p.locator('.install-hint').count(),0,'not on other platforms');
 await asIPhone(p);
 assert.match(await p.locator('.install-hint').innerText(),/Add SHAAH to your Home Screen/);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await p.evaluate(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});render();});
 assert.equal(await p.locator('.install-hint').count(),0,'not inside the installed app');
 await p.evaluate(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>false});render();});
 // A startup settings save queues a debounced config backup; let it land before taking the baseline.
 await p.waitForFunction(()=>window.__mockWrites.some(w=>w.date==='cfgbak')||!window.__mockWrites.length,null,{timeout:15000}).catch(()=>{});
 const writes=await p.evaluate(()=>__mockWrites.length);
 await p.locator('.install-hint-close').click();
 assert.equal(await p.locator('.install-hint').count(),0);
 await p.evaluate(()=>render());assert.equal(await p.locator('.install-hint').count(),0,'stays dismissed');
 assert.equal(await p.evaluate(()=>__mockWrites.length),writes,'a device preference: nothing is saved to the account');
});
test('the icon badge is off by default, needs permission, and counts the habits still open today',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await p.evaluate(()=>openSettings());assert.equal(await p.locator('.badge-setting').count(),0,'hidden where there is no icon to badge');
 await p.evaluate(()=>{
  Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});
  window.__badge=null;navigator.setAppBadge=n=>{window.__badge=n;return Promise.resolve()};navigator.clearAppBadge=()=>{window.__badge=0;return Promise.resolve()};
  window.__permission='denied';window.Notification={permission:'default',requestPermission:async()=>window.__permission};render();});
 const toggle=p.locator('.badge-toggle');assert.equal(await toggle.getAttribute('aria-pressed'),'false');
 await toggle.click();
 assert.match(await p.locator('.badge-setting').innerText(),/needs notification permission/);assert.equal(await toggle.getAttribute('aria-pressed'),'false');
 await p.evaluate(()=>{window.__permission='granted'});await toggle.click();
 await p.waitForFunction(()=>document.querySelector('.badge-toggle').getAttribute('aria-pressed')==='true');
 const pending=await p.evaluate(()=>badgePending());assert.ok(pending>0);assert.equal(await p.evaluate(()=>window.__badge),pending);
 await p.evaluate(()=>{const k=todayKey(),c=cfgForDate(k),it=[...c.L1,...c.L2,...c.L3].find(i=>i.pts>0&&!i.combo&&i.id!=='work');setHabitState(it.id,k,true);render();});
 assert.equal(await p.evaluate(()=>window.__badge),pending-1);
 await p.locator('.badge-toggle').click();await p.waitForFunction(()=>window.__badge===0);
 assert.equal(await p.locator('.badge-toggle').getAttribute('aria-pressed'),'false');
});
test('every iPhone launch screen referenced by the page exists with the size its media query declares',()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const links=[...html.matchAll(/<link rel="apple-touch-startup-image" media="[^"]*device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\)[^"]*" href="\.\/(splash\/iphone-(\d+)x(\d+)\.png)"/g)];
 assert.ok(links.length>=10);
 for(const [,w,h,d,file,W,H] of links){assert.equal(+W,w*d);assert.equal(+H,h*d);const b=fs.readFileSync(path.join(root,file));assert.equal(b.readUInt32BE(16),+W);assert.equal(b.readUInt32BE(20),+H);}
});
