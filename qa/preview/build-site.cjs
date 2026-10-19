// Deterministic QA adapter; source app remains unchanged. No credential inputs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {temporaryHtml,PRODUCTION_REF}=require('../supabase/guard.cjs');
const ROOT='/workspace/sites/shaah-test-preview';
async function main(){
  const source=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
  let html=temporaryHtml(source,'sb_publishable_preview_runtime');
  html=html.replace('const SUPABASE_KEY="sb_publishable_preview_runtime";','const SUPABASE_KEY=window.SHAAH_QA_CONFIG.key;');
  html=html.replace(/<title>[^<]*<\/title>/,'<title>SHAAH TEST · Location Groups</title>');
  const fontLink=html.match(/<link[^>]+href="(https:\/\/fonts.googleapis.com[^\"]+)"[^>]*>/);
  let fonts='';
  if(fontLink){
    const cache=path.join(ROOT,'fonts.css');
    if(fs.existsSync(cache))fonts=fs.readFileSync(cache,'utf8');
    else{
      const result=await fetch(fontLink[1],{headers:{'User-Agent':'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36'},redirect:'error',signal:AbortSignal.timeout(20000)});
      if(!result.ok)throw new Error('QA_FONT_CSS_FAILED');
      const css=await result.text();
      const allBlocks=[...css.matchAll(/@font-face\s*\{[^}]+\}/g)].map(x=>x[0]);
      const latin=allBlocks.filter(x=>/U\+0000-00FF/i.test(x));
      const blocks=latin.length?latin:allBlocks;
      if(!blocks.length)throw new Error('QA_LATIN_FONTS_MISSING');
      fonts=blocks.join('\n');
      for(const match of [...fonts.matchAll(/url\((https:\/\/fonts.gstatic.com\/[^)]+)\)/g)]){
        const r=await fetch(match[1],{redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('QA_FONT_FILE_FAILED');
        const bytes=Buffer.from(await r.arrayBuffer()),mime=match[1].endsWith('.ttf')?'font/ttf':'font/woff2';fonts=fonts.split(match[1]).join('data:'+mime+';base64,'+bytes.toString('base64'));
      }
      fs.writeFileSync(cache,fonts);
    }
    html=html.replace(fontLink[0],'<link rel="stylesheet" href="/qa-fonts.css">');
  }
  html=html.replace(/<link rel="manifest"[^>]+>/,'<link rel="manifest" href="/manifest.webmanifest">');
  html=html.replace('<head>','<head><meta name="robots" content="noindex,nofollow"><script src="/qa/config.js"></script><script src="/preview-guard.js"></script>');
  const ui=fs.readFileSync(path.join(ROOT,'preview-ui.js'),'utf8'),marker='\nboot();',boot=html.lastIndexOf(marker);
  assert.ok(boot>0);html=html.slice(0,boot)+'\n'+ui+html.slice(boot);
  const assets={
    '/':{type:'text/html; charset=utf-8',body:html},
    '/sdk.js':{type:'application/javascript',body:fs.readFileSync(path.join(path.dirname(require.resolve('@supabase/supabase-js')),'umd/supabase.js'),'utf8')},
    '/preview-guard.js':{type:'application/javascript',body:fs.readFileSync(path.join(ROOT,'preview-client.js'),'utf8')},
    '/qa-fonts.css':{type:'text/css',body:fonts},
    '/manifest.webmanifest':{type:'application/manifest+json',body:JSON.stringify({name:'SHAAH TEST',short_name:'SHAAH TEST',id:'shaah-test-location-groups',start_url:'/',scope:'/',display:'standalone',background_color:'#07070f',theme_color:'#193021'})}
  };
  const template=fs.readFileSync(path.join(ROOT,'worker/router.template.js'),'utf8');
  const hash=require('node:crypto').createHash('sha256').update(source).digest('hex');
  const worker=template.replace('__QA_ASSETS__',JSON.stringify(assets)).replace('__QA_SOURCE_SHA256__',hash);
  assert.ok(!worker.includes(PRODUCTION_REF),'Production reference must be absent from the entire preview');
  assert.ok(!html.includes('cdn.jsdelivr.net')&&!html.includes('fonts.googleapis.com'),'No runtime CDN dependency');
  fs.writeFileSync(path.join(ROOT,'worker/index.js'),worker);
  console.log(JSON.stringify({qaTarget:'kpnwiwaiwnndpvtxkvva',assetCount:Object.keys(assets).length,workerBytes:Buffer.byteLength(worker),productionReferences:0,runtimeExternalScripts:0}));
}
main().catch(e=>{console.log(/^QA_[A-Z_]+$/.test(e.message)?e.message:'QA_SITE_BUILD_FAILED');process.exitCode=2;});
