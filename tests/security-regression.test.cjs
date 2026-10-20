const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, loadApp } = require('./helpers.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { html } = require('./helpers.cjs');

test('the same-origin pinned SDK has matching SRI, anonymous CORS and the exact package bytes', () => {
  const script = html.match(/<script src="(\.\/assets\/supabase-[^"]+)" integrity="([^"]+)" crossorigin="anonymous"><\/script>/);
  assert.ok(script);
  assert.equal(script[1], './assets/supabase-2.118.0.js');
  const bytes = fs.readFileSync(path.join(path.dirname(require.resolve('@supabase/supabase-js')), 'umd/supabase.js'));
  assert.deepEqual(fs.readFileSync(path.join(__dirname, '..', script[1])), bytes);
  assert.equal(script[2], 'sha384-' + crypto.createHash('sha384').update(bytes).digest('base64'));
});

for (const [name, invalid] of [
  ['null habit map', { config: { h: null, order: [] } }],
  ['wrong contact type', { people: [{ name: { text: 'Ada' } }] }],
  ['wrong membership type', { people: [{ id: 'new', name: 'Ada', locations: 'Madrid' }] }],
  ['wrong status type', { people: [{ id: 'new', name: 'Ada', inactive: 'false' }] }],
  ['invalid day after valid contacts', { people: [{ id: 'new', name: 'Ada' }], days: { '2026-10-17': { social: 'invalid' } } }],
  ['reserved object keys', JSON.parse('{"people":[],"extra":{"__proto__":{"unexpected":"value"}}}')],
  ['empty root', []]
]) {
  test(`import rejects ${name} before backups, confirmation, state changes or queued writes`, () => {
    const app = loadApp();
    app.run('_cfgReady=true; var confirmations=0; confirm=()=>{confirmations++;return true};');
    const before = app.read('({config:CFG,days:_state,backups:_bak})');
    const stored = [...app.values];
    app.run(`importApply(JSON.parse(${JSON.stringify(JSON.stringify(invalid))}));`);
    assert.deepEqual(app.read('({config:CFG,days:_state,backups:_bak})'), before);
    assert.deepEqual([...app.values], stored);
    assert.equal(app.read('confirmations'), 0);
    assert.equal(app.writes.length, 0);
    assert.equal(app.timers.size, 0);
    assert.match(app.effects.at(-1), /Nothing was changed/);
  });
}

test('invalid routine styles reject the entire settings import without changing valid data', () => {
  const app = loadApp();
  const config = fixture().config;
  config.routines = { custom: { label: 'Routine', col: 'red;position:fixed', steps: [{ label: 'Step', dur: 5 }] } };
  const before = app.read('({config:CFG,days:_state})');
  app.run(`importApply(${JSON.stringify({ config })})`);
  assert.deepEqual(app.read('({config:CFG,days:_state})'), before);
  assert.match(app.effects.at(-1), /Nothing was changed/);
});

test('a missing routine definition is rejected before adopting settings or new days', () => {
  const app = loadApp();
  const config = fixture().config;
  config.h.work.routine = true;
  const before = app.read('({config:CFG,days:_state,backups:_bak})');
  app.run(`importApply(${JSON.stringify({ config, days: { '2026-10-17': { note: 'Do not add' } } })});`);
  assert.deepEqual(app.read('({config:CFG,days:_state,backups:_bak})'), before);
  assert.equal(app.writes.length, 0);
  assert.match(app.effects.at(-1), /Nothing was changed/);
});

test('valid full export imports keep historical scores, original IDs and new Day Log records', () => {
  const data = fixture();
  for (const d of Object.values(data.days)) delete d._daylog;
  data.days['2026-10-17'] = {
    checks: { social: true }, social: { friends: true }, people: ['pold01'], note: 'A & B <ordinary text>',
    _daylog: [{ id: "event O'Neil", title: '<b>Lunch & coffee</b>', type: 'manual',
      start: '2026-10-17T12:00:00Z', end: '2026-10-17T12:30:00Z' }]
  };
  const app = loadApp();
  const before = app.read('({day:_state["2026-09-16"],score:calcScore("2026-09-16")})');
  app.run(`importApply(${JSON.stringify(data)});`);
  assert.deepEqual(app.read('({day:_state["2026-09-16"],score:calcScore("2026-09-16")})'), before);
  assert.deepEqual(app.read('_state["2026-10-17"]'), data.days['2026-10-17']);
  assert.deepEqual(app.read('CFG.people'), data.config.people);
  assert.deepEqual(app.read('CFG.log'), data.config.log);
});

test('legacy people imports preserve punctuation and Unicode IDs without renaming historical references', () => {
  const app = loadApp();
  const person = { id: "person O'Neil & <id> \\ 雪", name: 'Ada & Bo', sub: 'friends', every: 12, locations: ['il', 'pa'], inactive: false };
  const before = app.read('_state');
  app.run(`importApply(${JSON.stringify({ people: [person] })});`);
  assert.deepEqual(app.read('peopleList().at(-1)'), person);
  assert.deepEqual(app.read('_state'), before);
});

test('older settings without timelines or per-mode prices remain importable', () => {
  const app = loadApp();
  const data = fixture().config;
  delete data.log; delete data.subs;
  for (const h of Object.values(data.h)) { delete h.pWork; delete h.pVacation; }
  app.run(`importApply(${JSON.stringify({ config: data })});`);
  assert.equal(app.read('CFG.people.length'), 3);
  assert.equal(app.read('modePts(CFG.h.work,"work")'), 20);
  assert.equal(app.effects.length, 0);
});

test('a delayed step callback leaves a removed routine session recoverable without recording completion', () => {
  const app = loadApp();
  app.run('sessions.custom={q:[0],done:{},secs:60,running:true,endAt:1792152060000};');
  const before = app.read('({session:sessions.custom,days:_state})');
  app.run('advanceSession("custom");');
  assert.deepEqual(app.read('({session:sessions.custom,days:_state})'), before);
  assert.equal(app.read('anyRunning()'), false);
  assert.equal(app.writes.length, 0);
});
