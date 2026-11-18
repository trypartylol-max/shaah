const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('../../../tests/helpers.cjs');
function app(){
  const a=loadApp();
  a.run(`globalThis.messages=[];globalThis.port={postMessage:s=>messages.push(JSON.parse(s)),close(){},start(){}};
    location={origin:'https://trypartylol-max.github.io',pathname:'/shaah/'};window.top=window;
    document.documentElement={lang:'es'};USER={id:'badge-test'};_cfgReady=true;`);
  return a;
}
function connect(a,origin='https://trypartylol-max.github.io'){
  a.run(`androidBadgeReceive({origin:${JSON.stringify(origin)},data:'shaah.badge.ready.v1',ports:[port]});`);
}
test('native bridge rejects other origins, wrong messages and sibling pages',()=>{
  const a=app();connect(a,'https://example.invalid');
  a.run(`androidBadgeReceive({origin:location.origin,data:'unknown',ports:[port]});
    location.pathname='/other/';androidBadgeReceive({origin:location.origin,data:'shaah.badge.ready.v1',ports:[port]});`);
  assert.equal(a.read('messages.length'),0);
});
test('counter is opt-in and sends only aggregate count, language and expiry',()=>{
  const a=app();connect(a);
  assert.equal(a.read('messages.at(-1).enabled'),false);
  a.run('set(badgeKey(),1);updateBadge();');
  const packet=a.read('messages.at(-1)');
  assert.equal(packet.enabled,true);assert.equal(packet.pending,a.read('badgePending()'));
  assert.deepEqual(Object.keys(packet).sort(),['enabled','expiresAt','lang','pending','type']);
  assert.equal(packet.lang,'es');assert.ok(packet.expiresAt>a.run('Date.now()'));
  a.run(`setChecked(todayKey(),Object.fromEntries([...cfgForDate(todayKey()).L1,...cfgForDate(todayKey()).L2,...cfgForDate(todayKey()).L3].map(i=>[i.id,true])));updateBadge();`);
  assert.equal(a.read('messages.at(-1).pending'),0);
});
test('turning off, logout and account-loading states clear the native count',()=>{
  const a=app();connect(a);a.run('set(badgeKey(),1);updateBadge();');
  a.run('set(badgeKey(),0);updateBadge();');assert.equal(a.read('messages.at(-1).enabled'),false);
  a.run('set(badgeKey(),1);updateBadge();_cfgReady=false;updateBadge();');assert.equal(a.read('messages.at(-1).enabled'),false);
  a.run('_cfgReady=true;updateBadge();USER=null;updateBadge();');assert.equal(a.read('messages.at(-1).pending'),0);
});
