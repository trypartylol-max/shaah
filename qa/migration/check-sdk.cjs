// Check the actual pinned CDN build as a classic browser script, with all
// outgoing requests blocked. No Supabase clients, accounts or sessions created.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const results=[];
  try{for(const [name,file]of [['pinnedCdn','/tmp/shaah-sdk-pinned.js'],['npmUmd',path.join(__dirname,'../../node_modules/@supabase/supabase-js/dist/umd/supabase.js')]]){
    const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();let errors=0,requests=0;
    await context.route('**/*',route=>{requests++;return route.abort();});page.on('pageerror',()=>errors++);
    await page.addScriptTag({path:file});const api=await page.evaluate(()=>({clientFactory:typeof window.supabase?.createClient,exports:Object.keys(window.supabase||{}).sort()}));
    assert.equal(api.clientFactory,'function');assert.equal(errors,0);assert.equal(requests,0);results.push({name,...api,runtimeErrors:errors,outboundRequests:requests});await context.close();
  }
  assert.deepEqual(results[0].exports,results[1].exports);
  const output=path.join(__dirname,'../../test-results/migration-phase3/pinned-sdk.json'),report=JSON.parse(fs.readFileSync(output,'utf8'));
  report.classicBrowserScriptsValid=true;report.globalExportsMatch=true;report.browserChecks=results;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'passed',version:report.version,classicBrowserScriptsValid:true,globalExportsMatch:true,outboundRequests:0}));
  }finally{await browser.close();}
})().catch(()=>{console.log('QA_SDK_BROWSER_CHECK_FAILED');process.exitCode=2;});
