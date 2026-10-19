// Private admin export received on hidden stdin, never in command arguments.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',s=>{input+=s;if(input.endsWith('\n')){process.stdin.pause();process.stdin.unref?.();save();}});
function save(){
 try{
  const payload=JSON.parse(input);assert.equal(payload.projectRef,'llpyxktcfubhmthqujpa');
  assert.equal(crypto.createHash('md5').update(payload.sourceJson).digest('hex'),payload.manifest.source_fingerprint);
  assert.deepEqual(JSON.parse(payload.sourceJson),payload.rows);
  assert.ok(Array.isArray(payload.rows)&&payload.rows.length===payload.manifest.source_rows);
  assert.ok(payload.rows.every(r=>Number.isSafeInteger(r.id)&&r.created_at&&r.user_id&&r.date&&r.data));
  const dir='/workspace/shaah-production-private/2026-10-18';
  fs.mkdirSync(dir,{recursive:true,mode:0o700});fs.chmodSync(dir,0o700);
  const file=path.join(dir,'day-logs-before.json');
  const bytes=Buffer.from(JSON.stringify(payload)+'\n');const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
  const reread=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(reread).digest('hex'),sha256);
  assert.deepEqual(JSON.parse(reread),payload);
  const receipt={status:'passed',projectRef:payload.projectRef,rows:payload.rows.length,bytes:bytes.length,sha256,sourceFingerprintVerified:true,independentOfDatabase:true,privateMode:(fs.statSync(file).mode&0o777).toString(8),file};
  fs.writeFileSync(path.join(dir,'backup-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(receipt));
 }catch(e){console.log(JSON.stringify({status:'failed',code:'PRIVATE_BACKUP_VALIDATION_FAILED',errorType:e.name}));process.exitCode=1;}
}
