const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,fixture,clone,source}=require('./helpers.cjs');
function setup({echo=false,alreadySaved=false,editDuringSave=false,offline=false,conflict=false}={}){
 const data=fixture();let app,writes=0;
 let server={data:{_cfg:clone(data.config)},settings_revision:3};
 if(alreadySaved)server.data._cfg.nightFrom=19;
 if(conflict)server.data._cfg.nightFrom=21;
 const client={auth:{onAuthStateChange(){}},from:()=>({select:()=>({eq:()=>({eq:async()=>({data:[clone(server)],error:null})})})}),rpc:async(name,args)=>{
   if(++writes>4)throw Error('Runaway save loop');
   if(offline)throw Error('Network unavailable');
   assert.equal(args.p_expected_revision,server.settings_revision);
   server={data:clone(args.p_data.data),settings_revision:server.settings_revision+1};
   if(echo)app.run(`rowToState(${JSON.stringify({date:'settings',...server})})`);
   if(editDuringSave&&writes===1)app.run('CFG.nightFrom=20;queueCfgSave();');
   return {data:clone(server),error:null};
 }};
 app=loadApp(data,{client});
 app.run(`USER={id:'synthetic-A'};_cfgReady=true;_cfgBase={_cfg:cfgCopy(CFG)};CFG.nightFrom=19;queueCfgSave();`);
 return {app,writes:()=>writes,server:()=>server};
}
test('own realtime echo completes once and clears the pending draft',async()=>{
 const t=setup({echo:true});await t.app.run('flushCfgSaves()');
 assert.equal(t.writes(),1);assert.equal(t.app.read('_cfgDraft'),null);assert.equal(t.app.read('_cfgSaveFailed'),false);
});
test('network failures keep the local draft for retry',async()=>{
 const t=setup({offline:true});await t.app.run('flushCfgSaves()');
 assert.equal(t.app.read('_cfgDraft.nightFrom'),19);assert.equal(t.app.read('_cfgSaveFailed'),true);
 assert.ok(t.app.values.has('shaah_cfg_pending_synthetic-A')||[...t.app.values.keys()].some(k=>k.includes('pending')));
});
test('a genuine conflicting edit is not overwritten',async()=>{
 const t=setup({conflict:true});await t.app.run('flushCfgSaves()');
 assert.equal(t.writes(),0);assert.equal(t.app.read('_cfgConflict'),true);assert.equal(t.app.read('_cfgDraft.nightFrom'),19);
});
test('an already saved draft is acknowledged without another write',async()=>{
 const t=setup({alreadySaved:true});await t.app.run('flushCfgSaves()');
 assert.equal(t.writes(),0);assert.equal(t.app.read('_cfgDraft'),null);
});
test('a genuine edit during an echo is preserved and saved once more',async()=>{
 const t=setup({echo:true,editDuringSave:true});await t.app.run('flushCfgSaves()');
 assert.equal(t.writes(),2);assert.equal(t.server().data._cfg.nightFrom,20);assert.equal(t.app.read('_cfgDraft'),null);
});
test('Today shortcut opens Social even when its navigation tab is hidden',()=>{
 const app=loadApp();
 app.run(source.slice(source.indexOf('function render(){'),source.indexOf('\n// Keep local day interactions')));
 app.run(`USER={id:'synthetic-A'};CFG.socialTab=false;
 document.getElementById=id=>id==='cr-dialog'?null:({style:{},querySelector:()=>null});document.querySelectorAll=()=>[];
 uiHTML=(el,html)=>{window.lastView=html};topbarHTML=()=>'';renderSocial=()=> 'SOCIAL_VIEW';renderToday=()=> 'TODAY_VIEW';
 renderTour=()=>{};routineDialogSync=()=>{};renderResume=()=>{};initScrollHide=()=>{};tuckNav=()=>{};
 UI_ACTIONS.setTab.run(null,null,'social');`);
 assert.equal(app.read('window.lastView'),'SOCIAL_VIEW');assert.equal(app.read('CFG.socialTab'),false);
});
