const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {source,html,loadApp}=require('./helpers.cjs');
const baseline=fs.readFileSync(path.join(__dirname,'../assets/app.4e9e7eead727df06.js'),'utf8');
const {execFileSync}=require('node:child_process');
const repo=path.join(__dirname,'..');
const deployedBase='bee9803a5e1eeb02ab5b1297b3eb5ce90e7d6d2c';
const readBase=file=>execFileSync('git',['show',deployedBase+':'+file],{cwd:repo,encoding:'utf8',maxBuffer:2*1024*1024});
const mainHtml=readBase('index.html');
const mainAsset=mainHtml.match(/<script data-shaah-app src="(\.\/assets\/app\.[a-f0-9]{16}\.js)(?:\?[^\"]*)?"/)[1];
const currentMainSource=readBase(mainAsset.slice(2));
test('romantic capacity uses the configured original category label',()=>{
 const app=loadApp();app.run("CFG.subs.find(s=>s.id==='flirt').label='She';");
 assert.match(app.run('socialRulesHTML()'),/>She · Maximum people assigned/);
 app.run("interfaceLanguage='es'");
 assert.match(app.run('socialRulesHTML()'),/>She · Máximo de personas asignadas/);
 assert.doesNotMatch(app.run('socialRulesHTML()'),/Flirting ·/);
});
test('promotion retains exact-main authentication, persistence and dated scoring implementations',()=>{
 const a=loadApp(),b=loadApp(undefined,{source:currentMainSource});
 for(const name of ['signIn','flushCfgSaves','persistDay','calcScore','cfgForDate','accountCopyStatus','removeAccountCopies']){
  assert.equal(a.run(`${name}.toString()`),b.run(`${name}.toString()`),name);
 }
 // Revert only the known copy substitutions before comparing sign-out logic.
 const signOutCopy=[
  'Sync your pending changes and finish any active routine before removing saved copies. You can also export your data.',
  'Sign out and remove this account’s saved copies from this browser, including local backups? Online data is not deleted. Download any local backups you want to keep first.',
  'Sign out of this browser session? Saved copies will stay on this browser.',
  'Signing out…',
  'Could not sign out. Your saved copies were kept. Please try again.'
 ];
 let signOut=a.run('signOut.toString()');
 for(const message of signOutCopy){
  const translatedCall='interfaceCopy('+JSON.stringify(message)+')';
  assert.ok(signOut.includes(translatedCall),message);
  assert.equal(a.read(translatedCall),message);
  a.run("interfaceLanguage='es'");
  assert.notEqual(a.read(translatedCall),message);
  assert.equal(typeof a.read(translatedCall),'string');
  a.run("interfaceLanguage='en'");
  signOut=signOut.replace(translatedCall,()=>"'"+message+"'");
 }
 assert.ok(signOut.includes('alert(signOutNoticeFor(notice))'));
 signOut=signOut.replace('alert(signOutNoticeFor(notice))','alert(SIGNOUT_NOTICES[notice])');
 assert.equal(signOut,b.run('signOut.toString()'),'signOut');
 assert.deepEqual(a.read('SIGNOUT_NOTICES'),b.read('SIGNOUT_NOTICES'));
 for(const code of Object.keys(a.read('SIGNOUT_NOTICES'))){
  assert.equal(a.read(`signOutNoticeFor(${JSON.stringify(code)})`),b.read(`signOutNoticeFor(${JSON.stringify(code)})`));
  a.run("interfaceLanguage='es'");
  assert.notEqual(a.read(`signOutNoticeFor(${JSON.stringify(code)})`),b.read(`signOutNoticeFor(${JSON.stringify(code)})`));
  a.run("interfaceLanguage='en'");
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
