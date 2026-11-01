const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/display-adaptation.js'),'utf8');
function display(width,height){
 const properties=new Map(),attributes=new Set(),events={},frames=[];
 const root={toggleAttribute:(key,on)=>on?attributes.add(key):attributes.delete(key),style:{setProperty:(key,value)=>properties.set(key,value),removeProperty:key=>properties.delete(key)}};
 const window={innerWidth:width,innerHeight:height,addEventListener:(key,fn)=>events[key]=fn};
 const forbidden=new Proxy({}, {get(){throw Error('Display policy must not access account data or preferences');}});
 vm.runInNewContext(source,{document:{documentElement:root},window,requestAnimationFrame:fn=>(frames.push(fn),frames.length),localStorage:forbidden,fetch:forbidden});
 return {properties,attributes,frames,resize(w,h){window.innerWidth=w;window.innerHeight=h;events.resize();},flush(){while(frames.length)frames.shift()();}};
}
test('moving from laptop to monitor and back restores the original display without stored preferences',()=>{
 const d=display(1440,900);assert.equal(d.properties.size,0);
 d.resize(2560,1440);d.flush();assert.equal(Number(d.properties.get('--app-display-scale')),1.6);
 assert.equal(parseFloat(d.properties.get('--app-vh'))*100*1.6,1440);
 d.resize(1440,900);d.flush();assert.equal(d.properties.size,0);assert.equal(d.attributes.size,0);
});
test('short ultrawides and mobile do not enlarge; very large monitors have a bounded scale',()=>{
 for(const [w,h] of [[390,844],[1440,900],[1600,1000],[3440,800]])assert.equal(display(w,h).properties.size,0);
 const d=display(5120,2880);assert.equal(d.properties.get('--app-display-scale'),'2');
});
test('rapid resize events use the final dimensions and schedule one presentation update',()=>{
 const d=display(1440,900);d.resize(1920,1080);d.resize(2560,1440);d.resize(3440,1440);
 assert.equal(d.frames.length,1);d.flush();assert.equal(d.properties.get('--app-display-scale'),'1.6');
 assert.equal(parseFloat(d.properties.get('--app-vw'))*100*1.6,3440);
});
