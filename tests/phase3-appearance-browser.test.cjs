const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const state=p=>p.evaluate(()=>JSON.stringify({config:CFG,days:_state,scores:Object.keys(_state).filter(k=>/^\d{4}-/.test(k)).map(k=>[k,calcScore(k)]),writes:__mockWrites.filter(r=>r.date!=='cfgbak')}));

async function migratedApp(t,mode='normal'){
  return openApp(t,undefined,{width:390,height:1000},{beforePage:async(context)=>{
    await context.addInitScript(mode=>{
      const native=Storage.prototype.setItem;
      if(!localStorage.getItem('phase3-seeded')){
        native.call(localStorage,'phase3-seeded','1');native.call(localStorage,'shaah:skin:v1','glow');
        if(mode==='unknown-backup')native.call(localStorage,'shaah:skin:migration:v1','human-value');
      }
      window.__appearanceWrites=[];
      Storage.prototype.setItem=function(key,value){
        if(key==='shaah:skin:migration:v1'&&mode==='blocked-backup')throw new DOMException('blocked','QuotaExceededError');
        if(key==='shaah:skin:v1'&&mode==='blocked-key')throw new DOMException('blocked','QuotaExceededError');
        if(key.startsWith('shaah:skin:'))window.__appearanceWrites.push([key,value]);
        const result=native.call(this,key,value);
        if(key==='shaah:skin:migration:v1'&&mode==='newer-choice')native.call(localStorage,'shaah:skin:v1','minimal');
        return result;
      };
    },mode);
  }});
}

test('Glow migration backs up before writing Aurora and is idempotent after reload',async t=>{
  const p=await migratedApp(t);
  assert.equal(await p.locator('html').getAttribute('data-skin'),'aurora');
  assert.deepEqual(await p.evaluate(()=>__appearanceWrites.map(x=>x[0])),['shaah:skin:migration:v1','shaah:skin:v1']);
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'aurora');
  const backup=await p.evaluate(()=>localStorage.getItem(SKIN_MIGRATION_KEY));
  assert.equal(JSON.parse(backup).previous,'glow');
  await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);
  assert.deepEqual(await p.evaluate(()=>__appearanceWrites),[]);
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_MIGRATION_KEY)),backup);
});
for(const mode of ['blocked-backup','blocked-key','unknown-backup'])test(`Glow migration preserves the original preference when ${mode}`,async t=>{
  const p=await migratedApp(t,mode);
  assert.equal(await p.locator('html').getAttribute('data-skin'),'aurora');
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'glow');
  if(mode==='unknown-backup')assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_MIGRATION_KEY)),'human-value');
});
test('Glow migration preserves a newer choice made while saving the backup',async t=>{
  const p=await migratedApp(t,'newer-choice');
  assert.equal(await p.locator('html').getAttribute('data-skin'),'minimal');
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'minimal');
});

for(const width of [320,390,1440])test(`Preview, cancel and apply preserve account data at ${width}px`,async t=>{
  const p=await openApp(t,undefined,{width,height:1000});
  await p.evaluate(()=>{setSkin('classic');setTab('today')});
  await p.getByRole('button',{name:'Settings',exact:true}).click();await p.evaluate(()=>flushCfgSaves());
  const before=await state(p);
  const choice=p.getByRole('button',{name:'Preview Aurora',exact:true});
  await choice.click();
  assert.equal(await p.locator('html').getAttribute('data-skin'),'aurora');
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'classic');
  assert.equal(await p.locator('#appearance-preview').isVisible(),true);
  if(width!==320){await p.locator('.skin-settings').screenshot({path:`docs/phase3/settings-${width}.png`});await p.screenshot({path:`docs/phase3/preview-${width}.png`});}
  await p.locator('#appearance-preview').getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await p.locator('html').getAttribute('data-skin'),'classic');
  assert.equal(await choice.evaluate(e=>e===document.activeElement),true);
  assert.equal(await p.locator('#appearance-preview').count(),0);
  for(const skin of ['aurora','matrix','minimal'])await p.evaluate(s=>previewSkin(s),skin);
  await p.evaluate(()=>cancelSkinPreview());
  assert.equal(await p.locator('html').getAttribute('data-skin'),'classic');
  await choice.click();
  await p.evaluate(()=>{closeSettings();setTab('today')});
  const note=p.locator('.t-note textarea');await note.fill('Unsaved appearance preview note');
  await p.evaluate(()=>{window.__appearanceNote=document.querySelector('.t-note textarea');previewSkin('matrix');cancelSkinPreview();});
  assert.equal(await note.inputValue(),'Unsaved appearance preview note');
  assert.equal(await note.evaluate(e=>e===window.__appearanceNote),true);
  // Filling the note is a separate edit; compare appearance-only behavior first.
  await note.fill('');
  assert.equal(await state(p),before);
  await p.evaluate(()=>previewSkin('aurora'));
  await p.locator('#appearance-preview').getByRole('button',{name:'Apply',exact:true}).click();
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'aurora');
  assert.equal(await p.locator('#appearance-preview').count(),0);
  assert.equal(await state(p),before);
  assert.equal(await p.evaluate(()=>document.querySelector('#scroll').scrollWidth>innerWidth),false);
});

test('Another tab supersedes a preview without overwriting the newer saved preference',async t=>{
  const p=await openApp(t);await p.evaluate(()=>{setSkin('classic');previewSkin('aurora')});
  const other=await p.context().newPage();await other.goto('http://shaah.test/');await other.waitForFunction(()=>_cfgReady&&_live);
  await other.evaluate(()=>setSkin('matrix'));
  await p.waitForFunction(()=>document.documentElement.dataset.skin==='matrix');
  assert.equal(await p.locator('#appearance-preview').count(),0);
  await p.evaluate(()=>cancelSkinPreview());
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'matrix');
});

test('A blocked Apply keeps the preview recoverable and supports retry or cancel',async t=>{
  const p=await openApp(t);await p.evaluate(()=>{
    setSkin('classic');previewSkin('aurora');
    window.__normalAppearanceSet=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key===SKIN_KEY)throw new DOMException('blocked','QuotaExceededError');return window.__normalAppearanceSet.call(this,key,value)};
  });
  await p.locator('#appearance-preview').getByRole('button',{name:'Apply',exact:true}).click();
  assert.match(await p.locator('#appearance-preview [role="alert"]').innerText(),/Couldn.t save/);
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'classic');
  await p.locator('#appearance-preview').getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await p.locator('html').getAttribute('data-skin'),'classic');
  await p.evaluate(()=>{previewSkin('aurora');Storage.prototype.setItem=window.__normalAppearanceSet});
  await p.locator('#appearance-preview').getByRole('button',{name:'Apply',exact:true}).click();
  assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),'aurora');
  assert.equal(await p.locator('#appearance-preview').count(),0);
});
