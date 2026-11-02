"""Prepare disposable baseline files from the exact production commit audited."""
import pathlib,subprocess
root=pathlib.Path(__file__).resolve().parent.parent
base='5337019be1748b05e26d93bf757a6abbb29e4547'
out=root/'docs/performance';out.mkdir(parents=True,exist_ok=True)
for source,target in [('source/app.js','baseline-app.js'),('index.html','baseline-index.html')]:
    data=subprocess.check_output(['git','show',base+':'+source],cwd=root)
    (out/target).write_bytes(data)
print('Prepared baseline from '+base)
