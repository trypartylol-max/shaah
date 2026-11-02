// Opt-in synthetic benchmark. No production credentials or traffic.
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path');
const {openApp}=require('./browser-helpers.cjs');
const {fixture,loadApp,clone}=require('./helpers.cjs');
const results=[];
for(const mobile of [false,true])test(`benchmark ${mobile?'mobile-slow':'desktop'}`,async t=>{
  const data=fixture();data.config=loadApp().read('Object.assign(cfgCopy(DEFAULT_CFG),cfgCopy(LEGACY_CFG))');
  Object.assign(data.config,{people:fixture().config.people.map((p,i)=>({...p,id:'bench'+i,name:'Synthetic '+i})),tz:'UTC',v:4,subsV:2,junkV:1,balV:1,travelV:10});
  data.config.subs=loadApp().read('SOCIAL_SUBS_BASE');
  data.config.travel={mode:'work',auto:false,resumeOn:'',modeUpdatedAt:1792065600000};
  data.config.log=[{from:'0001-01-01',mode:'work',h:clone(data.config.h),order:[...data.config.order],subs:clone(data.config.subs)}];
  const day=clone(data.days['2026-10-15']);data.days={};
  for(let i=0;i<365;i++){const d=new Date('2026-10-16T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);data.days[d.toISOString().slice(0,10)]=clone(day);}
  const page=await openApp(t,data,mobile?{width:390,height:844}:{width:1440,height:900},{nativePerformance:true,stayOnToday:true,beforePage:async(context,page)=>{
    if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
    await context.addInitScript(({latency})=>{
      window.__benchReads=[];window.__benchStart=performance.now();window.__benchSubscriptions=0;
      const adapter=window.supabase,create=adapter.createClient;
      adapter.createClient=(...args)=>{
        const client=create(...args),from=client.from,channel=client.channel;
        client.channel=(...args)=>{window.__benchSubscriptions++;return channel(...args);};
        client.from=(...args)=>{
          const query=from(...args),then=query.then;let action='select',date=null;
          const eq=query.eq;query.eq=(k,v)=>{if(k==='date')date=v;return eq(k,v);};
          for(const op of ['upsert','update','insert','delete']){const fn=query[op];query[op]=(...a)=>{action=op;return fn(...a);};}
          query.then=(resolve,reject)=>{
            if(action==='select')window.__benchReads.push({date,at:performance.now()});
            return new Promise(r=>setTimeout(r,latency)).then(()=>then.call(query,resolve,reject));
          };return query;
        };
        const getSession=client.auth.getSession,onAuth=client.auth.onAuthStateChange;let emit;
        client.auth.onAuthStateChange=callback=>{emit=callback;return onAuth(callback);};
        client.auth.getSession=async()=>{const session=await getSession();setTimeout(()=>emit?.('INITIAL_SESSION',session.data.session),0);await new Promise(r=>setTimeout(r,25));return session;};
        return client;
      };
    },{latency:mobile?600:100});
  }});
  await page.waitForTimeout(100);
  const startup=await page.evaluate(()=>({readyMs:performance.now()-__benchStart,reads:__benchReads.length,subscriptions:__benchSubscriptions,metrics:__benchMetrics}));
  const tabs={};
  for(const tab of ['today','social','stats','history','log']){
    const samples=[];
    for(let i=0;i<5;i++)samples.push(await page.evaluate(async tab=>{
      __benchMetrics={};const start=performance.now();setTab(tab);const sync=performance.now()-start;
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      return {syncMs:sync,paintMs:performance.now()-start,metrics:__benchMetrics};
    },tab));
    tabs[tab]=samples;
  }
  await page.evaluate(()=>setTab('today'));
  const habit=await page.evaluate(async()=>{
    const id=CFG.order.find(id=>CFG.h[id].on&&id!=='work'&&id!=='social'&&id!=='sleep'&&!CFG.h[id].routine);
    __benchMetrics={};const before=!!getChecked(todayKey())[id],start=performance.now();toggleHabit(id,todayKey());const sync=performance.now()-start;
    const immediate=!!getChecked(todayKey())[id]!==before;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return {id,immediate,syncMs:sync,paintMs:performance.now()-start,metrics:__benchMetrics};
  });
  results.push({device:mobile?'mobile-4x-CPU-600ms-API':'desktop-100ms-API',days:365,startup,tabs,habit});
  fs.writeFileSync(path.join(__dirname,'../docs/performance',`${process.env.BENCH_LABEL||'run'}.json`),JSON.stringify(results,null,2));
});
