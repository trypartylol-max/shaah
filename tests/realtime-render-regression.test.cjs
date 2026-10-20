const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,serverRows,clone}=require('./helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');
const {syncBackend}=require('./sync-backend.cjs');
const owner='synthetic-A',day='2026-10-16';

function appWithRealtime(){
  const data=locationFixture();data.days[day]=clone(data.days['2026-10-15']);
  const rows=serverRows(data).map(row=>({...row,user_id:owner}));
  const server=syncBackend(rows);let onChange;
  server.client.channel=()=>({on(_event,_filter,fn){onChange=fn;return this;},subscribe(fn){fn('SUBSCRIBED');return this;}});
  const app=loadApp(data,{client:server.clientFor(owner)});
  app.run(`USER={id:${JSON.stringify(owner)}};rowToState(${JSON.stringify(rows[0])});_cfgReady=true;var syncFrames=0;render=()=>syncFrames++;subscribeRealtime();`);
  return {app,server,rows,emit:payload=>onChange(clone(payload))};
}

test('Realtime backup events do not repaint the active page or change daily history',()=>{
  const {app,emit}=appWithRealtime(),before=app.read('_state');
  for(let i=0;i<20;i++)emit({eventType:'UPDATE',new:{user_id:owner,date:'cfgbak',data:{_bak:[]}}});
  emit({eventType:'DELETE',old:{user_id:owner,date:'cfgbak'}});
  assert.equal(app.read('syncFrames'),0);
  assert.deepEqual(app.read('_state'),before);
});

test('Repeated identical day and settings echoes do not repaint Today',()=>{
  const {app,rows,emit}=appWithRealtime(),before=app.read('_state');
  for(let i=0;i<20;i++){
    emit({eventType:'UPDATE',new:rows.find(row=>row.date===day)});
    emit({eventType:'UPDATE',new:rows[0]});
  }
  assert.equal(app.read('syncFrames'),0);
  assert.deepEqual(app.read('_state'),before);
});

test('A real remote day change repaints once and duplicate deliveries preserve the same state',()=>{
  const {app,rows,emit}=appWithRealtime();
  const row=clone(rows.find(row=>row.date===day));row.data._note='Synthetic remote note';
  emit({eventType:'UPDATE',new:row});emit({eventType:'UPDATE',new:row});
  assert.equal(app.read('getNote("'+day+'")'),'Synthetic remote note');
  assert.equal(app.read('syncFrames'),1);
});

test('A real remote settings change repaints once and preserves scoring history',()=>{
  const {app,rows,emit}=appWithRealtime(),before=app.read('calcScore("2026-09-16")');
  const row=clone(rows[0]);row.data._cfg.people[0].name='Synthetic remote rename';
  emit({eventType:'UPDATE',new:row});emit({eventType:'UPDATE',new:row});
  assert.equal(app.read('personById("pold01").name'),'Synthetic remote rename');
  assert.equal(app.read('syncFrames'),1);
  assert.deepEqual(app.read('calcScore("2026-09-16")'),before);
});

test('Remote deletion repaints only when it removes a visible own day',()=>{
  const {app,emit}=appWithRealtime();
  emit({eventType:'DELETE',old:{user_id:owner,date:day}});
  emit({eventType:'DELETE',old:{user_id:owner,date:day}});
  emit({eventType:'DELETE',old:{user_id:'synthetic-B',date:'2026-09-16'}});
  assert.equal(app.run(`!!_state[${JSON.stringify(day)}]`),false);
  assert.equal(app.run('!!_state["2026-09-16"]'),true);
  assert.equal(app.read('syncFrames'),1);
});

test('Opaque deletes that remove no own day do not repaint',async()=>{
  const {app,emit}=appWithRealtime();
  await emit({eventType:'DELETE',old:{id:123}});
  assert.equal(app.read('syncFrames'),0);
});

test('An identical row received during a stale DELETE read remains protected without repainting',async()=>{
  const {app,server,rows,emit}=appWithRealtime();
  server.rows=server.rows.filter(row=>row.date!==day);
  server.beforeSelect=()=>emit({eventType:'UPDATE',new:rows.find(row=>row.date===day)});
  await app.run('reconcileDeletedDays(USER.id,_syncEpoch)');
  assert.equal(app.run(`!!_state[${JSON.stringify(day)}]`),true);
  assert.equal(app.read('syncFrames'),0);
});

test('A pending local day edit is preserved without a repaint from its remote echo',()=>{
  const {app,rows,emit}=appWithRealtime();
  app.run(`_pending[${JSON.stringify(day)}]={};_state[${JSON.stringify(day)}].note='Synthetic pending local note';`);
  emit({eventType:'UPDATE',new:rows.find(row=>row.date===day)});
  assert.equal(app.read(`getNote(${JSON.stringify(day)})`),'Synthetic pending local note');
  assert.equal(app.read('syncFrames'),0);
});

test('A queued offline day edit is preserved when another device deletes the server row',()=>{
  const {app,emit}=appWithRealtime();
  app.run(`_offlineQueue[${JSON.stringify(day)}]={data:{_note:'Synthetic offline note'}};`);
  emit({eventType:'DELETE',old:{user_id:owner,date:day}});
  assert.equal(app.run(`!!_state[${JSON.stringify(day)}]`),true);
  assert.equal(app.read('syncFrames'),0);
});

test('A hidden page receives the latest data and defers repainting until it is visible',()=>{
  const {app,rows,emit}=appWithRealtime();app.run('document.hidden=true;');
  const row=clone(rows.find(row=>row.date===day));
  row.data._note='Synthetic background update 1';emit({eventType:'UPDATE',new:row});
  row.data._note='Synthetic background update 2';emit({eventType:'UPDATE',new:row});
  assert.equal(app.read('syncFrames'),0);assert.equal(app.read('_syncRenderQueued'),true);
  app.run('document.hidden=false;renderSyncedState();');
  assert.equal(app.read('syncFrames'),1);assert.equal(app.read('_syncRenderQueued'),false);
  assert.equal(app.read(`getNote(${JSON.stringify(day)})`),'Synthetic background update 2');
});
