"""Build production assets without changing auth, CSP or hosting identity."""
import base64, hashlib, pathlib, re
r=pathlib.Path(__file__).resolve().parent.parent
html=(r/'source/index.html').read_text()
for ext in ['js','css']:
    data=(r/f'source/app.{ext}').read_bytes()
    name=f'app.{hashlib.sha256(data).hexdigest()[:16]}.{ext}'
    (r/'assets'/name).write_bytes(data)
    sri='sha384-'+base64.b64encode(hashlib.sha384(data).digest()).decode()
    pattern=r'<(?:script|link)\b[^>]*(?:src|href)="\./assets/app\.[a-f0-9]{16}\.'+ext+r'"[^>]*>'
    def replace(m):
        tag=re.sub(r'app\.[a-f0-9]{16}\.'+ext,name,m.group())
        return re.sub(r'integrity="[^"]*"',f'integrity="{sri}"',tag)
    html,count=re.subn(pattern,replace,html)
    assert count==1,(ext,count)
# Optional local diagnostic module is versioned and integrity-checked independently.
data=(r/'source/performance.js').read_bytes()
name=f'performance.{hashlib.sha256(data).hexdigest()[:16]}.js'
(r/'assets'/name).write_bytes(data)
sri='sha384-'+base64.b64encode(hashlib.sha384(data).digest()).decode()
html,count=re.subn(r'<script data-shaah-performance src="\./assets/performance\.[a-f0-9]{16}\.js"[^>]*></script>',f'<script data-shaah-performance src="./assets/{name}" integrity="{sri}" crossorigin="anonymous"></script>',html)
assert count==1,('performance',count)
# Version optional skin assets atomically with the entrypoint, under the same CSP.
for name in ['aurora-skin.css','aurora-skin.js','work-skin-parity-20261027.css','ui-refinement-20261027.css','pro-mode.css','display-adaptation.css','display-adaptation.js','skin-identities.css','appearance-settings.css']:
    data=(r/'assets'/name).read_bytes()
    version=hashlib.sha256(data).hexdigest()[:16]
    sri='sha384-'+base64.b64encode(hashlib.sha384(data).digest()).decode()
    pattern=r'<(?:script|link)\b[^>]*(?:src|href)="\./assets/'+re.escape(name)+r'(?:\?v=[^"\s]+)?"[^>]*>'
    def skin_tag(m):
        tag=re.sub(re.escape(name)+r'(?:\?v=[^"\s]+)?',name+'?v='+version,m.group())
        tag=re.sub(r' integrity="[^"]*"| crossorigin="[^"]*"','',tag)
        return tag[:-1]+' integrity="'+sri+'" crossorigin="anonymous">'
    html,count=re.subn(pattern,skin_tag,html)
    assert count==1,(name,count)
(r/'index.html').write_text(html)
print('Built production assets with verified integrity hashes.')

# Build one coherent, scope-local offline release from the active entrypoint.
# Only referenced static files are cached; no API data, credentials or HTML from
# other pages. Include CSS dependencies (fonts) before installation can succeed.
import json
files={'./index.html'}
queue=re.findall(r'(?:src|href)="(\./assets/[^"\s]+)"',html)
while queue:
    url=queue.pop()
    if url in files: continue
    files.add(url)
    path=r/url.split('?')[0][2:]
    assert path.is_file(),url
    if path.suffix=='.css':
        for dep in re.findall(r'url\([\'\"]?([^\)\'\"]+)',path.read_text()):
            if dep.startswith(('data:','https:','http:')):continue
            target=(path.parent/dep.split('?')[0]).resolve()
            assert target.is_relative_to(r/'assets'),dep
            queue.append('./'+str(target.relative_to(r)))
release=hashlib.sha256((r/'source/sw-template.js').read_bytes()+html.encode()+b''.join((r/url.split('?')[0][2:]).read_bytes() for url in sorted(files) if url!='./index.html')).hexdigest()[:20]
template=(r/'source/sw-template.js').read_text()
integrity={url:'sha384-'+base64.b64encode(hashlib.sha384((r/url.split('?')[0][2:]).read_bytes()).digest()).decode() for url in files}
worker=template.replace('__RELEASE__',json.dumps(release)).replace('__STATIC_FILES__',json.dumps(sorted(files))).replace('__INTEGRITY__',json.dumps(integrity,sort_keys=True))
(r/'sw.js').write_text(worker)
print('Built complete static offline release:',release)
