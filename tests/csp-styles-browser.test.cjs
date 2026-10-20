const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const {fixture}=require('./helpers.cjs');
const path=require('node:path');
const {html,htmlPath}=require('./helpers.cjs');
async function open(t){return openApp(t,fixture(),{width:390,height:844});}

test('published artifact blocks inline style blocks and attributes while loading its exact local stylesheet',async()=>{
 const policy=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 assert.match(policy,/style-src 'self'; style-src-elem 'self'; style-src-attr 'none';/);
 assert.doesNotMatch(policy,/unsafe-inline|unsafe-eval|unsafe-hashes/);
 assert.doesNotMatch(html,/<style\b|\sstyle\s*=/i);
 const css=html.match(/<link rel="stylesheet" href="\.\/(assets\/app\.[a-f0-9]{16}\.css)"/)[1];
 const sheet=fs.readFileSync(path.join(path.dirname(htmlPath),css),'utf8');
 assert.ok(sheet.includes('#scroll')&&sheet.includes('matrix-code-drift'));
});

test('opaque style keys do not interpret CSS attribute text, and trusted styles survive cloning and replacement',async t=>{
 const page=await open(t);
 const result=await page.evaluate(()=>{
  const holder=document.createElement('div');document.body.append(holder);
  const style=uiStyle('padding:7px;color:#4ade80');
  uiHTML(holder,'<div '+style+'>Synthetic style</div><div data-ui-style="padding:11px">Unknown key</div>');
  const first=holder.firstElementChild,clone=first.cloneNode(true);holder.append(clone);
  const read=n=>({padding:getComputedStyle(n).paddingTop,color:getComputedStyle(n).color});
  const values={first:read(first),clone:read(clone),unknown:read(holder.children[1])};
  uiReplaceHTML(holder.children[1],'<div '+uiStyle('padding:13px')+'>Replacement</div>');
  values.replaced=read(holder.children[1]);holder.remove();return values;
 });
 assert.deepEqual(result.first,{padding:'7px',color:'rgb(74, 222, 128)'});assert.deepEqual(result.clone,result.first);
 assert.equal(result.unknown.padding,'0px');assert.equal(result.replaced.padding,'13px');
});

test('registry pruning preserves styles already visible and does not grow for disconnected screens',async t=>{
 const page=await open(t);
 const result=await page.evaluate(()=>{
  const holder=document.createElement('div');document.body.append(holder);
  const token=uiStyle('padding:17px');uiHTML(holder,'<div '+token+'>Synthetic retained style</div>');
  const key=holder.firstElementChild.getAttribute('data-ui-style');
  for(let i=0;i<2400;i++)uiStyle('margin-left:'+i+'px');
  const r={count:_uiStylesByKey.size,retained:_uiStylesByKey.has(key),padding:getComputedStyle(holder.firstElementChild).paddingTop};holder.remove();return r;
 });
 assert.ok(result.count<=2048);assert.equal(result.retained,true);assert.equal(result.padding,'17px');
});

test('all skins and main screens remain usable under the strict style policy',async t=>{
 const page=await open(t);
 for(const skin of ['classic','matrix','minimal']){
  await page.evaluate(id=>setSkin(id),skin);
  for(const tab of ['today','log','social','stats','history']){
   await page.locator('.nav-btn[data-tab="'+tab+'"]').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.locator('.nav-btn[data-tab="'+tab+'"]').getAttribute('aria-current'),'page');
  }
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
 }
 assert.equal(await page.evaluate(()=>__mockWrites.length),0);
});
