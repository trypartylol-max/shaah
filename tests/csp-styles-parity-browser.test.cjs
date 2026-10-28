const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
const baselinePath=path.join(__dirname,'fixtures/production-main-a305cd8.html');
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(baselinePath)).digest('hex'),'d18b37f82b713fba7b05009a43b91d7256e3a65c0c094d682d4fe963d67ccb05','Pinned current main HTML at a305cd8');
async function snapshot(page){
 // The new backup panel has its own browser coverage. Remove it for this
 // comparison so its added height does not change the legacy parent geometry.
 await page.evaluate(()=>{document.querySelector('[data-history-safety]')?.remove();});
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(220);
 return page.locator('#scroll *').evaluateAll(nodes=>nodes.filter(node=>!node.closest('[data-history-safety]')).map(node=>{
  const style=getComputedStyle(node),box=node.getBoundingClientRect();
  return {tag:node.tagName,class:node.getAttribute('class'),styles:Object.fromEntries(['display','position','color','backgroundColor','fontFamily','fontSize','fontWeight','borderTopWidth','borderTopColor','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','flexDirection','overflow','opacity'].map(k=>[k,style[k]])),width:Math.round(box.width*10)/10,height:Math.round(box.height*10)/10};
 }));
}
for(const skin of ['classic','matrix','minimal'])for(const size of ['mobile','desktop'])test(`${skin}/${size}: preserves production layout and styles outside the Matrix palette correction`,async t=>{
 const viewport=size==='mobile'?{width:390,height:844}:{width:1440,height:1000};
 const before=await openApp(t,fixture(),viewport,{htmlFile:baselinePath,assetsRoot:path.join(__dirname,'..')});
 const after=await openApp(t,fixture(),viewport);
 for(const page of [before,after]){await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(id=>setSkin(id),skin);}
 const results=[];
 for(const tab of ['today','social','log','stats','history','settings']){
  for(const page of [before,after])await page.evaluate(tab=>{if(tab==='settings')openSettings();else setTab(tab);},tab);
  const old=await snapshot(before),next=await snapshot(after);
  // Matrix intentionally fixes hardcoded purple/yellow colors. Its full palette
  // is asserted separately in matrix-icons-browser; geometry remains identical.
  if(skin==='matrix')for(const rows of [old,next])for(const row of rows)for(const property of ['color','backgroundColor','borderTopColor'])delete row.styles[property];
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
