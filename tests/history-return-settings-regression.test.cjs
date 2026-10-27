const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Tests the canonical source, not a stale fingerprinted build artifact.
const source = fs.readFileSync(path.join(__dirname, '../source/app.js'), 'utf8');
function body(name) {
  const begin = source.indexOf('function ' + name + '(');
  assert.ok(begin >= 0, name + ' must exist');
  const brace = source.indexOf('{', begin);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(begin, i + 1);
  }
  throw new Error('Unbalanced function ' + name);
}

test('return-to-Work migration preserves later Vacation era', () => {
  const eras = [
    {from:'2026-09-01',mode:'work',h:{work:{on:true}},order:[],subs:[]},
    {from:'2026-09-08',mode:'work',h:{work:{on:true}},order:[],subs:[]},
    {from:'2026-10-08',mode:'vacation',h:{work:{on:false}},order:[],subs:[]},
    {from:'2026-11-01',mode:'vacation',h:{work:{on:false}},order:[],subs:[]}
  ];
  const CFG = {travelV:9,travel:{auto:true,resumeOn:''},h:{work:{on:true}}};
  const fn = new Function('CFG','eras', `
    const CFG_EPOCH='2026-01-01';
    let _dayCfgCache={};
    const cfgLog=()=>eras, cfgBaseline=()=>eras[0], todayKey=()=> '2026-10-27';
    const travelEnsure=()=>{}, persistTravelMode=()=>{};
    ${body('ensureWorkReturn2026')}
    return ensureWorkReturn2026();
  `);
  assert.equal(fn(CFG,eras),true);
  assert.equal(eras[1].mode,'vacation');
  assert.equal(eras[2].mode,'work');
  assert.equal(eras[3].mode,'vacation');
  assert.equal(eras[3].h.work.on,false);
  assert.equal(CFG.travelV,10);
  assert.equal(fn(CFG,eras),false,'migration must be idempotent');
});

test('Settings habit re-enable does not invoke an undefined Day Log hook', () => {
  const CFG = {h:{meditation:{on:false}}};
  const fn = new Function('CFG', `
    const haptic=()=>{}, cfgEdit=fn=>fn();
    ${body('cfgToggle')}
    cfgToggle('meditation');
    return CFG.h.meditation.on;
  `);
  assert.equal(fn(CFG),true);
  assert.equal(source.includes('dayLogHookHabitCompletion('),false);
});
