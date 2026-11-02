// Real localhost HTTP transfers under browser throttling, with synthetic auth/data.
const {test,before,after}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
let server,origin;
const root=path.resolve(__dirname,'..'),results=[];
before(async()=>{
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost'),baseline=url.pathname.startsWith('/before/');
    const resource=url.pathname.replace(/^\/(before|after)\//,'');
    const file=resource?path.join(root,resource):path.join(root,baseline?'docs/performance/baseline-index.html':'index.html');
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
    const ext=path.extname(file),types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.woff2':'font/woff2'};
    const raw=fs.readFileSync(file),body=zlib.gzipSync(raw);
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Content-Encoding':'gzip','Cache-Control':'max-age=600','Content-Length':body.length});res.end(body);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));});
for(const label of ['before','after'])test(`cold HTTP mobile ${label}: 1.6Mbps/150ms RTT/4x CPU`,async t=>{
  let cdp;
  const page=await openApp(t,undefined,{width:390,height:844},{nativePerformance:true,url:origin+'/'+label+'/',realAssets:true,stayOnToday:true,beforePage:async(context,page)=>{
    cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await context.addInitScript(()=>{
      const create=supabase.createClient;
      supabase.createClient=(...args)=>{const client=create(...args),from=client.from;
        client.from=(...args)=>{const q=from(...args),then=q.then;q.then=(resolve,reject)=>new Promise(r=>setTimeout(r,600)).then(()=>then.call(q,resolve,reject));return q;};return client;};
      window.__readyAt=null;
      new MutationObserver(()=>{
        if(!__readyAt&&document.querySelector('.today'))requestAnimationFrame(()=>{if(!__readyAt)__readyAt=performance.now();});
      }).observe(document,{childList:true,subtree:true});
    });
  }});
  await page.waitForTimeout(100);
  const metrics=await page.evaluate(()=>({readyMs:__readyAt,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    resources:performance.getEntriesByType('resource').map(x=>({name:new URL(x.name).pathname,bytes:x.encodedBodySize,duration:x.duration})),
    overflow:document.documentElement.scrollWidth>innerWidth,live:_live}));
  assert.equal(metrics.overflow,false);assert.equal(metrics.live,true);
  await page.screenshot({path:path.join(root,'docs/performance',label+'-mobile.png')});
  results.push({label,profile:'390x844;4x CPU;1.6Mbps down;150ms latency;600ms synthetic API;gzip;fresh browser context',...metrics});
  fs.writeFileSync(path.join(root,'docs/performance/network.json'),JSON.stringify(results,null,2));
});
