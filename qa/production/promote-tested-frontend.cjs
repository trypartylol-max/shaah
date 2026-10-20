// Promote the exact approved TEST application, excluding the QA adapter.
// Builds static Pages assets only; no Supabase, Auth, Git, or deployment calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const sourcePath=process.argv[process.argv.indexOf('--source')+1];
assert.ok(process.argv.includes('--source')&&sourcePath,'Pass the approved canonical HTML with --source');
const source=fs.readFileSync(sourcePath,'utf8'),baseline=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
assert.equal(hash(source),'bb1004a36e75248c072fa9b8a9cc502dbe2597a64b5830ec86b27ef1c9e3d5f5','Exact validated TEST v15 canonical source');
assert.equal(hash(baseline),'cddd9d3a847f615a501cb9713e80fe07acf8140232337354ccda4673e8e02f22','Exact current Original baseline');
const scripts=[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(([,a])=>!/\bsrc\s*=/.test(a));
assert.equal(scripts.length,1);
const application=scripts[0][2];
const oldAppPath=baseline.match(/<script data-shaah-app src="\.\/([^"]+)"/)[1];
const oldApplication=fs.readFileSync(path.join(root,oldAppPath),'utf8');
for(const name of ['SUPABASE_URL','SUPABASE_KEY']){
  const re=new RegExp('const '+name+'=[^;]+;');
  assert.ok(oldApplication.match(re)?.[0]===application.match(re)?.[0],'Original public backend configuration remains unchanged');
}
assert.ok(!application.includes('kpnwiwaiwnndpvtxkvva')&&!application.includes('SHAAH_QA_')&&!application.includes('qaLogin('),'No TEST backend or QA adapter');
const integrity=bytes=>'sha384-'+crypto.createHash('sha384').update(bytes).digest('base64');
const assets={};
const add=(kind,ext,body)=>{
  const name='assets/'+kind+'.'+hash(body).slice(0,16)+'.'+ext;
  assets[name]=Buffer.from(body);return {name,integrity:integrity(body)};
};
const app=add('app','js',application);
let html=source.replace(scripts[0][0],`<script data-shaah-app src="./${app.name}" integrity="${app.integrity}" crossorigin="anonymous"></script>`);
const sdkTag=baseline.match(/<script\b[^>]*src="\.\/assets\/supabase-2\.118\.0\.js"[^>]*><\/script>/)[0];
html=html.replace(/<script\b[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.118\.0\/dist\/umd\/supabase\.js"[^>]*><\/script>/,sdkTag);
assert.ok(html.includes(sdkTag),'Retain pinned local SDK with its existing SRI');
const styles=[];
html=html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi,(_tag,css)=>{styles.push(css);return styles.length===1?'__LOCAL_APP_STYLES__':'';});
assert.equal(styles.length,28,'All original stylesheet blocks retained in order');
const css=add('app','css',styles.join('\n'));
html=html.replace('__LOCAL_APP_STYLES__',`<link rel="stylesheet" href="./${css.name}" integrity="${css.integrity}" crossorigin="anonymous">`);
const fonts=fs.readFileSync('/workspace/sites/shaah-test-preview/fonts.css','utf8');
assert.ok(/data:font\//.test(fonts)&&!/url\(https?:/i.test(fonts),'Use only the already validated self-contained font CSS');
const font=add('fonts','css',fonts);
html=html.replace(/<link\b[^>]*href="https:\/\/fonts\.googleapis\.com[^\"]*"[^>]*>/,`<link rel="stylesheet" href="./${font.name}" integrity="${font.integrity}" crossorigin="anonymous">`);
const csp="default-src 'self'; script-src 'self'; script-src-elem 'self'; script-src-attr 'none'; style-src 'self'; style-src-elem 'self'; style-src-attr 'none'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self' https://llpyxktcfubhmthqujpa.supabase.co wss://llpyxktcfubhmthqujpa.supabase.co; worker-src 'none'; manifest-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'";
html=html.replace(/<meta charset="UTF-8"\s*\/?>/i,m=>m+`\n<meta http-equiv="Content-Security-Policy" content="${csp}">\n<meta name="referrer" content="no-referrer">`);
assert.ok(html.includes(csp));
assert.equal(html.match(/<link rel="manifest"[^>]+>/)?.[0],baseline.match(/<link rel="manifest"[^>]+>/)?.[0],'Original web-app identity and install URL remain unchanged');
assert.doesNotMatch(html,/<style\b|\sstyle\s*=|\son[a-z]+\s*=/i);
assert.doesNotMatch(html,/unsafe-inline|unsafe-eval|unsafe-hashes|cdn\.jsdelivr\.net|fonts\.googleapis\.com|kpnwiwaiwnndpvtxkvva/);
assert.equal([...html.matchAll(/<script\b([^>]*)>/g)].filter(([,a])=>!/\bsrc\s*=/.test(a)).length,0);
for(const [name,bytes] of Object.entries(assets))fs.writeFileSync(path.join(root,name),bytes);
fs.writeFileSync(path.join(root,'index.html'),html);
const report={builtAt:new Date().toISOString(),baselineCommit:'9c02aabac42b0ab17f145a7d584a1954cb84bb5a',approvedTestApplicationCommit:'165cb0675558694fabea998fcd9dda7086a2b978',approvedTestSiteCommit:'7a763c936cded4c7e35eb82c70eb0829e9ac9543',approvedSourceSha256:hash(source),originalHtmlSha256:hash(html),originalAppPath:app.name,originalAppSha256:hash(application),originalStylesheet:css.name,fontStylesheet:font.name,assets:Object.fromEntries(Object.entries(assets).map(([name,b])=>[name,{sha256:hash(b),bytes:b.length}])),backendConfigurationUnchanged:true,manifestUnchanged:true,pinnedSdkUnchanged:true,scope:'Static original frontend only; no backend or Auth requests'};
const out=path.join(root,'test-results/security-promotion');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'build.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
