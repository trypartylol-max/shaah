const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
// The web titles must keep the count as the first number, which is what DelegationService reads.
test('pending notification titles carry the count the Android host parses',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../../app.js'),'utf8');
  assert.match(src,/PENDING_NOTE_TAG='shaah-pending'/);
  const java=fs.readFileSync(path.join(__dirname,'../native/DelegationService.java'),'utf8');
  assert.match(java,/PENDING_TAG = "shaah-pending"/);
  const first=t=>{const m=/(\d{1,3})/.exec(t);return m?+m[1]:1;};
  for(const [t,n] of [['Te quedan 4 hábitos hoy',4],['Te queda 1 hábito hoy',1],['12 habits left today',12],['1 habit left today',1],['נשארו 3 הרגלים להיום',3],['נשאר הרגל אחד להיום',1]])assert.equal(first(t),n);
  assert.equal(fs.readFileSync(path.join(__dirname,'../native/DelegationService.java'),'utf8'),fs.readFileSync(path.join(__dirname,'../project/app/src/main/java/io/github/trypartylol_max/shaah/DelegationService.java'),'utf8'));
});
