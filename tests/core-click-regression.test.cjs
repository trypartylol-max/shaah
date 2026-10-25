const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./helpers.cjs');

for(const [action,args] of [['setHabitState',['production','2026-10-16',true]],['startRoutine',['production']]]){
 test(`${action}: a repaint cannot turn the same click into a parent Clear action`,()=>{
  const app=loadApp();app.run(`
   window.calls=[];
   window.parentAction=null;
   const parent={nodeType:1,getAttribute(name){return name==='data-ui-click'?window.parentAction:name==='data-ui-click-args'?'["production","2026-10-16",false]':null;},matches(){return false;},closest(){return null;}};
   const child={nodeType:1,getAttribute(name){return name==='data-ui-click'?${JSON.stringify(action)}:name==='data-ui-click-args'?${JSON.stringify(JSON.stringify(args))}:null;},matches(){return false;},closest(){return null;}};
   setHabitState=(id,key,value)=>{window.calls.push(['mark',value]);window.parentAction='setHabitState';};
   startRoutine=id=>{window.calls.push(['start',id]);window.parentAction='setHabitState';};
   const event={type:'click',composedPath:()=>[child,parent,document],stopImmediatePropagation(){this.cancelBubble=true;}};
   uiDispatch(event);
  `);
  assert.deepEqual(app.read('window.calls'),action==='setHabitState'?[['mark',true]]:[['start','production']]);
 });
}
