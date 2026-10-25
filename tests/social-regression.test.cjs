const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { source, fixture, loadApp, clone } = require('./helpers.cjs');

test('application JavaScript compiles', () => { new vm.Script(source); });

test('legacy contacts load from cache without IDs, names, category or frequency changes', () => {
  const app = loadApp();
  const expected = app.read('CFG.people');
  app.run('set(cfgKey(),CFG); CFG=JSON.parse(JSON.stringify(DEFAULT_CFG)); loadCfgLocal();');
  assert.deepEqual(app.read('CFG.people'), expected);
});

test('a settings row preserves existing contacts and its historical timeline', () => {
  const app = loadApp();
  const expected = app.read('({people:CFG.people,log:CFG.log})');
  app.run('rowToState({date:"settings",data:{_cfg:JSON.parse(JSON.stringify(CFG))}})');
  assert.deepEqual(app.read('({people:CFG.people,log:CFG.log})'), expected);
});

test('server day rows preserve people, fractional checks, Social, note and Day Log', () => {
  const app = loadApp();
  const expected = app.read('_state["2026-09-16"]');
  app.run('const d=_state["2026-09-16"]; rowToState({date:"2026-09-16",data:{_checks:d.checks,_social:d.social,_people:d.people,_note:d.note,_daylog:d._daylog}})');
  assert.deepEqual(app.read('_state["2026-09-16"]'), expected);
});

test('tagging an existing contact checks its Social part and scores it only once', () => {
  const app = loadApp();
  app.run('togglePerson("pold01",todayKey()); togglePerson("pold02",todayKey());');
  assert.deepEqual(app.read('getPeople(todayKey())'), ['pold01', 'pold02']);
  assert.equal(app.run('getSocial(todayKey()).friends'), true);
  assert.equal(app.run('calcScore(todayKey()).l3'), 16);
});

test('untagging a person preserves the selected Social activity and the rest of the day', () => {
  const app = loadApp();
  const past = app.read('_state');
  app.run('togglePerson("pold01",todayKey()); togglePerson("pold01",todayKey());');
  assert.deepEqual(app.read('getPeople(todayKey())'), []);
  assert.equal(app.run('getSocial(todayKey()).friends'), true);
  for (const [key, day] of Object.entries(past)) assert.deepEqual(app.read(`_state[${JSON.stringify(key)}]`), day);
});

test('a sole contact is auto-tagged for its Social part; multiple contacts require a choice', () => {
  const app = loadApp();
  app.run('toggleSub("flirt",todayKey()); toggleSub("friends",todayKey());');
  assert.deepEqual(app.read('getPeople(todayKey())'), ['pold03']);
  app.run('toggleSub("flirt",todayKey());');
  assert.deepEqual(app.read('getPeople(todayKey())'), []);
  assert.equal(app.run('getChecked(todayKey()).social'), true);
});

test('editing contact metadata does not rewrite historical days, config eras or scores', () => {
  const app = loadApp();
  const before = app.read('({days:_state,log:CFG.log,score:calcScore("2026-09-16")})');
  app.run('personSet("pold03","name","Alex Renamed"); personSet("pold03","every",21); personSet("pold03","sub","friends");');
  assert.deepEqual(app.read('({days:_state,log:CFG.log,score:calcScore("2026-09-16")})'), before);
});

test('deleting a contact keeps previously logged IDs, Social flags and points', () => {
  const app = loadApp();
  const before = app.read('({days:_state,score:calcScore("2026-09-16")})');
  app.run('personDel("pold03");');
  assert.equal(app.run('personById("pold03")'), null);
  assert.deepEqual(app.read('({days:_state,score:calcScore("2026-09-16")})'), before);
});

test('orphan recovery preserves the original ID and every historical row', () => {
  const app = loadApp();
  const before = app.read('_state');
  app.run('CFG.people=CFG.people.filter(p=>p.id!=="pold03"); recoverPeopleFromDays();');
  assert.equal(app.run('personById("pold03").id'), 'pold03');
  assert.deepEqual(app.read('_state'), before);
});

test('WHO TO SEE orders never-seen contacts first and uses the latest visit', () => {
  const app = loadApp();
  app.run('setPeople("2026-10-01",["pold01"]); setPeople("2026-10-12",["pold01"]);');
  const status = app.read('peopleStatus()');
  assert.equal(status[0].id, 'pold02');
  assert.equal(status.find(p => p.id === 'pold01').last, '2026-10-12');
  assert.equal(status.find(p => p.id === 'pold01').days, 4);
  const ui = app.run('renderWhoToSee()');
  for (const name of ['Ana Existing', 'Luis Existing', 'Alex Existing']) assert.ok(ui.includes(name));
});

for (const [date, mode, score, max, pct, grade] of [
  ['2026-09-07', 'work', 27, 48, 56, 'B'],
  ['2026-09-08', 'vacation', 7, 30, 23, 'D'],
  ['2026-09-15', 'vacation', 7, 30, 23, 'D'],
  ['2026-09-16', 'vacation', 7, 30, 23, 'D'],
  ['2026-09-17', 'vacation', 7, 30, 23, 'D'],
  ['2026-09-18', 'vacation', 7, 30, 23, 'D'],
  ['2026-10-08', 'work', 27, 48, 56, 'B']
]) {
  test(`${date}: dated ${mode} points, maximum, percentage and grade`, () => {
    const app = loadApp();
    assert.equal(app.run(`cfgForDate("${date}").mode`), mode);
    const result = app.read(`calcScore("${date}")`);
    assert.equal(result.score, score);
    assert.equal(result.max, max);
    assert.equal(result.pct, pct);
    assert.equal(app.run(`GRADE(${score},${max}).l`), grade);
    assert.deepEqual(app.read(`cfgForDate("${date}").subs.map(s=>s.p)`), mode === 'work' ? [2, 0, 16] : [4, 0, 20]);
    assert.deepEqual(app.read(`cfgForDate("${date}").L1.map(h=>h.id)`), mode === 'work' ? ['work'] : []);
  });
}

test('Work → Vacation → Work changes today without changing historical Social scores', () => {
  const app = loadApp();
  const before = app.read('Object.keys(_state).map(k=>[k,cfgForDate(k),calcScore(k)])');
  app.run('togglePerson("pold03",todayKey()); setTravelMode("vacation");');
  assert.equal(app.run('calcScore(todayKey()).l3'), 4);
  assert.equal(app.run('calcScore(todayKey()).max'), 30);
  assert.deepEqual(app.read('Object.keys(_state).filter(k=>k!==todayKey()).map(k=>[k,cfgForDate(k),calcScore(k)])'), before);
  app.run('setTravelMode("work");');
  assert.equal(app.run('calcScore(todayKey()).l3'), 2);
  assert.equal(app.run('calcScore(todayKey()).max'), 48);
});

test('editing Vacation points while live mode is Work preserves Work points and old days', () => {
  const app = loadApp();
  const before = app.read('({days:_state,log:CFG.log,score:calcScore("2026-09-16")})');
  app.run('subSet(0,"pVacation",9);');
  assert.equal(app.run('CFG.subs[0].pWork'), 2);
  assert.equal(app.run('CFG.subs[0].pVacation'), 9);
  assert.deepEqual(app.read('_state'), before.days);
  assert.deepEqual(app.read('CFG.log.slice(0,3)'), before.log);
  assert.deepEqual(app.read('calcScore("2026-09-16")'), before.score);
});

test('editing Work points while live mode is Vacation preserves Vacation points and old days', () => {
  const app = loadApp();
  app.run('setTravelMode("vacation");');
  const before = app.read('calcScore("2026-09-16")');
  app.run('subSet(0,"pWork",9);');
  assert.equal(app.run('CFG.subs[0].pVacation'), 4);
  assert.equal(app.run('CFG.subs[0].pWork'), 9);
  assert.deepEqual(app.read('calcScore("2026-09-16")'), before);
});

for (const [mode, total] of [['work', 18], ['vacation', 24]]) {
  test(`legacy parts with no price inherit the ${mode} combo split, without mutation`, () => {
    const data = fixture();
    for (const era of data.config.log) era.subs = era.subs.map(({ id, label, icon }) => ({ id, label, icon }));
    const app = loadApp(data);
    const date = mode === 'work' ? '2026-09-07' : '2026-09-16';
    const original = app.read('CFG.log');
    assert.deepEqual(app.read(`cfgForDate("${date}").subs.map(s=>s.p)`), [total / 3, total / 3, total / 3]);
    assert.equal(app.run(`calcScore("${date}").l3`), total / 3);
    assert.deepEqual(app.read('CFG.log'), original);
  });
}

test('explicit legacy zero and mode-specific values are preserved by fallback', () => {
  const app = loadApp();
  assert.deepEqual(app.read('resolveSubs([{id:"zero",p:0},{id:"priced",p:7},{id:"modes",pWork:3,pVacation:11}],18,"vacation").map(s=>s.p)'), [0, 7, 11]);
});

for (const mode of ['work', 'vacation']) {
  test(`a historical zero-point ${mode} activity retains zero without changing its saved row`, () => {
    const data = fixture();
    const date = mode === 'work' ? '2026-09-07' : '2026-09-16';
    data.days[date].social = { strangers: true };
    const app = loadApp(data);
    const original = app.read('_state');
    assert.equal(app.run(`calcScore("${date}").l3`), 0);
    assert.deepEqual(app.read('_state'), original);
  });

  test(`selecting a zero-point part earns zero, rather than the whole ${mode} combo`, () => {
    const app = loadApp();
    app.run(`setTravelMode("${mode}"); toggleSub("strangers",todayKey());`);
    assert.equal(app.run('getChecked(todayKey()).social'), true);
    assert.equal(app.run('calcScore(todayKey()).l3'), 0);
    assert.match(app.run('comboBlock(todayKey(),true)'), /0 \/ (18|24) pts/);
    assert.ok(app.run('comboBlock(todayKey(),true)').includes('aria-pressed="true"'));
    assert.ok(app.run('renderSocial()').includes(`<span class="sd-pts"`));
    assert.match(app.run('renderSocial()'), mode === 'work' ? />0\/18%<\/span>/ : />0\/24%<\/span>/);
  });
}

test('a legacy combo check with no selected active part still grants the whole combo', () => {
  const app = loadApp();
  app.run('setChecked(todayKey(),{social:true}); setSocial(todayKey(),{});');
  assert.equal(app.run('calcScore(todayKey()).l3'), 18);
});

test('pausing a Social part changes today, preserving historical points and contact IDs', () => {
  const app = loadApp();
  const before = app.read('({days:_state,score:calcScore("2026-09-16")})');
  app.run('subToggle(0);');
  assert.equal(app.run('cfgForDate(todayKey()).subs.some(s=>s.id==="flirt")'), false);
  assert.deepEqual(app.read('({days:_state,score:calcScore("2026-09-16")})'), before);
});

test('a zero Social maximum produces zero points and a finite normalized percentage', () => {
  const data = fixture();
  for (const sub of data.config.subs) Object.assign(sub, { p: 0, pWork: 0, pVacation: 0 });
  for (const era of data.config.log) era.subs = clone(data.config.subs);
  const app = loadApp(data);
  app.run('toggleSub("strangers",todayKey());');
  assert.equal(app.run('calcScore(todayKey()).l3'), 0);
  assert.equal(app.run('calcScore(todayKey()).pct'), 0);
});

test('persistDay serializes synthetic contact and Social changes through a fake server only', async () => {
  const app = loadApp();
  app.run('USER={id:"regression-user"}; togglePerson("pold01",todayKey());');
  const dayTimer = [...app.timers.values()].find(t => t.ms === 250);
  assert.ok(dayTimer);
  await dayTimer.fn();
  assert.equal(app.writes.length, 1);
  assert.equal(app.writes[0].table, 'day_logs');
  assert.equal(app.writes[0].row.user_id, 'regression-user');
  assert.deepEqual(app.writes[0].row.data._people, ['pold01']);
  assert.equal(app.writes[0].row.data._social.friends, true);
});
