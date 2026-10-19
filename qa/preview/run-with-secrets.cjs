// Ephemeral local consumer of the same secrets stored in the private QA Site.
// Values arrive over hidden stdin; no .env, password file, token log or arguments.
const readline=require('node:readline');
const input=readline.createInterface({input:process.stdin,terminal:false});
input.once('line',line=>{
  input.close();process.stdin.pause();process.stdin.unref?.();
  try{
    const values=JSON.parse(line);
    const names=['SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY',...['A','B'].flatMap(who=>['ID','EMAIL','PASSWORD'].map(k=>'SHAAH_TEST_USER_'+who+'_'+k))];
    if(Object.keys(values).length!==names.length||names.some(k=>typeof values[k]!=='string'||!values[k]))throw new Error();
    for(const key of names)process.env[key]=values[key];
    require(process.argv.includes('--maintenance-check')?'../migration/check-maintenance.cjs':process.argv.includes('--migration-rehearsal')?'../migration/run-rehearsal.cjs':process.argv.includes('--diagnose')?'./diagnose-browser.cjs':process.argv.includes('--reset-synthetic')?'./reset-synthetic.cjs':process.argv.includes('--seed-demo')?'./seed-demo.cjs':'../supabase/run-sync.cjs');
  }catch{console.log('QA_SECRET_INPUT_INVALID');process.exitCode=2;}
});
