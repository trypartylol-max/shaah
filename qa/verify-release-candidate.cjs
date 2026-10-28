// GET-only public deployment parity and offline candidate/rollback identity.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const BASE='9d4de5bd66492bba55b834d8404c03490bbd3db8';
const SITE='https://trypartylol-max.github.io/shaah/';
const out=path.join(root,'docs/qa-habits-2026-10-28/release-pr-20');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitFile=file=>execFileSync('git',['show',BASE+':'+file],{cwd:root,maxBuffer:32*1024*1024});
function links(html){return [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\.\/assets\/[^"?#]+)(?:\?[^"#]*)?"[^>]*>/g)].map(m=>({file:m[1].slice(2),tag:m[0],url:m[0].match(/(?:src|href)="([^"]+)"/)[1]}));}
function sri(tag,bytes){const value=tag.match(/integrity="([^"]+)"/)?.[1];if(!value)return 'not_declared';assert.equal(value,'sha384-'+crypto.createHash('sha384').update(bytes).digest('base64'));return 'passed';}
(async()=>{
 const report={checkedAtUtc:new Date().toISOString(),baseCommit:BASE,url:SITE,status:'running',writes:0,publicGets:0,assets:[],candidate:[]};
 try{
  fs.mkdirSync(out,{recursive:true});
  const get=async url=>{const u=new URL(url,SITE);assert.equal(u.origin,new URL(SITE).origin);assert.ok(u.pathname.startsWith('/shaah/'));assert.equal(u.username+u.password+u.hash,'');const r=await fetch(u,{method:'GET',redirect:'error',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);report.publicGets++;return Buffer.from(await r.arrayBuffer());};
  const deployed=await get(SITE),expected=gitFile('index.html');report.publishedHtmlSha256=hash(deployed);assert.equal(hash(deployed),hash(expected),'Published HTML differs from pinned main');
  const queue=links(expected.toString()).map(a=>({...a,url:new URL(a.url,SITE).href})),seen=new Set();
  while(queue.length){const a=queue.shift();if(seen.has(a.file))continue;seen.add(a.file);
   const bytes=await get(a.url),source=gitFile(a.file);assert.equal(hash(bytes),hash(source),a.file+' differs from pinned main');
   report.assets.push({path:a.file,sha256:hash(bytes),sri:a.tag?sri(a.tag,bytes):'not_declared'});
   if(a.file.endsWith('.css'))for(const m of bytes.toString().matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)){
    const ref=m[1]||m[2];if(ref.startsWith('data:')||ref.startsWith('#'))continue;
    const url=new URL(ref,a.url);assert.equal(url.origin,new URL(SITE).origin);assert.ok(url.pathname.startsWith('/shaah/assets/'));
    queue.push({file:decodeURIComponent(url.pathname.slice('/shaah/'.length)),url:url.href});
   }
  }
  const html=fs.readFileSync(path.join(root,'index.html'));report.candidateHtmlSha256=hash(html);
  const skeleton=text=>text.replace(/<(?:script|link)\b[^>]*(?:src|href)="\.\/assets\/app\.[a-f0-9]{16}\.(js|css)"[^>]*>/g,(_,ext)=>'GENERATED_APP_'+ext);
  assert.equal(skeleton(html.toString()),skeleton(fs.readFileSync(path.join(root,'source/index.html'),'utf8')),'Candidate and source template differ beyond generated app references');
  for(const a of links(html.toString())){const bytes=fs.readFileSync(path.join(root,a.file));report.candidate.push({path:a.file,sha256:hash(bytes),sri:sri(a.tag,bytes)});
   const app=a.file.match(/^assets\/app\.([a-f0-9]{16})\.(js|css)$/);if(app){assert.equal(hash(bytes).slice(0,16),app[1]);assert.deepEqual(bytes,fs.readFileSync(path.join(root,'source/app.'+app[2])));}
  }
  const dir=path.join(root,'.runtime/release-candidate');fs.mkdirSync(dir,{recursive:true});const archive=path.join(dir,'rollback-'+BASE+'.tar');
  execFileSync('git',['archive','--format=tar','--output='+archive,BASE,'index.html','assets'],{cwd:root});
  report.rollback={commit:BASE,archive:'.runtime/release-candidate/'+path.basename(archive),sha256:hash(fs.readFileSync(archive)),scope:'Complete pinned-main index.html and assets; no database or settings rollback'};
  report.status='passed';
 }catch(e){report.status='failed';report.error=String(e.message).slice(0,300);process.exitCode=1;}
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'asset-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,publicGets:report.publicGets,publishedAssets:report.assets.length,candidateAssets:report.candidate.length,error:report.error}));
})();
