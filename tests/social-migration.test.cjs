const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadApp,fixture}=require('./helpers.cjs');
function upgraded(data=fixture(),date='2026-10-16'){
 const a=loadApp(data);a.run(`CFG=upgradeShaahSocialCoreConfig(CFG,'${date}','synthetic-A').config;_dayCfgCache={};applyCfg();`);return a;
}
test('migration reactivates once with 180 days and keeps IDs, history and edited frequency',()=>{
 const data=fixture();data.config.people[0].inactive=true;
 const a=upgraded(data);assert.equal(a.read('CFG.people[0].every'),180);assert.equal(a.read('CFG.people[0].id'),'pold01');assert.equal(a.run('CFG.people[0].inactive'),undefined);
 a.run("CFG.people[0].every=45;CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-17','synthetic-A').config");
 assert.equal(a.read('CFG.people[0].every'),45);assert.deepEqual(a.read('_state'),data.days);assert.equal(a.read('socialRomanticLimit()'),1);
});
test('romantic capacity blocks only new assignments and permits editing existing excess contacts',()=>{
 const data=fixture();data.config.people[0].sub='flirt';const a=upgraded(data);
 a.run("socialEdit('pold02');socialDraftField('sub','flirt');socialSave()");
 assert.equal(a.read("personById('pold02').sub"),'friends');assert.ok(a.read('socialFormError').includes('límite'));
 a.run("socialCancel();socialEdit('pold01');socialDraftField('every','90');socialSave()");
 assert.equal(a.read("personById('pold01').every"),90);assert.equal(a.read("peopleList().filter(p=>p.sub==='flirt').length"),2);
 a.run("socialRomanticLimitSet('3');socialEdit('pold02');socialDraftField('sub','flirt');socialSave()");
 assert.equal(a.read("personById('pold02').sub"),'flirt');assert.equal(a.read('CFG.people.length'),3);
});
test('focus changes only Friends suggestions; combo keeps all contacts',()=>{
 const data=fixture();data.config.locationGroups=[{id:'israel',name:'Israel'},{id:'panama',name:'Panamá'}];data.config.selectedLocation='israel';
 data.config.people[0].locations=['israel'];data.config.people[1].locations=['panama'];data.config.people[2].locations=['panama'];
 const a=upgraded(data);assert.deepEqual(a.read('socialSuggestionList().map(p=>p.id).sort()'),['pold01','pold03']);
 a.run("socialCategoryToggle('friends','2026-10-16')");assert.ok(a.run("comboBlock('2026-10-16')").includes('Luis Existing'));
 a.run("socialRecord('pold02','2026-10-16')");assert.ok(a.read("getPeople('2026-10-16')").includes('pold02'));
});
test('Work phases earn 10,20,25; previous days keep original weights; Vacation stays off',()=>{
 const old=loadApp(),a=upgraded();
 for(const k of Object.keys(fixture().days))assert.deepEqual(a.read(`calcScore('${k}')`),old.read(`calcScore('${k}')`));
 for(const [n,p] of [[1,10],[2,20],[3,25],[0,0]]){a.run(`workPhaseSet('2026-10-16',${n})`);assert.equal(a.read("calcScore('2026-10-16').l1"),p);}
 a.run("CFG.travel.mode='vacation';persistTravelMode('vacation');_dayCfgCache={};workPhaseSet('2026-10-16',3)");
 assert.ok(!a.read("cfgForDate('2026-10-16').L1").some(i=>i.id==='work'));
});
test('future era ordering/modes retained; invalid timelines fail without mutation',()=>{
 const data=fixture();const future=JSON.parse(JSON.stringify(data.config.log.at(-1)));future.from='2026-12-01';future.mode='vacation';data.config.log.push(future);
 const a=upgraded(data);assert.deepEqual(a.read('CFG.log.map(e=>[e.from,e.mode])'),[['0001-01-01','work'],['2026-09-08','vacation'],['2026-10-08','work'],['2026-10-16','work'],['2026-12-01','vacation']]);
 assert.equal(a.read("cfgForDate('2026-12-02').mode"),'vacation');
 a.run('delete CFG.shaahSocialCoreMigration;CFG.log.reverse()');const before=a.read('CFG');assert.throws(()=>a.run("upgradeShaahSocialCoreConfig(CFG,'2026-10-16','synthetic-A')"));assert.deepEqual(a.read('CFG'),before);
});
test('migration cannot write before authoritative load or during a settings conflict',()=>{
 const a=loadApp();a.run("USER={id:'synthetic-A'};_cfgReady=false");assert.equal(a.run('runShaahSocialCoreMigration()'),false);assert.equal(a.writes.length,0);
 a.run('_cfgReady=true;_cfgConflict=true');assert.equal(a.run('runShaahSocialCoreMigration()'),false);
});
test('all backed-up TEST accounts retain every historical score and day after migration',{skip:!fs.existsSync('../shaah-test-backups/test-database-before-social-restorable.json')},()=>{
 const backup=JSON.parse(fs.readFileSync('../shaah-test-backups/test-database-before-social-restorable.json','utf8'));
 for(const settings of backup.day_logs.filter(r=>r.date==='settings'&&r.data._cfg)){
  const days=Object.fromEntries(backup.day_logs.filter(r=>r.user_id===settings.user_id&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)).map(r=>[r.date,{checks:r.data._checks||{},social:r.data._social||{},people:r.data._people||[],note:r.data._note||'',_daylog:r.data._daylog||[]} ]));
  const data={config:settings.data._cfg,days},before=loadApp(data),after=upgraded(data,'2026-10-25');
  for(const date of Object.keys(days).filter(d=>d<'2026-10-25')){assert.deepEqual(after.read(`calcScore('${date}')`),before.read(`calcScore('${date}')`));assert.deepEqual(after.read(`_state['${date}']`),before.read(`_state['${date}']`));}
 }
});
test('account-specific migration and pending config use only current owner',()=>{
 const a=loadApp();a.run("USER={id:'synthetic-A'};_cfgReady=false;CFG=upgradeShaahSocialCoreConfig(CFG,'2026-10-16',USER.id).config;queueCfgSave()");
 assert.ok(a.values.has('shaah_cfg_pending_synthetic-A'));assert.ok(!a.values.has('shaah_cfg_pending_synthetic-B'));
 a.run("workPhaseOpenKey='2026-10-16';changeSyncUser({id:'synthetic-B'})");
 assert.equal(a.run('_cfgDraft'),null);assert.equal(a.run('workPhaseOpenKey'),null);assert.equal(a.read('socialDirectoryQuery'),'');assert.ok(!a.read('CFG').shaahSocialCoreMigration);
});
test('Social category controls expand people without inferring an encounter',()=>{
 const a=upgraded();a.run("socialCategoryToggle('flirt','2026-10-16')");
 assert.deepEqual(a.read("getPeople('2026-10-16')"),[]);assert.equal(a.read("calcScore('2026-10-16').l3"),2);
 a.run("socialRecord('pold03','2026-10-16');socialCategoryToggle('flirt','2026-10-16')");
 assert.deepEqual(a.read("getPeople('2026-10-16')"),['pold03']);assert.equal(a.read("calcScore('2026-10-16').l3"),0);
});
test('settings edit today preserves sorted future transition and earlier scores',()=>{
 const data=fixture();const future=JSON.parse(JSON.stringify(data.config.log.at(-1)));future.from='2026-12-01';future.mode='vacation';data.config.log.push(future);
 const a=upgraded(data),past=a.read("calcScore('2026-09-16')");
 a.run("cfgEdit(()=>{CFG.h.meditation.pWork=12})");
 const dates=a.read('CFG.log.map(e=>e.from)');assert.deepEqual(dates,[...dates].sort());assert.equal(a.read("cfgForDate('2026-12-02').mode"),'vacation');assert.deepEqual(a.read("calcScore('2026-09-16')"),past);
});
test('Settings renders rules and Work-specific fields in Vacation without UI errors',()=>{
 const a=upgraded();a.run("CFG.travel.mode='vacation';persistTravelMode('vacation');applyCfg()");
 const html=a.run('renderSettings()');assert.ok(html.includes('máximo de personas asignadas'));assert.ok(!html.includes('En pausa'));
 a.run("cfgSet('meditation','pWork','14')");assert.equal(a.read('CFG.h.meditation.pWork'),14);assert.equal(a.read('CFG.h.meditation.pVacation'),6);
});
test('inline groups create, rename and cancel without prompts or rewriting memberships/history',()=>{
 const a=upgraded(),days=a.read('_state');
 a.run("locationAdd();socialGroupName('Amigos Panamá');socialGroupSave()");
 const group=a.read('CFG.locationGroups[0]');assert.equal(group.name,'Amigos Panamá');
 a.run(`CFG.people[0].locations=['${group.id}'];locationRename('${group.id}');socialGroupName('Amigos Israel');socialGroupCancel()`);
 assert.equal(a.read('CFG.locationGroups[0].name'),'Amigos Panamá');
 a.run(`locationRename('${group.id}');socialGroupName('Amigos Panamá / Israel');socialGroupSave()`);
 assert.deepEqual(a.read('CFG.people[0].locations'),[group.id]);assert.deepEqual(a.read('_state'),days);
});
test('Family and legacy family remain recommended across friend location focus with their own frequency',()=>{
 const data=fixture();data.config.locationGroups=[{id:'israel',name:'Israel'},{id:'panama',name:'Panamá'}];data.config.selectedLocation='israel';
 data.config.people=[{id:'fam1',name:'Family synthetic',sub:'family',every:30,locations:['panama']},{id:'fam2',name:'Legacy family',sub:'friends',relationship:'family',every:180,locations:['panama']},{id:'friend1',name:'Friend synthetic',sub:'friends',every:7,locations:['panama']}];
 const a=upgraded(data);assert.deepEqual(a.read('socialSuggestionList().map(p=>[p.id,p.every])'),[['fam1',30],['fam2',180]]);assert.equal(a.read("socialCategory(personById('fam2'))"),'friends');
});
test('contact capsule follows the 10-day example and empties at nonnegative balance',()=>{
 const a=loadApp();
 for(const [days,color,fill] of [[0,'#4ade80',100],[6,'#4ade80',40],[9,'#4ade80',10],[10,'#f59e0b',0],[12,'#f59e0b',0],[13,'#ef4444',0],[20,'#ef4444',0]]){
  const pill=a.read(`socialTimePill({every:10,days:${days}})`);assert.equal(pill.color,color,`day ${days}`);assert.ok(Math.abs(pill.fill-fill)<0.000001,`fill on day ${days}`);
 }
 assert.equal(a.read('socialTimePill({every:7,days:9}).color'),'#f59e0b');
 assert.equal(a.read('socialTimePill({every:7,days:10}).color'),'#ef4444');
 assert.equal(a.read('socialTimePill({every:10,days:null}).color'),'#8888a4');
});
