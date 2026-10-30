const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
async function position(page){return page.locator('.t-reset').evaluate(el=>{const r=el.getBoundingClientRect(),dock=document.getElementById('nav').getBoundingClientRect();return {top:r.top,bottom:r.bottom,dockTop:dock.top,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});}
for(const [width,height] of [[320,740],[390,844],[879,900]])test(`Reset is accessible with sections collapsed and after scrolling expanded content at ${width}px`,async t=>{
 const page=await openApp(t,undefined,{width,height});
 await page.evaluate(()=>{todayRoutinesOpen=false;lvlOpen={1:false,2:false,3:false};setTab('today')});
 const combo=page.locator('.today .sf-combo-heading');
 if(await combo.count()&&await combo.getAttribute('aria-expanded')==='true')await combo.click();
 await page.evaluate(()=>document.getElementById('scroll').scrollTop=0);
 let p=await position(page);
 assert.ok(p.top>=0&&p.bottom<=p.dockTop&&p.hit,`collapsed ${JSON.stringify(p)}`);
 // Long supported content needs scrolling, never a dock-covered bottom action.
 await page.evaluate(()=>{todayRoutinesOpen=true;lvlOpen={1:true,2:true,3:true};for(let i=0;i<12;i++){const id='demo'+i;CFG.h[id]={l:'Synthetic long habit '+i,p:1,pWork:1,pVacation:1,lv:2,on:true};CFG.order.push(id);for(const era of CFG.log){era.h[id]={...CFG.h[id]};era.order.push(id)}}_dayCfgCache={};applyCfg();setTab('today')});
 await page.evaluate(()=>{const scroll=document.getElementById('scroll');scroll.scrollTop=scroll.scrollHeight});
 p=await position(page);assert.ok(p.top>=0&&p.bottom<=p.dockTop&&p.hit,`expanded ${JSON.stringify(p)}`);
 await page.getByRole('button',{name:'Reset day',exact:true}).click();
 assert.equal(await page.locator('.reset-day-confirm').count(),1);
 await page.getByRole('button',{name:'Cancelar borrado',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(width===390)await page.screenshot({path:'test-results/reset-mobile-accessible.png'});
});
