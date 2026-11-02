"""One-time lossless WOFF2 conversion of existing licensed fonts; no subsetting.
Requires fonttools[woff]==4.60.1 in the authoring environment, not in the app.
Original assets remain available for old cached entrypoints.
"""
import base64, hashlib, io, json, pathlib, re
from fontTools.ttLib import TTFont
root=pathlib.Path(__file__).resolve().parent.parent
original=root/'assets/fonts.f979be2919756976.css'
css=original.read_text()
report=[]
def convert(match):
    rule=match.group()
    family=re.search(r"font-family: '([^']+)'",rule)[1]
    weight=re.search(r'font-weight: (\d+)',rule)[1]
    raw=base64.b64decode(re.search(r'base64,([^)]*)',rule)[1])
    font=TTFont(io.BytesIO(raw),recalcTimestamp=False)
    cmap=font.getBestCmap();metrics=font['hmtx'].metrics.copy();glyphs=font.getGlyphOrder()
    font.flavor='woff2';out=io.BytesIO();font.save(out)
    encoded=out.getvalue();check=TTFont(io.BytesIO(encoded))
    assert check.getBestCmap()==cmap and check['hmtx'].metrics==metrics and check.getGlyphOrder()==glyphs
    name=family.lower().replace(' ','-')+'-'+weight+'.'+hashlib.sha256(encoded).hexdigest()[:16]+'.woff2'
    (root/'assets'/name).write_bytes(encoded)
    report.append(dict(family=family,weight=weight,ttf_bytes=len(raw),woff2_bytes=len(encoded),glyphs=len(glyphs),cmap_and_metrics_unchanged=True,file=name))
    return re.sub(r"url\([^)]*\) format\('truetype'\)","url('./"+name+"') format('woff2')",rule)
css=re.sub(r'@font-face\s*\{[^}]+\}',convert,css)
assert len(report)==6
data=css.encode();name='fonts.'+hashlib.sha256(data).hexdigest()[:16]+'.css'
(root/'assets'/name).write_bytes(data)
sri='sha384-'+base64.b64encode(hashlib.sha384(data).digest()).decode()
entry=root/'source/index.html';html=entry.read_text()
html,count=re.subn(r'<link rel="stylesheet" href="\./assets/fonts\.[a-f0-9]{16}\.css"[^>]*>',f'<link rel="stylesheet" href="./assets/{name}" integrity="{sri}" crossorigin="anonymous">',html)
assert count==1;entry.write_text(html)
(root/'docs/performance/fonts.json').write_text(json.dumps(report,indent=2)+'\n')
print('Converted all six faces; character coverage and advance widths preserved.')
