const {test}=require('node:test');const assert=require('node:assert/strict');const {loadApp}=require('./helpers.cjs');
function setup(events=[],now='2026-10-16T12:00:00Z',tz='UTC'){
 const a=loadApp(undefined,{now});a.contextEvents=events;
 a.run(`CFG.tz=${JSON.stringify(tz)};_state={'2026-10-16':{_daylog:${JSON.stringify(events)}}}`);return a;
}
const event=(start,end)=>({type:'manual',start,end});
test('empty Today includes midnight to now, old day all day, future no elapsed time; no records are created',()=>{
 const a=setup(),before=a.read('_state');assert.equal(a.run("dayLogCoverage('2026-10-16').gap"),720);
 assert.equal(a.run("dayLogCoverage('2026-10-15').gap"),1440);assert.equal(a.run("dayLogCoverage('2026-10-17').gap"),0);assert.deepEqual(a.read('_state'),before);
});
test('overlaps stay additive but untracked uses their union including first/last gaps',()=>{
 const a=setup([event('2026-10-16T09:00Z','2026-10-16T11:00Z'),event('2026-10-16T10:00Z','2026-10-16T11:30Z')]);
 const s=a.read("dayLogSummary('2026-10-16')");assert.equal(s.tracked,210);assert.equal(s.covered,150);assert.equal(s.gap,570);assert.deepEqual(s.gaps.map(g=>g.duration),[540,30]);
});
test('ongoing events cover until now; future times, points and missing historical ends cannot invent coverage',()=>{
 const a=setup([event('2026-10-16T10:00Z',null),event('2026-10-16T13:00Z',null),event('invalid',null),{type:'habit',sourceId:'sleep',start:'2026-10-16T06:00Z',end:null}]);
 assert.equal(a.run("dayLogCoverage('2026-10-16').gap"),600);assert.equal(a.run("dayLogCoverage('2026-10-16').covered"),120);
 a.run("_state['2026-10-15']={_daylog:[{type:'manual',start:'2026-10-15T10:00Z',end:null}]}");assert.equal(a.run("dayLogCoverage('2026-10-15').gap"),1440);
});
test('closed intervals are clipped at midnight and now, and computing never writes data',()=>{
 const a=setup([event('2026-10-15T23:00Z','2026-10-16T01:00Z'),event('2026-10-16T11:00Z','2026-10-17T01:00Z')]);const before=a.read('_state');
 assert.equal(a.run("dayLogCoverage('2026-10-16').covered"),120);assert.deepEqual(a.read('_state'),before);assert.equal(a.writes.length,0);
});
test('DST days measure actual elapsed hours in the configured timezone',()=>{
 const a=setup([],'2026-11-02T12:00:00Z','Europe/Berlin');assert.equal(a.run("dayLogCoverage('2026-10-25').elapsed"),1500);assert.equal(a.run("dayLogCoverage('2026-03-29').elapsed"),1380);
});

test('a closed overnight activity stored on its starting day also covers the following day',()=>{
 const a=setup();a.run("_state['2026-10-15']={_daylog:[{type:'manual',start:'2026-10-15T23:00Z',end:'2026-10-16T01:30Z'}]}");assert.equal(a.run("dayLogCoverage('2026-10-16').covered"),90);
 for(const key of ['bad','2026-13-01','2026-02-30'])assert.equal(a.run(`dayLogCoverage('${key}').elapsed`),0);
});
