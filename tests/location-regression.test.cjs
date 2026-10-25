const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');
const make = () => loadApp(locationFixture());

test('legacy contacts without location/status fields are active and visible in every location', () => {
  const app = make();
  const before = app.read('personById("plegacy")');
  for (const loc of ['all', 'il', 'pa', 'empty']) {
    app.run(`locationSelect("${loc}")`);
    assert.equal(app.run('personVisible(personById("plegacy"))'), true);
  }
  assert.deepEqual(app.read('personById("plegacy")'), before);
});

test('WHO TO SEE filters active contacts by location, retaining unassigned contacts', () => {
  const app = make();
  assert.deepEqual(app.read('visiblePeople().map(p=>p.id)'), ['pold01', 'pold02', 'pold03', 'plegacy']);
  app.run('locationSelect("pa")');
  assert.deepEqual(app.read('visiblePeople().map(p=>p.id)'), ['pold01', 'pold02', 'paway', 'plegacy']);
  assert.deepEqual(app.read('peopleStatus().map(p=>p.id).sort()'), ['plegacy', 'pold01', 'pold02', 'paway'].sort());
  app.run('locationSelect("all")');
  assert.equal(app.run('peopleStatus().length'), 5);
});

test('individual location toggles preserve all other memberships and reject unknown groups', () => {
  const app = make();
  app.run('locationTogglePerson("pold02","il");');
  assert.deepEqual(app.read('personById("pold02").locations'), ['pa']);
  app.run('locationTogglePerson("pold02","il"); locationTogglePerson("pold02","missing");');
  assert.deepEqual(app.read('personById("pold02").locations'), ['pa', 'il']);
});

test('bulk add is additive, deduplicates memberships and clears its selection', () => {
  const app = make();
  app.run('bulkPeopleToggle("pold01",true); bulkPeopleToggle("pold02",true); bulkPeopleToggle("pold02",true); bulkPeopleApply("pa","add");');
  assert.deepEqual(app.read('personById("pold01").locations'), ['pa']);
  assert.deepEqual(app.read('personById("pold02").locations'), ['il', 'pa']);
  assert.deepEqual(app.read('bulkPeopleSelection'), []);
  assert.deepEqual(app.read('personById("pold03").locations'), ['il']);
});

test('bulk remove removes only the requested membership from selected contacts', () => {
  const app = make();
  app.run('bulkPeopleToggle("pold02",true); bulkPeopleApply("il","remove");');
  assert.deepEqual(app.read('personById("pold02").locations'), ['pa']);
  assert.deepEqual(app.read('personById("pold03").locations'), ['il']);
});

test('bulk apply rejects unknown locations/actions and rechecks current filter eligibility', () => {
  const app = make();
  const before = app.read('CFG.people');
  app.run('bulkPeopleSelection=["pinactive"]; bulkPeopleApply("pa","add"); bulkPeopleSelection=["pold03"]; bulkPeopleApply("missing","add"); bulkPeopleApply("pa","replace"); bulkPeopleQuery="Ana"; bulkPeopleApply("pa","add");');
  assert.deepEqual(app.read('CFG.people'), before);
});

test('direct management keeps every contact available; bulk Unassigned remains independent', () => {
  const app = make();
  app.run('bulkPeopleSetScope("unassigned")');
  assert.deepEqual(app.read('bulkPeopleCandidates().map(p=>p.id)'), ['pold01', 'plegacy']);
  app.run('bulkPeopleSetScope("all");setPeopleSettingsFilter("inactive");');
  assert.equal(app.read('settingsPeople().length'),7); // Legacy status must not hide people from direct management.
  assert.deepEqual(app.read('settingsOrphanPeople().map(p=>p.id)'), ['porphan']);
  app.run('setPeopleSettingsFilter("all")');
  assert.equal(app.run('settingsPeople().length'), 7);
});

test('changing settings status, scope or search clears bulk selection', () => {
  const app = make();
  for (const action of ['setPeopleSettingsFilter("inactive")', 'bulkPeopleSetScope("unassigned")', 'bulkPeopleSearch("Ana")']) {
    app.run('bulkPeopleSelection=["pold01"];'+action);
    assert.deepEqual(app.read('bulkPeopleSelection'), [], action);
  }
});

test('bulk search is case-insensitive and selects only matching contacts', () => {
  const app = make();
  app.run('bulkPeopleSearch("  lUiS  ");bulkPeopleSelectVisible(true);');
  assert.deepEqual(app.read('bulkPeopleSelection'), ['pold02']);
  app.run('bulkPeopleApply("empty","add");');
  assert.deepEqual(app.read('personById("pold02").locations'), ['il', 'pa', 'empty']);
  assert.deepEqual(app.read('personById("pold03").locations'), ['il']);
});

test('inactive contacts stay excluded in every location and can be reactivated', () => {
  const app = make();
  for (const loc of ['all', 'il', 'pa']) {
    app.run(`locationSelect("${loc}")`);
    assert.equal(app.run('visiblePeople().some(p=>p.id==="pinactive")'), false);
  }
  app.run('personSetInactive("pinactive",false)');
  assert.equal(app.run('visiblePeople().some(p=>p.id==="pinactive")'), true);
});

test('switching location, memberships and inactive flags preserves all dated records and scores', () => {
  const app = make();
  const before = app.read('({days:_state,log:CFG.log,mode:CFG.travel,scores:Object.keys(_state).map(k=>calcScore(k))})');
  app.run('locationSelect("pa"); locationTogglePerson("pold03","pa"); personSetInactive("pold03",true); bulkPeopleToggle("pold02",true); bulkPeopleApply("il","remove");');
  assert.deepEqual(app.read('({days:_state,log:CFG.log,mode:CFG.travel,scores:Object.keys(_state).map(k=>calcScore(k))})'), before);
});

for (const [mode, points] of [['work', 2], ['vacation', 4]]) {
  test(`explicitly recording an inactive/away contact still earns ${mode} Social points`, () => {
    const app = make();
    app.run(`setTravelMode("${mode}");personSetInactive("pold03",true);locationSelect("pa");togglePerson("pold03",todayKey());`);
    assert.deepEqual(app.read('getPeople(todayKey())'), ['pold03']);
    assert.equal(app.run('calcScore(todayKey()).l3'), points);
    assert.equal(app.run('peopleStatus().some(p=>p.id==="pold03")'), false);
  });
}

test('Social auto-tagging ignores inactive/away suggestions, but deselecting a part clears all its tags', () => {
  const app = make();
  app.run('toggleSub("flirt",todayKey());');
  assert.deepEqual(app.read('getPeople(todayKey())'), ['pold03']);
  app.run('togglePerson("pinactive",todayKey());locationSelect("pa");toggleSub("flirt",todayKey());');
  assert.deepEqual(app.read('getPeople(todayKey())'), []);
  assert.equal(app.run('calcScore(todayKey()).l3'), 0);
});

test('an empty recommendation list still renders a usable location selector', () => {
  const app = make();
  app.run('CFG.people=[];locationSelect("empty")');
  assert.match(app.run('renderWhoToSee()'), /aria-label="Current social location"/);
  assert.match(app.run('renderWhoToSee()'), /value="all"/);
});

test('settings cache and server-row loading retain location groups, memberships and inactive status', () => {
  const app = make();
  const before = app.read('CFG');
  app.run('saveCfg();loadCfgLocal();rowToState({date:"settings",data:{_cfg:JSON.parse(JSON.stringify(CFG))}});');
  assert.deepEqual(app.read('({people:CFG.people,groups:CFG.locationGroups,selected:CFG.selectedLocation})'), { people: before.people, groups: before.locationGroups, selected: before.selectedLocation });
});

test('a deleted/invalid persisted selected group falls back to All without rewriting contacts', () => {
  const app = make();
  const before = app.read('CFG.people');
  app.run('CFG.selectedLocation="deleted";');
  assert.equal(app.run('selectedLocation()'), 'all');
  assert.equal(app.run('visiblePeople().length'), 5);
  assert.deepEqual(app.read('CFG.people'), before);
});

test('dangling location IDs behave as Unassigned without deleting the stored IDs', () => {
  const app = make();
  app.run('personById("pold01").locations=["deleted"];bulkPeopleSetScope("unassigned");');
  assert.equal(app.run('personVisible(personById("pold01"))'), true);
  assert.equal(app.run('bulkPeopleCandidates().some(p=>p.id==="pold01")'), true);
  assert.deepEqual(app.read('personById("pold01").locations'), ['deleted']);
});

test('people-only import keeps location/status metadata and does not overwrite existing contacts/history', () => {
  const app = make();
  const before = app.read('({days:_state,person:personById("pold01")})');
  app.run('importApply({people:[{id:"pimport",name:"Imported",sub:"friends",every:9,locations:["il","pa"],inactive:true},{id:"pold01",name:"Overwrite",sub:"flirt",every:1}]});');
  assert.deepEqual(app.read('personById("pimport")'), { id: 'pimport', name: 'Imported', sub: 'friends', every: 9, locations: ['il', 'pa'], inactive: true });
  assert.deepEqual(app.read('({days:_state,person:personById("pold01")})'), before);
});
