/* Optional, account-isolated diagnostics. No network, resource URLs or DOM data. */
(() => {
  'use strict';
  const LIMIT=200,MAX_MS=600000,KEY='shaah:performance:v1:';
  const names=Object.freeze(['app_ready','data_load','tab_today','tab_log','tab_social','tab_stats','tab_history','habit_response','fcp','lcp','slow_event_max']);
  const allowed=new Set(names);
  let owner=null,enabled=false,generation=0,series={},observers=[],saveTimer=null,seenOwner=false,reloadRecommended=false;
  let nativeIndices={},readyAllowed=false,readyDone=false,storageAvailable=true,visibilityEpoch=0;
  const support={paint:false,lcp:false,event:false};
  const now=()=>{try{const value=window.performance?.now();return Number.isFinite(value)?value:null;}catch{return null;}};
  const visible=()=>!document.hidden;
  const valid=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=MAX_MS;
  const storageKey=()=>owner===null?null:KEY+owner;
  function fresh(){return Object.fromEntries(names.map(key=>[key,{values:[],failures:0}]));}
  function read(){
    series=fresh();enabled=false;storageAvailable=true;
    try{
      const raw=localStorage.getItem(storageKey());
      if(!raw||raw.length>50000)return;
      const saved=JSON.parse(raw);if(saved?.version!==1)return;
      enabled=saved.enabled===true;
      for(const key of names){
        const item=saved.series?.[key];
        if(!item||typeof item!=='object')continue;
        if(Array.isArray(item.values))series[key].values=item.values.slice(-LIMIT).filter(valid).map(n=>Math.round(n*10)/10);
        if(Number.isSafeInteger(item.failures)&&item.failures>=0)series[key].failures=Math.min(1000000,item.failures);
      }
    }catch{storageAvailable=false;}
  }
  function persist(){
    if(owner===null)return;
    try{localStorage.setItem(storageKey(),JSON.stringify({version:1,enabled,series}));}
    catch{storageAvailable=false;}
  }
  function flush(){if(saveTimer!==null){clearTimeout(saveTimer);saveTimer=null;persist();}}
  function schedule(){
    if(saveTimer!==null)return;
    const epoch=generation;
    saveTimer=setTimeout(()=>{saveTimer=null;if(epoch===generation)persist();},1000);
  }
  function stop(){
    generation++;for(const observer of observers){try{observer.disconnect();}catch{}}
    observers=[];nativeIndices={};
  }
  function record(key,value,outcome='ok',single=false){
    if(!enabled||owner===null||!allowed.has(key)||!valid(value))return;
    const item=series[key],rounded=Math.round(value*10)/10;
    if(single&&nativeIndices[key]!==undefined)item.values[nativeIndices[key]]=key==='slow_event_max'?Math.max(item.values[nativeIndices[key]],rounded):rounded;
    else{item.values.push(rounded);if(item.values.length>LIMIT)item.values.shift();if(single)nativeIndices[key]=item.values.length-1;}
    if(outcome==='error')item.failures=Math.min(1000000,item.failures+1);
    schedule();
  }
  function observe(type,callback,buffered){
    try{
      const Observer=window.PerformanceObserver;
      if(typeof Observer!=='function'||!Observer.supportedEntryTypes?.includes(type))return false;
      const epoch=generation,cutoff=buffered?0:(now()??Infinity);
      const observer=new Observer(list=>{
        if(epoch!==generation||!enabled||!visible())return;
        for(const entry of list.getEntries()){
          // Never access target, element, URL, attribution or identifying fields.
          if(!Number.isFinite(entry.startTime)||entry.startTime<0||entry.startTime<cutoff)continue;
          callback(entry);
        }
      });
      observer.observe(type==='event'?{type,buffered,durationThreshold:40}:{type,buffered});
      observers.push(observer);return true;
    }catch{return false;}
  }
  function startObservers(buffered){
    support.paint=observe('paint',entry=>{if(entry.name==='first-contentful-paint')record('fcp',entry.startTime,'ok',true);},buffered);
    support.lcp=observe('largest-contentful-paint',entry=>record('lcp',entry.startTime,'ok',true),buffered);
    support.event=observe('event',entry=>{if(valid(entry.duration)&&entry.duration>=40)record('slow_event_max',entry.duration,'ok',true);},buffered);
  }
  function setOwner(value){
    const next=typeof value==='string'&&value.length<=200?value:null;
    if(next===owner)return;
    flush();stop();owner=next;series=fresh();enabled=false;reloadRecommended=false;readyAllowed=false;readyDone=false;
    support.paint=support.lcp=support.event=false;
    if(owner===null)return;
    read();const initial=!seenOwner;seenOwner=true;
    if(enabled){readyAllowed=initial;reloadRecommended=!initial;startObservers(initial);}
  }
  function setEnabled(value){
    if(owner===null)return;
    flush();stop();enabled=value===true;readyAllowed=false;readyDone=false;reloadRecommended=enabled;
    if(enabled)startObservers(false);
    persist();
  }
  function clear(){
    flush();stop();series=fresh();readyAllowed=false;readyDone=false;reloadRecommended=enabled;
    if(owner!==null){try{localStorage.removeItem(storageKey());}catch{storageAvailable=false;}if(enabled)persist();}
    if(enabled)startObservers(false);
  }
  function start(key){
    if(!enabled||owner===null||!allowed.has(key)||!visible())return null;
    const at=now();return at===null?null:{key,at,epoch:generation,visibility:visibilityEpoch,done:false};
  }
  function finish(token,outcome='ok',paint=false){
    if(!token||token.done||token.epoch!==generation||token.visibility!==visibilityEpoch||!allowed.has(token.key))return;
    token.done=true;
    const complete=()=>{
      if(token.epoch!==generation||token.visibility!==visibilityEpoch||!enabled||!visible())return;
      const at=now();if(at!==null)record(token.key,at-token.at,outcome);
    };
    if(paint){if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(()=>window.requestAnimationFrame(complete));}
    else complete();
  }
  function ready(){
    if(!enabled||!readyAllowed||readyDone||!visible())return;
    readyDone=true;const token=start('app_ready');if(token){token.at=0;finish(token,'ok',true);}
  }
  const quantile=(values,p)=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];};
  function snapshot(){
    return {app:'SHAAH',format:1,scope:'this-device-only',enabled,maxSamplesPerMetric:LIMIT,storageAvailable,reloadRecommended,
      support:{...support},metrics:names.map(key=>{const item=series[key]||{values:[],failures:0};return {key,unit:'ms',count:item.values.length,last:item.values.at(-1)??null,p50:quantile(item.values,.5),p95:quantile(item.values,.95),max:item.values.length?Math.max(...item.values):null,failures:item.failures};})};
  }
  series=fresh();
  document.addEventListener('visibilitychange',()=>{if(document.hidden){visibilityEpoch++;flush();}});
  window.addEventListener('pagehide',flush);
  // Respect a deletion or opt-out from another open tab. Discard its pending
  // callbacks before reading the current local preference; never resurrect it.
  window.addEventListener('storage',event=>{
    if(owner===null||(event.key!==storageKey()&&event.key!==null))return;
    if(saveTimer!==null){clearTimeout(saveTimer);saveTimer=null;}
    stop();read();readyAllowed=false;readyDone=false;reloadRecommended=enabled;
    if(enabled)startObservers(false);
  });
  window.SHAAHPerformance=Object.freeze({setOwner,setEnabled,clear,start,finish,ready,snapshot});
})();
