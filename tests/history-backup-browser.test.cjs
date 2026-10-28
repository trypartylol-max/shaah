const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const {fixture,clone}=require('./helpers.cjs');
function pending(){
 const data=fixture();data.config.travelV=9;
 data.config.shaahSocialCoreMigration={version:1,effectiveFrom:'2026-10-16',owner:'regression-user'};
 data.config.travel={mode:'vacation',auto:true,resumeOn:'2026-12-01',modeUpdatedAt:Date.parse('2026-10-14T12:00:00Z')};
 data.config.log[2].mode='vacation';data.config.log[2].h.work.on=false;return data;
}
async function open(t,width=390,email='trypartylol@gmail.com'){
 const data=pending(),other=pending();other.config.shaahSocialCoreMigration.owner='synthetic-other';
 const page=await openApp(t,data,{width,height:1000},{url:'http://localhost/',authEmail:email,syntheticAccounts:{'synthetic-other':other}});
 await settings(page);return {page,data};
}
async function settings(page){
 if(!await page.locator('#settings-toggle-bak').count())await page.getByRole('button',{name:'Settings',exact:true}).click();
 if(await page.locator('#settings-toggle-bak').getAttribute('aria-expanded')==='false')await page.locator('#settings-toggle-bak').click();
}
async function download(page){
 const event=page.waitForEvent('download');event.catch(()=>{});await page.getByRole('button',{name:'Descargar respaldo',exact:true}).click();
 await page.waitForFunction(()=>!_historySafety.busy);
 assert.equal(await page.evaluate(()=>!!_historySafety.backup),true,await page.evaluate(()=>_historySafety.status));
 const result=await event;const body=fs.readFileSync(await result.path());
 return {body,envelope:JSON.parse(body),file:{name:result.suggestedFilename(),mimeType:'application/json',buffer:body}};
}
async function verify(page,backup){await page.getByLabel('Verificar archivo descargado').setInputFiles(backup.file);await page.waitForFunction(()=>!_historySafety.busy);}
async function apply(page){page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Confirmar reparación',exact:true}).click();await page.waitForFunction(()=>!_historySafety.busy);}
for(const width of [390,1440])test(`${width}: verified download, preview, explicit repair and recovery survive reload without replacing day records`,async t=>{
 const {page,data}=await open(t,width);
 assert.equal(await page.evaluate(()=>CFG.travelV),9);
 assert.deepEqual(await page.evaluate(()=>CFG.log),data.config.log);
 const button=page.getByRole('button',{name:'Confirmar reparación',exact:true});assert.equal(await button.isDisabled(),true);
 const before=await page.evaluate(()=>JSON.stringify(_state)),backup=await download(page);
 assert.equal(backup.envelope.payload.owner.id,'regression-user');assert.equal(backup.envelope.payload.owner.email,'trypartylol@gmail.com');
 assert.equal(backup.envelope.payload.records.length,Object.keys(data.days).length+1);
 assert.equal(await page.evaluate(()=>__mockWrites.length),0,'backup reads and download do not write');
 assert.equal(await button.isDisabled(),true);
 await verify(page,backup);assert.equal(await button.isEnabled(),true);
 assert.ok((await page.locator('[data-history-safety]').innerText()).includes('Cambios previstos'));
 assert.equal(await page.evaluate(()=>CFG.travelV),9);assert.equal(await page.evaluate(()=>JSON.stringify(_state)),before);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('[data-history-safety]').screenshot({path:`test-results/history-backup-${width}.png`});
 page.once('dialog',d=>d.dismiss());await button.click();assert.equal(await page.evaluate(()=>__mockWrites.length),0,'cancelling the confirmation writes nothing');
 await apply(page);assert.equal(await page.evaluate(()=>CFG.travelV),10);
 assert.equal(await page.evaluate(()=>CFG.log.find(e=>e.from==='2026-10-08').mode),'work');
 assert.equal(await page.evaluate(()=>travelMode()),'vacation','historical repair preserves live choice');
 assert.equal(await page.evaluate(()=>JSON.stringify(_state)),before);
 assert.equal(await page.evaluate(()=>__mockWrites.filter(r=>r.date==='settings').length),1);
 await page.evaluate(()=>setNote(todayKey(),'Added after repair'));
 await page.waitForFunction(()=>!_pending[todayKey()]);
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);await settings(page);
 const dayWrites=await page.evaluate(()=>__mockWrites.filter(r=>r.date!=='settings').length);
 await page.getByLabel('Respaldo anterior',{exact:true}).setInputFiles(backup.file);await page.waitForFunction(()=>!_historySafety.busy);
 assert.equal(await page.getByRole('button',{name:'Confirmar recuperación',exact:true}).isEnabled(),true);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Confirmar recuperación',exact:true}).click();await page.waitForFunction(()=>!_historySafety.busy);
 assert.equal(await page.evaluate(()=>CFG.travelV),10);
 assert.deepEqual(await page.evaluate(()=>CFG.log),data.config.log);
 assert.equal(await page.evaluate(()=>getNote(todayKey())),'Added after repair');
 assert.equal(await page.evaluate(()=>__mockWrites.filter(r=>r.date!=='settings').length),dayWrites,'recovery never rewrites daily rows');
 await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
 assert.equal(await page.evaluate(()=>CFG.travelV),10,'recovery is not followed by another automatic repair');
 assert.deepEqual(await page.evaluate(()=>CFG.log),data.config.log);assert.equal(await page.evaluate(()=>getNote(todayKey())),'Added after repair');
});
test('corrupted or foreign files and changed server revisions cannot enable a stale repair',async t=>{
 const {page}=await open(t),backup=await download(page),bad=clone(backup.envelope);bad.payload.config.travelV=123;
 await page.getByLabel('Verificar archivo descargado').setInputFiles({name:'changed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>!_historySafety.busy);
 assert.equal(await page.getByRole('button',{name:'Confirmar reparación',exact:true}).isDisabled(),true);
 const foreign=clone(backup.envelope);foreign.payload.owner.id='synthetic-other';
 await page.getByLabel('Verificar archivo descargado').setInputFiles({name:'foreign.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(foreign))});await page.waitForFunction(()=>!_historySafety.busy);
 assert.equal(await page.getByRole('button',{name:'Confirmar reparación',exact:true}).isDisabled(),true);
 await verify(page,backup);
 await page.evaluate(()=>{const rows=JSON.parse(localStorage.getItem('shaah_mock_rows'));rows.find(r=>r.date==='settings').settings_revision++;localStorage.setItem('shaah_mock_rows',JSON.stringify(rows));});
 await apply(page);assert.equal(await page.evaluate(()=>CFG.travelV),9);assert.equal(await page.evaluate(()=>__mockWrites.length),0);
 assert.ok((await page.locator('[data-history-safety] [role=status]').innerText()).includes('cambiaron'));
});
test('switching owners clears verified backup and recovery controls; another account can export only its own data',async t=>{
 const {page}=await open(t),backup=await download(page);await verify(page,backup);
 await page.evaluate(()=>__emitMockAuth('SIGNED_IN',{id:'synthetic-other',email:'other@example.invalid'}));
 await page.waitForFunction(()=>USER?.id==='synthetic-other'&&_cfgReady&&_live);await settings(page);
 assert.equal(await page.evaluate(()=>_historySafety.backup),null);assert.equal(await page.evaluate(()=>_historySafety.verified),false);
 assert.equal(await page.getByRole('button',{name:'Confirmar reparación',exact:true}).count(),0);
 assert.equal(await page.getByLabel('Respaldo anterior',{exact:true}).count(),0);
 const own=await download(page);assert.equal(own.envelope.payload.owner.id,'synthetic-other');
 assert.equal(own.envelope.payload.records.every(r=>r.user_id==='synthetic-other'),true);
 assert.equal(await page.evaluate(()=>__mockWrites.filter(r=>r.user_id==='synthetic-other').length),0);
});
