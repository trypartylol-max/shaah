const {test}=require('node:test');
const assert=require('node:assert/strict');
const {html,source,loadApp}=require('./helpers.cjs');

test('application templates contain no event attributes or text-to-code evaluator',()=>{
  assert.doesNotMatch(html,/\son[a-z]+\s*=\s*["']/i);
  assert.doesNotMatch(source,/\beval\s*\(|\bnew\s+Function\s*\(/);
});

function dispatchApp(){
  const app=loadApp();
  app.run(`globalThis.uiCalls=[];globalThis.uiStops=0;
    setSkin=id=>uiCalls.push(['skin',id]);setTab=id=>uiCalls.push(['tab',id]);dayLogStop=id=>uiCalls.push(['stop',id]);
    globalThis.control=(type,name,args,options={})=>({nodeType:1,value:options.value||'',checked:!!options.checked,
      getAttribute:key=>key==='data-ui-'+type?name:key==='data-ui-'+type+'-args'?args:null,
      matches:()=>!!options.disabled,closest:()=>options.inert?{}:null});
    globalThis.fire=(type,nodes)=>{const event={type,composedPath:()=>[...nodes,document],cancelBubble:false,
      stopImmediatePropagation(){uiStops++;this.cancelBubble=true;}};uiDispatch(event);};`);
  return app;
}

test('registered actions require matching event types, exact arity and typed allowed values',()=>{
  const app=dispatchApp();
  app.run(`fire('click',[control('click','setSkin','["matrix"]')]);`);
  assert.deepEqual(app.read('uiCalls'),[['skin','matrix']]);
  for(const args of ['{','{}','null','["unknown"]','["matrix",true]','[{"name":"matrix"}]']){
    app.run(`fire('click',[control('click','setSkin',${JSON.stringify(args)})]);`);
  }
  app.run(`fire('change',[control('change','setSkin','["matrix"]')]);`);
  assert.deepEqual(app.read('uiCalls'),[['skin','matrix']]);
});

test('inherited and unregistered names cannot become UI actions',()=>{
  const app=dispatchApp();
  for(const name of ['constructor','__proto__','toString','notRegistered']){
    app.run(`fire('click',[control('click',${JSON.stringify(name)},'[]')]);`);
    assert.throws(()=>app.run(`ui('click',${JSON.stringify(name)})`),/Invalid UI action/);
  }
  assert.deepEqual(app.read('uiCalls'),[]);
  assert.equal(app.run('Object.isFrozen(UI_ACTIONS)&&Object.isFrozen(UI_ENUMS)'),true);
});

test('disabled and inert controls do not invoke actions',()=>{
  const app=dispatchApp();
  app.run(`fire('click',[control('click','setSkin','["matrix"]',{disabled:true})]);
    fire('click',[control('click','setSkin','["matrix"]',{inert:true})]);`);
  assert.deepEqual(app.read('uiCalls'),[]);
});

test('a child action that stopped propagation does not also activate its parent',()=>{
  const app=dispatchApp();
  app.run(`fire('click',[control('click','dayLogStop','["synthetic-event"]'),control('click','setTab','["today"]')]);`);
  assert.deepEqual(app.read('uiCalls'),[['stop','synthetic-event']]);assert.equal(app.read('uiStops'),1);
});

test('form actions preserve input values, Unicode IDs and checked-state types',()=>{
  const app=dispatchApp(),id="old O'Neil & 雪";
  app.run('personSet=(...args)=>uiCalls.push(args);personSetInactive=(...args)=>uiCalls.push(args);');
  app.run(`fire('change',[control('change','personSet',${JSON.stringify(JSON.stringify([id,'name']))},{value:'Synthetic renamed contact'})]);`);
  app.run(`fire('change',[control('change','personSetInactive',${JSON.stringify(JSON.stringify([id]))},{checked:true})]);`);
  assert.deepEqual(app.read('uiCalls'),[[id,'name','Synthetic renamed contact'],[id,true]]);
});

test('field selectors and score-state values cannot widen beyond their registered choices',()=>{
  const app=loadApp();
  for(const field of ['unrecognized','constructor','__proto__'])assert.throws(()=>app.run(`ui('change','personSet','synthetic-id',${JSON.stringify(field)})`),/Invalid UI action/);
  for(const value of ['null','1','"true"'])assert.throws(()=>app.run(`ui('click','setHabitState','work','2026-10-16',${value})`),/Invalid UI action/);
  for(const value of ['true','false','0.5'])assert.doesNotThrow(()=>app.run(`ui('click','setHabitState','work','2026-10-16',${value})`));
});
