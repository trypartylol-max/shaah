"""Read-only verification of the public baseline and its referenced static files."""
import concurrent.futures,gzip,hashlib,json,pathlib,re,urllib.request,urllib.parse
root=pathlib.Path(__file__).resolve().parent.parent
origin='https://trypartylol-max.github.io/shaah/'
baseline=(root/'docs/performance/baseline-index.html').read_bytes()
paths=['']+re.findall(r'(?:src|href)="\./([^"\s]+)',baseline.decode())
def inspect(resource):
    url=urllib.parse.urljoin(origin,resource)
    request=urllib.request.Request(url,headers={'Accept-Encoding':'gzip','User-Agent':'SHAAH-readonly-performance-audit'})
    with urllib.request.urlopen(request,timeout=20) as response:
        body=response.read();headers={k.lower():v for k,v in response.headers.items()}
    raw=gzip.decompress(body) if headers.get('content-encoding')=='gzip' else body
    local=(root/urllib.parse.urlsplit(resource).path).read_bytes() if resource else baseline
    return dict(url=url,sha256=hashlib.sha256(raw).hexdigest(),matches_baseline=raw==local,encoded_bytes=len(body),decoded_bytes=len(raw),
        headers={k:headers[k] for k in ['cache-control','content-encoding','etag','vary','server','x-served-by','x-cache','age'] if k in headers})
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(inspect,paths))
report={'base_commit':'5337019be1748b05e26d93bf757a6abbb29e4547','origin':origin,'all_match':all(r['matches_baseline'] for r in results),'files':results}
(root/'docs/performance/public-baseline.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'files':len(results),'all_match':report['all_match']}))
assert report['all_match']
