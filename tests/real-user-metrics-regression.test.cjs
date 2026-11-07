const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

// No application/auth/backend is loaded: every capability is an explicit fake.
// Retaining observer callbacks lets tests exercise records delivered after disconnect.
function harness(options={}){
  let now=1000,sequence=0,denied=!!options.storageDenied,hidden=false;
  const values=new Map(Object.entries(options.storage||{})),timers=new Map(),frames=new Map(),observers=[],events=new Map(),network=[];
  const storage={getItem(key){if(denied)throw Error('Storage denied');return values.get(key)??null;},setItem(key,value){if(denied)throw Error('Storage denied');values.set(String(key),String(value));},removeItem(key){if(denied)throw Error('Storage denied');values.delete(key);}};
  class Observer{
    static supportedEntryTypes=options.types||['paint','largest-contentful-paint','event'];
    constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}
    observe(config){if(options.observeThrows)throw Error('Observer unavailable');this.config=config;}
    disconnect(){this.disconnected=true;}
    takeRecords(){return [];}
  }
  const addEventListener=(name,fn)=>{const listeners=events.get(name)||[];listeners.push(fn);events.set(name,listeners);};
  const document={addEventListener,get hidden(){return hidden;},get visibilityState(){return hidden?'hidden':'visible';}};
  const performance={now:()=>now,getEntriesByType:type=>options.entries?.[type]||[],getEntriesByName:()=>[],timeOrigin:123456789};
  const context=vm.createContext({console,JSON,Math,Object,Array,Number,String,Set,Map,Date,Blob,URL,document,performance,localStorage:storage,PerformanceObserver:options.noObserver?undefined:Observer,
    navigator:{sendBeacon:(...args)=>{network.push(args);throw Error('Unexpected beacon');}},
    fetch:(...args)=>{network.push(args);throw Error('Unexpected fetch');},
    XMLHttpRequest:class{constructor(){network.push(['XHR']);throw Error('Unexpected XHR');}},
    setTimeout(fn){const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame(fn){const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),addEventListener});
  context.window=context;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../source/performance.js'),'utf8'),context,{filename:'source/performance.js'});
  const api=context.SHAAHPerformance;
  const copy=x=>JSON.parse(JSON.stringify(x));
  return {api,values,timers,frames,observers,network,context,
    snapshot:()=>copy(api.snapshot()),setNow:value=>{now=value;},advance:amount=>{now+=amount;},
    setDenied:value=>{denied=value;},setHidden:value=>{hidden=value;},
    event(name,event={}){for(const fn of events.get(name)||[])fn(event);},
    deliver(observer,entries){observer.callback({getEntries:()=>entries});},
    flushTimers(){const pending=[...timers.values()];timers.clear();for(const fn of pending)fn();},
    frame(){const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(now);}
  };
}
const key=owner=>'shaah:performance:v1:'+owner;
const metric=(h,name)=>h.snapshot().metrics.find(row=>row.key===name);
const observer=(h,type)=>h.observers.findLast(item=>item.config?.type===type);
function enabled(options={}){const h=harness(options);h.api.setOwner('synthetic-A');h.api.setEnabled(true);return h;}
function sample(h,name,value=25,outcome='ok'){
  const token=h.api.start(name);h.advance(value);h.api.finish(token,outcome);return token;
}

test('diagnostic is off by default and anonymous contexts never start collection or network',()=>{
  const h=harness();assert.equal(h.snapshot().enabled,false);assert.equal(h.api.start('data_load'),null);
  h.api.setEnabled(true);h.api.ready();assert.equal(h.snapshot().enabled,false);
  h.api.setOwner('synthetic-A');assert.equal(h.snapshot().enabled,false);assert.equal(h.observers.length,0);
  assert.equal(h.api.start('tab_today'),null);assert.equal(h.values.size,0);assert.deepEqual(h.network,[]);
});

test('only numeric measurements with fixed metric names enter sanitized snapshots',()=>{
  const h=enabled();sample(h,'data_load',12.34,'error');
  assert.equal(h.api.start('private-habit-name'),null);assert.equal(metric(h,'data_load').count,1);
  assert.equal(metric(h,'data_load').last,12.3);assert.equal(metric(h,'data_load').failures,1);
  const text=JSON.stringify(h.snapshot());assert.doesNotMatch(text,/synthetic-A|private-habit-name|shaah:performance|timeOrigin|123456789|\/\//);
  assert.deepEqual(Object.keys(h.snapshot()).sort(),['app','enabled','format','maxSamplesPerMetric','metrics','reloadRecommended','scope','storageAvailable','support'].sort());
  h.flushTimers();assert.deepEqual(h.network,[]);
});

test('one timing token is consumed once and invalid/backwards durations never enter reports',()=>{
  const h=enabled(),token=sample(h,'habit_response',10);
  h.api.finish(token);assert.equal(metric(h,'habit_response').count,1);
  const old=h.api.start('data_load');h.advance(-100);h.api.finish(old);assert.equal(metric(h,'data_load').count,0);
  const huge=h.api.start('data_load');h.advance(600001);h.api.finish(huge);assert.equal(metric(h,'data_load').count,0);
  h.api.finish(null);h.api.finish({key:'not-allowed',epoch:0,at:1});assert.equal(metric(h,'data_load').count,0);
});

test('200-sample rolling bound and quantiles remain meaningful after extended use',()=>{
  const h=enabled();for(let i=1;i<=250;i++)sample(h,'tab_social',i);
  const row=metric(h,'tab_social');assert.equal(row.count,200);assert.equal(row.last,250);assert.equal(row.max,250);assert.equal(row.p50,150);assert.equal(row.p95,240);
  h.flushTimers();assert.ok([...h.values.values()].every(value=>value.length<50000));assert.deepEqual(h.network,[]);
});

test('clearing cancels pending timers, observers and delayed paint records without reviving deleted measurements',()=>{
  const h=enabled();sample(h,'data_load',15);
  const staleTimer=[...h.timers.values()][0],staleObserver=observer(h,'event');
  const token=h.api.start('tab_stats');h.advance(20);h.api.finish(token,'ok',true);
  const staleFrames=[...h.frames.values()];h.api.clear();staleTimer?.();
  h.deliver(staleObserver,[{startTime:1005,duration:80}]);for(const fn of staleFrames)fn();h.frame();h.flushTimers();
  assert.ok(h.snapshot().metrics.every(row=>row.count===0));assert.ok(staleObserver.disconnected);
  const persisted=JSON.parse(h.values.get(key('synthetic-A')));assert.ok(Object.values(persisted.series).every(row=>row.values.length===0));
});

test('switching accounts and logging out invalidates outstanding work and restores only each owner’s measurements',()=>{
  const h=enabled();sample(h,'data_load',15);const old=h.api.start('tab_today');
  h.api.finish(old,'ok',true);const staleFrame=[...h.frames.values()][0],staleObserver=observer(h,'event');
  h.api.setOwner('synthetic-B');assert.equal(h.snapshot().enabled,false);assert.ok(h.snapshot().metrics.every(row=>!row.count));
  h.api.setEnabled(true);sample(h,'tab_social',22);staleFrame?.();h.frame();h.deliver(staleObserver,[{startTime:1050,duration:120}]);
  assert.equal(metric(h,'tab_today').count,0);assert.equal(metric(h,'slow_event_max').count,0);
  h.api.setOwner(null);assert.equal(h.snapshot().enabled,false);assert.ok(h.snapshot().metrics.every(row=>!row.count));
  h.api.setOwner('synthetic-A');assert.equal(metric(h,'data_load').last,15);assert.equal(metric(h,'tab_social').count,0);
  h.api.setOwner('synthetic-B');assert.equal(metric(h,'tab_social').last,22);assert.equal(metric(h,'data_load').count,0);
});

test('disabling collection retains existing diagnostics and stops all pending or observer measurements',()=>{
  const h=enabled();sample(h,'data_load',30);const old=observer(h,'event');
  const token=h.api.start('tab_history');h.api.finish(token,'ok',true);h.api.setEnabled(false);h.frame();h.frame();
  h.deliver(old,[{startTime:1100,duration:80}]);assert.equal(h.api.start('data_load'),null);
  assert.equal(metric(h,'data_load').last,30);assert.equal(metric(h,'tab_history').count,0);assert.equal(metric(h,'slow_event_max').count,0);
  h.api.setOwner(null);h.api.setOwner('synthetic-A');assert.equal(h.snapshot().enabled,false);assert.equal(metric(h,'data_load').last,30);
});

test('storage entries are allowlisted, bounded and numeric before entering a report',()=>{
  const hostile={version:1,enabled:true,account:'private@example.invalid',url:'https://secret.invalid/',series:{
    data_load:{values:[-1,'secret',null,1,2,...Array(210).fill(3),Infinity],failures:3,privateNote:'secret'},
    'private-habit-name':{values:[123],failures:100},__proto__:{privateNote:'secret'}
  }};
  const h=harness({storage:{[key('synthetic-A')]:JSON.stringify(hostile)}});h.api.setOwner('synthetic-A');
  assert.ok(metric(h,'data_load').count<=200);assert.equal(metric(h,'data_load').last,3);
  assert.equal(metric(h,'data_load').failures,3);assert.doesNotMatch(JSON.stringify(h.snapshot()),/secret|private|account|example|invalid/);
});

test('malformed, oversized and unsupported storage formats never enable collection',()=>{
  for(const raw of ['{broken','x'.repeat(50001),JSON.stringify({version:2,enabled:true}),JSON.stringify({version:1,enabled:'true'})]){
    const h=harness({storage:{[key('synthetic-A')]:raw}});assert.doesNotThrow(()=>h.api.setOwner('synthetic-A'));assert.equal(h.snapshot().enabled,false);assert.ok(h.snapshot().metrics.every(row=>!row.count));
  }
});

test('denied storage remains usable in memory and never changes app storage or network',()=>{
  const h=enabled({storageDenied:true});assert.equal(h.snapshot().enabled,true);assert.equal(h.snapshot().storageAvailable,false);
  sample(h,'data_load',25);h.flushTimers();assert.equal(metric(h,'data_load').last,25);assert.equal(h.values.size,0);
  assert.doesNotThrow(()=>h.api.clear());assert.ok(h.snapshot().metrics.every(row=>!row.count));assert.deepEqual(h.network,[]);
});

test('missing observers, unsupported entries and observe errors preserve custom measurements',()=>{
  for(const options of [{noObserver:true},{types:[]},{observeThrows:true}]){
    const h=enabled(options);assert.deepEqual(h.snapshot().support,{paint:false,lcp:false,event:false});sample(h,'tab_log',14);assert.equal(metric(h,'tab_log').last,14);
  }
});

test('FCP and LCP retain one sample per page while Event Timing is a maximum observed duration, not INP',()=>{
  const saved={version:1,enabled:true,series:{}};const h=harness({storage:{[key('synthetic-A')]:JSON.stringify(saved)}});h.api.setOwner('synthetic-A');
  h.deliver(observer(h,'paint'),[{name:'first-paint',startTime:10},{name:'first-contentful-paint',startTime:100}]);
  h.deliver(observer(h,'largest-contentful-paint'),[{startTime:200},{startTime:350}]);
  h.deliver(observer(h,'event'),[{startTime:400,duration:32},{startTime:500,duration:88},{startTime:600,duration:48}]);
  assert.equal(metric(h,'fcp').last,100);assert.equal(metric(h,'fcp').count,1);
  assert.equal(metric(h,'lcp').last,350);assert.equal(metric(h,'lcp').count,1);
  assert.equal(metric(h,'slow_event_max').last,88);assert.equal(metric(h,'slow_event_max').count,1);assert.doesNotMatch(JSON.stringify(h.snapshot()),/\binp\b/i);
});

test('enabling mid-page and changing accounts reject old buffered entries and recommend a new load',()=>{
  const h=enabled();assert.equal(h.snapshot().reloadRecommended,true);
  assert.ok(h.observers.every(item=>item.config.buffered===false));
  h.deliver(observer(h,'paint'),[{name:'first-contentful-paint',startTime:100}]);h.deliver(observer(h,'event'),[{startTime:500,duration:80}]);
  h.api.ready();h.frame();h.frame();assert.equal(metric(h,'fcp').count,0);assert.equal(metric(h,'slow_event_max').count,0);assert.equal(metric(h,'app_ready').count,0);
});

test('observer processing never reads DOM targets, elements, attribution or resource URLs',()=>{
  const h=enabled(),secret=()=>{throw Error('Sensitive field accessed');};
  const event={startTime:1100,duration:80};for(const field of ['target','element','url','name','attribution'])Object.defineProperty(event,field,{get:secret});
  assert.doesNotThrow(()=>h.deliver(observer(h,'event'),[event]));assert.equal(metric(h,'slow_event_max').last,80);assert.deepEqual(h.network,[]);
});

test('long-lived sessions still measure event duration after ten minutes of page uptime',()=>{
  const h=enabled();h.setNow(3600000);h.deliver(observer(h,'event'),[{startTime:3600010,duration:80}]);assert.equal(metric(h,'slow_event_max').last,80);
});

test('hidden tabs do not collect timings and pending saves flush on hide',()=>{
  const h=enabled();sample(h,'data_load',20);assert.equal(h.timers.size,1);h.setHidden(true);h.event('visibilitychange');assert.equal(h.timers.size,0);
  assert.equal(h.api.start('tab_today'),null);h.deliver(observer(h,'event'),[{startTime:1500,duration:120}]);assert.equal(metric(h,'slow_event_max').count,0);
});

test('a deletion or opt-out in another tab cancels local work and cannot resurrect cleared measurements',()=>{
  for(const mode of ['delete','disable','clear-all']){
    const h=enabled();sample(h,'data_load',25);const staleSave=[...h.timers.values()][0],staleObserver=observer(h,'event');
    const token=h.api.start('tab_today');h.api.finish(token,'ok',true);const staleFrame=[...h.frames.values()][0];
    if(mode==='disable')h.values.set(key('synthetic-A'),JSON.stringify({version:1,enabled:false,series:{}}));
    else h.values.delete(key('synthetic-A'));
    h.event('storage',{key:mode==='clear-all'?null:key('synthetic-A')});
    staleSave?.();staleFrame?.();h.frame();h.deliver(staleObserver,[{startTime:1300,duration:120}]);h.flushTimers();
    assert.equal(h.snapshot().enabled,false);assert.ok(h.snapshot().metrics.every(row=>!row.count));assert.equal(h.timers.size,0);
    if(mode==='disable')assert.equal(JSON.parse(h.values.get(key('synthetic-A'))).enabled,false);
    else assert.equal(h.values.has(key('synthetic-A')),false);
  }
});

test('another account’s storage event cannot clear this account or expose its diagnostic data',()=>{
  const h=enabled();sample(h,'data_load',18);h.values.set(key('synthetic-B'),JSON.stringify({version:1,enabled:true,series:{data_load:{values:[999],failures:0}}}));
  h.event('storage',{key:key('synthetic-B')});assert.equal(metric(h,'data_load').last,18);assert.equal(h.snapshot().enabled,true);
  assert.equal(h.observers.filter(o=>!o.disconnected).length,3);assert.doesNotMatch(JSON.stringify(h.snapshot()),/synthetic-B|999/);
});

test('unavailable high-resolution clock prevents measurement without disturbing collection controls',()=>{
  const h=enabled();h.context.performance=undefined;assert.equal(h.api.start('data_load'),null);
  assert.doesNotThrow(()=>h.api.clear());assert.doesNotThrow(()=>h.api.setEnabled(false));assert.ok(h.snapshot().metrics.every(row=>!row.count));
});

for(const afterFinish of [false,true])test(`a background interval is excluded from ${afterFinish?'scheduled paint':'unfinished action'} timings`,()=>{
  const h=enabled(),token=h.api.start('tab_today');h.advance(5);
  if(afterFinish)h.api.finish(token,'ok',true);
  h.setHidden(true);h.event('visibilitychange');h.advance(30000);h.setHidden(false);h.event('visibilitychange');
  if(!afterFinish)h.api.finish(token,'ok',true);
  h.frame();h.frame();assert.equal(metric(h,'tab_today').count,0);
  sample(h,'tab_today',12);assert.equal(metric(h,'tab_today').last,12);
});
