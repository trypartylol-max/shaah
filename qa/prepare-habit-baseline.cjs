// Reproducible, read-only Git export of the exact base for this change.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const BASE='5e42f014d7c5e1c07f8faaaa57d52b1fc73a586b';
const HTML_SHA256='4cb2348633e404d8f240b42f90dea0496d8b7bce07c285df5400490c5497bcbd';
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
