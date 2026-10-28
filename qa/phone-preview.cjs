// Local synthetic preview for a physical phone. Never connects to Supabase.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.runtime/phone-preview');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
function build(){
 const {loadApp,serverRows}=require('../tests/helpers.cjs');
 const app=loadApp();app.run("CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16','regression-user').config;CFG.log.push({...JSON.parse(JSON.stringify(CFG.log.at(-1))),from:'2026-12-01'});");
 const fixture={config:app.read('CFG'),days:app.read('_state')};
 // Reuse the exact existing synthetic SDK rather than implementing another
 // fake persistence protocol. Fail closed if its source boundary changes.
 const helper=fs.readFileSync(path.join(root,'tests/browser-helpers.cjs'),'utf8');
 const start='await context.addInitScript(',end='\n  }, { rows: serverRows(data)';
 assert.equal(helper.split(start).length,2);assert.equal(helper.split(end).length,2);
 const fn=helper.slice(helper.indexOf(start)+start.length,helper.indexOf(end))+'\n  }';
 assert.ok(fn.startsWith('({ rows, loggedOut, extraRows }) => {'));
 const bootstrap=`'use strict';\n// Synthetic calendar date with advancing elapsed time for touch guards and timers.\nconst NativeDate=Date,fixtureEpoch=NativeDate.parse('2026-10-16T12:00:00Z'),fixtureStarted=performance.now();const fixtureNow=()=>fixtureEpoch+Math.floor(performance.now()-fixtureStarted);window.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[fixtureNow()]));}static now(){return fixtureNow();}};\n(${fn})(${JSON.stringify({rows:serverRows(fixture),loggedOut:false,extraRows:{}})});\ndocument.addEventListener('DOMContentLoaded',()=>{const n=document.createElement('div');n.className='qa-device-label';n.textContent='PRUEBA LOCAL · DATOS FICTICIOS · 16 OCT 2026';document.body.append(n);});\n`;
 const candidate=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sdk='<script src="./assets/supabase-2.118.0.js"';assert.equal(candidate.split(sdk).length,2);
 const html=candidate.replace('</head>','<link rel="stylesheet" href="./qa-device.css">\n</head>').replace(sdk,'<script src="./qa-bootstrap.js"></script>\n'+sdk);
 fs.mkdirSync(dir,{recursive:true});fs.cpSync(path.join(root,'assets'),path.join(dir,'assets'),{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),html);fs.writeFileSync(path.join(dir,'qa-bootstrap.js'),bootstrap);
 fs.writeFileSync(path.join(dir,'qa-device.css'),'.qa-device-label{position:fixed;top:env(safe-area-inset-top,0px);left:50%;transform:translateX(-50%);z-index:99999;max-width:95vw;white-space:nowrap;padding:3px 8px;border-radius:4px;background:#fff3c4;color:#242014;font:10px system-ui;pointer-events:none}\n');
 const manifest={candidateHtmlSha256:hash(candidate),previewHtmlSha256:hash(html),bootstrapSha256:hash(bootstrap),fixtureClock:'advancing elapsed time anchored to synthetic date',fixtureDate:'2026-10-16',backend:'synthetic SDK from browser-helpers; localStorage only',connectPolicy:"connect-src 'none'",dataSource:'tests/helpers.cjs synthetic fixture; no account data',physicalDeviceResult:'pending'};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
function serve(host,port){
 return new Promise(resolve=>{
  const server=http.createServer((req,res)=>{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
   const name=decodeURIComponent(new URL(req.url,'http://local.invalid').pathname);
   const file=path.resolve(dir,'.'+(name==='/'?'/index.html':name));
   if(!file.startsWith(dir+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
   const type=file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Content-Security-Policy':"connect-src 'none'; frame-src 'none'; form-action 'none'",'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
   res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));
  });server.listen(port,host,()=>resolve(server));
 });
}
(async()=>{
 const manifest=build();
 if(process.argv.includes('--verify')){
  const server=await serve('127.0.0.1',0);let browser;
  const report={status:'running',...manifest,remoteRequests:0,runtimeErrors:0};
  try{
   const engine=process.env.SHAAH_BROWSER_ENGINE==='webkit'?'webkit':'chromium';report.engine=engine;
   browser=await require('playwright')[engine].launch(engine==='webkit'?{headless:true}:{executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'}),origin='http://127.0.0.1:'+server.address().port;
   await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();report.remoteRequests++;return route.abort();});
   await context.routeWebSocket('**/*',route=>{report.remoteRequests++;route.close();});
   const page=await context.newPage();page.on('pageerror',()=>report.runtimeErrors++);
   await page.goto(origin);await page.waitForFunction(()=>_cfgReady&&_live&&!_cfgDraft&&!_cfgFlushPromise);
   assert.equal(await page.evaluate(()=>USER.id),'regression-user');
   const before=await page.evaluate(()=>JSON.stringify([_state,CFG.log.filter(e=>e.from!==todayKey())]));
   const tap=async locator=>{await page.waitForTimeout(350);await locator.tap();};
   await tap(page.getByRole('button',{name:'Settings',exact:true}));
   const toggle=page.locator('#settings-toggle-hab');
   const initial=await toggle.getAttribute('aria-expanded');await tap(toggle);
   await page.waitForFunction(expected=>document.querySelector('#settings-toggle-hab').getAttribute('aria-expanded')===expected,initial==='true'?'false':'true',{timeout:3000});
   await tap(toggle);assert.equal(await toggle.getAttribute('aria-expanded'),initial);
   if(initial==='false')await tap(toggle);
   report.repeatedTouchSettingsControls='passed';
   await page.locator('select[data-ui-change="cfgLevel"][data-ui-change-args=\'["meditation"]\']').selectOption('3');await page.waitForFunction(()=>!_cfgDraft&&!_cfgFlushPromise);
   await page.reload();await page.waitForFunction(()=>_cfgReady&&_live&&!_cfgDraft&&!_cfgFlushPromise);
   assert.equal(await page.evaluate(()=>CFG.h.meditation.lv),3);assert.equal(await page.evaluate(()=>JSON.stringify([_state,CFG.log.filter(e=>e.from!==todayKey())])),before);
   assert.equal(report.remoteRequests,0);assert.equal(report.runtimeErrors,0);report.status='passed';
  }catch(e){report.status='failed';report.error=String(e.message).slice(0,300);process.exitCode=1;}
  finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(root,'docs/qa-habits-2026-10-28/release-candidate/phone-preview-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
 }else if(process.argv.includes('--serve')){
  const host=process.argv.includes('--lan')?'0.0.0.0':'127.0.0.1';await serve(host,4187);console.log('Synthetic phone preview on '+host+':4187. Stop with Ctrl+C. No Supabase connections.');
 }else console.log(JSON.stringify({status:'prepared',...manifest}));
})();
