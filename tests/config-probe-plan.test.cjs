const test=require('node:test'),assert=require('node:assert/strict');
const {prepare}=require('../qa/supabase/config-probe-plan.cjs');
const args={projectRef:'kpnwiwaiwnndpvtxkvva',nonce:'ab0123456789cdef'};
test('config probe refuses other projects and unsafe identifiers',()=>{
 for(const projectRef of ['llpyxktcfubhmthqujpa','',undefined])assert.throws(()=>prepare({...args,projectRef}),/SHAAH_TEST_ONLY/);
 for(const nonce of ['x;drop schema public','abcd','A'.repeat(16)])assert.throws(()=>prepare({...args,nonce}),/INVALID_PROBE_NONCE/);
});
test('config probe scopes the complete revision protocol to fresh names',()=>{
 const p=prepare(args);
 assert.equal(p.sources.length,3);
 for(const s of p.sources)assert.match(s.sha256,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(p.install,/public\.day_logs|shaah_private|public\.shaah_save_settings_v1|create table if not exists/i);
 assert.match(p.install,/SHAAH_REQUEST_OWNER_MISMATCH/);
 assert.match(p.install,/errcode='PT409'/);
 assert.match(p.install,/enable row level security/);
 assert.match(p.install,/set search_path = ''/);
 assert.match(p.install,new RegExp('create table public\\.'+p.table));
 assert.match(p.install,/alter publication supabase_realtime add table/);
 assert.ok(p.install.startsWith('begin;')&&p.install.endsWith('commit;\n'));
});
test('cleanup verifies run ownership and never uses cascade or existing resources',()=>{
 const p=prepare(args);
 assert.match(p.cleanup,/PROBE_IDENTITY_MISMATCH/);
 assert.match(p.cleanup,/obj_description/);
 assert.doesNotMatch(p.cleanup,/cascade|public\.day_logs|shaah_private|auth\.users/i);
 assert.ok(p.cleanup.startsWith('begin;')&&p.cleanup.endsWith('commit;\n'));
 const other=prepare({...args,nonce:'0123456789abcdef'});
 assert.notEqual(p.table,other.table);
 assert.ok(!other.cleanup.includes(p.marker));
});
