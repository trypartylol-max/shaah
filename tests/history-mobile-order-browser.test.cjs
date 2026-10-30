const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
for(const width of [320,390,879,880,1440])test(`History order and scope at ${width}px`,async t=>{
 const data=fixture(); data.config.shaahSocialCoreMigration={effectiveFrom:'2026-10-08'};
 const page=await openApp(t,data,{width,height:1000});
 const measure=()=>page.evaluate(()=>[...document.querySelectorAll('.today > *')].map(n=>({name:n.className,order:getComputedStyle(n).order,y:n.getBoundingClientRect().y})));
 await page.locator('.nav-btn[data-tab="today"]').click();
 const before=await measure();
 await page.evaluate(()=>{CFG.shaahSocialCoreMigration={effectiveFrom:'2026-10-08'};openEditDay('2026-10-15');});
 const sequence=['t-score-hero','t-lvl1','t-lvl2','t-lvl3','t-daylog','t-social-independent','t-note','t-reset'];
 for(const night of [false,true]){
  await page.evaluate(night=>document.querySelector('.history-day-editor').classList.toggle('night',night),night);
  const current=await measure();
  if(width<880){
   const items=sequence.map(name=>{const item=current.find(x=>x.name.split(' ').includes(name));if(!['t-daylog','t-reset'].includes(name))assert.ok(item,name);return item;}).filter(Boolean);
   assert.deepEqual([...items].sort((a,b)=>a.y-b.y).map(x=>x.name),items.map(x=>x.name));
   assert.ok(items.every((x,i)=>i===0||Number(x.order)>Number(items[i-1].order)));
  }
 }
 await page.locator('html').evaluate(n=>n.setAttribute('data-skin','glow'));
 if(width<880){const items=await measure();const ordered=sequence.map(name=>items.find(x=>x.name.split(' ').includes(name))).filter(Boolean);assert.ok(ordered.every((x,i)=>!i||x.y>=ordered[i-1].y));}
 await page.locator('html').evaluate(n=>n.removeAttribute('data-skin'));
 await page.evaluate(()=>closeEditDay());
 await page.locator('.nav-btn[data-tab="today"]').click();
 assert.deepEqual((await measure()).map(x=>[x.name,x.order]),before.map(x=>[x.name,x.order]));
});
