const {test}=require('node:test');
const assert=require('node:assert/strict');
const {digest}=require('../qa/supabase/probe-integrity.cjs');
test('probe cleanup recognizes semantically identical JSONB despite nested key reordering',()=>{
  assert.equal(digest({_note:'probe:online',_checks:{b:false,a:true},_people:['one','two']}),digest({_people:['one','two'],_checks:{a:true,b:false},_note:'probe:online'}));
});
test('probe cleanup detects changes to notes, checks, membership and array ordering',()=>{
  const original={_note:'probe:online',_checks:{a:false},_people:['one','two']};
  for(const changed of [{...original,_note:'manual edit'},{...original,_checks:{a:true}},{...original,_people:['one','two','three']},{...original,_people:['two','one']}])assert.notEqual(digest(original),digest(changed));
});
