const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
for(const width of [390,879,880,1440])test(`History cards never overlap at ${width}px`,async t=>{
 const data=fixture();
 data.config.shaahSocialCoreMigration={effectiveFrom:'2026-10-08'};
 const page=await openApp(t,data,{width,height:1000});
 await page.evaluate(()=>{CFG.shaahSocialCoreMigration={effectiveFrom:'2026-10-08'};openEditDay('2026-10-15');});
 for(const open of [false,true]){
  await page.evaluate(open=>{lvlOpen[1]=lvlOpen[2]=lvlOpen[3]=open;render();},open);
  for(const category of await page.locator('.history-day-editor .sf-category-toggle').all()){
   if((await category.getAttribute('aria-expanded'))!==String(open))await category.click();
  }
  await page.waitForTimeout(350);
  const boxes=await page.locator('.history-day-editor > .t-lvl, .history-day-editor > .t-note, .history-day-editor > .t-score-hero').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {name:n.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
  assert.equal(boxes.length,6);
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];
   assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<1,JSON.stringify({open,a,b}));
  }
  assert.ok(boxes.every(b=>b.x>=0&&b.right<=width+1));
  if(open&&[390,1440].includes(width))await page.screenshot({path:`/tmp/shaah-history-${width}.png`,fullPage:true});
  assert.equal(await page.locator('#note-2026-10-15').inputValue(),'Synthetic history — preserve me');
 }
 await page.evaluate(()=>closeEditDay());
 await page.locator('.nav-btn[data-tab="today"]').click();
 assert.equal(await page.locator('.today.history-day-editor').count(),0);
});
