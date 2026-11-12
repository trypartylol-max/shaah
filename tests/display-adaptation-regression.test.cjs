const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/display-adaptation.js'),'utf8');
function display(width,height){
 const properties=new Map(),attributes=new Set(),values=new Map(),events={},frames=[];
 const root={toggleAttribute:(key,on)=>on?attributes.add(key):attributes.delete(key),setAttribute:(key,value)=>values.set(key,String(value)),removeAttribute:key=>values.delete(key),style:{setProperty:(key,value)=>properties.set(key,value),removeProperty:key=>properties.delete(key)}};
 const window={innerWidth:width,innerHeight:height,addEventListener:(key,fn)=>events[key]=fn};
 const forbidden=new Proxy({}, {get(){throw Error('Display policy must not access account data or preferences');}});
 vm.runInNewContext(source,{document:{documentElement:root},window,requestAnimationFrame:fn=>(frames.push(fn),frames.length),localStorage:forbidden,fetch:forbidden});
 return {properties,attributes,values,frames,resize(w,h){window.innerWidth=w;window.innerHeight=h;events.resize();},flush(){while(frames.length)frames.shift()();}};
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

test('Today fit tier follows the effective (post-zoom) viewport',()=>{
 const fit=(w,h)=>display(w,h).values.get('data-today-fit');
 assert.equal(fit(390,844),undefined);          // mobile
 assert.equal(fit(879,700),undefined);          // below the desktop grid
 assert.equal(fit(1440,1000),undefined);        // roomy laptop
 assert.equal(fit(1440,900),'compact');
 assert.equal(fit(2560,1440),'compact');        // zoomed x1.6 -> 1600x900
 assert.equal(fit(2560,1295),'compact');        // browser window on the same monitor
 assert.equal(fit(1280,720),'compact tight');
 assert.equal(fit(1280,648),'compact tight');
 const d=display(1440,1000);d.resize(1280,720);d.flush();assert.equal(d.values.get('data-today-fit'),'compact tight');
 d.resize(1440,1000);d.flush();assert.equal(d.values.has('data-today-fit'),false);
});
