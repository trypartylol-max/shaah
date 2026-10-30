const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
for(const width of [390,1440])test(`recorded zero days render in statistics at ${width}px`,async t=>{
 const page=await openApp(t,undefined,{width,height:1000});await page.waitForTimeout(2300);
 await page.evaluate(()=>{_state={'2026-10-15':{note:'Recorded zero'},'2026-10-16':{checks:{work:true}},'2026-10-14':{}};setTab('stats');});
 const cards=page.locator('.stats-metric-card');
 assert.equal(await cards.filter({hasText:'DAYS LOGGED'}).locator('.stats-metric-value').textContent(),'2');
 assert.equal(await cards.filter({hasText:'AVERAGE'}).locator('.stats-metric-value').textContent(),`${await page.evaluate(()=>Math.round(calcScore('2026-10-16').pct/2))}%`);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>{_state={'2026-10-15':{note:'Zero'}};render();});
 assert.equal(await page.getByText('NO DATA YET',{exact:true}).count(),0);
 assert.equal(await cards.filter({hasText:'AVERAGE'}).locator('.stats-metric-value').textContent(),'0%');
 const history=await page.evaluate(()=>JSON.stringify(_state));
 page.once('dialog',dialog=>dialog.accept());
 await page.evaluate(()=>personDel('pold03'));
 await page.evaluate(()=>recoverPeopleFromDays());
 assert.equal(await page.evaluate(()=>personById('pold03')),null);
 assert.equal(await page.evaluate(()=>JSON.stringify(_state)),history);
});
