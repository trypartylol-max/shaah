// Reproducible, read-only Git export of the exact base for this change.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const BASE='9d4de5bd66492bba55b834d8404c03490bbd3db8';
const HTML_SHA256='21e2c4cfc25e649e5475ef0bf6ba77bc1ab4ace0f6a4d85a483fa1a6ef991f4e';
function prepare(){
 const root=path.resolve(__dirname,'..'),folder=path.join(root,'.runtime','habit-baseline',BASE);
 fs.mkdirSync(folder,{recursive:true});
 const archive=execFileSync('git',['archive',BASE,'index.html','assets'],{cwd:root,maxBuffer:128*1024*1024});
 execFileSync('tar',['-x','-C',folder],{input:archive});
 const file=path.join(folder,'index.html');
 if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==HTML_SHA256)throw Error('Base HTML identity mismatch');
 return file;
}
if(require.main===module)console.log(prepare());
module.exports={prepare,BASE,HTML_SHA256};
