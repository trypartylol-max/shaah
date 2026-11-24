/* Cocina — front-end. Los datos viven en la hoja de Google; llegan por la API de Apps Script (api.js). */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS='cocina_cache_v1';
const UI=(()=>{try{return JSON.parse(localStorage.getItem('cocina_ui_v1'))||{}}catch(e){return {}}})();UI.open=UI.open||{};UI.min=UI.min||{cRec:1,cDesp:1};UI.shut=UI.shut||{};
const CARDS=['cUrg','cMenu','cRec','cFlash','cComp','cTg','cDesp'];
const syncAll=()=>{const b=document.getElementById('allTog');if(b)b.textContent=CARDS.every(id=>UI.min[id])?'Expandir todo':'Colapsar todo'};
const saveUI=()=>{try{localStorage.setItem('cocina_ui_v1',JSON.stringify(UI))}catch(e){}};
const ORD=['Congelador','Nevera','Despensa','Encimera'];
const invKey=i=>UI.inv==='tipo'?(i.cat||'Otro'):(i.ubi||'Otro');
const invSort=(a,b)=>UI.inv==='tipo'?a.localeCompare(b,'es'):((ORD.indexOf(a)+99)%99)-((ORD.indexOf(b)+99)%99);
const invMeta=i=>(UI.inv==='tipo'?esc(i.ubi)+' · ':'');
const ICO={'Congelador':'❄️','Nevera':'🧊','Despensa':'🗄️','Encimera':'🧺','Carnes y pescados':'🥩','Lácteos y huevos':'🧀','Verduras':'🥬','Hierbas frescas':'🌿','Frutas':'🍎','Panes':'🍞','Granos y pastas':'🍚','Legumbres':'🫘','Conservas':'🥫','Salsas y especias':'🧂','Semillas y frutos secos':'🥜','Congelados listos':'🍕','Cocinado':'🍲','Bebidas':'🥤','Dulces y snacks':'🍫','Hogar':'🧻','Otro':'📦','Desayuno':'🌅','Almuerzo':'🍽️','Cena':'🌙','Snack':'🍿','Acompañante':'🥗','Otras':'📖','En casa':'🏠','En la lista de compras':'🛒','Recetas':'👨‍🍳'};
const gi=k=>'<span class="gi">'+(ICO[k]||'•')+'</span>';
const grpH=(k,n)=>'<div class="grp">'+gi(k)+esc(k)+(n!=null?' <span class="gc">· '+n+'</span>':'')+'</div>';
const grpO=(key,title,count,inner)=>'<details class="g" data-gs="'+esc(key)+'"'+(UI.shut[key]?'':' open')+'><summary>'+gi(title)+esc(title)+'<span class="cnt">'+(count!=null?count:'')+'</span></summary>'+inner+'</details>';
const grpBox=(key,title,count,tags,inner)=>'<details class="g" data-g="'+esc(key)+'"'+(UI.open[key]?' open':'')+'><summary>'+gi(title)+esc(title)+(tags||'')+'<span class="cnt">'+count+'</span></summary>'+inner+'</details>';
let D=null, pending=0, Q=Promise.resolve();
const fmt=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const plus=(ymd,n)=>{const d=new Date(ymd+'T00:00:00');d.setDate(d.getDate()+Number(n));return fmt(d)};
const diff=(a,b)=>Math.round((new Date(a+'T00:00:00')-new Date(b+'T00:00:00'))/864e5);
const newId=p=>p+'-'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();
function toast(t,u){const e=$('toast');e.innerHTML=esc(t)+(u?'<button class="ub" id="undoB" type="button">Deshacer</button>':'');e.classList.add('on');e.classList.toggle('act',!!u);clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on','act'),u?5000:1600)}
function busy(txt){$('dot').classList.toggle('off',pending>0||!!txt);$('status').textContent=txt||(pending?'guardando…':'al día')}
function derive(){
  const t=fmt(new Date()); D.hoy=t;
  D.inv.forEach(i=>{if(i.v0===undefined)i.v0=i.vence||'';i.vence=(i.usar&&(!i.v0||i.usar<i.v0))?i.usar:i.v0;i.dias=i.vence?diff(i.vence,t):null});
  const have=new Set(D.inv.map(i=>i.n)), urg=new Set(D.inv.filter(i=>i.dias!=null&&i.dias<=2).map(i=>i.n));
  D.rec.forEach(r=>{r.tengo=r.ing.filter(x=>have.has(x));r.faltan=r.ing.filter(x=>!have.has(x));r.rescata=r.ing.filter(x=>urg.has(x));r.score=r.rescata.length*10+r.tengo.length-r.faltan.length*3});
  D.rec.sort((a,b)=>b.score-a.score);
}
function save(){try{localStorage.setItem(LS,JSON.stringify(D))}catch(e){}}
let LASTMSG='', UNDO=null;
function apply(msg){derive();save();render();sheetRender();searchRender();menuRender();tgRender();if(msg){LASTMSG=msg;toast(msg)}}
// Deshacer: el guardado espera 5 s; si tocas Deshacer, se cancela y vuelve todo como estaba.
function commit(){if(!UNDO)return;clearTimeout(UNDO.t);const u=UNDO;UNDO=null;pending--;srv(u.fn,...u.args)}
function later(snap,fn,...args){commit();pending++;busy();UNDO={snap,fn,args,t:setTimeout(commit,5000)};toast(LASTMSG,true)}
function undo(){if(!UNDO)return;clearTimeout(UNDO.t);D=JSON.parse(UNDO.snap);UNDO=null;pending--;busy();closeSheet();apply('Deshecho');save()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')commit()});
window.addEventListener('pagehide',commit);
function srv(fn,...args){
  pending++;busy();
  Q=Q.then(()=>new Promise(res=>GS()
    .withSuccessHandler(()=>{pending--;busy();res()})
    .withFailureHandler(e=>{pending--;busy();toast('No se guardó: '+e.message);res();load()})[fn](...args)));
}
function load(){
  if(!D)busy('cargando…');
  GS().withSuccessHandler(d=>{if(pending)return;D=d;apply();busy()}).withFailureHandler(e=>{busy('sin conexión');toast(e.message)}).getData();
}
function badge(i){
  if(i.dias==null) return '<div class="badge">—</div>';
  const cls=i.dias<=0?'red':i.dias<=2?'amb':'ok';
  const t=i.dias<0?'venc.':i.dias===0?'hoy':i.dias===1?'1 día':i.dias+' días';
  return '<div class="badge '+cls+'">'+t+'</div>';
}
function fdate(s){if(!s)return'';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short'})}
function render(){
  const inv=D.inv, urg=inv.filter(i=>i.dias!=null&&i.dias<=2).sort((a,b)=>a.dias-b.dias), poco=inv.filter(i=>i.cant==='Poco');
  const recOk=D.rec.filter(r=>r.tengo.length>0);
  $('kUrg').textContent=urg.length; $('kUrgS').textContent=urg.slice(0,3).map(i=>i.n).join(', ')||'Nada urgente';
  $('kRec').textContent=recOk.length; $('kRecS').textContent=recOk[0]?'Top: '+recOk[0].n:'—';
  $('kPoco').textContent=poco.length; $('kPocoS').textContent=poco.slice(0,3).map(i=>i.n).join(', ')||'—';
  $('kCasa').textContent=inv.length; $('kCasaS').textContent=D.compras.length+' en la lista de compras';
  $('hoyFecha').textContent=fdate(D.hoy);
  CARDS.forEach(id=>$(id).classList.toggle('min',!!UI.min[id]));syncAll();
  $('catList').innerHTML=D.cat.map(c=>'<option value="'+esc(c.n)+'">').join('');
  $('urg').innerHTML=urg.length?urg.map(i=>'<div class="item">'+badge(i)+'<div class="it"><div class="n">'+esc(i.n)+(i.tipo==='Sobra'?'<span class="pill sobra">sobra</span>':'')+'</div><div class="m">'+esc(i.ubi)+' · vence '+fdate(i.vence)+(i.nota?' · '+esc(i.nota):'')+'</div></div><div class="acts">'+(i.usar?'<button class="a on" data-usar="'+esc(i.id)+'" title="Quitar de usar primero">⚡</button>':'')+'<button class="a in" data-s="Consumido" data-id="'+esc(i.id)+'" title="Consumido">✓</button><button class="a out" data-s="Desperdiciado" data-id="'+esc(i.id)+'" title="Se perdió">✕</button></div></div>').join(''):'<div class="empty">Nada por vencer en los próximos 2 días.</div>';
  {const recHTML=(r,k)=>'<div class="rec" data-k="'+k+'"><div class="t"><b>'+esc(r.n)+'</b><span>'+esc(r.tipo||'')+(r.min?' · '+esc(r.min)+' min':'')+'</span></div><div class="chips">'+r.rescata.map(x=>'<span class="chip r">⚡ '+esc(x)+'</span>').join('')+r.tengo.filter(x=>!r.rescata.includes(x)).map(x=>'<span class="chip h">'+esc(x)+'</span>').join('')+r.faltan.map(x=>'<span class="chip f">falta '+esc(x)+'</span>').join('')+'</div><div class="more">'+esc(r.pasos||'')+(r.link?' <a href="'+esc(r.link)+'" target="_blank" style="color:var(--in)">ver ↗</a>':'')+(r.faltan.length?'<div><button class="a" data-falt="'+esc(r.id)+'">Agregar lo que falta a compras</button></div>':'')+'<div><button class="a in" data-cook="'+esc(r.id)+'">Cociné esto</button></div>'+'<div><button class="a out" data-delrec="'+esc(r.id)+'">Quitar receta</button></div>'+'</div></div>';const RO=['Desayuno','Almuerzo','Cena','Snack','Acompañante'],G={};D.rec.forEach(r=>{const k=String(r.tipo||'Otras').split('/')[0].trim()||'Otras';(G[k]=G[k]||[]).push(r)});$('recs').innerHTML=Object.keys(G).sort((a,b)=>(RO.indexOf(a)+99)%99-(RO.indexOf(b)+99)%99).map(k=>{const l=G[k],resc=l.filter(r=>r.rescata.length).length,ok=l.filter(r=>!r.faltan.length).length;return grpBox('rec:'+k,k,l.length,(resc?' <span class="tag y">⚡ '+resc+'</span>':'')+(ok?' <span class="tag h">'+ok+' completas</span>':''),l.map(recHTML).join(''))}).join('')||'<div class="empty">Sin recetas.</div>'}
  {const fl=D.compras.filter(c=>c.flash),rest=D.compras.filter(c=>!c.flash);
  $('fN').textContent=fl.length?fl.length+' para ya':'';
  $('flash').innerHTML=fl.length?fl.map(c=>'<div class="item"><button class="chk" data-comp="'+esc(c.id)+'" title="Comprado"></button><div class="it"><div class="n">'+esc(c.n)+'</div><div class="m">'+esc(c.origen||'')+'</div></div><div class="acts"><button class="a fz on" data-flash="'+esc(c.id)+'" data-on="0" title="Quitar de flash">⚡</button></div></div>').join(''):'<div class="empty">Toca ⚡ en una compra para traerla aquí.</div>';
  $('cN').textContent=rest.length?rest.length+' pendientes':'';
  const cg={};rest.forEach(c=>{const k=(catOf(c.n)||classify(c.n)).cat;(cg[k]=cg[k]||[]).push(c)});
  $('compras').innerHTML=rest.length?Object.keys(cg).sort((a,b)=>a.localeCompare(b,'es')).map(k=>grpO('comp:'+k,k,cg[k].length,cg[k].map(c=>'<div class="item"><button class="chk" data-comp="'+esc(c.id)+'" title="Comprado"></button><div class="it"><div class="n">'+esc(c.n)+'</div><div class="m">'+esc(c.origen||'')+(c.nota?' · '+esc(c.nota):'')+'</div></div><div class="acts"><button class="a fz" data-flash="'+esc(c.id)+'" data-on="1" title="A compras flash">⚡</button></div></div>').join(''))).join(''):'<div class="empty">Lista vacía.</div>';
  const have=new Set(D.inv.map(i=>i.n)),inList=new Set(D.compras.map(c=>c.n)),H=D.hist||{};
  const sg=Object.keys(H).filter(n=>!have.has(n)&&!inList.has(n)).sort((a,b)=>H[b]-H[a]).slice(0,8);
  $('sug').innerHTML=sg.length?'<div class="l">Sueles comprar y ya no tienes:</div><div class="chips">'+sg.map(n=>'<button class="chip" data-sug="'+esc(n)+'">+ '+esc(n)+'</button>').join('')+'</div>':'';}
  const g={};
  inv.forEach(i=>{const k=invKey(i);(g[k]=g[k]||[]).push(i)});
  document.querySelectorAll('#invMode button').forEach(b=>b.classList.toggle('on',b.dataset.mode===(UI.inv||'lugar')));
  $('dN').textContent=inv.length+' cosas';
  $('desp').innerHTML=Object.keys(g).sort(invSort).map(u=>grpBox('desp:'+(UI.inv||'lugar')+':'+u,u,g[u].length,(g[u].some(i=>i.dias!=null&&i.dias<=2)?' <span class="tag r">'+g[u].filter(i=>i.dias!=null&&i.dias<=2).length+' urgentes</span>':'')+(g[u].some(i=>i.cant==='Poco')?' <span class="tag y">'+g[u].filter(i=>i.cant==='Poco').length+' poco</span>':''),g[u].sort((a,b)=>a.n.localeCompare(b.n)).map(i=>'<div class="item"><div class="it"><div class="n">'+esc(i.n)+(i.tipo==='Sobra'?'<span class="pill sobra">sobra</span>':'')+(i.cant==='Poco'?'<span class="pill poco">poco</span>':i.cant==='Medio'?'<span class="pill medio">medio</span>':'')+'</div><div class="m">'+invMeta(i)+(i.vence?'vence '+fdate(i.vence):'sin caducidad')+(i.nota?' · '+esc(i.nota):'')+'</div></div><div class="acts"><button class="a" data-cant="'+esc(i.id)+'" data-v="'+({Lleno:'Medio',Medio:'Poco',Poco:'Lleno'}[i.cant]||'Poco')+'" title="Cambiar cantidad">'+(i.cant||'lleno').toLowerCase()+'</button><button class="a'+(i.usar?' on':'')+'" data-usar="'+esc(i.id)+'" title="Usar primero">⚡</button><button class="a" data-acabo="'+esc(i.id)+'" title="Se acabó: sale y va a compras">se acabó</button><button class="a in" data-s="Consumido" data-id="'+esc(i.id)+'" title="Consumido">✓</button></div></div>').join(''))).join('');
}
let KPI=null, COOK=null;
function invRow(i,acts){return '<div class="item">'+badge(i)+'<div class="it"><div class="n">'+esc(i.n)+(i.tipo==='Sobra'?'<span class="pill sobra">sobra</span>':'')+(i.cant==='Poco'?'<span class="pill poco">poco</span>':i.cant==='Medio'?'<span class="pill medio">medio</span>':'')+'</div><div class="m">'+esc(i.ubi)+' · '+(i.vence?'vence '+fdate(i.vence):'sin caducidad')+(i.nota?' · '+esc(i.nota):'')+'</div></div><div class="acts">'+acts(i)+'</div></div>'}
const A={ok:i=>'<button class="a in" data-s="Consumido" data-id="'+esc(i.id)+'" title="Consumido">✓</button>',bad:i=>'<button class="a out" data-s="Desperdiciado" data-id="'+esc(i.id)+'" title="Se perdió">✕</button>',acabo:i=>'<button class="a" data-acabo="'+esc(i.id)+'">se acabó</button>',cant:i=>'<button class="a" data-cant="'+esc(i.id)+'" data-v="'+({Lleno:'Medio',Medio:'Poco',Poco:'Lleno'}[i.cant]||'Poco')+'" title="Cambiar cantidad">'+(i.cant||'lleno').toLowerCase()+'</button>',usar:i=>'<button class="a'+(i.usar?' on':'')+'" data-usar="'+esc(i.id)+'" title="Usar primero">⚡</button>'};
function recRow(r){return '<div class="rec open"><div class="t"><b>'+esc(r.n)+'</b><span>'+esc(r.tipo||'')+(r.min?' · '+esc(r.min)+' min':'')+'</span></div><div class="chips">'+r.rescata.map(x=>'<span class="chip r">⚡ '+esc(x)+'</span>').join('')+r.tengo.filter(x=>!r.rescata.includes(x)).map(x=>'<span class="chip h">'+esc(x)+'</span>').join('')+r.faltan.map(x=>'<span class="chip f">falta '+esc(x)+'</span>').join('')+'</div><div class="more">'+esc(r.pasos||'')+(r.faltan.length?'<div><button class="a" data-falt="'+esc(r.id)+'">Agregar lo que falta a compras</button></div>':'')+'<div><button class="a in" data-cook="'+esc(r.id)+'">Cociné esto</button></div>'+'<div><button class="a out" data-delrec="'+esc(r.id)+'">Quitar receta</button></div>'+'</div></div>'}
function sheetRender(){
  if(!KPI||!D)return; const inv=D.inv;
  const grouped=(list,acts)=>{const g={};list.forEach(i=>{const k=invKey(i);(g[k]=g[k]||[]).push(i)});return Object.keys(g).sort(invSort).map(u=>grpO('sh:'+u,u,g[u].length,g[u].sort((a,b)=>a.n.localeCompare(b.n)).map(i=>invRow(i,acts)).join(''))).join('')};
  let t,c,b;
  if(KPI==='recibo'){if($('shB').dataset.cook==='recibo')return;$('shT').innerHTML='<i style="--c:var(--in)"></i>Recibo · '+RCPT.length+' productos';$('shB').innerHTML='<div style="color:var(--faint);font-size:13px;margin-bottom:8px">Revisa los nombres, desmarca lo que no es comida y toca agregar. Lo que esté en tu lista de compras se marca como comprado.</div>'+RCPT.map((n,k)=>'<div class="rr"><input type="checkbox" data-rk="'+k+'" checked><input type="text" data-rn="'+k+'" value="'+esc(n)+'"><small>'+esc((catOf(n)||classify(n)).cat)+'</small></div>').join('')+'<button class="go2" data-rcok="1">Agregar a la casa</button>';$('shB').dataset.cook='recibo';return}
  if(KPI==='cook'){const r=D.rec.find(x=>x.id===COOK)||{n:'',ing:[]};if($('shB').dataset.cook===COOK)return;const items=D.inv.filter(i=>r.ing.includes(i.n));t='Cociné: '+r.n;c='var(--in)';b=(items.length?'<div class="m" style="color:var(--faint);font-size:13px;margin-bottom:6px">Marca lo que usaste (sale de la casa):</div>'+items.map(i=>'<label class="ck"><input type="checkbox" data-ckid="'+esc(i.id)+'"'+((i.tipo==='Perecedero'||i.tipo==='Sobra')&&i.ubi!=='Congelador'?' checked':'')+'><span>'+esc(i.n)+'</span><small>'+esc(i.ubi)+'</small></label>').join(''):'<div class="empty">No hay ingredientes de esta receta en casa.</div>')+'<div class="cookf"><select id="ckS"><option value="">No sobró</option><option value="2" selected>Sobró · 2 días</option><option value="1">Sobró · 1 día</option></select><input id="ckN" value="'+esc(r.n)+'" placeholder="Nombre de la sobra"></div><button class="go2" data-cookok="'+esc(r.id)+'">Listo</button>';$('shT').innerHTML='<i style="--c:'+c+'"></i>'+esc(t);$('shB').innerHTML=b;$('shB').dataset.cook=COOK;return}
  delete $('shB').dataset.cook;
  if(KPI==='urg'){const l=inv.filter(i=>i.dias!=null&&i.dias<=2).sort((a,b)=>a.dias-b.dias);t='Por vencer';c='var(--out)';b=l.map(i=>invRow(i,i=>(i.usar?A.usar(i):'')+A.ok(i)+A.bad(i))).join('')||'<div class="empty">Nada por vencer en los próximos 2 días.</div>'}
  if(KPI==='rec'){const l=D.rec.filter(r=>r.tengo.length>0);t='Para cocinar hoy';c='var(--in)';b=l.map(recRow).join('')||'<div class="empty">Ninguna receta con lo que hay.</div>'}
  if(KPI==='poco'){const l=inv.filter(i=>i.cant==='Poco');t='Queda poco';c='var(--gold)';b=l.length?grouped(l,i=>A.cant(i)+A.usar(i)+A.acabo(i)):'<div class="empty">Nada en poco.</div>'}
  if(KPI==='casa'){t='En casa · '+inv.length;c='var(--dim)';b=grouped(inv,i=>A.cant(i)+A.usar(i)+A.acabo(i)+A.ok(i))}
  $('shT').innerHTML='<i style="--c:'+c+'"></i>'+esc(t); $('shB').innerHTML=b;
}
function openSheet(k){KPI=k;sheetRender();$('sheet').classList.add('on');document.body.style.overflow='hidden'}
function closeSheet(){KPI=null;COOK=null;delete $('shB').dataset.cook;$('sheet').classList.remove('on');document.body.style.overflow=''}
document.querySelectorAll('[data-kpi]').forEach(e=>e.addEventListener('click',()=>openSheet(e.dataset.kpi)));
$('shX').onclick=closeSheet;
$('sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});

// Reglas iguales a las del servidor. [regex, categoria, tipo, dias, lugar]  — el primero que coincide gana. Pensado para una cocina en Israel.
const CLS_RULES = [
  ['papel|aluminio|bolsa|jab[oó]n|detergente|servillet|esponja|film|toalla|נייר|אלומיניום|שקיות|סבון', 'Hogar', 'Despensa', '', 'Despensa'],
  ['helado|גלידה', 'Dulces y snacks', 'Congelado', '', 'Congelador'],
  ['en lata|enlatad|conserva|crema de coco|leche de coco|שימורים|קופסת', 'Conservas', 'Despensa', '', 'Despensa'],
  ['tahini|tehina|טחינה', 'Salsas y especias', 'Despensa', '', 'Despensa'],
  ['hummus|humus|חומוס מוכן|מטבוחה|matbuja|baba|chatzil|guacamole', 'Salsas y especias', 'Perecedero', 5, 'Nevera'],
  ['salsa|ketchup|mayonesa|mostaza|soya|soja|vinagre|aceite|\\bsal\\b|pimienta|comino|p[aá]prika|zaatar|za.atar|sumac|especia|caldo|miel|sil[aá]n|\\bamba\\b|schug|zhug|s.hug|harissa|ajo triturado|רוטב|קטשופ|מיונז|חרדל|סויה|חומץ|שמן|מלח|כמון|פפריקה|זעתר|סומק|דבש|סילאן|עמבה|סחוג', 'Salsas y especias', 'Despensa', '', 'Despensa'],
  ['ch[ií]a|nuez|nueces|almendra|anacardo|caj[uú]|pistach|semilla|s[eé]samo|linaza|man[ií]\\b|cacahuate|girasol|pecan|פיצוח|שקדים|אגוז|צ.יה|פשתן|שומשום|בוטנים|גרעינים', 'Semillas y frutos secos', 'Despensa', '', 'Despensa'],
  ['chocolate|galleta|dulce|caramelo|chips|snack|\\bbamba\\b|bisli|halv|במבה|ביסלי|שוקולד|עוגיות|חלבה|ופל', 'Dulces y snacks', 'Despensa', '', 'Despensa'],
  ['\\bagua\\b|jugo|zumo|soda|cerveza|vino|caf[eé]|\\bt[eé]\\b|kombucha|refresco|\\bcola\\b|coca|מים|מיץ|בירה|יין|קפה|\\bתה\\b|סודה', 'Bebidas', 'Despensa', '', 'Despensa'],
  ['sobra|cocinad|cocido|guiso|\\bsopa\\b', 'Cocinado', 'Sobra', 2, 'Nevera'],
  ['pizza|nuggets|schnitzel congel|papas prefrit|bolitas|burekas|bureka|schnitzel|shnitzel|malawach|jachnun|ziva|בורקס|מלאווח|ג.חנון|שניצל', 'Congelados listos', 'Congelado', '', 'Congelador'],
  ['pollo|\\bres\\b|carne|molida|steak|bife|salm[oó]n|at[uú]n|pescado|brisket|tu[eé]tano|kebab|shawarma|hamburguesa|pavo|cordero|merguez|ternera|camar[oó]n|עוף|בשר|דג|סלמון|טונה|הודו|כבש|שווארמה|קבב|המבורגר', 'Carnes y pescados', 'Perecedero', 2, 'Nevera'],
  ['queso|manchego|amsterdam|parmesan|mozzarella|gouda|brie|feta|ricotta|halloumi|emmental|leche|yog|labneh|leben|lebe|cottage|crema|mantequilla|ghee|huevo|gvina|tzfat|bulgar|גבינה|חלב|יוגורט|לבנה|לבן|קוטג|שמנת|חמאה|ביצ|מעדן|אשל|גיל', 'Lácteos y huevos', 'Perecedero', 7, 'Nevera'],
  ['cilantro|perejil|\\bnana\\b|menta|eneldo|albahaca|ceboll[ií]n|romero|tomillo|כוסברה|פטרוזיליה|נענע|שמיר|בזיליקום|בצל ירוק|רוזמרין|טימין', 'Hierbas frescas', 'Perecedero', 5, 'Nevera'],
  ['\\bpapas?\\b|cebolla|\\bajo\\b|batata|camote|calabaza|תפוח אדמה|תפו.א|בצל|שום|בטטה|דלעת', 'Verduras', 'Despensa', '', 'Despensa'],
  ['\\bpan\\b|pita|lafa|laffa|jal[aá]|challah|bagel|tortilla|wrap|baguette|croissant|לחם|פית|לאפה|חלה|בייגל|באגט|קרואסון', 'Panes', 'Perecedero', 3, 'Despensa'],
  ['pepino|zucchini|calabac|chile|topinambur|artichoke|מלפפון|קישוא|ארטישוק ירושלמי', 'Verduras', 'Perecedero', 6, 'Despensa'],
  ['manzana|תפוח(?! אדמה)', 'Frutas', 'Perecedero', 6, 'Despensa'],
  ['banana|pl[aá]tano|aguacate|palta|בננה|אבוקדו', 'Frutas', 'Perecedero', 5, 'Despensa'],
  ['manzana|naranja|mandarina|lim[oó]n|lima|uva|fresa|frutilla|mango|pi[nñ]a|ar[aá]ndano|pera|durazno|melocot|nectarin|ciruela|sand[ií]a|mel[oó]n|granada|kiwi|d[aá]til|higo|caqui|persimon|frambuesa|cereza|תפוח|תפוז|קלמנטינה|לימון|ענב|תות|מנגו|אננס|אוכמנ|אגס|אפרסק|נקטרינה|שזיף|אבטיח|מלון|רימון|קיווי|תמר|תאנה|אפרסמון|דובדבן|פטל', 'Frutas', 'Perecedero', 6, 'Nevera'],
  ['tomate|pepino|zucchini|calabac|berenjena|pimiento|piment|zanahoria|lechuga|espinaca|\\bcol\\b|repollo|kale|apio|champi|hongo|seta|chile|jalape|r[uú]cula|br[oó]coli|coliflor|remolacha|ma[ií]z|edamame|ejote|jud[ií]a|arveja|guisante|alcachofa|topinambur|artichoke|esp[aá]rrago|puerro|hinojo|עגבני|מלפפון|קישוא|חציל|פלפל|גזר|חסה|תרד|כרוב|קייל|סלרי|פטריות|סלק|תירס|שעועית ירוקה|אפונה|ארטישוק|אספרגוס|כרשה|שומר', 'Verduras', 'Perecedero', 6, 'Nevera'],
  ['lenteja|garbanzo|frijol|poroto|alubia|\\bhabas?\\b|עדשים|חומוס יבש|גרגרי חומוס|שעועית|פול', 'Legumbres', 'Despensa', '', 'Despensa'],
  ['arroz|quinoa|avena|pasta|fideo|espagueti|macarr|mac and cheese|cusc|cous|bulgur|harina|panko|ptitim|cereal|granola|polenta|אורז|קינואה|שיבולת|פסטה|ספגטי|קוסקוס|בורגול|קמח|פתיתים|דגני|גרנולה', 'Granos y pastas', 'Despensa', '', 'Despensa']
];
function classify(name) {
  const n = String(name || '').toLowerCase();
  let r = null;
  for (const x of CLS_RULES) if (new RegExp(x[0], 'i').test(n)) { r = x; break; }
  const out = r ? { cat: r[1], tipo: r[2], dias: r[3], ubi: r[4] } : { cat: 'Otro', tipo: 'Despensa', dias: '', ubi: 'Despensa' };
  if (/congel|frozen|קפוא/i.test(n)) { out.tipo = 'Congelado'; out.dias = ''; out.ubi = 'Congelador'; }
  return out;
}

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function searchRender(){
  const raw=($('q').value||'').trim(),nq=norm(raw),box=$('qRes');
  if(!nq||!D){box.hidden=true;box.innerHTML='';return}
  const inv=D.inv.filter(i=>norm(i.n).includes(nq)||norm(i.cat).includes(nq)),rec=D.rec.filter(r=>norm(r.n).includes(nq)||r.ing.some(x=>norm(x).includes(nq))),com=D.compras.filter(c=>norm(c.n).includes(nq));
  let h='';
  if(inv.length)h+=grpO('q:casa','En casa',inv.length,inv.map(i=>invRow(i,i=>A.cant(i)+A.usar(i)+A.acabo(i)+A.ok(i))).join(''));
  if(com.length)h+=grpO('q:comp','En la lista de compras',com.length,com.map(c=>'<div class="item"><button class="chk" data-comp="'+esc(c.id)+'" title="Comprado"></button><div class="it"><div class="n">'+esc(c.n)+'</div></div></div>').join(''));
  if(!inv.length&&!com.length)h+='<div class="item"><div class="it"><div class="n">No tienes “'+esc(raw)+'”</div></div><div class="acts"><button class="a" data-addq="'+esc(raw)+'">+ a compras</button></div></div>';
  if(rec.length)h+=grpO('q:rec','Recetas',rec.length,rec.map(recRow).join(''));
  box.innerHTML=h;box.hidden=false;
}
function tgRender(){
  if(!D)return;const on=!!D.aviso;$('tgN').textContent=on?'activo · 12:00':'apagado';
  $('tg').innerHTML='<div class="tgs">'+(on?'Todos los días a las <b>12:00</b> te aparece un evento en tu <b>Google Calendar</b> con lo que vence hoy y mañana, y una receta para usarlo. El celular te avisa con la notificación del calendario. Si no vence nada, no se crea.':'Crea cada día un evento a las <b>12:00</b> en tu Google Calendar con lo que vence, y tu celular te avisa.')+'</div><div class="tgrow">'+(on?'<button class="a" data-tg="ahora">Actualizar ahora</button><button class="a out" data-tg="off">Apagar</button>':'<button class="a in" data-tg="on">Activar aviso</button>')+'</div>';
}
function tgCall(fn,msg){busy('conectando…');GS().withSuccessHandler(v=>{busy();D.aviso=!!v;save();tgRender();toast(msg)}).withFailureHandler(e=>{busy();toast(/autoriz|authoriz|permis/i.test(e.message)?'Falta dar permiso al calendario (te explico en el chat)':e.message)})[fn]()}
function menuRender(){
  if(!D)return;const t=fmt(new Date()),M=D.menu||[],days=[...Array(7)].map((_,k)=>plus(t,k));
  $('mN').textContent=M.length?M.filter(m=>m.elegida&&m.fecha>=t).length+' de 7 elegidos':'';
  $('menu').innerHTML=M.length?days.map(d=>{const m=M.find(x=>x.fecha===d);const lbl=d===t?'Hoy':d===plus(t,1)?'Mañana':fdate(d);
    return '<div class="day"><div class="dl">'+lbl+'</div>'+(m?'<div class="chips">'+m.ops.map(o=>'<button class="chip'+(m.elegida===o?' sel':'')+'" data-mid="'+esc(m.id)+'" data-mop="'+esc(o)+'">'+(m.elegida===o?'✓ ':'')+esc(o)+'</button>').join('')+'</div>':'<div class="m" style="color:var(--faint);font-size:13px">Sin plan</div>')+'</div>'}).join(''):'<div class="empty">Toca “Armar semana” y te propongo 3 opciones por día, empezando por lo que vence.</div>';
  $('mGen').textContent=M.length?'Rehacer lo que no elegiste':'Armar semana';
}
function genMenu(){
  const S=JSON.stringify(D),t=fmt(new Date()),used={},keep=(D.menu||[]).filter(m=>m.elegida&&m.fecha>=t);
  keep.forEach(m=>used[m.elegida]=(used[m.elegida]||0)+1);
  const main=D.rec.filter(r=>/almuerzo|cena/i.test(r.tipo||''));const out=[];
  for(let k=0;k<7;k++){const d=plus(t,k),ex=keep.find(m=>m.fecha===d);if(ex){out.push(ex);continue}
    const sc=r=>r.ing.filter(x=>D.inv.some(i=>i.n===x&&i.vence&&diff(i.vence,d)>=0&&diff(i.vence,d)<=2)).length*10+r.tengo.length-r.faltan.length*3-(used[r.n]||0)*6;
    const ops=main.slice().sort((a,b)=>sc(b)-sc(a)).slice(0,3).map(r=>r.n);ops.forEach(n=>used[n]=(used[n]||0)+1);
    out.push({id:newId('MEN'),fecha:d,momento:'Comida',ops,elegida:'',nota:''})}
  D.menu=out;apply('Semana armada');later(S,'guardarMenu',out);
}
// Recibo
const HE2ES=[[/מלפפון/,'Pepino'],[/קישוא/,'Zucchini'],[/בצל סגול/,'Cebolla morada'],[/בצל/,'Cebolla blanca'],[/שום/,'Ajo'],[/ביצ/,'Huevos'],[/בולגרית/,'Queso búlgaro 5%'],[/גבינת שמנת|גבינה לבנה/,'Queso crema'],[/לבנה/,'Labneh'],[/יוגורט/,'Yogur griego'],[/שמנת מתוקה|שמנת לבישול|שמנת/,'Crema de leche'],[/פטרוזיליה/,'Perejil'],[/כוסברה/,'Cilantro'],[/נענע/,'Nana'],[/בננ/,'Banana'],[/תפוח אדמה|תפו"?א/,'Papas'],[/תפוח/,'Manzana'],[/אורז/,'Arroz blanco'],[/קינואה/,'Quinoa'],[/עדשים/,'Lentejas rojas'],[/טונה/,'Atún en lata'],[/פיתה|פיתות/,'Pan pita'],[/חזה עוף/,'Pechuga de pollo'],[/בשר טחון/,'Carne molida'],[/סלמון/,'Salmón'],[/אבוקדו/,'Aguacate'],[/עגבני/,'Tomate'],[/גזר/,'Zanahoria'],[/חציל/,'Berenjena'],[/פלפל/,'Pimiento'],[/חסה/,'Lechuga'],[/לימון/,'Limón'],[/טחינה/,'Tahini'],[/חומוס/,'Hummus'],[/במבה/,'Bamba'],[/שיבולת/,'Avena'],[/צ.יה/,'Chía'],[/חמאה/,'Mantequilla'],[/סודה|מוגז/,'Agua con gas'],[/בירה/,'Cerveza'],[/שוקולד/,'Chocolate amargo'],[/לחם/,'Pan integral'],[/חלב/,'Leche']];
const RSTOP=/סה.?כ|מע.?מ|הנחה|עודף|אשראי|קופה|קופאי|תאריך|שעה|שופרסל|רמי לוי|ויקטורי|יוחננוף|אושר עד|טיב טעם|ח\.?פ|טלפון|סניף|קבלה|חשבונית|מזומן|כרטיס|תודה|לתשלום|פריטים|ברקוד|עוסק|מבצע|חבר מועדון|total|visa|cash|change|receipt/i;
function parseRecibo(txt){const seen=new Set();return String(txt||'').split(/\n/).map(l=>l.replace(/ק"?ג|יח'?|גרם|ליטר|\bkg\b|\bgr\b/gi,' ').replace(/[0-9]+([.,][0-9]+)?/g,' ').replace(/[₪%*x×=:\-\/\\|()"'#@+.,]/g,' ').replace(/\s+/g,' ').trim()).filter(l=>l.length>=2&&l.length<=32&&/[\u0590-\u05FFa-zA-Zá-úñ]{2}/.test(l)&&!RSTOP.test(l)).map(l=>{for(const [re,es] of HE2ES)if(re.test(l))return es;return l}).filter(l=>{const k=norm(l);if(seen.has(k))return false;seen.add(k);return true}).slice(0,40)}
let RCPT=[];
function shrink(file){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{const k=Math.min(1,1800/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);res(c.toDataURL('image/jpeg',0.85).split(',')[1])};img.onerror=rej;img.src=u})}
async function onRecibo(file){
  if(!file)return;busy('leyendo recibo…');toast('Leyendo el recibo…');
  let b64;try{b64=await shrink(file)}catch(e){busy();toast('No pude abrir la foto');return}
  GS().withSuccessHandler(txt=>{busy();RCPT=parseRecibo(txt);if(!RCPT.length){toast('No encontré productos en la foto');return}KPI='recibo';delete $('shB').dataset.cook;sheetRender();$('sheet').classList.add('on');document.body.style.overflow='hidden'}).withFailureHandler(e=>{busy();toast('No pude leer el recibo: '+e.message)}).leerRecibo(b64,'image/jpeg');
}
const catOf=n=>D.cat.find(c=>c.n===n);
const rmInv=id=>{D.inv=D.inv.filter(i=>i.id!==id)};
function compraLocal(n,origen){if(D.compras.some(c=>c.n===n))return null;const id=newId('COM');D.compras.push({id,n,nota:'',origen,flash:false});return id}
// Lo que sale de casa vuelve a compras (menos las sobras cocinadas).
const repone=(i,origen)=>i&&i.tipo!=='Sobra'?compraLocal(i.n,origen):null;
function invLocal(n,cant,nota,sobra){
  const sd=sobra?(Number(sobra)>0&&Number(sobra)<=2?Number(sobra):2):0;const c=sd?{cat:'Cocinado',tipo:'Sobra',dias:sd,ubi:'Nevera'}:(catOf(n)||classify(n));
  const dias=c.tipo==='Sobra'?(sd||2):(c.tipo==='Perecedero'?c.dias:''), t=fmt(new Date());
  const vence=((c.tipo==='Perecedero'||c.tipo==='Sobra')&&c.ubi!=='Congelador'&&dias!==''&&dias!=null)?plus(t,dias):'';
  const id=newId('INV');D.inv.push({id,n,cat:c.cat,tipo:c.tipo,ubi:c.ubi,cant,nota,entrada:t,v0:vence,usar:'',vence});
  if(!sobra&&!catOf(n))D.cat.push(Object.assign({n},classify(n)));
  return id;
}
const ACT={
  salida(id,tipo){const S=JSON.stringify(D);const i=D.inv.find(x=>x.id===id);const cid=repone(i,tipo==='Consumido'?'Consumido':'Se perdió');rmInv(id);apply((i?i.n+': ':'')+(tipo==='Consumido'?'consumido':'se perdió')+(cid?' → compras':''));later(S,'salida',id,tipo,cid)},
  flash(cid,on){const S=JSON.stringify(D);const c=D.compras.find(x=>x.id===cid);if(!c)return;c.flash=on;apply(c.n+(on?' → flash':' → compras'));later(S,'setFlash',cid,on)},
  cant(id,v){const S=JSON.stringify(D);const i=D.inv.find(x=>x.id===id);if(i)i.cant=v;apply((i?i.n+': ':'')+v.toLowerCase());later(S,'setCantidad',id,v)},
  acabo(id){const S=JSON.stringify(D);const i=D.inv.find(x=>x.id===id);if(!i)return;const cid=compraLocal(i.n,'Se acabó');rmInv(id);apply(i.n+' → compras');later(S,'seAcabo',id,cid)},
  comprado(cid){const S=JSON.stringify(D);const c=D.compras.find(x=>x.id===cid);if(!c)return;D.compras=D.compras.filter(x=>x.id!==cid);const iid=invLocal(c.n,'Lleno','',false);apply(c.n+' → en casa');later(S,'comprado',cid,iid)},
  delrec(rid,b){const S=JSON.stringify(D);if(!b.dataset.arm){b.dataset.arm=1;b.textContent='¿Quitar? toca otra vez';setTimeout(()=>{delete b.dataset.arm;b.textContent='Quitar receta'},3000);return}const r=D.rec.find(x=>x.id===rid);D.rec=D.rec.filter(x=>x.id!==rid);apply((r?r.n:'Receta')+' quitada');later(S,'descartarReceta',rid)},
  usar(id){const S=JSON.stringify(D);const i=D.inv.find(x=>x.id===id);if(!i)return;const on=!i.usar;i.usar=on?plus(fmt(new Date()),1):'';apply(i.n+(on?' → usar primero':' ya no es urgente'));later(S,'usarPronto',id,i.usar)},
  cook(rid){COOK=rid;KPI='cook';delete $('shB').dataset.cook;sheetRender();$('sheet').classList.add('on');document.body.style.overflow='hidden'},
  cookok(rid){const S=JSON.stringify(D);const r=D.rec.find(x=>x.id===rid);const ids=[...document.querySelectorAll('[data-ckid]')].filter(x=>x.checked).map(x=>x.dataset.ckid);const days=$('ckS').value,name=($('ckN').value||'').trim();const cids=ids.map(id=>repone(D.inv.find(x=>x.id===id),'Cocinado'));ids.forEach(rmInv);let iid=null;if(days&&name)iid=invLocal(name,'Lleno','Sobra de receta',days);closeSheet();apply((r?r.n:'Receta')+': '+ids.length+' usados'+(iid?' · sobra guardada':''));later(S,'cocine',ids,days&&name?name:'',Number(days)||0,iid,cids)},
  falt(rid){const S=JSON.stringify(D);const r=D.rec.find(x=>x.id===rid);if(!r)return;const l=r.faltan.map(x=>[x,compraLocal(x,'Receta')]).filter(p=>p[1]);apply(l.length?l.length+' a compras':'Ya estaban en la lista');if(l.length)later(S,'addCompras',l)},
  addq(n){const S=JSON.stringify(D);const cid=compraLocal(n,'Manual');if(!cid){toast('Ya está en la lista');return}if(!catOf(n))D.cat.push(Object.assign({n},classify(n)));$('q').value='';apply(n+' a la lista');later(S,'addCompras',[[n,cid]],'Manual')},
  sug(n){const S=JSON.stringify(D);const cid=compraLocal(n,'Habitual');if(!cid)return;apply(n+' a la lista');later(S,'addCompras',[[n,cid]],'Habitual')},
  menuPick(id,o){const S=JSON.stringify(D);const m=(D.menu||[]).find(x=>x.id===id);if(!m)return;m.elegida=m.elegida===o?'':o;apply(m.elegida?m.elegida+' elegido':'Sin elegir');later(S,'elegirMenu',id,m.elegida)},
  rcok(){const S=JSON.stringify(D);const names=[...document.querySelectorAll('[data-rk]')].filter(x=>x.checked).map(x=>($('shB').querySelector('[data-rn="'+x.dataset.rk+'"]').value||'').trim()).filter(Boolean);if(!names.length){closeSheet();return}
    const cids=[];names.forEach(n=>{const c=D.compras.find(x=>norm(x.n)===norm(n)||norm(n).includes(norm(x.n))||norm(x.n).includes(norm(n)));if(c){cids.push(c.id);D.compras=D.compras.filter(x=>x.id!==c.id)}});
    const list=names.map(n=>[n,'Lleno','Recibo',0,invLocal(n,'Lleno','Recibo',0)]);closeSheet();apply(names.length+' productos a la casa'+(cids.length?' · '+cids.length+' de la lista':''));later(S,'reciboOk',list,cids)}
};
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.gs){if(d.open)delete UI.shut[d.dataset.gs];else UI.shut[d.dataset.gs]=1;saveUI();return}if(d&&d.dataset&&d.dataset.g){if(d.open)UI.open[d.dataset.g]=1;else delete UI.open[d.dataset.g];saveUI()}},true);
document.addEventListener('click',e=>{
  const md=e.target.closest('#invMode button');if(md){UI.inv=md.dataset.mode;saveUI();render();sheetRender();return}
  const h=e.target.closest('h2.tog');if(h){const c=h.parentElement;c.classList.toggle('min');if(c.classList.contains('min'))UI.min[c.id]=1;else delete UI.min[c.id];saveUI();syncAll();return}
  if(e.target.id==='allTog'){const all=CARDS.every(id=>UI.min[id]);CARDS.forEach(id=>{if(all)delete UI.min[id];else UI.min[id]=1;$(id).classList.toggle('min',!all)});saveUI();syncAll();return}
  if(e.target.id==='undoB'){undo();return}
  if(e.target.id==='mGen'){genMenu();return}
  const b=e.target.closest('button,.rec'); if(!b)return;
  const d=b.dataset;
  if(d.s){e.stopPropagation();ACT.salida(d.id,d.s);return}
  if(d.comp){ACT.comprado(d.comp);return}
  if(d.flash){e.stopPropagation();ACT.flash(d.flash,d.on==='1');return}
  if(d.acabo){ACT.acabo(d.acabo);return}
  if(d.cant){ACT.cant(d.cant,d.v);return}
  if(d.delrec){e.stopPropagation();ACT.delrec(d.delrec,b);return}
  if(d.usar){e.stopPropagation();ACT.usar(d.usar);return}
  if(d.cook){e.stopPropagation();ACT.cook(d.cook);return}
  if(d.cookok){e.stopPropagation();ACT.cookok(d.cookok);return}
  if(d.tg){const k=d.tg;if(k==='on')tgCall('avisoOn','Aviso activado · revisa tu calendario');else if(k==='off')tgCall('avisoOff','Aviso apagado');else if(k==='ahora')tgCall('avisoAhora','Evento actualizado en tu calendario');return}
  if(d.addq){ACT.addq(d.addq);return}
  if(d.sug){ACT.sug(d.sug);return}
  if(d.mid){ACT.menuPick(d.mid,d.mop);return}
  if(d.rcok){ACT.rcok();return}
  if(d.falt){e.stopPropagation();ACT.falt(d.falt);return}
  if(b.classList.contains('rec')&&!b.closest('#sheet'))b.classList.toggle('open');
});
const split=v=>v.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
$('addForm').addEventListener('submit',e=>{e.preventDefault();const L=split($('aIng').value);if(!L.length)return;const S=JSON.stringify(D);const sobra=Number($('aTipo').value)||0,cant=$('aCant').value,nota=$('aNota').value.trim();const list=L.map(n=>[n,cant,nota,sobra,invLocal(n,cant,nota,sobra)]);apply(L.length>1?L.length+' cosas agregadas':L[0]+(sobra?' (sobra, '+sobra+(sobra>1?' días)':' día)'):'')+' agregado');later(S,'addInventarioMany',list);e.target.reset()});
$('cForm').addEventListener('submit',e=>{e.preventDefault();const L=split($('cIng').value);if(!L.length)return;const S=JSON.stringify(D);const list=[];L.forEach(n=>{const cid=compraLocal(n,'Manual');if(cid){list.push([n,cid]);if(!catOf(n))D.cat.push(Object.assign({n},classify(n)))}});if(!list.length){toast('Ya está en la lista');return}apply(list.length>1?list.length+' a la lista':list[0][0]+' a la lista');later(S,'addCompras',list,'Manual');e.target.reset()});
$('q').addEventListener('input',()=>{$('qX').hidden=!$('q').value;searchRender()});
$('qX').onclick=()=>{$('q').value='';$('qX').hidden=true;searchRender();$('q').focus()};
$('rcpt').addEventListener('change',e=>{onRecibo(e.target.files[0]);e.target.value=''});
$('reload').onclick=()=>{commit();load()};
try{D=JSON.parse(localStorage.getItem(LS)||'null')}catch(e){D=null}
if(D&&D.inv){apply();busy('actualizando…')}else D=null;
load();
