const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,source}=require('./helpers.cjs');

test('Social tabs follow order B and keep original category labels',()=>{
 const app=loadApp();
 const html=app.run("socialWorkspace('2026-10-16')");
 assert.ok(html.indexOf('Who to See')<html.indexOf('Social Combo'));
 assert.ok(html.indexOf('Social Combo')<html.indexOf('People &amp; Groups') || html.indexOf('Social Combo')<html.indexOf('People & Groups'));
 assert.deepEqual(app.read('socialCategories().map(s=>s.label)'),['Flirting','Strangers','Friends']);
});

test('two people in one category award its points once and preserve history',()=>{
 const app=loadApp();
 const before=app.read("Object.fromEntries(Object.keys(_state).map(k=>[k,{day:_state[k],score:calcScore(k)}]))");
 app.run("socialRecord('pold01','2026-10-16');socialRecord('pold02','2026-10-16')");
 assert.equal(app.read("calcScore('2026-10-16').l3"),16);
 assert.equal(app.read("getPeople('2026-10-16').length"),2);
 for(const [k,v] of Object.entries(before)){
  assert.deepEqual(app.read(`_state[${JSON.stringify(k)}]`),v.day);
  assert.deepEqual(app.read(`calcScore(${JSON.stringify(k)})`),v.score);
 }
});

test('Today combo is compact and directory displays frequencies',()=>{
 const app=loadApp();
 assert.ok(app.run("comboBlock('2026-10-16')").includes('sf-compact-combo'));
 assert.ok(!app.run("comboBlock('2026-10-16')").includes('sf-capture'));
 const html=app.run('socialPeople()');
 assert.ok(html.includes('sf-directory'));
 assert.ok(html.includes('Cada 7 días'));
});

test('location focus cannot hide people from encounter category selection',()=>{
 const start=source.indexOf('function legacyComboBlock(');
 const end=source.indexOf('\nfunction ',start+10);
 const renderer=source.slice(start,end);
 assert.ok(!renderer.includes('visiblePeople()'));
 assert.ok(!renderer.includes('${locationSelector()}'));
 assert.ok(renderer.includes('peopleList().filter(x=>!x.inactive&&x.sub===s.id)'));
});
