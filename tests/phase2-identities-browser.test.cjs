const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {openApp}=require('./browser-helpers.cjs');
const skins=['classic','aurora','matrix','minimal'];
const account=p=>p.evaluate(()=>JSON.stringify({config:CFG,days:_state,scores:Object.keys(_state).filter(k=>/^\d{4}-/.test(k)).map(k=>[k,calcScore(k)]),writes:__mockWrites.filter(r=>r.date!=='cfgbak')}));
const root=path.resolve(__dirname,'..');

for(const width of [320,390,879,880,1440])test(`Four identities preserve mobile structure and account state at ${width}px`,async t=>{
  const p=await openApp(t,undefined,{width,height:1000});
  const old=await openApp(t,undefined,{width,height:1000},{htmlFile:path.join(root,'docs/phase2/baseline.html'),assetsRoot:root,beforePage:async context=>{for(const name of ['pro-mode.css','display-adaptation.css','appearance-settings.css'])await context.route('**/assets/'+name+'*',route=>route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(root,'docs/phase4/baseline-'+name))}));}});
  // Warm the normal render-time normalization and configuration upgrade before
  // measuring skin changes; otherwise first opening Today changes the fixture.
  for(const page of [p,old]){
    for(const tab of ['today','log','social','stats','history'])await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
    await page.getByRole('button',{name:'Settings',exact:true}).click();
    await page.evaluate(async()=>{await flushCfgSaves();closeSettings();});
  }
  const state=await account(p);
  for(const skin of skins){
    await p.evaluate(s=>setSkin(s),skin);await old.evaluate(s=>setSkin(s),skin);
    for(const tab of ['today','log','social','stats','history']){
      for(const page of [p,old])await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
      const geometry=page=>page.evaluate(()=>({
        boxes:[...document.querySelectorAll('.t-lvl,.t-rout,.t-note,.wg-card,.stats-metric-card,#nav')].map(e=>{const r=e.getBoundingClientRect();return [e.className,r.x,r.y,r.width,r.height]}),
        overflow:document.querySelector('#scroll').scrollWidth>document.querySelector('#scroll').clientWidth+1,
      }));
      const next=await geometry(p),before=await geometry(old);
      assert.equal(next.overflow,false,skin+' '+tab);
      if(width<880)assert.deepEqual(next.boxes,before.boxes,skin+' '+tab+' preserves mobile card geometry');
      if((width===390||width===1440)&&['today','stats','social','log'].includes(tab)){
        await p.screenshot({path:`docs/phase2/${skin}-${tab}-${width}.png`});
        if(tab==='today')await p.locator('.wg-card').screenshot({path:`docs/phase2/${skin}-work-${width}.png`});
      }
    }
    await p.getByRole('button',{name:'Settings',exact:true}).click();
    assert.deepEqual(await p.locator('.skin-options [data-skin-choice]').evaluateAll(es=>es.map(e=>e.dataset.skinChoice)),skins);
    assert.equal(await p.locator('[data-skin-choice="pro"]').count(),0);
    if(width===390)await p.locator('.skin-settings').screenshot({path:`docs/phase2/${skin}-settings-${width}.png`});
    await p.evaluate(()=>closeSettings());
    assert.equal(await account(p),state,'Switching identity preserves account, history, scores and writes');
  }
});

test('WORK identity reaches amounts, geometry and focus; quiet mode and reduced motion suppress completion effects',async t=>{
  const p=await openApp(t);await p.evaluate(()=>setTab('today'));
  const identities=[];
  for(const skin of skins){
    await p.evaluate(s=>setSkin(s),skin);
    const identity=await p.locator('.wg-card').evaluate(e=>{
      const css=getComputedStyle(e),title=getComputedStyle(e.querySelector('.wg-head>span:first-child'));
      return {font:css.fontFamily,color:css.color,bg:css.backgroundColor,title:title.color,accent:css.getPropertyValue('--identity-accent').trim()};
    });
    identities.push(identity);
    assert.ok(identity.font&&identity.accent);
    const contrast=({color,bg})=>{
      const luminance=s=>{const v=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722};
      return (luminance(color)+.05)/(luminance(bg)+.05);
    };
    assert.ok(contrast(identity)>=4.5,skin+' Work text contrast');
    // Present the completed state without triggering account writes.
    await p.locator('.wg-figure').evaluate(e=>e.classList.add('complete'));
    if(skin==='minimal')assert.deepEqual(await p.locator('.wg-figure').evaluate(e=>({animation:getComputedStyle(e).animationName,filter:getComputedStyle(e).filter})),{animation:'none',filter:'none'});
    await p.emulateMedia({reducedMotion:'reduce'});
    assert.deepEqual(await p.locator('.wg-figure').evaluate(e=>({animation:getComputedStyle(e).animationName,filter:getComputedStyle(e).filter})),{animation:'none',filter:'none'});
    await p.emulateMedia({reducedMotion:'no-preference'});
  }
  assert.equal(new Set(identities.map(x=>x.title)).size,4,'Four Work accents');
  assert.match(identities[2].font,/DM Mono/);
  assert.match(identities[3].font,/DM Sans/);
});

test('Glow migrates with its original preference backed up; Pro stays accessible',async t=>{
  const p=await openApp(t);
  for(const id of ['glow','pro']){
    await p.evaluate(id=>localStorage.setItem(SKIN_KEY,id),id);
    await p.reload();await p.waitForFunction(()=>_cfgReady&&_live);
    assert.equal(await p.locator('html').getAttribute('data-skin'),id==='glow'?'aurora':'classic');
    assert.equal(await p.evaluate(()=>localStorage.getItem(SKIN_KEY)),id==='glow'?'aurora':'classic');
    if(id==='glow')assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(SKIN_MIGRATION_KEY)).previous),'glow');
    await p.getByRole('button',{name:'Settings',exact:true}).click();
    assert.equal(await p.locator('[data-skin-choice="glow"]').count(),0);
    if(id==='pro')assert.equal(await p.evaluate(()=>localStorage.getItem(LAYOUT_KEY)),'pro');
    else assert.equal(await p.locator('[data-skin-choice="aurora"]').getAttribute('aria-pressed'),'true');
    await p.evaluate(()=>closeSettings());
  }
});


test('Aurora mobile progress strip retains geometry with the lighter canvas and track',async t=>{
  const p=await openApp(t,undefined,{width:390,height:1000});
  await p.evaluate(()=>{setSkin('aurora');setTab('today')});
  const measure=()=>p.locator('#tb-score').evaluate(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
  const before=await measure();
  assert.equal(await p.locator('#tb-score .ts-bar').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(255, 255, 255, 0.22)');
  assert.equal(await p.locator('#tb-score').evaluate(e=>getComputedStyle(e).backgroundImage),'none');
  await p.locator('#tb-score').screenshot({path:'docs/phase2/aurora-progress-updated.png'});
  await p.locator('#tb-score').evaluate(e=>{window.__oldFeedbackSheet=[...document.styleSheets].find(s=>s.href?.includes('skin-identities'));window.__oldFeedbackSheet.disabled=true;});
  assert.deepEqual(await measure(),before);
  await p.evaluate(()=>window.__oldFeedbackSheet.disabled=false);
});
