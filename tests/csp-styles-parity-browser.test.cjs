const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
const baselinePath='/workspace/shaah-original-steady/index.html';
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(baselinePath)).digest('hex'),'cddd9d3a847f615a501cb9713e80fe07acf8140232337354ccda4673e8e02f22','Exact currently published Original baseline');
async function snapshot(page){
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(220);
 return page.locator('#scroll *').evaluateAll(nodes=>nodes.map(node=>{
  const style=getComputedStyle(node),box=node.getBoundingClientRect();
  return {tag:node.tagName,class:node.getAttribute('class'),styles:Object.fromEntries(['display','position','color','backgroundColor','fontFamily','fontSize','fontWeight','borderTopWidth','borderTopColor','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','flexDirection','overflow','opacity'].map(k=>[k,style[k]])),width:Math.round(box.width*10)/10,height:Math.round(box.height*10)/10};
 }));
}
for(const skin of ['classic','matrix','minimal'])for(const size of ['mobile','desktop'])test(`${skin}/${size}: strict styles preserve the published Original appearance on main screens`,async t=>{
 const viewport=size==='mobile'?{width:390,height:844}:{width:1440,height:1000};
 const before=await openApp(t,fixture(),viewport,{htmlFile:baselinePath});
 const after=await openApp(t,fixture(),viewport);
 for(const page of [before,after]){await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(id=>setSkin(id),skin);}
 const results=[];
 for(const tab of ['today','social','log','stats','history','settings']){
  for(const page of [before,after])await page.evaluate(tab=>{if(tab==='settings')openSettings();else setTab(tab);},tab);
  const old=await snapshot(before),next=await snapshot(after);
  const diffs=[];
  for(let i=0;i<Math.max(old.length,next.length);i++)if(JSON.stringify(old[i])!==JSON.stringify(next[i]))diffs.push({index:i,before:old[i],after:next[i]});
  results.push({tab,beforeElements:old.length,afterElements:next.length,differences:diffs});
 }
 const out=path.join(__dirname,'../test-results/security-styles');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,`appearance-${process.env.SHAAH_BROWSER_ENGINE||'chromium'}-${skin}-${size}.json`),JSON.stringify(results,null,2));
 // Compare appearance without screenshot instrumentation. WebKit's screenshot
 // synchronization injects an inline `body {}` sheet, correctly rejected by CSP.
 // Keep the policy enforced throughout this functional check.
 const mismatches=results.filter(x=>x.differences.length).map(x=>({tab:x.tab,differences:x.differences.length,first:x.differences[0]}));
 assert.deepEqual(mismatches,[],'Computed appearance and geometry remain equal to current Original');
});
