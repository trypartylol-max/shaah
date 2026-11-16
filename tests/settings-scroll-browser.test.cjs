const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
// Settings reuses the edit-day wrapper. The one-screen Edit day layout (>=1200px) must not lock its scroll.
for(const [width,height] of [[393,852],[1280,720],[1440,900]])test(`Settings scrolls to its last section at ${width}px`,async t=>{
 const p=await openApp(t,undefined,{width,height});
 await p.evaluate(()=>openSettings());
 const last=p.locator('#scroll .st-head').last();await last.waitFor({state:'attached'});
 const m=await p.evaluate(()=>{const s=document.querySelector('#scroll');return {overflow:getComputedStyle(s).overflowY,scrollable:s.scrollHeight>s.clientHeight+50}});
 assert.equal(m.overflow,'auto');assert.equal(m.scrollable,true);
 await p.mouse.move(width/2,height/2);await p.mouse.wheel(0,30000);
 await p.waitForFunction(()=>{const s=document.querySelector('#scroll');return s.scrollTop>0&&Math.abs(s.scrollTop-(s.scrollHeight-s.clientHeight))<2});
 const box=await last.boundingBox();assert.ok(box&&box.y<height,'last section header is reachable');
});
test('Edit day stays one fixed screen on desktop',async t=>{
 const p=await openApp(t,undefined,{width:1440,height:900});
 await p.evaluate(()=>openEditDay(keyMinus(todayKey(),1)));await p.locator('.edit-day-screen').waitFor();
 assert.equal(await p.locator('.edit-day-screen').evaluate(e=>getComputedStyle(e).overflowY),'hidden');
});
