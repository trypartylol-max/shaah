"""Instrument a copy, never ship profiling wrappers in the application."""
import pathlib,sys
source=pathlib.Path(sys.argv[1]).read_text()
instrument="window.__benchMetrics={};\n"
for name in ['render','renderToday','renderStats','renderHistory','renderDayChange','skinPaintTree','getHistory','calcScore']:
    instrument+="{const original="+name+";"+name+"=function(...args){const start=performance.now();try{return original(...args);}finally{const m=window.__benchMetrics['"+name+"']||(window.__benchMetrics['"+name+"']={calls:0,ms:0});m.calls++;m.ms+=performance.now()-start;}};}\n"
assert '\nboot();' in source
pathlib.Path(sys.argv[2]).write_text(source.replace('\nboot();','\n'+instrument+'\nboot();'))
