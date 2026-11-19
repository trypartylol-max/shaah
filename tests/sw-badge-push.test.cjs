const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
// Runs the built service worker's push handler with a fake registration.
function loadWorker(){
  const listeners={},shown=[],closed=[],badges=[];
  const existing=[{close:()=>closed.push('old')}];
  const self={location:{href:'https://example.test/shaah/sw.js'},navigator:{setAppBadge:async n=>badges.push(n),clearAppBadge:async()=>badges.push(0)},
    registration:{showNotification:async(title,o)=>shown.push({title,...o}),getNotifications:async({tag})=>tag==='shaah-pending'?existing:[]},
    clients:{matchAll:async()=>[],openWindow:async()=>null},addEventListener:(type,fn)=>{listeners[type]=fn},skipWaiting:()=>{}};
  const ctx=vm.createContext({self,URL,caches:{open:async()=>({}),keys:async()=>[]},fetch:async()=>{},console,Response,Request});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),ctx);
  return {listeners,shown,closed,badges};
}
async function push(w,data){let p;w.listeners.push({data:{json:()=>data},waitUntil:x=>{p=x}});await p;}
test('the midnight badge push sets the icon number and the silent pending notification',async()=>{
  const w=loadWorker();
  await push(w,{kind:'badge',count:7,lang:'es'});
  assert.deepEqual(w.badges,[7]);assert.deepEqual(w.closed,['old']);
  assert.equal(w.shown.length,1);assert.equal(w.shown[0].title,'Te quedan 7 hábitos hoy');
  assert.equal(w.shown[0].tag,'shaah-pending');assert.equal(w.shown[0].silent,true);
});
test('the daily reminder push is unchanged',async()=>{
  const w=loadWorker();
  await push(w,{title:"Today's plan",body:'x',tag:'shaah-daily'});
  assert.deepEqual(w.badges,[]);assert.equal(w.shown[0].title,"Today's plan");assert.equal(w.shown[0].tag,'shaah-daily');
});
