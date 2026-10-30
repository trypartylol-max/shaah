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
# Version optional skin assets atomically with the entrypoint, under the same CSP.
for name in ['aurora-skin.css','aurora-skin.js','work-skin-parity-20261027.css','ui-refinement-20261027.css','pro-mode.css']:
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
