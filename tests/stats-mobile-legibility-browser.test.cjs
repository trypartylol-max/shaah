const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
for(const width of [320,375,390,600,601,768,879,880,1440])test(`Stats readable without moving cards at ${width}px`,async t=>{
 const page=await openApp(t,undefined,{width,height:1000});
 await page.locator('.nav-btn[data-tab="stats"]').click();
 for(const skin of ['classic','aurora','glow','matrix','minimal']){
  await page.evaluate(skin=>setSkin(skin),skin);
  const inspect=()=>page.evaluate(()=>({
   boxes:[...document.querySelectorAll('.stats-metric-card')].map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}),
   copy:[...document.querySelectorAll('.stats-metric-label,.stats-metric-sub')].map(el=>({text:el.textContent,size:parseFloat(getComputedStyle(el).fontSize),width:el.clientWidth,scroll:el.scrollWidth})),
   overflow:document.querySelector('#scroll').scrollWidth>innerWidth,
  }));
  const next=await inspect();
  assert.equal(next.boxes.length,6);
  assert.equal(next.overflow,false,skin);
  if(width<880)for(const text of next.copy){assert.ok(text.size>=13,`${skin}: ${text.text}`);assert.ok(text.scroll<=text.width+1,`${skin}: clipped ${text.text}`);}
  await page.evaluate(()=>{
   window.__statsRules=[];
   function visit(sheet){for(let i=sheet.cssRules.length-1;i>=0;i--){const rule=sheet.cssRules[i];if(rule.selectorText?.startsWith('.stats-page .stats-metric')){window.__statsRules.push([sheet,i,rule.cssText]);sheet.deleteRule(i);}else if(rule.cssRules)visit(rule);}}
   for(const sheet of document.styleSheets)visit(sheet);
  });
  const old=await inspect();
  await page.evaluate(()=>{for(const [sheet,index,text] of window.__statsRules.reverse())sheet.insertRule(text,index);window.__statsRules=[];});
  assert.deepEqual(next.boxes,old.boxes,`${skin}: preserve card positions and sizes`);
  if(width>=880)assert.deepEqual(next,old,'Desktop unchanged');
 }
 if(width===390||width===1440)await page.screenshot({path:`docs/stats-legibility-${width}.png`,fullPage:true});
 if(width<880){
  await page.evaluate(()=>{
   document.querySelectorAll('.stats-metric-sub').forEach(el=>el.textContent='Long custom habit name with additional details and no missing words');
   document.querySelector('.stats-metric-value').textContent='1234d';
  });
  const problems=await page.evaluate(()=>[...document.querySelectorAll('.stats-metric-label,.stats-metric-sub')].filter(el=>{
   const r=el.getBoundingClientRect(),card=el.closest('.stats-metric-card').getBoundingClientRect();
   return el.scrollWidth>el.clientWidth+1||r.right>card.right+1||r.bottom>card.bottom+1;
  }).map(el=>el.textContent));
  assert.deepEqual(problems,[],'Long custom copy remains visible inside its card');
 }
});
