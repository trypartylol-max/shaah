const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {loadApp,fixture,serverRows,clone}=require('./helpers.cjs');
const source=fs.readFileSync(path.join(__dirname,'../source/app.js'),'utf8');
function harness(){
 const data=fixture();data.config.travelV=9;data.config.log[2].mode='vacation';data.config.log[2].h.work.on=false;
 const rows=serverRows(data).map(r=>({...r,user_id:'owner',settings_revision:0}));let writes=[],readHook=null,rpcHook=null;
 const client={auth:{onAuthStateChange(){}},from(){let owner,range=[0,499];const q={select(){return q;},eq(k,v){if(k==='user_id')owner=v;return q;},order(){return q;},range(a,b){range=[a,b];return q;},async then(resolve,reject){try{if(readHook)await readHook();const all=rows.filter(r=>r.user_id===owner).sort((a,b)=>a.date.localeCompare(b.date));return resolve({data:clone(all.slice(range[0],range[1]+1)),count:all.length,error:null});}catch(e){return reject(e);}}};return q;},async rpc(name,args){
  if(rpcHook)return rpcHook(name,args);
  assert.equal(name,'shaah_save_settings_v1');assert.equal(args.p_data.owner_id,'owner');const row=rows.find(r=>r.date==='settings');
  if(row.settings_revision!==args.p_expected_revision)return {data:null,error:{code:'PT409'}};
  row.data=clone(args.p_data.data);row.settings_revision++;writes.push(clone(args));return {data:{data:clone(row.data),settings_revision:row.settings_revision},error:null};
 }};
 const a=loadApp(data,{source,client});a.run("USER={id:'owner',email:'trypartylol@gmail.com'};_cfgReady=true;_live=true;_cfgBase={_cfg:fixtureData.config};historyDownload=envelope=>{globalThis.downloaded=envelope;}");
 return {a,rows,writes,client,readHook:fn=>readHook=fn,rpcHook:fn=>rpcHook=fn};
}
const file=body=>({size:Buffer.byteLength(body),text:async()=>body});
async function prepare(h){await h.a.run('historyBackupDownload()');assert.ok(h.a.read('_historySafety.backup'),h.a.run('_historySafety.status'));return h.a.read('downloaded');}
async function verify(h,envelope){h.a.run(`globalThis.testFile={size:${Buffer.byteLength(JSON.stringify(envelope))},text:async()=>${JSON.stringify(JSON.stringify(envelope))}}`);await h.a.run('historyBackupVerify(testFile)');}

test('backup is read-only, checks the downloaded file, previews and round-trips the repair',async()=>{
 const h=harness(),before=clone(h.rows),days=h.a.read('_state');
 await h.a.run('historyCommit()');assert.equal(h.writes.length,0);
 const envelope=await prepare(h);assert.equal(h.writes.length,0);assert.deepEqual(h.rows,before);assert.deepEqual(envelope.payload.records,before.slice().sort((a,b)=>a.date.localeCompare(b.date)));
 await h.a.run('historyCommit()');assert.equal(h.writes.length,0);
 await verify(h,envelope);assert.equal(h.a.run('_historySafety.verified'),true);
 await h.a.run('historyCommit()');assert.equal(h.writes.length,1);assert.equal(h.a.run('CFG.travelV'),10);assert.deepEqual(h.a.read('_state'),days);
 h.a.run(`globalThis.testFile={size:${Buffer.byteLength(JSON.stringify(envelope))},text:async()=>${JSON.stringify(JSON.stringify(envelope))}}`);
 await h.a.run('historyRestorePreview(testFile)');assert.ok(h.a.run('_historySafety.restore'),h.a.run('_historySafety.status'));
 await h.a.run('historyCommit(true)');assert.equal(h.writes.length,2);assert.deepEqual(h.rows.find(r=>r.date==='settings').data._cfg,{...before.find(r=>r.date==='settings').data._cfg,travelV:10});assert.deepEqual(h.a.read('_state'),days);
});
test('altered, foreign and unprepared backup files cannot enable application',async()=>{
 const h=harness(),envelope=await prepare(h),bad=clone(envelope);bad.payload.config.travelV=999;
 await verify(h,bad);assert.equal(h.a.run('_historySafety.verified'),false);
 const foreign=clone(envelope);foreign.payload.owner.id='another';await verify(h,foreign);assert.equal(h.a.run('_historySafety.verified'),false);
 await h.a.run('historyCommit()');assert.equal(h.writes.length,0);
});
test('local edits and remote revisions invalidate the reviewed snapshot',async()=>{
 const h=harness(),envelope=await prepare(h);await verify(h,envelope);h.a.run("CFG.people[0].name='New edit'");await h.a.run('historyCommit()');assert.equal(h.writes.length,0);assert.equal(h.a.run('CFG.people[0].name'),'New edit');
 const next=harness(),backup=await prepare(next);await verify(next,backup);next.rows.find(r=>r.date==='settings').settings_revision++;await next.a.run('historyCommit()');assert.equal(next.writes.length,0);
});
test('recovery preserves unrelated new settings and new day records but refuses conflicting period edits',async()=>{
 const h=harness(),envelope=await prepare(h);await verify(h,envelope);await h.a.run('historyCommit()');
 const row=h.rows.find(r=>r.date==='settings');row.data._cfg.people[0].name='Later contact';row.settings_revision++;
 h.a.run(`CFG.people[0].name='Later contact';_cfgBase=${JSON.stringify(row.data)};globalThis.testFile={size:${Buffer.byteLength(JSON.stringify(envelope))},text:async()=>${JSON.stringify(JSON.stringify(envelope))}}`);
 const day={user_id:'owner',date:'2026-10-17',settings_revision:0,data:{_checks:{work:true},_note:'Keep new day'}};h.rows.push(day);
 await h.a.run('historyRestorePreview(testFile)');assert.ok(h.a.run('_historySafety.restore'),h.a.run('_historySafety.status'));await h.a.run('historyCommit(true)');
 assert.equal(row.data._cfg.people[0].name,'Later contact');assert.deepEqual(h.rows.find(r=>r.date===day.date),day);
 const other=harness(),b=await prepare(other);await verify(other,b);await other.a.run('historyCommit()');const r=other.rows.find(r=>r.date==='settings');r.data._cfg.travelV=11;r.settings_revision++;
 other.a.run(`CFG=${JSON.stringify(r.data._cfg)};_cfgBase=${JSON.stringify(r.data)};globalThis.testFile={size:${Buffer.byteLength(JSON.stringify(b))},text:async()=>${JSON.stringify(JSON.stringify(b))}}`);
 await other.a.run('historyRestorePreview(testFile)');assert.equal(other.a.run('_historySafety.restore'),null);assert.equal(other.writes.length,1);
});
test('recovery keeps equivalent inserted boundaries and restores their previous scoring',()=>{
 const h=harness();h.a.run('CFG.log.splice(1,2)');const before=h.a.read('CFG'),days=h.a.read('_state');const plan=h.a.read('ensureWorkReturn2026()');
 const undo=h.a.read(`historyUndoConfig(${JSON.stringify(plan)},${JSON.stringify(plan.after)})`);
 assert.equal(undo.travelV,10);assert.throws(()=>h.a.run(`historyUndoConfig(${JSON.stringify(plan)},${JSON.stringify(before)})`));assert.equal(undo.log.length,plan.after.log.length);assert.deepEqual(h.a.read(`historyScoreChanges(${JSON.stringify(before)},${JSON.stringify(undo)},${JSON.stringify(days)})`),[]);
});
test('missing revision/count protocol, unsynced data and changing reads fail closed',async()=>{
 const h=harness();h.a.run('_cfgDraft={pending:true}');await h.a.run('historyBackupDownload()');assert.equal(h.a.run('_historySafety.backup'),null);assert.equal(h.writes.length,0);
 const other=harness();let count=0;other.readHook(()=>{if(++count===2)other.rows[1].data._note='Concurrent note';});await other.a.run('historyBackupDownload()');assert.equal(other.a.run('_historySafety.backup'),null);assert.equal(other.writes.length,0);
 const missing=harness();delete missing.rows.find(r=>r.date==='settings').settings_revision;await missing.a.run('historyBackupDownload()');assert.equal(missing.a.run('_historySafety.backup'),null);
});
test('rejected or unconfirmed RPCs never claim success; late local edits are preserved',async()=>{
 for(const reply of [{error:{code:'PT409'}},{data:null,error:null},{error:{message:'Network lost'}}]){
  const h=harness(),backup=await prepare(h);await verify(h,backup);h.rpcHook(()=>reply);await h.a.run('historyCommit()');assert.equal(h.a.run('CFG.travelV'),9);assert.equal(h.a.run('_historySafety.verified'),false);assert.ok(!h.a.run('_historySafety.status').startsWith('Reparación confirmada'));
 }
 const h=harness(),backup=await prepare(h);await verify(h,backup);
 h.rpcHook((_name,args)=>{h.a.run("CFG.people[0].name='Typed during save'");const row=h.rows.find(r=>r.date==='settings');row.data=clone(args.p_data.data);row.settings_revision++;return {data:{data:clone(row.data),settings_revision:row.settings_revision},error:null};});
 await h.a.run('historyCommit()');assert.equal(h.a.run('CFG.people[0].name'),'Typed during save');assert.equal(h.a.run('_cfgConflict'),true);
});
test('a delayed read from another account cannot download or apply the former owner data',async()=>{
 const h=harness();h.readHook(()=>{h.a.run("USER={id:'other',email:'other@example.invalid'};_syncEpoch++;_historySafety=historySafetyState()");});await h.a.run('historyBackupDownload()');assert.equal(h.a.run('typeof downloaded'),'undefined');assert.equal(h.writes.length,0);
});

test('pagination exports beyond the server page limit and validates the total count',async()=>{
 const h=harness();for(let i=0;i<1100;i++){const date=new Date(Date.UTC(2020,0,1+i)).toISOString().slice(0,10);h.rows.push({user_id:'owner',date,data:{_note:'Older synthetic record'},settings_revision:0});}
 const backup=await prepare(h);assert.equal(backup.payload.records.length,h.rows.length);assert.equal(Object.keys(backup.payload.days).length,h.rows.length-1);assert.equal(h.writes.length,0);
});
test('digest has a known interoperable value and dangerous JSON keys are rejected',async()=>{
 const h=harness();assert.equal(await h.a.run('historyDigest({a:1})'),require('node:crypto').createHash('sha256').update('{"a":1}').digest('hex'));
 assert.throws(()=>h.a.run('historyCanonical(JSON.parse(\'{"__proto__":{"x":1}}\'))'));
});

test('a lost acknowledgement after a committed repair can be recovered after refresh',async()=>{
 const h=harness(),backup=await prepare(h);await verify(h,backup);
 h.rpcHook((_name,args)=>{const row=h.rows.find(r=>r.date==='settings');row.data=clone(args.p_data.data);row.settings_revision++;throw Error('Connection lost after commit');});
 await h.a.run('historyCommit()');assert.equal(h.a.run('CFG.travelV'),9);assert.ok(h.a.run('_historySafety.status').includes('No se pudo confirmar'));
 const row=h.rows.find(r=>r.date==='settings');assert.equal(row.data._cfg.travelV,10);
 h.rpcHook(null);h.a.run(`CFG=${JSON.stringify(row.data._cfg)};_cfgBase=${JSON.stringify(row.data)};_syncEpoch++;_historySafety=historySafetyState()`);
 await h.a.run('historyRestorePreview(testFile)');assert.ok(h.a.run('_historySafety.restore'),h.a.run('_historySafety.status'));await h.a.run('historyCommit(true)');
 assert.equal(row.data._cfg.travelV,10);assert.equal(h.a.run('CFG.travelV'),10);
});
test('a missing total count cannot silently truncate a backup',async()=>{
 const h=harness(),original=h.client.from;h.client.from=(...args)=>{const query=original(...args),then=query.then;query.then=(resolve,reject)=>then(result=>resolve({...result,count:null}),reject);return query;};
 await h.a.run('historyBackupDownload()');assert.equal(h.a.run('_historySafety.backup'),null);assert.equal(h.writes.length,0);
});
