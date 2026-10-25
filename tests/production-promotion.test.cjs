const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {source,html,loadApp}=require('./helpers.cjs');
const baseline=fs.readFileSync(path.join(__dirname,'../assets/app.4e9e7eead727df06.js'),'utf8');
test('romantic capacity uses the configured original category label',()=>{
 const app=loadApp();app.run("CFG.subs.find(s=>s.id==='flirt').label='She';");
 assert.match(app.run('socialRulesHTML()'),/>She · máximo de personas asignadas/);
 assert.doesNotMatch(app.run('socialRulesHTML()'),/Flirting ·/);
});
test('promotion retains production authentication, persistence and scoring implementations',()=>{
 for(const name of ['signIn','signOut','flushCfgSaves','persistDay','calcScore','cfgForDate']){
  const a=loadApp(),b=loadApp(undefined,{source:baseline});
  assert.equal(a.run(`${name}.toString()`),b.run(`${name}.toString()`),name);
 }
 assert.ok(source.includes('https://llpyxktcfubhmthqujpa.supabase.co'));
 assert.ok(html.includes('https://llpyxktcfubhmthqujpa.supabase.co'));
 assert.doesNotMatch(source+html,/SHAAH_QA_CONFIG|qaLogin|qaToolbar|\/qa\/session|kpnwiwaiwnndpvtxkvva/);
});
const backupPath=path.join(__dirname,'../../shaah-test-backups/production-before-v28-port.json');
test('production backup accounts retain historical scores, IDs, categories and day records',{skip:!fs.existsSync(backupPath)},()=>{
 const backup=JSON.parse(fs.readFileSync(backupPath));let dates=0,accounts=0;
 for(const settings of backup.rows.filter(r=>r.date==='settings'&&r.data?._cfg)){
  accounts++;
  const days=Object.fromEntries(backup.rows.filter(r=>r.user_id===settings.user_id&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)).map(r=>[r.date,{checks:r.data._checks||{},social:r.data._social||{},people:r.data._people||[],note:r.data._note||'',_daylog:r.data._daylog||[]}]));
  const data={config:settings.data._cfg,days};
  const old=loadApp(data,{source:baseline}),next=loadApp(data);
  next.run(`CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-25','${settings.user_id}').config;_dayCfgCache={};applyCfg()`);
  for(const date of Object.keys(days).filter(d=>d<'2026-10-25')){
   assert.deepEqual(next.read(`calcScore('${date}')`),old.read(`calcScore('${date}')`),date);
   dates++;
  }
  assert.deepEqual(next.read('_state'),old.read('_state'));
  assert.deepEqual(next.read('CFG.people.map(p=>p.id)'),old.read('CFG.people.map(p=>p.id)'));
  assert.deepEqual(next.read('CFG.subs'),old.read('CFG.subs'));
  for(const person of data.config.people||[])if(person.inactive===true){
   assert.equal(next.read(`CFG.people.find(p=>p.id===${JSON.stringify(person.id)}).every`),180);
  }
 }
 assert.equal(accounts,3);assert.ok(dates>0);
 console.log(`Verified ${dates} historical days across ${accounts} production accounts using local backup only.`);
});
