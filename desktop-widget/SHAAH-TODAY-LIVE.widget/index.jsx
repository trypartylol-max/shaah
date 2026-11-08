export const command = `cat "$HOME/.cache/shaah-today-live.json" 2>/dev/null || printf '%s' '{"status":"Agente sin iniciar","message":"Instala el agente y conecta Google."}'`;
export const refreshFrequency = 5000;
export const className = `
 top: 0; left: 0; width: 0; height: 0; color:#f4f2fa;
 font-family: -apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;
 .panel{position:fixed;width:390px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:20px;border:1px solid #323047;border-radius:22px;background:rgba(10,10,23,.94);box-shadow:0 18px 50px #0008;backdrop-filter:blur(16px)}
 .move{cursor:move;touch-action:none;background:transparent;border:1px solid #45415d;border-radius:6px;color:#ddd;padding:4px 7px;margin-left:8px} .move:focus-visible{outline:2px solid #ae90fd}
 .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:17px}
 .brand{font-size:12px;font-weight:850;letter-spacing:.24em}
 .state{font-size:10px;color:#a8a1bc;border:1px solid #45415d;padding:4px 7px;border-radius:8px}
 .hero{display:flex;gap:16px;align-items:center}
 .ring{width:124px;height:124px;flex-shrink:0;position:relative}
 .ring svg{height:124px;width:124px;transform:rotate(-90deg)}
 .ring circle{fill:none;stroke-width:9}.ring .track{stroke:#29283d}.ring .value{stroke:#ae90fd;stroke-linecap:round}
 .ring .number{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;font-size:28px;font-weight:800}
 .ring .number small{font-size:15px;color:#bba9eb}
 .info{flex:1;min-width:0}.date{font-size:11px;color:#9d9aaf;margin-bottom:7px}
 .lev{margin:8px 0}.levline{display:flex;justify-content:space-between;font-size:11px;color:#c4c1d4;margin-bottom:5px}
 .bar{height:5px;border-radius:9px;background:#27263a;overflow:hidden}.fill{height:5px;border-radius:9px;background:#a68cf6}
 .next{margin-top:17px;background:#191626;border:1px solid #302941;border-radius:13px;padding:13px}
 .nexttop{color:#b9a0f4;font-size:10px;font-weight:800;letter-spacing:.14em;margin-bottom:8px}
 .nextbody{color:#dfdbe9;font-size:12px;line-height:1.45}
 .meta{margin-top:13px;display:flex;justify-content:space-between;font-size:11px;color:#a7a2bb}
 .footer{border-top:1px solid #29273a;margin-top:15px;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:#88879e}
 .warn{margin-top:12px;color:#f0b5b5;font-size:11px;line-height:1.5}
 .hint{margin-top:9px;color:#8e8da4;font-size:10px;line-height:1.45}
`;
const safe = v => String(v == null ? '' : v);
const formatNum = n => Number.isFinite(Number(n)) ? String(Math.round(Number(n))) : '—';

const POSITION_KEY='shaah-today-live-position-v1';
const clampPosition=(x,y)=>({x:Math.max(8,Math.min(Number.isFinite(x)?x:innerWidth-424,Math.max(8,innerWidth-398))),y:Math.max(8,Math.min(Number.isFinite(y)?y:44,Math.max(8,innerHeight-100)))});
const readPosition=()=>{try{const p=JSON.parse(localStorage.getItem(POSITION_KEY)||'{}');return clampPosition(p.x,p.y)}catch(_){return clampPosition()}};
const savePosition=(panel,x,y)=>{const p=clampPosition(x,y);panel.style.left=p.x+'px';panel.style.top=p.y+'px';try{localStorage.setItem(POSITION_KEY,JSON.stringify(p))}catch(_){}return p};
const moveWidget=e=>{
 if(e.button!==0)return;
 e.preventDefault();const handle=e.currentTarget,panel=handle.closest('.panel'),rect=panel.getBoundingClientRect(),dx=e.clientX-rect.left,dy=e.clientY-rect.top;
 handle.setPointerCapture(e.pointerId);
 const move=event=>savePosition(panel,event.clientX-dx,event.clientY-dy);
 const stop=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);handle.removeEventListener('pointercancel',stop);handle.removeEventListener('lostpointercapture',stop)};
 handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
};
const moveWithKeys=e=>{const keys={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!keys[e.key])return;e.preventDefault();const p=e.currentTarget.closest('.panel'),r=p.getBoundingClientRect(),step=e.shiftKey?1:10;savePosition(p,r.left+keys[e.key][0]*step,r.top+keys[e.key][1]*step)};

export const render = ({output,error}) => {
 let d={};try{d=JSON.parse(output||'{}')}catch(e){d={error:'Datos locales ilegibles'}}
 const stamp=Date.parse(d.agentAt||'');
 if(d.agentAt && (!Number.isFinite(stamp)||Date.now()-stamp>180000)){d.status='Desactualizado';d.message='El agente no se ha actualizado en más de 3 minutos.';}
 const valid=d.percent!=null&&Number.isFinite(Number(d.percent));
 const pct=valid?Math.max(0,Math.min(100,Number(d.percent))):0;
 const circumference=2*Math.PI*49;
 const levels=Array.isArray(d.levels)?d.levels:[null,null,null];
 const position=readPosition();
 return <div className="panel" style={{left:position.x,top:position.y}}>
  <div className="head"><span className="brand">SHAAH / TODAY</span><button className="move" title="Arrastra para mover. Flechas: 10 px; Mayús + flechas: 1 px." aria-label="Mover widget" onPointerDown={moveWidget} onKeyDown={moveWithKeys}>↔</button><span className="state">REAL · {safe(d.status||'Sin conexión')}</span></div>
  <div className="hero">
   <div className="ring"><svg viewBox="0 0 124 124"><circle className="track" cx="62" cy="62" r="49"/><circle className="value" cx="62" cy="62" r="49" strokeDasharray={circumference} strokeDashoffset={circumference*(1-pct/100)}/></svg><div className="number">{valid?formatNum(d.score)+' pts':'—'}<small>{safe(d.grade||'PENDIENTE')}</small></div></div>
   <div className="info"><div className="date">{safe(d.date||'HOY')}</div>
    {['LEVEL 1','LEVEL 2','LEVEL 3'].map((label,i)=><div className="lev" key={label}><div className="levline"><span>{label}</span><span>{levels[i]==null||levels[i].percent==null?'—':formatNum(levels[i].score)+' / '+formatNum(levels[i].max)}</span></div><div className="bar"><div className="fill" style={{width:levels[i]&&levels[i].percent!=null?Math.max(0,Math.min(100,levels[i].percent))+'%':'0%'}}/></div></div>)}
   </div>
  </div>
  <div className="next"><div className="nexttop">NEXT MOVE</div><div className="nextbody">{d.nextMove&&d.nextMove.label?(d.nextMove.label+' · '+(d.nextMove.pts||0)+' pts'+(d.nextMove.target?' → '+d.nextMove.target:'')):(d.nextMove&&d.nextMove.message||'Sin siguiente acción calculable.')}</div></div>
  <div className="meta"><span>{d.completed==null?'—':d.completed} checks completos</span><span>{d.recordedChecks==null?'—':d.recordedChecks} registrados</span></div>
  {Array.isArray(d.completedItems)&&d.completedItems.length>0&&<div className="hint">{'✓ '+d.completedItems.join(' · ')}</div>}
  {(d.error||error)&&<div className="warn">{safe(d.error||error)}</div>}
  <div className="hint">{safe(d.message||'Vista de solo lectura. Sin datos inventados.')}</div>
  <div className="footer"><span>SHAAH REAL · SOLO LECTURA</span><span>{d.ageSeconds!=null?'Hace '+safe(d.ageSeconds)+' s':(d.lastSync?'Sync '+safe(d.lastSync):'Sin sincronizar')}</span></div>
 </div>
};
