const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
const baselinePath=require('../qa/prepare-habit-baseline.cjs').prepare();
async function snapshot(page){
 await page.evaluate(()=>document.querySelector('[data-history-safety]')?.remove());
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(220);
 return page.locator('#scroll *').evaluateAll(nodes=>nodes.map(node=>{
  const style=getComputedStyle(node),box=node.getBoundingClientRect();
  return {tag:node.tagName,class:node.getAttribute('class'),styles:Object.fromEntries(['display','position','color','backgroundColor','fontFamily','fontSize','fontWeight','borderTopWidth','borderTopColor','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','flexDirection','overflow','opacity'].map(k=>[k,style[k]])),width:Math.round(box.width*10)/10,height:Math.round(box.height*10)/10};
 }));
}
for(const skin of ['classic','matrix','minimal'])for(const size of ['mobile','desktop'])test(`${skin}/${size}: strict styles preserve task-base appearance with identical weekly inputs apart from the new selector and explicit skin-color corrections`,async t=>{
 const viewport=size==='mobile'?{width:390,height:844}:{width:1440,height:1000};
 const before=await openApp(t,fixture(),viewport,{htmlFile:baselinePath});
 const after=await openApp(t,fixture(),viewport);
 for(const page of [before,after]){await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(id=>setSkin(id),skin);}
 // Review values intentionally changed in this fix. Feed both renderers the
 // same base review to compare presentation only; math and actual Stats labels
 // are checked independently by habit timeline and browser regression tests.
 const baseReview=await before.evaluate(()=>weekReview());
 await after.evaluate(review=>{window.__originalWeekReview=weekReview;weekReview=()=>review},baseReview);
 const results=[];
 for(const tab of ['today','social','log','stats','history','settings']){
  for(const page of [before,after])await page.evaluate(tab=>{if(tab==='settings')openSettings();else setTab(tab);},tab);
  // The added control is intentional. Remove only that control for exact
  // geometry parity; its visible layout and behavior have separate browser tests.
  if(tab==='settings')await after.evaluate(()=>{window.__levelControls=[...document.querySelectorAll('select[data-ui-change="cfgLevel"]')].map(node=>{const marker=document.createComment('level-control');node.replaceWith(marker);return {node,marker}})});
  const old=await snapshot(before),next=await snapshot(after);
  if(tab==='settings')await after.evaluate(()=>{for(const {node,marker} of window.__levelControls)marker.replaceWith(node);delete window.__levelControls});
  // Color-only changes in Social/Core are intentional: raw Classic literals now
  // use the existing skin engine. Accept only its exact RGB/alpha mapping;
  // dimensions, typography, structure and every other style stay exact.
  const paletteChanges=[];
  if(skin!=='classic'){
   const properties=['color','backgroundColor','borderTopColor'];
   const values=[...new Set(old.flatMap(n=>properties.map(k=>n.styles[k])))];
   const mapping=await after.evaluate(values=>{
    const probe=document.createElement('span');document.body.append(probe);const result={};
    for(const value of values){probe.style.color=skinColorValue(value);result[value]=getComputedStyle(probe).color;}
    probe.remove();return result;
   },values);
   for(let i=0;i<Math.min(old.length,next.length);i++)for(const property of properties){
    const previous=old[i].styles[property],current=next[i].styles[property];
    if(previous!==current&&mapping[previous]===current){paletteChanges.push({index:i,property,from:previous,to:current});old[i].styles[property]=current;}
   }
  }
  const diffs=[];
  for(let i=0;i<Math.max(old.length,next.length);i++)if(JSON.stringify(old[i])!==JSON.stringify(next[i]))diffs.push({index:i,before:old[i],after:next[i]});
  results.push({tab,beforeElements:old.length,afterElements:next.length,differences:diffs,acceptedPaletteChanges:paletteChanges});
 }
 await after.evaluate(()=>{weekReview=window.__originalWeekReview;delete window.__originalWeekReview});
 const out=path.join(__dirname,'../test-results/security-styles');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,`appearance-${process.env.SHAAH_BROWSER_ENGINE||'chromium'}-${skin}-${size}.json`),JSON.stringify(results,null,2));
 // Compare appearance without screenshot instrumentation. WebKit's screenshot
 // synchronization injects an inline `body {}` sheet, correctly rejected by CSP.
 // Keep the policy enforced throughout this functional check.
 const mismatches=results.filter(x=>x.differences.length).map(x=>({tab:x.tab,differences:x.differences.length,first:x.differences[0]}));
 assert.deepEqual(mismatches,[],'Computed appearance and geometry remain equal to the exact task base except the intentional selector');
});
