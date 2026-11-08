const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {chromium}=require('playwright');
test('Desktop widget drag, keyboard and persistent coordinates',async t=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const source=fs.readFileSync('desktop-widget/SHAAH-TODAY-LIVE.widget/index.jsx','utf8');const logic=source.slice(source.indexOf("const POSITION_KEY="),source.indexOf('export const render ='));
 await page.route('http://widget.test/',r=>r.fulfill({contentType:'text/html',body:'<div class="panel" style="position:fixed;width:390px;height:300px"><button style="touch-action:none">Move</button></div>'}));
 const setup=()=>page.evaluate(logic=>{eval(logic+`;const panel=document.querySelector('.panel'),p=readPosition();panel.style.left=p.x+'px';panel.style.top=p.y+'px';const b=panel.querySelector('button');b.onpointerdown=moveWidget;b.onkeydown=moveWithKeys;window.position=readPosition;`);},logic);
 await page.goto('http://widget.test/');await setup();const button=page.locator('button');const box=await button.boundingBox();
 await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();await page.mouse.move(250,200,{steps:5});await page.mouse.up();
 const saved=await page.evaluate(()=>position());assert.ok(saved.x<300);await page.reload();await setup();assert.deepEqual(await page.evaluate(()=>position()),saved);
 await button.focus();await page.keyboard.press('ArrowRight');assert.equal((await page.evaluate(()=>position())).x,saved.x+10);
 await page.keyboard.press('Shift+ArrowDown');assert.equal((await page.evaluate(()=>position())).y,saved.y+1);
 await page.evaluate(()=>localStorage.setItem('shaah-today-live-position-v1','broken'));await page.reload();await setup();assert.ok(Number.isFinite((await page.evaluate(()=>position())).x));
});
