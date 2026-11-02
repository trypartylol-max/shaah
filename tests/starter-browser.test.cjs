const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
test('first session uses a real habit and real Day Log, survives refresh, no automatic tour',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 assert.equal(await p.locator('#tour.on').count(),0);assert.equal(await p.evaluate(()=>__mockWrites.length),0);
 assert.equal(await p.locator('#starter-confirm').isDisabled(),true);
 fs.mkdirSync('test-results',{recursive:true});await p.screenshot({path:'test-results/starter-choose-mobile.png'});
 await p.getByRole('button',{name:/Enfoque/}).click();await p.getByRole('button',{name:'Empezar con esto'}).click();
 await p.getByRole('heading',{name:'Tu día, a tu ritmo.'}).waitFor();assert.equal(await p.locator('[data-starter-habit]').count(),1);
 await p.getByRole('button',{name:'Marcar como hecho',exact:true}).click();assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),10);
 assert.equal(await p.locator('#tb-score').innerText(),'1 de 1 de tu plan');
 await p.getByRole('button',{name:'Deshacer',exact:true}).click();assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),0);
 await p.getByRole('button',{name:'Dividir en pasos · opcional'}).click();await p.getByRole('button',{name:'Añadir esta rutina'}).click();
 assert.equal(await p.evaluate(()=>Object.keys(CFG.routines).length),1);assert.equal(await p.evaluate(()=>calcScore(todayKey()).max),10);
 await p.evaluate(()=>flushCfgSaves());await p.reload();await p.getByRole('heading',{name:'Tu día, a tu ritmo.'}).waitFor();
 assert.equal(await p.locator('#tour.on').count(),0);assert.equal(await p.locator('[data-starter-habit]').count(),1);
 await p.getByRole('button',{name:'Añadir otro hábito'}).click();await p.getByRole('button',{name:'Movimiento',exact:false}).click();await p.getByRole('button',{name:'Añadir a mi plan'}).click();
 assert.equal(await p.locator('[data-starter-habit]').count(),2);assert.equal(await p.evaluate(()=>calcScore(todayKey()).max),20);
 assert.equal(await p.evaluate(()=>!!CFG.h.work||!!CFG.h.cjunk0),false);
 await p.getByRole('button',{name:'Registrar actividad',exact:true}).click();
 await p.locator('#logPanelName').fill('Paseo de prueba');await p.locator('#logPanelStart').fill('10:00');await p.locator('#logPanelEnd').fill('10:20');
 await p.getByRole('button',{name:'ADD ACTIVITY',exact:true}).click();assert.equal(await p.evaluate(()=>dayLogEvents(todayKey()).some(e=>e.title==='Paseo de prueba')),true);
});
test('skip stays neutral across refresh; custom name is escaped and editable',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await p.getByRole('button',{name:'Entrar sin elegir'}).click();await p.getByRole('heading',{name:'Tu día empieza aquí.'}).waitFor();
 assert.equal(await p.locator('#tb-score').innerText(),'Sin plan de hábitos');await p.reload();await p.getByRole('heading',{name:'Tu día empieza aquí.'}).waitFor();
 await p.getByRole('button',{name:'Elegir mi primer hábito'}).click();await p.getByRole('button',{name:'Escribir el mío'}).click();
 await p.getByLabel('Mi compromiso',{exact:true}).fill('<img src=x onerror=alert(1)> Leer');await p.getByRole('button',{name:'Añadir a mi plan'}).click();
 assert.equal(await p.locator('[data-starter-habit] img').count(),0);assert.match(await p.locator('[data-starter-habit] h2').innerText(),/<img/);
 await p.getByRole('button',{name:'Cambiar',exact:true}).click();await p.getByLabel('Mi compromiso',{exact:true}).fill('Leer una página');await p.getByRole('button',{name:'Guardar cambio'}).click();
 assert.equal(await p.locator('[data-starter-habit]').count(),1);assert.match(await p.locator('[data-starter-habit] h2').innerText(),/Leer una página/);
});
test('responsive Starter is usable in six skins; full/simple switches keep all active habits',async t=>{
 const p=await openApp(t,undefined,{width:1440,height:900},{emptyAccount:true});
 fs.mkdirSync('test-results',{recursive:true});
 for(const skin of ['classic','aurora','glow','matrix','minimal','pro']){
  await p.evaluate(s=>setSkin(s),skin);
  for(const width of [320,390,879,880,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,skin+' '+width);}
 }
 await p.evaluate(()=>setSkin('classic'));await p.getByRole('button',{name:/Enfoque/}).click();await p.getByRole('button',{name:'Empezar con esto'}).click();
 for(const skin of ['classic','aurora','glow','matrix','minimal','pro']){await p.evaluate(s=>setSkin(s),skin);for(const width of [320,390,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.locator('#scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,skin+' Today '+width);assert.equal(await p.getByRole('button',{name:'Marcar como hecho'}).isVisible(),true);assert.ok(await p.locator('[data-starter-habit]').evaluate(e=>e.getBoundingClientRect().width)>Math.min(240,width-40),skin+' readable card '+width);}}
 await p.screenshot({path:'test-results/starter-today-desktop.png'});await p.getByRole('button',{name:'Ver vista completa'}).click();
 assert.equal(await p.evaluate(()=>CFG.starter.view),'full');await p.evaluate(()=>starterView('simple'));assert.equal(await p.locator('[data-starter-habit]').count(),1);
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:'test-results/starter-today-mobile.png'});
});
test('optional generic routine opens the existing runner without duplicate points; tutorial stays a memory demo',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{emptyAccount:true});
 await p.getByRole('button',{name:/Enfoque/}).click();await p.getByRole('button',{name:'Empezar con esto'}).click();
 await p.getByRole('button',{name:'Dividir en pasos · opcional'}).click();await p.getByRole('button',{name:'Añadir esta rutina'}).click();
 await p.getByRole('button',{name:'Empezar rutina',exact:true}).click();await p.locator('#cr-dialog').waitFor();
 assert.equal(await p.evaluate(()=>ROUTINES[CFG.order[0]].steps.length),3);assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),0);
 await p.getByRole('button',{name:'Close routine',exact:true}).click();await p.getByRole('button',{name:'Marcar como hecho'}).click();
 assert.equal(await p.evaluate(()=>Object.keys(sessions).length),0);assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),10);
 await p.getByRole('button',{name:'Ver tutorial',exact:true}).click();await p.locator('#tour.on').waitFor();
 await p.getByRole('button',{name:'Skip / close',exact:true}).click();assert.equal(await p.evaluate(()=>calcScore(todayKey()).score),10);
});
test('new browser for an existing account never starts the old automatic tutorial',async t=>{
 const p=await openApp(t);await p.evaluate(()=>localStorage.removeItem(tourKey()));await p.reload();await p.waitForFunction(()=>_cfgReady);
 assert.equal(await p.locator('.starter-screen').count(),0);assert.equal(await p.locator('#tour.on').count(),0);
});
