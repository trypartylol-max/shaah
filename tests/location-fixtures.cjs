const { fixture } = require('./helpers.cjs');

function locationFixture() {
  const data = fixture();
  data.config.locationGroups = [{ id: 'il', name: 'Israel' }, { id: 'pa', name: 'Panamá' }, { id: 'empty', name: 'Empty' }];
  data.config.selectedLocation = 'il';
  Object.assign(data.config.people[0], { locations: [], inactive: false });
  Object.assign(data.config.people[1], { locations: ['il', 'pa'], inactive: false });
  Object.assign(data.config.people[2], { locations: ['il'], inactive: false });
  data.config.people.push(
    { id: 'paway', name: 'Remote Person', sub: 'friends', every: 14, locations: ['pa'], inactive: false },
    { id: 'pinactive', name: 'Inactive Person', sub: 'flirt', every: 21, locations: ['il', 'pa'], inactive: true },
    { id: 'plegacy', name: 'Legacy Person', sub: 'friends', every: 30 },
    { id: 'porphan', name: 'Orphan Person', sub: 'archived', every: 7, locations: ['il'], inactive: true }
  );
  return data;
}
module.exports = { locationFixture };
