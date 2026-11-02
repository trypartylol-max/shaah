const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {openApp}=require('./browser-helpers.cjs');
test('mobile shows an accessible loading placeholder during auth and data, then replaces it with the real account',async t=>{
  let checks;
  const opening=openApp(t,undefined,{width:390,height:844},{stayOnToday:true,beforePage:async(context,page)=>{
    await context.addInitScript(()=>{
      const create=supabase.createClient;
      supabase.createClient=(...args)=>{
        const client=create(...args),getSession=client.auth.getSession,from=client.from;
        client.auth.getSession=async()=>{await new Promise(r=>window.__releaseBoot=r);return getSession();};
        let waiting=true;client.from=(...args)=>{const q=from(...args),then=q.then;
          q.then=(resolve,reject)=>{if(!waiting)return then.call(q,resolve,reject);waiting=false;return new Promise(r=>window.__releaseRead=r).then(()=>then.call(q,resolve,reject));};return q;};
        return client;
      };
    });
    checks=new Promise((resolve,reject)=>page.once('domcontentloaded',async()=>{
      try{
        await page.waitForFunction(()=>typeof __releaseBoot==='function');
        assert.equal(await page.locator('.loading-skeleton').isVisible(),true);
        assert.equal(await page.locator('#nav').isVisible(),false);
        await page.evaluate(()=>__releaseBoot());
        await page.waitForFunction(()=>typeof __releaseRead==='function');
        assert.equal(await page.locator('[aria-busy="true"]').isVisible(),true);
        assert.equal(await page.locator('.today').count(),0);
        await page.screenshot({path:path.join(__dirname,'../docs/performance/loading-mobile.png')});
        await page.evaluate(()=>{__releaseRead();delete window.__releaseRead;});
        // Routine refresh and any migration settings read use the same adapter.
        await page.waitForFunction(()=>_cfgReady);
        await page.evaluate(()=>{if(window.__releaseRead)__releaseRead();});
        resolve();
      }catch(e){reject(e);}
    }));
  }});
  const page=await opening;await checks;
  assert.equal(await page.locator('.loading-skeleton').count(),0);
  assert.equal(await page.locator('.today').isVisible(),true);
  assert.equal(await page.locator('#nav').isVisible(),true);
});
test('all WOFF2 faces load under CSP and retain the original font measurements',async t=>{
  const snapshots=[];
  for(const baseline of [true,false]){
    const page=await openApp(t,undefined,{width:390,height:844},baseline?{stayOnToday:true,htmlFile:path.join(__dirname,'../docs/performance/baseline-index.html'),assetsRoot:path.join(__dirname,'..')}:{stayOnToday:true});
    const metrics=await page.evaluate(async()=>{
      const fonts=['400 18px "Bebas Neue"','400 18px "DM Mono"','500 18px "DM Mono"','400 18px "DM Sans"','500 18px "DM Sans"','700 18px "DM Sans"'];
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
      const widths=[];
      for(const font of fonts){const faces=await document.fonts.load(font);if(!faces.length||faces.some(f=>f.status!=='loaded'))throw Error('Font failed to load: '+font);ctx.font=font;widths.push(ctx.measureText('SHAAH · Hábitos 0123456789 ₪').width);}
      return widths;
    });snapshots.push(metrics);
  }
  assert.deepEqual(snapshots[1],snapshots[0]);
});
