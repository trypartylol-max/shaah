const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadApp,source}=require('./helpers.cjs');

test('style descriptors accept only registered presentation properties and freeze declarations',()=>{
  const app=loadApp();
  assert.deepEqual(app.read("uiStyleDeclarations(\"font-family:'DM Mono';color:#4ade80;padding:8px !important\")"),[
    ['font-family',"'DM Mono'",''],['color','#4ade80',''],['padding','8px','important']
  ]);
  assert.equal(app.run("Object.isFrozen(uiStyleDeclarations('color:#4ade80'))&&Object.isFrozen(uiStyleDeclarations('color:#4ade80')[0])"),true);
  for(const value of ['unexpected-spacing:8px','color:','plain text'])assert.throws(()=>app.run('uiStyleDeclarations('+JSON.stringify(value)+')'),/Invalid application style/);
});

test('style registration returns only opaque keys and reuses identical declarations',()=>{
  const app=loadApp();
  const token=app.run("uiStyle('margin:8px;color:#4ade80')");
  assert.match(token,/^data-ui-style="s[a-z0-9]+"$/);
  assert.equal(app.run("uiStyle('margin:8px;color:#4ade80')"),token);
  assert.doesNotMatch(token,/color|margin|style="margin/);
  assert.notEqual(app.run("uiStyle('margin:9px;color:#4ade80')"),token);
});

test('rendered application templates carry style registry keys instead of CSS attributes',()=>{
  const app=loadApp();
  for(const expression of ['renderToday(todayKey())','renderSettings()','renderSocial()','renderHistory()','renderStats()']){
    const markup=app.run(expression);
    assert.doesNotMatch(markup,/\sstyle\s*=/i,expression);
    assert.doesNotMatch(markup,/<style\b/i,expression);
  }
  assert.ok(source.includes('function uiFragment('));
  assert.doesNotMatch(source,/setAttribute\(['"]style['"]|\.style\.cssText\s*=/);
});
