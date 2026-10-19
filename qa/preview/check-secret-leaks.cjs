// Scan only the QA source/evidence trees. Candidate secret values arrive by
// hidden stdin and are never included in output, paths or exceptions.
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline');
const roots=['/workspace/shaah','/workspace/sites/shaah-test-preview'];
const rl=readline.createInterface({input:process.stdin,terminal:false});
rl.once('line',line=>{
  rl.close();process.stdin.pause();process.stdin.unref?.();
  try{
    const values=Object.values(JSON.parse(line));
    if(!values.length||values.some(v=>typeof v!=='string'||v.length<20))throw new Error();
    let files=0,matches=0;
    function visit(folder){for(const ent of fs.readdirSync(folder,{withFileTypes:true})){
      if(['.git','node_modules','.runtime'].includes(ent.name)||ent.isSymbolicLink())continue;
      const file=path.join(folder,ent.name);
      if(ent.isDirectory())visit(file);
      else if(ent.isFile()){files++;const data=fs.readFileSync(file);if(values.some(v=>data.includes(Buffer.from(v))))matches++;}
    }}
    roots.forEach(visit);console.log(JSON.stringify({status:matches?'failed':'passed',filesScanned:files,filesContainingActualSecrets:matches}));
    if(matches)process.exitCode=2;
  }catch{console.log('QA_SECRET_SCAN_FAILED');process.exitCode=2;}
});
