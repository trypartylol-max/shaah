
// ═══════════════════════════════════════════════════════════
//  SHAAH — Supabase Auth + Realtime data layer
//  Single source of truth: Supabase. localStorage = cache only.
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL="https://llpyxktcfubhmthqujpa.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscHl4a3RjZnViaG10aHF1anBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTQyMzEsImV4cCI6MjA5NTM5MDIzMX0.4dutcaJzjhuR9IQRlpBetGgLalaSZCiEDdl3oSI_f2A";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    flowType:'pkce',
    storage:window.localStorage
  }
});


// Appearance is a device preference, separate from account data and scoring.
// Only application templates register declarations; DOM attributes carry opaque
// keys. Individual DOM property assignments preserve style-src-attr 'none'.
const UI_STYLE_PROPERTIES=new Set(['-webkit-user-select','align-items','animation','background','border','border-bottom','border-color','border-left','border-radius','border-top','bottom','box-shadow','box-sizing','color','cursor','display','filter','flex','flex-basis','flex-direction','flex-shrink','flex-wrap','font','font-family','font-size','font-weight','gap','grid-template-columns','height','inset','justify-content','left','letter-spacing','line-height','margin','margin-bottom','margin-left','margin-top','max-height','max-width','min-height','min-width','opacity','outline','overflow','overflow-wrap','overflow-y','padding','padding-right','padding-top','position','resize','right','text-align','text-decoration','text-overflow','text-shadow','text-transform','top','transform','transition','user-select','white-space','width','word-break','z-index']);
const _uiStylesByText=new Map(),_uiStylesByKey=new Map();
let _uiStyleSequence=0;
function uiStyleDeclarations(text){
  if(typeof text!=='string'||text.length>4096||/[<>\\{}@]/.test(text)||/url\s*\(|image-set\s*\(/i.test(text))throw new Error('Invalid application style');
  return Object.freeze(text.split(';').map(part=>part.trim()).filter(Boolean).map(part=>{
    const colon=part.indexOf(':'),property=part.slice(0,colon).trim().toLowerCase();
    let value=part.slice(colon+1).trim(),priority='';
    if(colon<1||!UI_STYLE_PROPERTIES.has(property)||!value)throw new Error('Invalid application style property');
    if(/\s*!important\s*$/i.test(value)){value=value.replace(/\s*!important\s*$/i,'');priority='important';}
    return Object.freeze([property,value,priority]);
  }));
}
function uiStyle(text){
  let entry=_uiStylesByText.get(text);
  if(!entry){
    entry=Object.freeze({key:'s'+(++_uiStyleSequence).toString(36),text,rules:uiStyleDeclarations(text)});
    _uiStylesByText.set(text,entry);_uiStylesByKey.set(entry.key,entry);
    if(_uiStylesByKey.size>2048&&typeof document.querySelectorAll==='function'){
      const keep=new Set([...document.querySelectorAll('[data-ui-style]')].map(n=>n.getAttribute('data-ui-style')));
      for(const key of [..._uiStylesByKey.keys()].slice(-512))keep.add(key);
      for(const [key,old]of _uiStylesByKey)if(!keep.has(key)){_uiStylesByKey.delete(key);_uiStylesByText.delete(old.text);}
    }
  }
  return 'data-ui-style="'+entry.key+'"';
}
function uiApplyStyleRules(node,rules){
  for(const name of Array.from(node.style))node.style.removeProperty(name);
  for(const [property,value,priority]of rules)node.style.setProperty(property,value,priority);
}
function uiCopyStyle(node,next){
  for(const property of Array.from(node.style))if(!next.style.getPropertyValue(property))node.style.removeProperty(property);
  for(const property of Array.from(next.style)){
    const value=next.style.getPropertyValue(property),priority=next.style.getPropertyPriority(property);
    if(node.style.getPropertyValue(property)!==value||node.style.getPropertyPriority(property)!==priority)node.style.setProperty(property,value,priority);
  }
}
function uiApplyStyles(root){
  const nodes=[...(root.nodeType===1&&root.hasAttribute('data-ui-style')?[root]:[]),...root.querySelectorAll('[data-ui-style]')];
  for(const node of nodes){const entry=_uiStylesByKey.get(node.getAttribute('data-ui-style'));if(entry)uiApplyStyleRules(node,entry.rules);}
  return root;
}
function uiFragment(markup){
  const template=document.createElement('template');template.innerHTML=markup;
  return uiApplyStyles(template.content);
}
function uiHTML(node,markup){
  const fragment=uiFragment(markup);
  (node.tagName==='TEMPLATE'?node.content:node).replaceChildren(fragment);
}
function uiReplaceHTML(node,markup){node.replaceWith(uiFragment(markup));}

const SKIN_KEY='shaah:skin:v1';
const SKINS=[
  {id:'classic',label:'Original',detail:'El aspecto de siempre, con todos sus colores.'},
  {id:'glow',label:'Glow',detail:'Anillo azul-violeta, Work azul-cian y brillo suave.'},
  {id:'matrix',label:'Matrix',detail:'Negro profundo, verde y detalles de terminal.'},
  {id:'minimal',label:'Bajo estímulo',detail:'Tonos neutros, sin brillos ni animaciones.'},
  {id:'aurora',label:'Aurora',detail:'Azul eléctrico, violeta y rosa, con brillo moderado.'},
  {id:'pro',label:'Pro Mode',detail:'Escritorio en cajas, progreso amplio y navegación lateral. Móvil conserva su formato.'}
];
let _skin='classic',_skinObserver=null;
const _skinColors=new Set(["000000","04040a","07070f","073b34","080810","0a0a13","0a0a14","0b0b14","0b0b15","0b0b16","0b0c16","0b3a32","0c0c16","0c0c18","0d0d18","0d0d19","0d0d1a","0d1b31","0e1020","0f0f1c","0f0f1d","10101c","10101d","10101e","111120","111124","11172b","12121f","12cfa8","141424","141426","14142a","151524","151525","15152a","151a2b","15315a","15d6ad","160d13","161626","16162a","16a98a","17172a","17172b","178ee8","18182b","1a1a2c","1b2238","1c1c30","1c1d32","1d1d33","1d2a22","1e1e2e","1e1e33","1f9c7f","202033","202036","202039","20203a","222239","22223a","23233a","24243a","24253b","25253a","26263c","26324a","27283d","29200f","2a2a3a","2a2a40","2c2615","2e2e4a","303046","303047","342263","36a5ff","38d6ad","3a3a55","3a3a5a","3b36ff","45455b","4a4a7a","4ade80","4b25f5","4b5a86","4d2bff","4f4f66","4f8dff","5268ff","556cff","57576e","5d5d75","5f5f77","60a5fa","62627a","65657d","65708d","66667d","66667e","68687e","68687f","6e5a29","6f6f87","70708a","73738c","77758e","77778f","79aaff","7aa2ff","7e7e97","8278b4","8888a4","8a8a9a","8a8aa0","8b63ff","8c8ca3","8f8da6","9090aa","9a9ab0","9a9ab2","9a9ab4","9b45e9","9d2d45","9fa9bc","a0a0b6","a4a4b7","a4a4ba","a9a1c8","aaa6c4","aaaabd","aaaabe","adadbf","b0b0bf","b0b0c0","b497ff","b58d31","b8b8c7","c0c0cd","c4c4d2","c7c7d2","c8c8d4","d0d0da","d0d0db","d5d5df","d69e2e","d8d8e1","d9d7e3","d9d9e2","dedee6","e0e0e8","e1e1e8","e2e2e2","e2e2ea","e4e4eb","e8e8ee","e8e8f0","ececf2","f2f2f2","f4b62b","f59e0b","f87171","fbbf24","ffb400","ffffff"]);
const SKIN_COLOR_RE=/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)/gi;
function skinColorParts(value){
  if(value[0]==='#'){
    let hex=value.slice(1);if(hex.length<5)hex=[...hex].map(c=>c+c).join('');
    return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).concat(hex.length===8?parseInt(hex.slice(6),16)/255:1);
  }
  const parts=value.match(/[\d.]+/g).map(Number);return [...parts.slice(0,3),parts[3]??1];
}
function skinTone(hex,id=_skin){
  const [r,g,b]=skinColorParts('#'+hex),classic=[r,g,b];if(id==='classic'||id==='glow'||id==='pro')return classic;
  // Aurora shares the same palette in CSS, generated templates and SVG charts.
  // Keep success / warning / danger distinct from interactive cyan / violet.
  if(id==='aurora'){
    const semantic={fff1a8:'fff0bd',ffd700:'f6d77b','4ade80':'68e0bb','60a5fa':'75baff',
      f59e0b:'f5c879',f97316:'f7a77c',ef4444:'ff879f',f87171:'ff879f',
      a78bfa:'b9a2ff',fbbf24:'f5c879'};
    let tone=semantic[hex];
    if(!tone){
      const high=Math.max(r,g,b),low=Math.min(r,g,b),y=.2126*r+.7152*g+.0722*b;
      if(high-low<=Math.max(32,high*.18)||(high<100&&Math.abs(r-g)<20)){
        const bucket=[9,20,32,55,80,115,165,205].findIndex(n=>y<=n);
        tone=['050b1b','0d1630','16213f','2d3d62','53658d','97a9cc','b0bfdd','d1def4','edf4ff'][bucket<0?8:bucket];
      }else if(high<100)tone='172344';
      else if(r>g*1.35&&r>b*1.15)tone='ff879f';
      else if(r>120&&g>r*.55&&b<g*.7)tone='f5c879';
      else if(g>r&&g>=b)tone='68e0bb';
      else if(b>r*1.25)tone='75baff';
      else tone='b9a2ff';
    }
    return skinColorParts('#'+tone).slice(0,3);
  }
  const grades={
    fff1a8:['dcffe8','dce2cc'],ffd700:['b4ffce','c2cbae'],
    '4ade80':['00ff41','9fbaa9'],'60a5fa':['50e68c','9bb3c6'],
    f59e0b:['79d697','c7b78f'],f97316:['9ac3a5','c4aa92'],ef4444:['b0bdb4','cba7a3'],
    a78bfa:['00e859','bbc0c8'],fbbf24:['75f7ad','bbc0c8']
  };
  let tone=grades[hex]?.[id==='matrix'?0:1];
  if(!tone){
    const high=Math.max(r,g,b),low=Math.min(r,g,b),y=.2126*r+.7152*g+.0722*b;
    // Neutralize the old violet-tinted surfaces as well as true grays.
    if(high-low<=Math.max(24,high*.14)||(high<95&&Math.abs(r-g)<16)){
      const bucket=[9,20,32,55,80,115,165,205].findIndex(n=>y<=n);
      const neutral=id==='matrix'
        ?['020705','07120d','10251a','244433','456753','789783','a0b9ac','c5ded0','e0f5e9']
        :['15171a','1c1f23','272b30','3e444c','646b74','9ba2ab','b2b8c0','cdd2d8','e2e5e9'];
      tone=neutral[bucket<0?8:bucket];
    }else if(r>g*1.35&&r>b*1.15)tone=id==='matrix'?'b0bdb4':'cba7a3';
    else if(r>120&&g>r*.55&&b<g*.7)tone=id==='matrix'?'92deaa':'c7b78f';
    else if(g>r&&g>=b)tone=id==='matrix'?'00e859':'9fbaa9';
    else tone=id==='matrix'?'70df9c':'bbc0c8';
  }
  return skinColorParts('#'+tone).slice(0,3);
}
function skinColorValue(value){
  // Normalize literal colors once; CSS variables let skin changes preserve DOM,
  // focus, drafts, timers and the original source colors for exact restoration.
  return value.replace(SKIN_COLOR_RE,literal=>{
    const [r,g,b,alpha]=skinColorParts(literal),rgb=[r,g,b];
    const hex=rgb.map(n=>n.toString(16).padStart(2,'0')).join('');
    if(!_skinColors.has(hex)){
      _skinColors.add(hex);
      if(_skin!=='classic')document.documentElement?.style.setProperty('--skin-rgb-'+hex,skinTone(hex).join(','));
    }
    return `rgba(var(--skin-rgb-${hex},${rgb.join(',')}),${alpha})`;
  });
}
// Fixed, local SVG artwork only. User-supplied icons remain text, never markup.
const MATRIX_GLYPHS={
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12l9 4 9-4M12 12v5"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4 2 2 0 0 1 1-4h2a3 3 0 0 0 3-3 9 9 0 0 0-9-7Z"/><path d="M7 9h.01M10 6h.01M15 7h.01M6 14h.01"/>',
  moon:'<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>',
  meditate:'<circle cx="12" cy="5" r="2"/><path d="m7 10 5-2 5 2 3 5M4 15l3-5M12 8v8m-4-3 4 3 4-3M8 16l-4 4h16l-4-4"/>',
  book:'<path d="M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1Zm0 0v16M5 8h3M16 8h3"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5.65"/>',
  food:'<path d="M3 11h18a9 9 0 0 1-18 0Zm9 0C5 11 5 3 5 3s8 0 8 8m0 0c0-6 6-7 6-7s1 4-3 7M7 21h10"/>',
  flame:'<path d="M12 2c1 5 7 7 7 13a7 7 0 0 1-14 0c0-3 1-5 4-8 0 4 2 5 2 5 3-4 1-10 1-10Z"/>',
  cube:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10v10M3 7l9 5 9-5M7.5 4.5l9 5"/>',
  cup:'<path d="M4 8h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a3 3 0 0 1 0 6h-2M7 2v3M12 2v3"/>',
  laptop:'<rect x="4" y="3" width="16" height="13" rx="1"/><path d="m4 16-2 5h20l-2-5M9 18h6"/>',
  headphones:'<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H4a1 1 0 0 1-1-1Zm18 0h-4v9h3a1 1 0 0 0 1-1Z"/>',
  repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
  save:'<path d="M3 3h15l3 3v15H3Zm4 0v7h10V3M7 21v-7h10v7"/>',
  music:'<path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
  hands:'<path d="M12 4v13M12 4c-3-3-4 0-4 3v5l-5 7 5 3 4-5 4 5 5-3-5-7V7c0-3-1-6-4-3Z"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12M7 12h10"/>',
  pill:'<path d="M5 19a6 6 0 0 1 0-8l6-6a6 6 0 0 1 8 8l-6 6a6 6 0 0 1-8 0Zm3-11 8 8"/>',
  shoe:'<path d="M3 5h5l2 7 10 3 2 3v3H2v-9l1-7Zm10 8-2 3m6-2-2 3M2 18h20"/>',
  walk:'<circle cx="14" cy="4" r="2"/><path d="m10 22 3-7-3-4 3-5 3 5h4M4 13l5-2m1 0-3 8H3m10-4 5 7"/>',
  home:'<path d="m2 11 10-9 10 9M5 9v13h14V9M9 22v-8h6v8"/>',
  keyboard:'<rect x="2" y="5" width="20" height="14" rx="1"/><path d="M6 5v9h3V5m6 0v9h3V5M7 14v5m5-14v14m5-5v5"/>',
  ear:'<path d="M6 9a6 6 0 0 1 12 0c0 6-5 5-5 10a3 3 0 0 1-6 0M9 9a3 3 0 0 1 6 0c0 2-3 3-3 5"/>',
  ruler:'<path d="m3 21 18-18v18ZM9 18h9V9m-7 4 2 2m1-5 2 2m1-5 2 2"/>',
  sliders:'<path d="M5 3v5m0 6v7M12 3v10m0 6v2M19 3v2m0 6v10"/><path d="M2 8h6v6H2Zm7 5h6v6H9Zm7-8h6v6h-6Z"/>',
  disc:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M6 10a6 6 0 0 1 4-4m8 8a6 6 0 0 1-4 4"/>',
  folder:'<path d="M3 4h6l3 3h9v14H3Zm0 7h18M7 4V2h13v5"/>',
  heart:'<path d="M20 4a5 5 0 0 0-8 2 5 5 0 0 0-8-2C-3 10 12 21 12 21S27 10 20 4Z"/>',
  handshake:'<path d="m2 8 4-4 5 2 4-2 7 5-4 10-5 3L4 14Zm4-4 5 6 4-2 4 5M7 16l4-4m0 8 4-5"/>',
  trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4M12 14v6m-5 1h10"/>',
  chartdown:'<path d="M3 3v18h18M6 7l5 5 4-3 6 7m-5 0h5v-5"/>',
  toast:'<path d="m5 2 6 2-3 7a4 4 0 0 1-6-2Zm14 0-6 2 3 7a4 4 0 0 0 6-2ZM5 12l-2 7m-2-1 5 2m13-8 2 7m-3 1 5-2M11 1l1 3 1-3"/>',
  play:'<path d="m7 3 14 9-14 9Z"/>',
  down:'<path d="M12 3v18m-7-7 7 7 7-7"/>',
  up:'<path d="M12 21V3m-7 7 7-7 7 7"/>',
  left:'<path d="M21 12H3m7-7-7 7 7 7"/>',
  right:'<path d="M3 12h18m-7-7 7 7-7 7"/>',
  palm:'<path d="M3 21h18M12 21l2-14M14 7C10 0 4 4 4 8c5-3 8-3 10-1Zm0 0c4-7 8-2 8 2-4-3-6-3-8-2Zm0 0c-1-6 3-8 5-6"/>',
  stop:'<rect x="5" y="5" width="14" height="14" rx="1"/>',
  alert:'<path d="m12 2 10 19H2Zm0 6v6m0 3h.01"/>',
  star:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
  hand:'<path d="M7 12V5a2 2 0 0 1 3 0v6-8a2 2 0 0 1 3 0v8-6a2 2 0 0 1 3 0v7-3a2 2 0 0 1 3 0v7a6 6 0 0 1-10 4l-6-6a2 2 0 0 1 3-3l3 3"/>',
  touch:'<path d="M10 13V5a2 2 0 0 1 4 0v7l5 2v4a4 4 0 0 1-4 4h-3l-7-7a2 2 0 0 1 3-3l2 2M4 4l2 2m12-2-2 2M10 1h4"/>',
  settings:'<path d="m10 2-1 3-3 1-3-1-2 4 2 2v3l-2 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-2-2v-3l2-2-2-4-3 1-3-1-1-3Z"/><circle cx="12" cy="12.5" r="3"/>',
  check:'<path d="m4 12 5 5L20 5"/>',
  checked:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-7"/>',
  bars:'<path d="M4 21V12h3v9m3 0V7h3v14m3 0V2h3v19"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h2m4 0h4M7 18h5"/>',
  flag:'<path d="M4 22V3c6-5 10 5 16 0v13c-6 5-10-5-16 0M9 2v14m6-10v12M4 9c6-5 10 5 16 0"/>',
  pause:'<path d="M5 3h4v18H5Zm10 0h4v18h-4Z"/>',
  skip:'<path d="m4 3 12 9-12 9ZM20 3v18"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  history:'<path d="M3 8a9 9 0 1 1-1 7M3 2v6h6M12 7v5l3 2"/>',
  close:'<path d="m5 5 14 14M5 19 19 5"/>'
};
const MATRIX_ICON_ALIASES={
  '⚡':'bolt','💼':'briefcase','🎨':'palette','🌙':'moon','🧘':'meditate','📖':'book','🔒':'lock','👥':'people',
  '🥗':'food','🍅':'food','🔥':'flame','🧊':'cube','🥛':'cup','💻':'laptop','🎧':'headphones','🔁':'repeat','☕':'cup','✨':'spark','💾':'save',
  '🎵':'music','🙏':'hands','🚭':'ban','💊':'pill','👟':'shoe','🚶':'walk','🏠':'home','🎹':'keyboard','🎶':'music','👂':'ear','📐':'ruler','🎼':'music','🎚':'sliders','📀':'disc','🗂':'folder',
  '💘':'heart','🤝':'handshake','👫':'people','🏆':'trophy','📉':'chartdown','🥂':'toast','▶':'play','⬇':'down','⬆':'up','🏖':'palm','⬛':'stop','▪':'stop','⚠':'alert','⭐':'star','👋':'hand','👆':'touch','⚙':'settings','✅':'checked','📊':'bars','📅':'calendar','🏁':'flag','⏸':'pause','⏭':'skip',
  '◉':'calendar','◷':'clock','◍':'people','◇':'bars','◈':'history','←':'left','→':'right','↑':'up','↓':'down','✓':'check','✔':'check','✕':'close','✖':'close','×':'close'
};
function skinIconSpan(value){
  const span=document.createElement('span');span.className='skin-emoji';
  const normalized=value.replace(/[\uFE0E\uFE0F]|\p{Emoji_Modifier}/gu,'');
  const key=MATRIX_ICON_ALIASES[normalized];
  if(!key){span.textContent=value;return span;}
  span.classList.add('has-matrix-icon');
  const original=document.createElement('span');original.className='skin-icon-original';original.textContent=value;span.append(original);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  svg.classList.add('matrix-icon');svg.innerHTML=MATRIX_GLYPHS[key];span.append(svg);
  return span;
}
function skinPaintEmoji(root){
  // Keep the original text and accessible name, and change only the drawing.
  const pattern=/(\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?)*|\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|[◉◷◍◇◈←→↑↓✓✔✕✖×][\uFE0E\uFE0F]?)/gu;
  const texts=[];
  if(root.nodeType===3)texts.push(root);
  else{const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())texts.push(walker.currentNode);}
  for(const text of texts){
    if(!text.parentElement||text.parentElement.closest('script,style,textarea,option,.skin-emoji,[data-skin-preview]'))continue;
    const parts=text.data.split(pattern);if(parts.length===1)continue;
    const fragment=document.createDocumentFragment();
    parts.forEach((part,i)=>{if(!part)return;if(i%2)fragment.append(skinIconSpan(part));else fragment.append(document.createTextNode(part));});
    text.replaceWith(fragment);
  }
}
function skinPaintTree(root,includeText=true){
  if(root.nodeType===3){if(includeText)skinPaintEmoji(root);return;}
  if(root.nodeType!==1)return;
  const nodes=[root,...root.querySelectorAll('[style],[fill],[stroke]')];
  for(const node of nodes){
    if(node.closest('[data-skin-preview]'))continue;
    for(const property of Array.from(node.style||[])){
      const before=node.style.getPropertyValue(property),after=skinColorValue(before);
      if(after!==before)node.style.setProperty(property,after,node.style.getPropertyPriority(property));
    }
    for(const attr of ['fill','stroke']){
      const before=node.getAttribute(attr);if(!before)continue;
      const after=skinColorValue(before);if(after!==before)node.setAttribute(attr,after);
    }
  }
  if(includeText)skinPaintEmoji(root);
}
function applySkin(){
  const root=document.documentElement;if(!root)return;
  root.dataset.skin=_skin;
  root.classList.toggle('shaah-aurora',_skin==='aurora');
  for(const hex of _skinColors){
    const key='--skin-rgb-'+hex;
    if(_skin==='classic')root.style.removeProperty(key);
    else root.style.setProperty(key,skinTone(hex).join(','));
  }
  const theme=document.querySelector('meta[name="theme-color"]');
  if(theme)theme.content=_skin==='matrix'?'#020705':_skin==='minimal'?'#15171a':_skin==='aurora'?'#050b1b':'#07070f';
  document.querySelectorAll('[data-skin-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.skinChoice===_skin)));
  // Skin selection changes presentation only; preserve interactive DOM and state.

}
function setSkin(id){
  if(!SKINS.some(s=>s.id===id))return false;
  _skin=id;let saved=true;
  try{localStorage.setItem(SKIN_KEY,id);}catch(e){saved=false;}
  applySkin();
  const status=document.getElementById('skin-status');
  if(status)status.textContent=SKINS.find(s=>s.id===id).label+' aplicado. '+(saved?'Guardado en este navegador.':'Se mantiene durante esta sesión; el navegador no permite guardarlo.');
  return true;
}
function initSkin(){
  ["1c1d28", "252535", "29293c"].forEach(hex=>_skinColors.add(hex));
  _skinColors.add('171725');_skinColors.add('34344a');_skinColors.add('a78bfa');
  try{const id=localStorage.getItem(SKIN_KEY);_skin=SKINS.some(s=>s.id===id)?id:'classic';}catch(e){_skin='classic';}
  applySkin();
  if(typeof MutationObserver==='undefined'||!document.body)return;
  skinPaintTree(document.body);
  _skinObserver=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='attributes')skinPaintTree(record.target,false);
      else for(const node of record.addedNodes)skinPaintTree(node);
    }
  });
  _skinObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','fill','stroke']});
}
window.addEventListener('storage',event=>{
  if(event.key!==SKIN_KEY&&event.key!==null)return;
  const id=event.newValue;_skin=SKINS.some(s=>s.id===id)?id:'classic';applySkin();
});
function skinPickerHTML(){
  return `<div class="skin-options" role="group" aria-label="Skin de la aplicación">${SKINS.map(s=>`
    <button type="button" class="skin-option" data-skin-choice="${s.id}" aria-pressed="${_skin===s.id}" ${ui('click','setSkin' ,s.id)}>
      <span class="skin-preview skin-preview-${s.id}" data-skin-preview aria-hidden="true">
        <span class="skin-preview-ring">68</span><span class="skin-preview-lines"><i></i><i></i><i></i></span>
      </span>
      <span class="skin-option-title">${s.label}<span class="skin-check" aria-hidden="true">✓</span></span>
      <span class="skin-option-detail">${s.detail}</span>
    </button>`).join('')}</div>
    <p class="skin-status" id="skin-status" role="status" aria-live="polite">Se guarda en este navegador. Tus puntos y tu historial se mantienen.</p>`;
}


/* Travel mode: server settings are authoritative; localStorage is a cache.
   Never let an old device-local Vacation preference override a newer saved mode. */
const travelModeKey=()=>USER?'travelMode:'+USER.id:'travelMode';
function persistTravelMode(mode, updatedAt=Date.now()){
  travelEnsure();
  mode=mode==='vacation'?'vacation':'work';
  const stamp=Number(updatedAt)||Date.now();
  CFG.travel.mode=mode;
  CFG.travel.modeUpdatedAt=stamp;
  try{localStorage.setItem(travelModeKey(),JSON.stringify({mode,updatedAt:stamp}));}catch(e){}
  return mode;
}
function restoreLiveTravelMode(){
  travelEnsure();
  let rec=null;
  try{
    const raw=localStorage.getItem(travelModeKey());
    if(raw){try{rec=JSON.parse(raw);}catch(e){rec={mode:raw,updatedAt:0};}}
  }catch(e){}
  const localMode=rec&&(rec.mode==='vacation'||rec.mode==='work')?rec.mode:null;
  const localStamp=Number(rec&&rec.updatedAt)||0;
  const serverMode=CFG.travel.mode==='vacation'?'vacation':'work';
  const serverStamp=Number(CFG.travel.modeUpdatedAt)||0;
  // Legacy server records without timestamps still take precedence over
  // legacy browser records; a newer explicit offline choice may win.
  if(localMode&&localStamp>serverStamp){
    persistTravelMode(localMode,localStamp);
    if(CFG.h&&CFG.h.work)CFG.h.work.on=(localMode==='work');
    return true;
  }
  persistTravelMode(serverMode,serverStamp||Date.now());
  if(CFG.h&&CFG.h.work)CFG.h.work.on=(serverMode==='work');
  return false;
}

/* =========================
   DAY LOG — phases 1 + 2 + 3
   ========================= */
const DAYLOG_KEY='dayLogV2';
const dayLogLocalKey=()=>USER?DAYLOG_KEY+':'+USER.id:null;

function dayLogLegacyStore(){
  try{
    const raw=localStorage.getItem('dayLogV1');
    const obj=raw?JSON.parse(raw):{};
    return obj&&typeof obj==='object'?obj:{};
  }catch(e){return {};}
}
function dayLogEvents(key){
  if(!_state[key])_state[key]={checks:{},social:blankSocial(),note:'',people:[]};
  if(!Array.isArray(_state[key]._daylog))_state[key]._daylog=[];
  return _state[key]._daylog;
}
function dayLogId(){return 'evt_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);}
function dayLogFmt(mins){
  if(mins==null||isNaN(mins))return '—';
  mins=Math.max(0,Math.round(mins));
  const h=Math.floor(mins/60),m=mins%60;
  return h?`${h}h${m?` ${m}m`:''}`:`${m}m`;
}
function dayLogTz(){return CFG.tz&&CFG.tz!=='device'?CFG.tz:Intl.DateTimeFormat().resolvedOptions().timeZone;}
function dayLogDateTime(key,minutes){
  const mins=Math.max(0,Math.min(1439,minutes));
  const [y,m,d]=key.split('-').map(Number);
  const hh=Math.floor(mins/60), mm=mins%60;
  const tz=dayLogTz();
  // Convert a wall-clock date/time in SHAAH's configured timezone to an instant.
  // The second pass handles DST transitions around the target date.
  let guess=new Date(Date.UTC(y,m-1,d,hh,mm));
  for(let i=0;i<2;i++){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(guess);
    const get=t=>Number(parts.find(x=>x.type===t)?.value||0);
    const shown=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));
    const target=Date.UTC(y,m-1,d,hh,mm);
    guess=new Date(guess.getTime()+(target-shown));
  }
  return guess;
}
function dayLogMinutes(iso){
  if(!iso)return null;
  const d=new Date(iso);
  if(isNaN(d))return null;
  const tz=dayLogTz();
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const get=t=>Number(parts.find(x=>x.type===t)?.value||0);
  return get('hour')*60+get('minute');
}
function dayLogNowISO(){
  const d=new Date();d.setSeconds(0,0);return d.toISOString();
}
function dayLogSort(evs){return [...evs].sort((a,b)=>new Date(a.start)-new Date(b.start));}
function dayLogEsc(s){return esc(s);}
function dayLogTypeLabel(t){return t==='habit'?'HABIT':t==='routine'?'ROUTINE':'MANUAL';}
// Sleep Early is a two-point habit: wake time + sleep time. It is deliberately
// excluded from duration/timeline math so the overnight span is never drawn as a block.
function dayLogIsSleepWake(e){return !!(e&&e.type==='habit'&&e.sourceId==='sleep');}
function dayLogSleepRole(e){const role=e?.meta?.sleepRole||e?.sleepRole;return ['wake','sleep'].includes(role)?role:null;}
// Normalize older Sleep & Wake records created before the two-event model.
// Any record linked to sourceId=sleep is a point event; legacy start→end records
// are split into WAKE and SLEEP. Unselected legacy rows are retained, never deleted.
function dayLogNormalizeSleepWake(key){
  const arr=dayLogEvents(key);
  const raw=arr.filter(e=>e&&e.type==='habit'&&e.sourceId==='sleep');
  if(!raw.length)return false;
  const before=JSON.stringify(arr);
  const role=dayLogSleepRole;
  const roleWake=raw.filter(e=>role(e)==='wake');
  const roleSleep=raw.filter(e=>role(e)==='sleep');
  const untagged=raw.filter(e=>!['wake','sleep'].includes(role(e)));
  let wake=roleWake[0]||null, sleep=roleSleep[0]||null;
  // Capture a legacy end before clearing it from the WAKE point below.
  // Invalid/reversed legacy ranges are ambiguous: leave them intact for review.
  if(raw.some(e=>e.end&&(!Number.isFinite(Date.parse(e.start))||!Number.isFinite(Date.parse(e.end))||Date.parse(e.end)<Date.parse(e.start))))return false;
  const legacySource=raw.find(e=>e.end&&Date.parse(e.end)>Date.parse(e.start))||null;
  const legacyEnd=legacySource?.end||null;
  const inferLegacyPair=!roleWake.length&&!roleSleep.length&&(untagged.length>=2||!!legacySource);

  if(!wake&&inferLegacyPair){
    const candidate=untagged.slice().sort((a,b)=>new Date(a.start)-new Date(b.start))[0]||null;
    if(candidate)wake=candidate;
  }
  if(wake){
    if(wake.end)wake.meta={...(wake.meta||{}),legacyRange:{start:wake.start,end:wake.end}};
    wake.end=null;
    wake.title=wake.title||'Wake Up and Sleep Early';
    wake.meta={...(wake.meta||{}),sleepWake:true,sleepRole:'wake',light:true,completed:false};
  }

  // If an older build already created two separate rows, keep the latest
  // distinct point as SLEEP. Only when there is no second row do we split a
  // legacy start→end record into a standalone SLEEP event.
  if(!sleep&&inferLegacyPair){
    const candidate=untagged.slice().sort((a,b)=>new Date(b.start)-new Date(a.start)).find(e=>e!==wake);
    if(candidate)sleep=candidate;
  }
  if(!sleep && legacyEnd){
    sleep={...(legacySource||wake),id:dayLogId(),start:legacyEnd,end:null,
      meta:{...((legacySource||wake)?.meta||{}),sleepWake:true,sleepRole:'sleep',light:false,completed:true}};
    arr.push(sleep);
  }
  if(sleep){
    if(sleep.end)sleep.meta={...(sleep.meta||{}),legacyRange:{start:sleep.start,end:sleep.end}};
    sleep.end=null;
    sleep.title=sleep.title||'Wake Up and Sleep Early';
    sleep.meta={...(sleep.meta||{}),sleepWake:true,sleepRole:'sleep',light:false,completed:true};
  }

  // Compatibility must not erase additional records or repeatedly save a day
  // merely because the user opened Log again.
  const changed=before!==JSON.stringify(arr);
  if(changed)dayLogPersist(key);
  return changed;
}
function dayLogDuration(e){
  if(dayLogIsSleepWake(e))return null;
  const a=dayLogMinutes(e.start),b=dayLogMinutes(e.end);
  return a!=null&&b!=null&&b>=a?b-a:null;
}
function dayLogSaveLocal(key){
  const storageKey=dayLogLocalKey();if(!storageKey)return false;
  try{
    const s={};
    Object.keys(_state).forEach(k=>{if(DATE_RE.test(k)&&Array.isArray(_state[k]?._daylog)&&_state[k]._daylog.length)s[k]=_state[k]._daylog;});
    localStorage.setItem(storageKey,JSON.stringify(s));
    return true;
  }catch(e){return false;}
}
function dayLogMigrateLocal(){
  const storageKey=dayLogLocalKey();
  const legacy=storageKey?get(storageKey):null;
  if(!legacy||typeof legacy!=='object')return;
  for(const k of Object.keys(legacy)){
    if(!DATE_RE.test(k)||!Array.isArray(legacy[k])||legacy[k].length===0)continue;
    // An explicit empty record may be a saved deletion; never resurrect it.
    if(Array.isArray(_state[k]?._daylog))continue;
    dayLogEvents(k);_state[k]._daylog=legacy[k];
  }
}
function unownedDayLogCopies(){
  const copies={};
  for(const key of ['dayLogV1',DAYLOG_KEY]){
    const value=get(key);
    if(value&&typeof value==='object'&&Object.keys(value).some(k=>DATE_RE.test(k)))copies[key]=value;
  }
  return copies;
}
function exportUnownedDayLogs(){
  const copies=unownedDayLogCopies();if(!Object.keys(copies).length)return;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'SHAAH',owner:null,activityCopies:copies},null,2)],{type:'application/json'}));
  a.download='shaah-older-activity.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function unownedDayLogNoticeHTML(){
  if(!Object.keys(unownedDayLogCopies()).length)return '';
  return `<div ${uiStyle(`padding:12px;border:1px solid #66552a;border-radius:10px;color:#fbbf24;font-size:13px;line-height:1.6;margin:10px 0`)}>Older activity copies on this browser are not linked to an account. They are kept separately for recovery and are not assigned automatically. <button ${ui('click','exportUnownedDayLogs')} ${uiStyle(`margin-top:8px;background:none;border:1px solid #66552a;color:inherit;border-radius:7px;padding:8px;font:inherit;cursor:pointer`)}>Download older activity</button></div>`;
}
function dayLogPersist(key){
  dayLogSaveLocal(key);
  persistDay(key);
}
function dayLogAdd(title,startISO,endISO,type='manual',sourceId=null,meta={}){
  const key=dateKey(new Date(startISO||Date.now()));
  const ev={id:dayLogId(),title:String(title||'').trim(),start:startISO||dayLogNowISO(),end:endISO||null,type,sourceId,...meta};
  if(!ev.title)return null;
  dayLogEvents(key).push(ev);
  dayLogPersist(key);
  return ev;
}
function dayLogUpdate(id,patch,key=todayKey()){
  const ev=dayLogEvents(key).find(e=>e.id===id);if(!ev)return;
  Object.assign(ev,patch);dayLogPersist(key);
}
function dayLogDelete(id,key=todayKey()){
  const arr=dayLogEvents(key),i=arr.findIndex(e=>e.id===id);if(i<0)return;
  arr.splice(i,1);dayLogPersist(key);
}
function dayLogFindLinked(type,sourceId,key=todayKey()){
  return dayLogEvents(key).find(e=>e.type===type&&e.sourceId===sourceId);
}
function dayLogSyncCompletion(id,key,state,{create=true}={}){
  const fraction=doneFrac(state),arr=dayLogEvents(key);
  // Only explicit completion changes reconcile linked events. Manual activities
  // and unlinked timer records are independent of habit credit.
  if(!fraction){
    const kept=arr.filter(e=>!(e.type!=='manual'&&e.sourceId===id));
    if(kept.length!==arr.length){_state[key]._daylog=kept;dayLogPersist(key);}
    return;
  }
  const C=cfgForDate(key);
  const all=[...C.L1,...C.L2,...C.L3];
  const item=all.find(x=>x.id===id);
  if(!item)return;
  const type=item.routine?'routine':'habit';
  const title=item.routine?(ROUTINES[id]?.label||item.label):item.label;
  const existing=dayLogFindLinked(type,id,key);

  // Historical edits never invent a timestamp or overwrite recorded times.
  // Bulk completion cannot reconstruct Wake/Sleep times either.
  if(key!==todayKey()||!create){
    let changed=false;
    for(let i=arr.length-1;i>=0;i--){
      const e=arr[i];if(e.type==='manual'||e.sourceId!==id)continue;
      if(id==='sleep'&&fraction<1&&dayLogSleepRole(e)==='sleep'){arr.splice(i,1);changed=true;continue;}
      e.meta={...(e.meta||{}),completed:fraction===1,light:fraction<1};changed=true;
    }
    if(changed)dayLogPersist(key);
    return;
  }

  // Wake Up and Sleep Early is deliberately TWO independent timestamp events:
  // first tap = WAKE, second tap = SLEEP. Neither event has an end time and
  // neither is drawn as a duration block on the timeline.
  if(id==='sleep' && type==='habit'){
    const arr=dayLogEvents(key);
    dayLogNormalizeSleepWake(key);
    const sleepEvents=arr.filter(e=>e.type==='habit'&&e.sourceId==='sleep');
    const wake=sleepEvents.find(e=>e.meta?.sleepRole==='wake')||null;
    const sleep=sleepEvents.find(e=>e.meta?.sleepRole==='sleep')||null;

    if(state===true){
      if(!wake){
        // Full credit alone cannot reconstruct two contrary actions/times.
        // Bulk/history already use create=false; a direct full setter follows
        // the same no-fabricated-time rule until an actual Wake is recorded.
        return;
      }else if(!sleep){
        const now=dayLogNowISO();
        dayLogAdd(title,now,null,'habit',id,{meta:{sleepWake:true,sleepRole:'sleep',light:false,completed:true}});
      }
      return;
    }
    if(state===0.5){
      // Explicitly returning to half credit removes only the complementary Sleep
      // point; the Wake timestamp remains the one actually recorded.
      const sleeps=arr.filter(e=>e.type==='habit'&&e.sourceId==='sleep'&&(e.meta?.sleepRole||e.sleepRole)==='sleep');
      if(sleeps.length){_state[key]._daylog=arr.filter(e=>!sleeps.includes(e));dayLogPersist(key);}
      if(!wake){
        const now=dayLogNowISO();
        dayLogAdd(title,now,null,'habit',id,{meta:{sleepWake:true,sleepRole:'wake',light:true,completed:false}});
      }
      return;
    }
    if(sleepEvents.length){
      for(let i=arr.length-1;i>=0;i--){
        const e=arr[i];
        if(e.type==='habit'&&e.sourceId==='sleep')arr.splice(i,1);
      }
      dayLogPersist(key);
    }
    return;
  }

  if(fraction>0){
    const meta={completed:fraction===1,light:fraction<1};
    if(existing){
      existing.title=title;existing.meta={...(existing.meta||{}),...meta};
      dayLogPersist(key);
    }else{
      const now=dayLogNowISO();
      dayLogAdd(title,now,now,type,id,{meta});
    }
  }
}
function dayLogSyncChangedCompletions(key,before){
  const after=getChecked(key);
  for(const id of new Set([...Object.keys(before),...Object.keys(after)])){
    if(doneFrac(before[id])===doneFrac(after[id]))continue;
    dayLogSyncCompletion(id,key,after[id],{create:id!=='sleep'});
  }
}
function dayLogSyncAllCompleted(key){
  const ch=getChecked(key),C=cfgForDate(key);
  for(const i of [...C.L1,...C.L2,...C.L3]){
    if(i.combo)continue;
    if(ch[i.id]===true||ch[i.id]===0.5)dayLogSyncCompletion(i.id,key,ch[i.id]);
  }
  if(ch.social===true){
    const ex=dayLogFindLinked('habit','social',key);
    if(!ex){const now=dayLogNowISO();dayLogAdd('Social Combo',now,now,'habit','social',{completed:true});}
  }
}
function dayLogActiveId(){
  const evs=dayLogEvents(todayKey());
  const open=dayLogSort(evs).reverse().find(e=>!e.end&&!dayLogIsSleepWake(e));
  return open?.id||null;
}
function dayLogStart(){
  const input=document.querySelector('#dayLogInput'),title=(input?.value||'').trim();
  if(!title)return;
  const now=dayLogNowISO();
  const existing=dayLogActiveId();
  if(existing)dayLogStop(existing);
  const ev=dayLogAdd(title,now,null,'manual',null,{running:true});
  window.__dayLogActive=ev?.id||null;
  if(input)input.value='';
  haptic(10);render();
}
function dayLogStop(id=window.__dayLogActive){
  if(!id)id=dayLogActiveId();
  if(!id)return;
  const ev=dayLogEvents(todayKey()).find(e=>e.id===id);
  if(!ev)return;
  ev.end=dayLogNowISO();ev.meta={...(ev.meta||{}),running:false};
  dayLogPersist(todayKey());window.__dayLogActive=null;haptic(10);render();
}
function dayLogToggle(){if(dayLogActiveId())dayLogStop();else dayLogStart();}
function dayLogAddManual(){
  const input=document.querySelector('#dayLogInput'),title=(input?.value||'').trim();
  if(!title)return;
  const now=dayLogNowISO();dayLogAdd(title,now,now,'manual');
  if(input)input.value='';haptic(8);render();
}
function dayLogEdit(id,key=todayKey()){
  const ev=dayLogEvents(key).find(e=>e.id===id);if(!ev)return;
  const fmtTime=iso=>{
    const mins=dayLogMinutes(iso);if(mins==null)return '';
    return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  };
  const old=document.getElementById('dayLogEditModal');if(old)old.remove();
  const modal=document.createElement('div');
  modal.id='dayLogEditModal';
  modal.className='daylog-edit-modal';
  uiHTML(modal,`<div class="daylog-edit-backdrop" role="button" tabindex="0" aria-label="Close editor" ${ui('click','dayLogEditClose')} ${ui('keydown','activate')}></div>
    <div class="daylog-edit-card" role="dialog" aria-modal="true" aria-labelledby="daylogEditTitle">
      <div class="daylog-edit-head"><div><div class="daylog-edit-kicker">EDIT ACTIVITY</div><div id="daylogEditTitle" class="daylog-edit-title">DAY LOG</div></div><button type="button" ${ui('click','dayLogEditClose')} aria-label="Close">×</button></div>
      <label>ACTIVITY<input id="daylogEditName" type="text" maxlength="120" value="${dayLogEsc(ev.title)}" autocomplete="off"></label>
      <div class="daylog-edit-times">
        <label>START<input id="daylogEditStart" type="time" value="${fmtTime(ev.start)}"></label>
        ${ev.end?`<label>END<input id="daylogEditEnd" type="time" value="${fmtTime(ev.end)}"></label>`:''}
      </div>
      <div class="daylog-edit-actions"><button type="button" class="secondary" ${ui('click','dayLogEditClose')}>CANCEL</button><button type="button" ${ui('click','dayLogEditSave' ,id,key)}>SAVE</button></div>
    </div>`);
  document.body.appendChild(modal);
  setTimeout(()=>document.getElementById('daylogEditName')?.focus(),30);
}
function dayLogEditClose(){document.getElementById('dayLogEditModal')?.remove();}
function dayLogEditSave(id,key){
  const ev=dayLogEvents(key).find(e=>e.id===id);if(!ev)return;
  const title=(document.getElementById('daylogEditName')?.value||'').trim();
  const sm=document.getElementById('daylogEditStart')?.value||'';
  const endEl=document.getElementById('daylogEditEnd');
  const em=endEl?endEl.value:null;
  const valid=/^\d{2}:\d{2}$/.test(sm)&&(em==null||/^\d{2}:\d{2}$/.test(em));
  if(!valid){alert('Please enter a valid time.');return;}
  const parse=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;};
  const a=parse(sm),b=em==null?null:parse(em);
  if(a>1439||(b!=null&&b>1439)||(b!=null&&b<a)){alert('End must be after start.');return;}
  const sleepWake=dayLogIsSleepWake(ev);
  const start=dayLogDateTime(key,a).toISOString(),end=sleepWake?null:(b==null?null:dayLogDateTime(key,b).toISOString());
  Object.assign(ev,{title:title||ev.title,start,end});
  dayLogPersist(key);dayLogEditClose();render();
}
function dayLogGapEvents(key){
  const evs=dayLogSort(dayLogEvents(key)).filter(e=>!dayLogIsSleepWake(e));let prev=null,gaps=[];
  for(const e of evs){
    const s=dayLogMinutes(e.start),en=dayLogMinutes(e.end);
    if(s==null)continue;
    if(prev!=null&&s>prev)gaps.push({start:prev,end:s,duration:s-prev});
    if(en!=null)prev=Math.max(prev??0,en);else prev=Math.max(prev??0,s);
  }
  return gaps;
}
function dayLogSummary(key){
  const evs=dayLogSort(dayLogEvents(key)),gaps=dayLogGapEvents(key);
  const tracked=evs.reduce((n,e)=>n+(dayLogDuration(e)||0),0);
  return {tracked,gap:gaps.reduce((n,g)=>n+g.duration,0),events:evs.length,gaps};
}
function dayLogRender(key=todayKey()){
  const box=document.querySelector('#dayLogList'),summary=document.querySelector('#dayLogSummary'),status=document.querySelector('#dayLogStatus');
  if(!box)return;
  const evs=dayLogSort(dayLogEvents(key));let html='';
  evs.forEach(e=>{
    const dur=dayLogDuration(e), running=!e.end&&!dayLogIsSleepWake(e);
    html+=`<div class="dl-event" data-id="${dayLogEsc(e.id)}">
      <div class="dl-time">${new Date(e.start).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}${e.end?`–${new Date(e.end).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:' · NOW'}</div>
      <div class="dl-main" role="button" tabindex="0" aria-label="Edit activity" ${ui('click','dayLogEdit' ,e.id,key)} ${ui('keydown','activate')}>
        <div class="dl-title">${dayLogEsc(e.title)} ${e.meta?.light?'<span class="dl-light">½</span>':''}</div>
        <div class="dl-meta">${dayLogTypeLabel(e.type)}${dur!=null?` · ${dayLogFmt(dur)}`:''}${running?' · RUNNING':''}</div>
      </div>
      <div class="dl-actions">
        ${running?`<button class="dl-stop" type="button" ${ui('click','dayLogStop' ,e.id)}>STOP</button>`:''}
        <button class="dl-del" type="button" aria-label="Delete activity" ${ui('click','dayLogDelete' ,e.id,key)}>×</button>
      </div>
    </div>`;
  });
  const gaps=dayLogGapEvents(key);
  gaps.forEach((g,i)=>{
    // Inserted separately below; the compact list still shows a summary banner.
  });
  if(!html)html='<div class="dl-empty">No activities logged yet. Start something and shaah will build the timeline.</div>';
  uiHTML(box,html);
  const s=dayLogSummary(key);
  if(summary)summary.textContent=`${dayLogFmt(s.tracked)} tracked · ${dayLogFmt(s.gap)} untracked · ${s.events} events`;
  if(status)status.textContent=s.gaps.length?`${s.gaps.length} gap${s.gaps.length===1?'':'s'} to review`:'No gaps';
  const btn=document.querySelector('#dayLogStartBtn');
  if(btn)btn.textContent=dayLogActiveId()?'STOP':'START';
}
function dayLogRenderRecap(key=todayKey()){
  const el=document.querySelector('#dayLogRecap');if(!el)return;
  const s=dayLogSummary(key),evs=s.events?dayLogSort(dayLogEvents(key)):[];
  const by={manual:0,habit:0,routine:0};
  evs.forEach(e=>{by[e.type]=(by[e.type]||0)+(dayLogDuration(e)||0);});
  const top=Object.entries(by).sort((a,b)=>b[1]-a[1]);
  const longest=[...evs].filter(e=>dayLogDuration(e)!=null).sort((a,b)=>dayLogDuration(b)-dayLogDuration(a)).slice(0,3);
  uiHTML(el,`
    <div class="dl-recap-grid">
      <div><b>${dayLogFmt(s.tracked)}</b><span>TRACKED</span></div>
      <div><b>${dayLogFmt(s.gap)}</b><span>UNTRACKED</span></div>
      <div><b>${s.events}</b><span>EVENTS</span></div>
    </div>
    <div class="dl-recap-row"><span>MANUAL</span><b>${dayLogFmt(by.manual)}</b></div>
    <div class="dl-recap-row"><span>HABITS</span><b>${dayLogFmt(by.habit)}</b></div>
    <div class="dl-recap-row"><span>ROUTINES</span><b>${dayLogFmt(by.routine)}</b></div>
    ${longest.length?`<div class="dl-longest"><div class="dl-recap-label">LONGEST BLOCKS</div>${longest.map(e=>`<div><span>${dayLogEsc(e.title)}</span><b>${dayLogFmt(dayLogDuration(e))}</b></div>`).join('')}</div>`:''}
  `);
}
function dayLogInit(){
  dayLogMigrateLocal();
  window.__dayLogActive=dayLogActiveId();
  dayLogRender();
}

const BUILD="20260920-rebuild-v1";
let AUTH_ERR = null;
let _signOutNotice='',_signOutStatus='',_signOutBusy=false;
let USER = null;      // signed-in Supabase user
let _state = {};      // { "YYYY-MM-DD": {checks,social,note} }
let _live = false;    // realtime channel connected

// ── localStorage helpers (cache only; Supabase is source of truth) ──
const get=k=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}};
const set=(k,v)=>{
  try{ const str=JSON.stringify(v); localStorage.setItem(k,str);
       return true;
  }catch(e){
    return false;
  }};
const del=k=>{try{localStorage.removeItem(k);}catch(e){}};

// ═══ CONFIG (editable in Settings, synced via Supabase) ═══
const DEFAULT_CFG={
  tz:'device',
  pill:'chips',   // 'chips' | 'slim' | 'circle'
  nightFrom:20.5,
  nightUntil:7,   // night layout runs 20:30 → 07:00 // hour (decimal) after which TODAY leads with note + checklist — 20.5 = 8:30pm
  h:{
    wod:        {l:"Exercise",    p:20, i:"⚡", lv:1, on:true, routine:true},
    work:       {l:"Deep Work",   p:20, i:"💼", lv:1, on:true},
    production: {l:"Create",      p:15, i:"🎨", lv:1, on:true, routine:true},
    sleep:      {l:"Wake Up and Sleep Early", p:10, i:"🌙", lv:2, on:true},
    meditation: {l:"Meditate",    p:10, i:"🧘", lv:2, on:true},
    pray:       {l:"Read",        p:8,  i:"📖", lv:2, on:true},
    nofap:      {l:"Self-control",p:6,  i:"🔒", lv:2, on:false},
    social:     {l:"Social",      p:18, i:"👥", lv:3, on:true, combo:true},
    nosmoke:    {l:"No Junk Food",p:6,  i:"🥗", lv:3, on:true},
    pomodoro:   {l:"Focus Block", p:5,  i:"🍅", lv:3, on:true},
  },
  order:["wod","work","production","sleep","meditation","pray","nofap","social","nosmoke","pomodoro"],
  routines:{
    wod:{label:"Exercise",icon:"⚡",col:"#e2e2e2",steps:[
      {id:"warmup",label:"Warm up",dur:10,icon:"🔥"},
      {id:"main",label:"Main set",dur:35,icon:"⚡"},
      {id:"cool",label:"Cool down",dur:10,icon:"🧊"},
      {id:"fuel",label:"Refuel",dur:5,icon:"🥛"},
    ]},
    production:{label:"Create",icon:"🎨",col:"#a78bfa",steps:[
      {id:"setup",label:"Set up your space",dur:5,icon:"💻",ses:1},
      {id:"warm",label:"Warm up / references",dur:10,icon:"🎧",ses:1},
      {id:"build",label:"Build the core idea",dur:30,icon:"🔁",ses:1},
      {id:"break",label:"Break — step away",dur:15,icon:"☕",ses:"break",isBreak:true},
      {id:"refine",label:"Refine & finish",dur:25,icon:"✨",ses:2},
      {id:"save",label:"Save & archive",dur:5,icon:"💾",ses:2},
    ]},
  },
};

const LEGACY_CFG={
  tz:'device',
  nightFrom:20.5, // hour (decimal) after which TODAY leads with note + checklist — 20.5 = 8:30pm
  h:{
    wod:        {l:"WOD",         p:15, i:"⚡", lv:1, on:true, routine:true},
    work:       {l:"Work",        p:20, i:"💼", lv:1, on:true},
    production: {l:"Production",  p:20, i:"🎵", lv:1, on:true, routine:true},
    nofap:      {l:"NoFap",       p:10, i:"🔒", lv:2, on:true},
    sleep:      {l:"Wake Up and Sleep Early", p:8,  i:"🌙", lv:2, on:true},
    meditation: {l:"Meditation",  p:8,  i:"🧘", lv:2, on:true},
    pray:       {l:"Pray",        p:8,  i:"🙏", lv:2, on:true},
    social:     {l:"Social Combo",p:18, i:"👥", lv:3, on:true, combo:true},
    nosmoke:    {l:"No Smoking",    p:6,  i:"🚭", lv:3, on:true},
    pomodoro:   {l:"Pomodoro",    p:5,  i:"🍅", lv:3, on:true},
  },
  order:["wod","work","production","nofap","sleep","meditation","pray","social","nosmoke","pomodoro"],
  routines:{
    wod:{label:"WOD",icon:"⚡",col:"#e2e2e2",steps:[
      {id:"pre",label:"Pre-workout & supplements",dur:5,icon:"💊"},
      {id:"dress",label:"Get dressed",dur:5,icon:"👟"},
      {id:"walk",label:"Walk to the spot",dur:10,icon:"🚶"},
      {id:"warmup",label:"Warm up",dur:10,icon:"🔥"},
      {id:"workout",label:"Workout",dur:40,icon:"⚡"},
      {id:"cool",label:"Cool down",dur:10,icon:"🧊"},
      {id:"back",label:"Walk back",dur:10,icon:"🏠"},
      {id:"protein",label:"Protein & carbs",dur:10,icon:"🥛"},
    ]},
    production:{label:"Production",icon:"🎵",col:"#a78bfa",steps:[
      {id:"setup",label:"Setup & open DAW",dur:5,icon:"💻",ses:1},
      {id:"refs",label:"Listen to references",dur:10,icon:"🎧",ses:1},
      {id:"freeplay",label:"Free play / find the idea",dur:15,icon:"🎹",ses:1},
      {id:"loop",label:"Build the core loop",dur:30,icon:"🔁",ses:1},
      {id:"drop",label:"Develop drop / hook",dur:20,icon:"🎶",ses:1},
      {id:"save1",label:"Save & export draft",dur:10,icon:"💾",ses:1},
      {id:"break",label:"Break — eat, walk",dur:30,icon:"☕",ses:"break",isBreak:true},
      {id:"listen2",label:"Fresh ears — listen",dur:10,icon:"👂",ses:2},
      {id:"arrange",label:"Arrangement & structure",dur:25,icon:"📐",ses:2},
      {id:"layers",label:"Layers & textures",dur:20,icon:"🎼",ses:2},
      {id:"mix",label:"Mix pass",dur:20,icon:"🎚",ses:2},
      {id:"master",label:"Master & bounce",dur:10,icon:"📀",ses:2},
      {id:"archive",label:"Label & archive",dur:5,icon:"🗂",ses:2},
    ]},
  }
};
const TIMEZONES=[
  {id:"device",  label:"Automatic (device)"},
  {id:"Asia/Jerusalem",   label:"Israel — Jerusalem"},
  {id:"America/Panama",   label:"Panama"},
  {id:"America/Mexico_City",label:"Mexico"},
  {id:"America/Bogota",   label:"Colombia"},
  {id:"America/Argentina/Buenos_Aires",label:"Argentina"},
  {id:"Europe/Madrid",    label:"Spain"},
  {id:"America/New_York", label:"USA — Eastern"},
];
let CFG=JSON.parse(JSON.stringify(DEFAULT_CFG));

const LVL_COL={1:"#e2e2e2",2:"#a78bfa",3:"#fbbf24"};
let LVL1=[],LVL2=[],LVL3=[],ROUTINES={},MAX=0,LVL1_MAX=0,LVL2_MAX=0,LVL3_MAX=0;

// Points are user-editable, so never trust them: clamp to a sane integer.
function safePts(v){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(999,n)):0;}
// A routine habit (wod, production) can be logged LIGHT (0.5) as well as FULL (true).
// Every other habit stays boolean — this reads either shape the same way.
function doneFrac(v){return v===true?1:(typeof v==="number"&&v>0&&v<1?v:0);}
// These habits use the same three-state scoring cycle as routines: none → half → full → none.
function halfCreditItem(id){return id==='work'||id==='sleep';}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
// A JavaScript string inside a quoted HTML event attribute needs both contexts
// protected. Encode data as UTF-16 escapes; never treat a stored ID as code.
// Ordinary legacy IDs keep their exact value and their history references.
// UI data is JSON, never JavaScript. Only these fixed, typed actions may run.
const uiRule=(event,args,run,stop=false)=>Object.freeze({event,args:Object.freeze(args),run,stop});
const UI_ACTIONS=Object.freeze({
  historyBackupDownload:uiRule('click',[],()=>historyBackupDownload()),
  historyBackupVerifyFile:uiRule('change',[],n=>historyBackupVerify(n.files?.[0])),
  historyRestoreFile:uiRule('change',[],n=>historyRestorePreview(n.files?.[0])),
  historyRepairApply:uiRule('click',[],()=>historyCommit(false)),
  historyRepairRestore:uiRule('click',[],()=>historyCommit(true)),
  socialFamilyToggle:uiRule('click',[],()=>{socialFamilyIncluded=!socialFamilyIncluded;render();}),
  socialDirectoryToggle:uiRule('click',[],()=>socialDirectoryToggle()),
  socialBulkToggle:uiRule('click',[],()=>{socialBulkOpen=!socialBulkOpen;}),
  socialPeopleToggle:uiRule('click',[],()=>{socialPeopleOpen=!socialPeopleOpen;render();}),
  socialRecord:uiRule('click',['string','string'],(n,e,id,key)=>socialRecord(id,key),true),
  socialViewSet:uiRule('click',['string'],(n,e,v)=>socialViewSet(v)),
  socialGroupName:uiRule('input',[],n=>socialGroupName(n.value)),
  socialGroupSave:uiRule('click',[],()=>socialGroupSave()),
  socialGroupCancel:uiRule('click',[],()=>socialGroupCancel()),
  socialManage:uiRule('click',[],()=>socialManage()),
  socialSearch:uiRule('input',[],n=>socialSearch(n.value)),
  socialNew:uiRule('click',['string'],(n,e,k)=>socialNew(k)),
  socialEdit:uiRule('click',['string'],(n,e,id)=>socialEdit(id)),
  socialCancel:uiRule('click',[],()=>socialCancel()),
  socialSave:uiRule('click',[],()=>socialSave()),
  socialDraftName:uiRule('input',[],n=>socialDraftField('name',n.value)),
  socialDraftEvery:uiRule('input',[],n=>socialDraftField('every',n.value)),
  socialDraftSub:uiRule('change',[],n=>socialDraftField('sub',n.value)),
  socialDraftRelationship:uiRule('change',[],n=>socialDraftField('relationship',n.value)),
  socialDirectorySearch:uiRule('input',[],n=>socialDirectorySet('query',n.value)),
  socialDirectoryGroup:uiRule('change',[],n=>socialDirectorySet('group',n.value)),
  socialDirectoryCategory:uiRule('change',[],n=>socialDirectorySet('category',n.value)),
  socialRomanticLimitSet:uiRule('change',[],n=>socialRomanticLimitSet(n.value)),
  socialCategoryToggle:uiRule('click',['string','string'],(n,e,id,k)=>socialCategoryToggle(id,k),true),
  socialNewCategory:uiRule('click',['string','string'],(n,e,k,id)=>socialNew(k,id),true),
  workMilestonesSummary:uiRule('input',[],()=>workMilestonesSummary(),true),
  workMilestonesAdd:uiRule('click',[],()=>workMilestonesChange(-1),true),
  workMilestonesDelete:uiRule('click',['number'],(n,e,i)=>workMilestonesChange(i),true),
  workMilestonesSave:uiRule('click',[],()=>workMilestonesSave(),true),
  workPhaseAdvance:uiRule('click',['string'],(n,e,k)=>workPhaseAdvance(k),true),
  workPhaseToggle:uiRule('click',['string'],(n,e,k)=>workPhaseToggle(k)),
  workPhaseSet:uiRule('click',['string','number'],(n,e,k,v)=>workPhaseSet(k,v),true),
  socialDraftLocation:uiRule('change',['string'],(n,e,id)=>socialDraftLocation(id,n.checked)),

  setTab:uiRule('click',['tab'],(n,e,id)=>setTab(id)),
  setSkin:uiRule('click',['skin'],(n,e,id)=>setSkin(id)),
  activate:uiRule('keydown',[],(n,e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();n.click();}}),
  stop:uiRule('click',[],()=>{},true),
  exportUnownedDayLogs:uiRule('click',[],()=>exportUnownedDayLogs()),
  dayLogEditClose:uiRule('click',[],()=>dayLogEditClose()),
  dayLogEditSave:uiRule('click',['string','string'],(n,e,id,key)=>dayLogEditSave(id,key)),
  dayLogEdit:uiRule('click',['string','string'],(n,e,id,key)=>dayLogEdit(id,key)),
  dayLogStop:uiRule('click',['string'],(n,e,id)=>dayLogStop(id),true),
  dayLogDelete:uiRule('click',['string','string'],(n,e,id,key)=>{dayLogDelete(id,key);render();},true),
  bulkPeopleSearch:uiRule('input',[],n=>bulkPeopleSearch(n.value)),
  bulkPeopleSetScope:uiRule('click',['scope'],(n,e,scope)=>bulkPeopleSetScope(scope)),
  bulkPeopleSelectVisible:uiRule('click',['boolean'],(n,e,on)=>bulkPeopleSelectVisible(on)),
  bulkPeopleToggle:uiRule('change',['string'],(n,e,id)=>bulkPeopleToggle(id,n.checked)),
  bulkPeopleApply:uiRule('click',['string','membership'],(n,e,id,action)=>bulkPeopleApply(id,action)),
  locationSelect:uiRule('change',[],n=>locationSelect(n.value)),
  resolveCfgConflict:uiRule('click',['resolution'],(n,e,choice)=>resolveCfgConflict(choice)),
  flushCfgSaves:uiRule('click',[],()=>flushCfgSaves()),
  exportUnownedOffline:uiRule('click',[],()=>exportUnownedOffline()),
  closeReview:uiRule('click',[],()=>closeReview()),
  toggleSec:uiRule('click',['string'],(n,e,key)=>toggleSec(key)),
  cfgLevel:uiRule('change',['string'],(n,e,id)=>cfgLevel(id,Number(n.value))),
  cfgMove:uiRule('click',['string','integer'],(n,e,id,d)=>cfgMove(id,d)),
  cfgSet:uiRule('change',['string','habitField'],(n,e,id,field)=>cfgSet(id,field,field==='i'?n.value.slice(0,3):n.value)),
  cfgVacationPoints:uiRule('change',['string'],(n,e,id)=>cfgEdit(()=>{ensureModePts(CFG.h[id]);CFG.h[id].pVacation=Math.max(0,parseInt(n.value)||0);CFG.h[id].p=modePts(CFG.h[id],travelMode());})),
  cfgToggle:uiRule('click',['string'],(n,e,id)=>cfgToggle(id)),
  cfgDel:uiRule('click',['string'],(n,e,id)=>cfgDel(id)),
  cfgAdd:uiRule('click',['integer'],(n,e,level)=>cfgAdd(level)),
  closeSettings:uiRule('click',[],()=>closeSettings()),
  cfgTz:uiRule('change',[],n=>cfgTz(n.value)),
  cfgPill:uiRule('click',['string'],(n,e,id)=>cfgPill(id)),
  startTour:uiRule('click',[],()=>startTour()),
  exportData:uiRule('click',[],()=>exportData()),
  importPick:uiRule('click',[],()=>importPick()),
  restoreDefaults:uiRule('click',[],()=>{if(confirm('Restore all default settings?')){CFG=JSON.parse(JSON.stringify(DEFAULT_CFG));saveCfg();render();}}),
  signOut:uiRule('click',['boolean'],(n,e,forget)=>signOut(forget)),
  setTravelMode:uiRule('click',['mode'],(n,e,id)=>setTravelMode(id)),
  setTravelResume:uiRule('change',[],n=>setTravelResume(n.value)),
  setTravelAuto:uiRule('click',['boolean'],(n,e,on)=>setTravelAuto(on)),
  subSet:uiRule('change',['integer','socialField'],(n,e,i,field)=>subSet(i,field,n.value)),
  subToggle:uiRule('click',['integer'],(n,e,i)=>subToggle(i)),
  subDel:uiRule('click',['integer'],(n,e,i)=>subDel(i)),
  subAdd:uiRule('click',[],()=>subAdd()),
  stepSet:uiRule('change',['string','integer','stepField'],(n,e,id,i,field)=>stepSet(id,i,field,n.value)),
  locationAdd:uiRule('click',[],()=>locationAdd()),
  locationRename:uiRule('click',['string'],(n,e,id)=>locationRename(id)),
  setPeopleSettingsFilter:uiRule('click',['string'],(n,e,filter)=>setPeopleSettingsFilter(filter)),
  personSet:uiRule('change',['string','personField'],(n,e,id,field)=>personSet(id,field,n.value)),
  personSetInactive:uiRule('change',['string'],(n,e,id)=>personSetInactive(id,n.checked)),
  personDel:uiRule('click',['string'],(n,e,id)=>personDel(id)),
  locationTogglePerson:uiRule('change',['string','string'],(n,e,id,group)=>locationTogglePerson(id,group)),
  personAdd:uiRule('click',['string'],(n,e,id)=>personAdd(id)),
  personAddDay:uiRule('click',['string','string'],(n,e,id,key)=>socialNew(key,id),true),
  bakRestore:uiRule('click',['integer'],(n,e,i)=>bakRestore(i)),
  signIn:uiRule('click',[],()=>signIn()),
  openRoutine:uiRule('click',['string'],(n,e,id)=>openRoutine(id)),
  discardRoutine:uiRule('click',['string'],(n,e,id)=>{if(confirm('Discard this session?'))closeRoutine(id);},true),
  tourDone:uiRule('click',[],()=>tourDone()),
  tourGo:uiRule('click',['integer'],(n,e,step)=>tourGo(step)),
  tourPractice:uiRule('click',['string'],(n,e,kind)=>tourPractice(kind)),
  tourPracticeEnter:uiRule('keydown',[],(n,e)=>{if(e.key==='Enter'){e.preventDefault();tourPractice('log');}}),
  tourDraft:uiRule('input',[],(n,e)=>{if(tourStep!==null&&TOUR[tourStep].demo==='log')tourDemo.draft=n.value.slice(0,80);}),
  openSettings:uiRule('click',[],()=>openSettings()),
  handleSocial:uiRule('click',['string'],(n,e,key)=>handleSocial(key)),
  toggleSocialExpand:uiRule('click',['string'],(n,e,key)=>toggleSocialExpand(key),true),
  toggleSub:uiRule('click',['string','string'],(n,e,id,key)=>toggleSub(id,key)),
  togglePerson:uiRule('click',['string','string'],(n,e,id,key)=>togglePerson(id,key),true),
  toggleLevelAll:uiRule('click',['integer','string'],(n,e,level,key)=>toggleLevelAll(level,key),true),
  openDayLogStart:uiRule('click',[],()=>openDayLogStart()),
  toggleTodayRoutines:uiRule('click',[],n=>toggleTodayRoutines(n)),
  setHabitState:uiRule('click',['string','string','mark'],(n,e,id,key,value)=>setHabitState(id,key,value),true),
  productEndAsk:uiRule('click',['string'],(n,e,id)=>{productEndId=id;render();},true),
  productEndCancel:uiRule('click',[],()=>{productEndId=null;render();},true),
  productEndConfirm:uiRule('click',['string'],(n,e,id)=>{productEndId=null;finishRoutineEarly(id);},true),
  startRoutine:uiRule('click',['string'],(n,e,id)=>startRoutine(id),true),
  startRoutineNested:uiRule('click',['string'],(n,e,id)=>startRoutine(id),true),
  toggleLvl:uiRule('click',['integer'],(n,e,level)=>toggleLvl(level)),
  toggleHabit:uiRule('click',['string','string'],(n,e,id,key)=>toggleHabit(id,key)),
  dayLogEnter:uiRule('keydown',[],(n,e)=>{if(e.key==='Enter')dayLogToggle();}),
  dayLogToggle:uiRule('click',[],()=>dayLogToggle()),
  noteGrow:uiRule('input',[],n=>noteGrow(n)),
  setNote:uiRule('change',['string'],(n,e,key)=>setNote(key,n.value)),
  resetDay:uiRule('click',['string'],(n,e,key)=>requestResetDay(key),true),
  resetDayCancel:uiRule('click',[],()=>{resetDayRequest=null;render();},true),
  resetDayConfirm:uiRule('click',['string'],(n,e,key)=>confirmResetDay(key),true),
  resetDayEscape:uiRule('keydown',[],(n,e)=>{if(e.key==='Escape'){resetDayRequest=null;render();}},true),
  dayLogPanelSelect:uiRule('click',['string'],(n,e,id)=>dayLogPanelSelect(id)),
  dayLogPanelSelectNested:uiRule('click',['string'],(n,e,id)=>dayLogPanelSelect(id),true),
  dayLogPanelNew:uiRule('click',[],()=>dayLogPanelNew()),
  dayLogPanelCancel:uiRule('click',[],()=>dayLogPanelCancel()),
  dayLogPanelSave:uiRule('click',['string'],(n,e,key)=>dayLogPanelSave(key)),
  dayLogPanelDelete:uiRule('click',['string'],(n,e,key)=>dayLogPanelDelete(key)),
  closeEditDay:uiRule('click',[],()=>closeEditDay()),
  socialShift:uiRule('click',['integer'],(n,e,d)=>socialShift(d)),
  socialToday:uiRule('click',[],()=>socialToday()),
  setHistTab:uiRule('click',['string'],(n,e,tab)=>setHistTab(tab)),
  openEditDay:uiRule('click',['string'],(n,e,key)=>openEditDay(key)),
  histMonthShift:uiRule('click',['integer'],(n,e,d)=>histMonthShift(d)),
  finishRoutine:uiRule('click',[],()=>finishRoutine()),
  exitRoutine:uiRule('click',[],()=>exitRoutine()),
  discardCurrentRoutine:uiRule('click',[],()=>{if(confirm('Discard this routine session?'))closeRoutine();}),
  routineReset:uiRule('click',[],()=>routineReset()),
  routineFinishEarly:uiRule('click',['string'],(n,e,id)=>finishRoutineEarly(id),true),
  routineToggle:uiRule('click',[],()=>routineToggle()),
  routineNext:uiRule('click',['string','integer'],(n,e,id,step)=>{if(e.detail<2)routineNext(id,step);},true),
  routineResume:uiRule('click',['string'],(n,e,id)=>resumeRoutine(id),true),
  routineSendToEnd:uiRule('click',[],()=>routineSendToEnd())
});
const UI_ENUMS=Object.freeze(Object.fromEntries(Object.entries({
  tab:['today','log','social','stats','history'],skin:SKINS.map(s=>s.id),
  scope:['all','unassigned'],membership:['add','remove'],resolution:['server','local'],
  mode:['work','vacation'],habitField:['i','l','p','pWork'],socialField:['icon','label','pWork','pVacation'],
  stepField:['label','dur'],personField:['name','sub','every']
}).map(([key,values])=>[key,Object.freeze(values)])));
function uiValid(rule,type,args){
  if(!rule||rule.event!==type||!Array.isArray(args)||args.length!==rule.args.length)return false;
  return rule.args.every((kind,i)=>Object.hasOwn(UI_ENUMS,kind)?UI_ENUMS[kind].includes(args[i]):kind==='integer'?Number.isSafeInteger(args[i]):kind==='mark'?[false,true,0.5].includes(args[i]):typeof args[i]===kind);
}
function ui(type,name,...args){
  const rule=Object.hasOwn(UI_ACTIONS,name)?UI_ACTIONS[name]:null;
  if(!uiValid(rule,type,args))throw new Error('Invalid UI action');
  return `data-ui-${type}="${name}" data-ui-${type}-args="${esc(JSON.stringify(args))}"`;
}
function uiDispatch(event){
  if(!['click','input','change','keydown'].includes(event.type))return;
  for(const node of event.composedPath()){
    if(node===document)break;
    if(node?.nodeType!==1)continue;
    const attr='data-ui-'+event.type,name=node.getAttribute(attr);
    if(!name||!Object.hasOwn(UI_ACTIONS,name))continue;
    if(node.matches(':disabled')||node.closest('[inert]'))return;
    const rule=UI_ACTIONS[name];let args;
    try{args=JSON.parse(node.getAttribute(attr+'-args')||'[]');}catch(e){continue;}
    if(!uiValid(rule,event.type,args))continue;
    // An old child handler stopped propagation before document listeners ran.
    // Stop later document listeners too, then stop walking the captured path.
    if(rule.stop)event.stopImmediatePropagation();
    rule.run(node,event,...args);
    if(rule.stop||event.cancelBubble)break;
  }
}
for(const type of ['click','input','change','keydown'])document.addEventListener(type,uiDispatch);
function safeColor(v,fallback='#9090aa'){
  if(typeof v!=='string'||!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(v))return fallback;
  const full=v.length<=5?'#'+v.slice(1).split('').map(c=>c+c).join(''):v;
  return full.slice(0,7); // Views compose their own alpha suffix from an RGB base.
}
function safeDuration(v){const n=Number(v);return Number.isFinite(n)?Math.max(1,Math.min(600,n)):1;}
function routineViews(input){
  const out=Object.create(null);
  if(!input||typeof input!=='object'||Array.isArray(input))return out;
  for(const [id,r] of Object.entries(input)){
    if(!r||typeof r!=='object'||!Array.isArray(r.steps)||!r.steps.length
      ||r.steps.some(s=>!s||typeof s!=='object'||Array.isArray(s)))continue;
    out[id]={...r,col:safeColor(r.col),steps:r.steps.map(s=>({...s,dur:safeDuration(s.dur)}))};
  }
  return out; // Do not rewrite stored metadata or renumber historical steps.
}
const SOCIAL_SUBS_BASE=[{id:"flirt",label:"Flirting",icon:"💘"},{id:"strangers",label:"Strangers",icon:"🤝"},{id:"friends",label:"Friends",icon:"👫"}];
// The combo divides its points by how many sub-items exist, so the list has to
// ride the config timeline too — otherwise adding one would turn every past
// "3 of 3" day into "3 of 4" and quietly dock the score.
function subsList(){return (Array.isArray(CFG.subs)&&CFG.subs.length)?CFG.subs:SOCIAL_SUBS_BASE;}
// Paused parts don't count and don't divide — same rule as a paused habit.
const subsOn=l=>l.filter(x=>x.on!==false);
function comboIdIn(h){ for(const id of Object.keys(h)) if(h[id]&&h[id].combo) return id; return null; }
// Parts written before points were per-part fall back to the even split that was
// in force in THEIR era, so every old day keeps exactly the score it had.
function modeKey(mode){return mode==='vacation'?'vacation':'work';}
function modePts(x,mode){
  if(!x)return 0;
  const v=modeKey(mode)==='vacation'?x.pVacation:x.pWork;
  return v!=null?safePts(v):safePts(x.p);
}
function ensureModePts(x){
  if(!x)return;
  const p=safePts(x.p);
  if(x.pWork==null)x.pWork=p;
  if(x.pVacation==null)x.pVacation=p;
}
function resolveSubs(list,comboPts,mode){
  const n=list.length||1;
  return list.map(x=>{
    const y={...x};
    // Resolve an absent legacy price before normalization can turn it into zero.
    // Explicit zeroes and per-mode prices must keep their original meaning.
    if(y.pWork==null)y.pWork=y.p!=null?safePts(y.p):Math.round(comboPts/n);
    if(y.pVacation==null)y.pVacation=y.p!=null?safePts(y.p):Math.round(comboPts/n);
    y.p=modePts(y,mode);
    return y;
  });
}
function subsFor(h,list,mode){
  const base=(Array.isArray(list)&&list.length)?list:SOCIAL_SUBS_BASE;
  const cid=comboIdIn(h);
  const cp=cid&&h[cid]?modePts(h[cid],mode):18;
  return subsOn(resolveSubs(base,cp,mode));
}
function levelsFor(h,order,n,subs,mode,key=todayKey()){
  return order.filter(id=>h[id]&&h[id].lv===n&&h[id].on!==false&&!(modeKey(mode)==='vacation'&&id==='work'))
    .map(id=>({id,label:h[id].l,
               pts:(id==='work'&&coreLayoutFor(key)&&modeKey(mode)==='work')?workMilestoneRules(key).reduce((n,p)=>n+p.points,0):(h[id].combo&&subs)?subs.reduce((a,x)=>a+x.p,0):modePts(h[id],mode),
               icon:h[id].i,col:LVL_COL[n],routine:!!h[id].routine,combo:!!h[id].combo}));
}
function buildLevel(n){ const m=travelMode(); return levelsFor(CFG.h,CFG.order,n,subsFor(CFG.h,CFG.subs,m),m); }

// ── Config timeline ────────────────────────────────────────
// Every day is scored with the config that was in effect THAT day. Turning a
// habit off (or adding one) changes today forward and can never rewrite the past.
var CFG_EPOCH="0001-01-01";
var _dayCfgCache={};
function cfgSnap(){return{h:JSON.parse(JSON.stringify(CFG.h)),order:CFG.order.slice(),subs:JSON.parse(JSON.stringify(subsList())),mode:travelMode()};}
// The baseline that covers all history predating the timeline. A habit that was
// ticked on some past day was plainly active back then, so force it ON here —
// otherwise a habit switched off BEFORE this build existed (there was no timeline
// to record it) would silently erase its own history.
function cfgBaseline(){
  const b=cfgSnap();
  for(const k of Object.keys(_state)){
    if(!DATE_RE.test(k))continue;
    const ch=(_state[k]&&_state[k].checks)||{};
    for(const id of Object.keys(ch)){ if(ch[id]&&b.h[id])b.h[id].on=true; }
  }
  return b;
}
// Seal the baseline as soon as history is in memory — not lazily on the first
// edit, or the first edit would seal whatever (possibly already-wrong) state it finds.
// Adds "Family" to the Social Combo once, as its own era from today, so every
// earlier day keeps the 3-way split it was actually scored with.
const FAMILY_FROM="2026-09-09";   // David pidió Family desde el miércoles, no desde el día del update
// Garantiza que una parte del combo exista en todas las épocas desde `from` en adelante,
// partiendo la época vigente en esa fecha si hace falta. No reordena ni reescribe el resto
// de la config de ninguna época: solo añade la parte.
function ensureSubFrom(sub,from){
  subsEnsure();
  const lg=cfgLog();
  if(!lg.length){const b=cfgBaseline();lg.push({from:CFG_EPOCH,h:b.h,order:b.order,subs:b.subs,mode:b.mode,auto:true});}
  let i=0;
  for(let k=0;k<lg.length;k++){ if(lg[k].from<=from)i=k; else break; }
  if(lg[i].from<from){                       // corta una época nueva justo en esa fecha
    const e=lg[i];
    lg.splice(i+1,0,{from,h:JSON.parse(JSON.stringify(e.h)),order:e.order.slice(),
                     subs:JSON.parse(JSON.stringify(Array.isArray(e.subs)?e.subs:[])),mode:e.mode||travelMode()});
    i++;
  }
  for(let k=i;k<lg.length;k++){
    if(!Array.isArray(lg[k].subs))lg[k].subs=[];
    // Congelar los puntos que esa época ya tenía ANTES de meter nada: si sus partes no
    // llevan `p` explícito, el reparto se calcula con su número de partes, y añadir una
    // cambiaría el divisor y le movería el score a días pasados.
    const cid=comboIdIn(lg[k].h), cp=cid&&lg[k].h[cid]?safePts(lg[k].h[cid].p):18, n0=lg[k].subs.length||1;
    for(const x of lg[k].subs) if(x.p==null) x.p=Math.round(cp/n0);
    if(!lg[k].subs.some(x=>x.id===sub.id))lg[k].subs.push({...sub});
  }
  if(!CFG.subs.some(x=>x.id===sub.id))CFG.subs.push({...sub});
  syncComboPts(); _dayCfgCache={};
}
// Igual que ensureSubFrom pero para un hábito entero: existe desde `from` en adelante,
// y las épocas anteriores no se tocan (su MAX no se mueve).
function ensureHabitFrom(id,def,from,after){
  const lg=cfgLog();
  if(!lg.length){const b=cfgBaseline();lg.push({from:CFG_EPOCH,h:b.h,order:b.order,subs:b.subs,mode:b.mode,auto:true});}
  let i=0;
  for(let k=0;k<lg.length;k++){ if(lg[k].from<=from)i=k; else break; }
  if(lg[i].from<from){
    const e=lg[i];
    lg.splice(i+1,0,{from,h:JSON.parse(JSON.stringify(e.h)),order:e.order.slice(),
                     subs:JSON.parse(JSON.stringify(Array.isArray(e.subs)?e.subs:[])),mode:e.mode||travelMode()});
    i++;
  }
  const place=(h,order)=>{
    if(h[id])return;
    h[id]={...def};
    const at=after&&order.indexOf(after)>=0?order.indexOf(after)+1:order.length;
    order.splice(at,0,id);
  };
  for(let k=i;k<lg.length;k++)place(lg[k].h,lg[k].order);
  place(CFG.h,CFG.order);
  _dayCfgCache={};
}
// Aplica un cambio de configuración desde `from` en adelante: corta una época nueva
// en esa fecha si hace falta y aplica `fn` a esa época, a las posteriores y a la
// config viva. Las épocas anteriores no se tocan — el pasado conserva sus pesos.
function editFrom(from,fn){
  const lg=cfgLog();
  if(!lg.length){const b=cfgBaseline();lg.push({from:CFG_EPOCH,h:b.h,order:b.order,subs:b.subs,mode:b.mode,auto:true});}
  let i=0;
  for(let k=0;k<lg.length;k++){ if(lg[k].from<=from)i=k; else break; }
  if(lg[i].from<from){
    const e=lg[i];
    lg.splice(i+1,0,{from,h:JSON.parse(JSON.stringify(e.h)),order:e.order.slice(),
                     subs:JSON.parse(JSON.stringify(Array.isArray(e.subs)?e.subs:[])),mode:e.mode||travelMode()});
    i++;
  }
  for(let k=i;k<lg.length;k++)fn(lg[k].h,lg[k].subs||(lg[k].subs=[]));
  subsEnsure(); fn(CFG.h,CFG.subs);
  _dayCfgCache={};
}
// balV 1 = reequilibrio del 13/09: el esfuerzo real pesa más que el toque fácil.
// Solo mueve valores que siguen en su número por defecto; si ya los tocaste a mano,
// se respetan.
function rebalanceOnce(){
  if(CFG.balV>=1)return false;
  editFrom(todayKey(),(h,subs)=>{
    if(h.wod&&safePts(h.wod.p)===15)h.wod.p=20;          // el hábito más caro del día
    for(const x of (subs||[])) if(x&&safePts(x.p)===6)x.p=4;   // partes del combo
  });
  CFG.balV=1; syncComboPts(); applyCfg(); saveCfg();
  return true;
}
// junkV 1 = "No Junk Food" añadido aparte de "No Smoking", desde hoy.
function addJunkFoodOnce(){
  if(CFG.junkV>=1)return false;
  ensureHabitFrom("cjunk0",{l:"No Junk Food",p:6,i:"\u{1F957}",lv:3,on:true},todayKey(),"nosmoke");
  CFG.junkV=1;
  applyCfg(); saveCfg();
  return true;
}
// subsV 2 = Family colocada desde FAMILY_FROM. Los que ya tenían subsV 1 (Family desde el
// día del update) pasan por aquí otra vez y se les corrige la fecha de entrada.
function addFamilyOnce(){
  if(CFG.subsV>=2)return false;
  ensureSubFrom({id:"family",label:"Family",icon:"\u{1F46A}",p:6},FAMILY_FROM);
  CFG.subsV=2;
  saveCfg();
  return true;
}
// ── Travel mode: Vacation ⇄ Work ────────────────────────────
// David sale de Israel y vuelve; "Work" no tiene sentido puntuar igual en
// ambos casos. Esto es solo el INTERRUPTOR + el calendario — todavía no
// decide cómo repartir el 118% en cada modo (eso se habla aparte). Por ahora
// cambiar de modo únicamente enciende/apaga "work" desde hoy; el resto de
// pesos no se toca hasta que se defina la distribución.
function travelEnsure(){
  if(!CFG.travel||typeof CFG.travel!=='object')
    CFG.travel={mode:'work',auto:false,resumeOn:''};
}
// Normalize legacy travel-return dates. A malformed year such as 0026 is the
// same year 26 that the browser can display after an old date-input conversion;
// in this app the intended modern year is 20xx. Keep valid four-digit years
// untouched.
function normalizeTravelResume(){
  travelEnsure();
  const v=String(CFG.travel.resumeOn||'');
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if(!m)return false;
  const y=Number(m[1]);
  if(y>=100)return false;
  const fixed='20'+String(y).padStart(2,'0')+'-'+m[2]+'-'+m[3];
  CFG.travel.resumeOn=fixed;
  return true;
}
// The saved live mode controls today; dated entries control completed days.
// Browser storage is only a synchronized cache, never a competing authority.
function travelMode(){
  travelEnsure();
  return CFG.travel.mode==='vacation'?'vacation':'work';
}
// Switch ONLY the current era. Never rewrite an already-configured future era:
// that future era is the boundary where the next Work/Vacation period starts.
function applyTravelMode(mode){
  travelEnsure();
  mode=mode==='vacation'?'vacation':'work';
  const tk=todayKey(),lg=cfgLog();
  if(!lg.length){
    const b=cfgBaseline();
    lg.push({from:CFG_EPOCH,h:b.h,order:b.order,subs:b.subs,mode:b.mode,auto:true});
  }
  let i=0;
  for(let k=0;k<lg.length;k++){ if(lg[k].from<=tk)i=k; else break; }
  if(lg[i].from<tk){
    const e=lg[i];
    lg.splice(i+1,0,{
      from:tk,
      h:JSON.parse(JSON.stringify(e.h)),
      order:e.order.slice(),
      subs:JSON.parse(JSON.stringify(Array.isArray(e.subs)?e.subs:[])),
      mode
    });
    i++;
  }
  const e=lg[i];
  e.mode=mode;
  if(e.h&&e.h.work)e.h.work.on=(mode==='work');
  // Keep the live config in the selected mode, but DO NOT touch later eras.
  CFG.travel.mode=mode;
  if(CFG.h&&CFG.h.work)CFG.h.work.on=(mode==='work');
  // Do not reset the one-time 2026 return migration on manual switches.
  CFG.travelV=Math.max(Number(CFG.travelV)||0,10);
  _dayCfgCache={};
  applyCfg(); saveCfg();
}
function setTravelMode(mode){ haptic(10); persistTravelMode(mode); CFG.travel.auto=false; applyTravelMode(mode); render(); }
function setTravelAuto(v){ travelEnsure(); CFG.travel.auto=false; haptic(8); saveCfg(); render(); }
function setTravelResume(v){
  travelEnsure();
  const raw=/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';
  CFG.travel.resumeOn=raw;
  normalizeTravelResume();
  saveCfg();
  render();
}
// Se llama una vez por sesión (loadAll): si está en modo automático y ya
// llegó (o pasó) la fecha de vuelta al trabajo, cambia solo a "work". No hace
// nada mientras el modo ya sea "work" ni si `auto` está apagado.
function checkTravelAuto(){ /* Automatic mode changes disabled: only explicit user actions switch modes. */ }
// The dated repair is a read-only proposal. Applying it is a separate, gated action.
function historyRepairAccount(){return !!USER?.id&&typeof USER.email==='string'&&USER.email.trim().toLowerCase()==='trypartylol@gmail.com';}
function ensureWorkReturn2026(config=CFG,days=_state,day=todayKey()){
  const START='2026-09-08',RETURN='2026-10-08';
  if(!historyRepairAccount()||day<RETURN||Number(config.travelV)>=10)return null;
  const before=cfgCopy(config),after=cfgCopy(config),log=after.log;
  if(!Array.isArray(log)||!log.length||log[0].from>START||log.some((e,i)=>!e||!DATE_RE.test(e.from)||!Number.isFinite(Date.parse(e.from+'T12:00:00Z'))||!e.h||typeof e.h!=='object'||Array.isArray(e.h)||!Array.isArray(e.order)||(e.mode!==undefined&&!['work','vacation'].includes(e.mode))||(e.h.work&&(typeof e.h.work!=='object'||(e.h.work.on!==undefined&&typeof e.h.work.on!=='boolean')))||(i&&e.from<=log[i-1].from)))throw Error('El historial necesita una revisión antes de repararlo.');
  for(const date of [START,RETURN]){
    if(log.some(e=>e.from===date))continue;
    let at=0;for(let i=0;i<log.length;i++){if(log[i].from<date)at=i;else break;}
    log.splice(at+1,0,{...cfgCopy(log[at]),from:date});
  }
  for(const era of log){
    if(era.from>=START&&era.from<RETURN){era.mode='vacation';if(era.h.work)era.h.work.on=false;}
    else if(era.from===RETURN){era.mode='work';if(era.h.work)era.h.work.on=true;}
  }
  // A historical repair never changes the live mode, its schedule, or day rows.
  after.travelV=10;
  return {before,after,day,changes:historyModeChanges(before,after),scores:historyScoreChanges(before,after,days)};
}
function historyModeChanges(before,after){
  return (after.log||[]).flatMap(e=>{
    const exact=(before.log||[]).find(x=>x.from===e.from);let old=exact;
    if(!old)for(const x of before.log||[]){if(x.from<=e.from)old=x;else break;}
    const workBefore=!!old?.h?.work&&old.h.work.on!==false,workAfter=!!e.h?.work&&e.h.work.on!==false;
    return exact&&old.mode===e.mode&&workBefore===workAfter?[]:[{date:e.from,before:old?.mode||'Período anterior',after:e.mode,workBefore,workAfter,created:!exact}];
  });
}
function historyScoreChanges(before,after,days){
  const saved={config:CFG,days:_state,cache:_dayCfgCache};
  try{
    _state=cfgCopy(days);
    const scores=config=>{CFG=cfgCopy(config);_dayCfgCache={};return Object.fromEntries(Object.keys(days).filter(k=>DATE_RE.test(k)).sort().map(k=>[k,calcScore(k)]));};
    const old=scores(before),next=scores(after);
    return Object.keys(old).filter(k=>!cfgEqual(old[k],next[k])).map(date=>({date,before:old[date].score,after:next[date].score,maxBefore:old[date].max,maxAfter:next[date].max}));
  }finally{CFG=saved.config;_state=saved.days;_dayCfgCache=saved.cache;}
}
function historySafetyState(){return {busy:false,status:'',backup:null,verified:false,verifiedName:'',restore:null};}
var _historySafety=historySafetyState();
const HISTORY_BACKUP_LIMIT=20*1024*1024;
function historyCanonical(value){
  const seen=new Set();let nodes=0;
  const walk=(v,depth)=>{
    if(++nodes>200000||depth>40)throw Error('El respaldo supera los límites de verificación.');
    if(v===null||typeof v==='boolean'||typeof v==='string')return JSON.stringify(v);
    if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
    if(!v||typeof v!=='object'||seen.has(v))throw Error('El respaldo no tiene un formato válido.');
    seen.add(v);let text;
    if(Array.isArray(v))text='['+v.map(x=>walk(x,depth+1)).join(',')+']';
    else text='{'+Object.keys(v).sort().map(k=>{if(['__proto__','prototype','constructor'].includes(k))throw Error('El respaldo contiene campos no válidos.');return JSON.stringify(k)+':'+walk(v[k],depth+1);}).join(',')+'}';
    seen.delete(v);return text;
  };
  const text=walk(value,0);
  if(new TextEncoder().encode(text).byteLength>HISTORY_BACKUP_LIMIT)throw Error('El respaldo supera 20 MB. No se aplicó ningún cambio.');
  return text;
}
async function historyDigest(payload){
  if(!globalThis.crypto?.subtle)throw Error('Este navegador no permite verificar el respaldo. Usa una conexión segura.');
  const bytes=new TextEncoder().encode(historyCanonical(payload));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
}
function historyIdle(){
  if(!USER?.id||!_cfgReady||!_live||_cfgDraft||_cfgFlushPromise||_cfgConflict||_cfgSaveFailed||Object.keys(_pending).length||Object.keys(_offlineQueue).length)throw Error('Espera a que terminen de sincronizarse tus cambios y vuelve a intentarlo.');
}
function historyLocal(){return {config:cfgCopy(CFG),days:cfgCopy(_state),day:todayKey()};}
function historySameLocal(local){return local.day===todayKey()&&cfgEqual(local.config,CFG)&&cfgEqual(local.days,_state);}
async function historyRead(owner,current){
  const read=async()=>{
    let records=[],total=null,bytes=0;
    do{
      const result=await sb.from('day_logs').select('*',{count:'exact'}).eq('user_id',owner).order('date',{ascending:true}).range(records.length,records.length+499);
      if(!current())throw Error('La cuenta cambió. Vuelve a preparar el respaldo.');
      if(result.error||!Array.isArray(result.data)||!Number.isSafeInteger(result.count)||result.count<0||result.count>20000||(total!==null&&total!==result.count))throw Error('No se pudo leer un respaldo completo y estable. Vuelve a intentarlo.');
      total=result.count;
      if(!result.data.length&&records.length<total)throw Error('La lectura del respaldo quedó incompleta.');
      bytes+=new TextEncoder().encode(JSON.stringify(result.data)).byteLength;
      if(bytes>HISTORY_BACKUP_LIMIT)throw Error('El respaldo supera 20 MB.');
      records.push(...result.data);
      if(records.length>total)throw Error('Los datos cambiaron durante la lectura.');
    }while(records.length<total);
    if(new Set(records.map(r=>r.date)).size!==records.length||records.some(r=>typeof r.date!=='string'||(r.user_id&&r.user_id!==owner)))throw Error('No se pudo verificar la cuenta del respaldo.');
    return records;
  };
  const records=await read(),again=await read();
  if(historyCanonical(records)!==historyCanonical(again))throw Error('Los datos cambiaron durante la lectura. Prepara otro respaldo.');
  const settings=records.find(r=>r.date==='settings');
  if(!settings?.data?._cfg||(!Number.isSafeInteger(settings.settings_revision)||settings.settings_revision<0))throw Error('Primero sincroniza la configuración de tu cuenta.');
  return {records,settings};
}
function historyGuardRecords(records){return records.filter(r=>r.date!=='cfgbak');}
function historyServerDays(records){
  return Object.fromEntries(records.filter(r=>DATE_RE.test(r.date)).map(r=>{const d=r.data||{};return [r.date,{checks:d._checks||{},social:d._social||blankSocial(),note:d._note||'',people:Array.isArray(d._people)?d._people:[],_daylog:Array.isArray(d._daylog)?d._daylog:[]}];}));
}
function historyCheckBase(snapshot){
  if(!cfgEqual(snapshot.settings.data._cfg,_cfgBase?._cfg))throw Error('Hay cambios de otro dispositivo. Actualiza la app antes de continuar.');
  const days=historyServerDays(snapshot.records);
  for(const [date,d] of Object.entries(_state).filter(([k])=>DATE_RE.test(k))){
    const local={checks:d.checks||{},social:d.social||blankSocial(),note:d.note||'',people:d.people||[],_daylog:d._daylog||[]};
    const empty=!Object.values(local.checks).some(Boolean)&&!Object.values(local.social).some(Boolean)&&!local.note&&!local.people.length&&!local._daylog.length;
    if(!days[date]&&empty)continue; // Rendering may create an unsaved empty Today.
    if(!cfgEqual(local,days[date]))throw Error('Hay registros recientes sin actualizar. Actualiza la app antes de continuar.');
  }
}
function historyUndoConfig(plan,current){
  if(Number(current.travelV)<10||!Number.isFinite(Number(current.travelV)))throw Error('Esta reparación no figura como aplicada.');
  const after=mergeCfg(plan.after,plan.before,current);
  // Preserve the completed-review marker so an older app cannot rerun its
  // automatic migration immediately after the user recovers the old history.
  after.travelV=10;
  // Keep equivalent boundary entries so older clients cannot revive a longer,
  // stale timeline from their cache after a successful recovery.
  for(const e of current.log||[]){
    if((plan.before.log||[]).some(x=>x.from===e.from)||(after.log||[]).some(x=>x.from===e.from))continue;
    let original=plan.before.log[0];for(const old of plan.before.log){if(old.from<=e.from)original=old;else break;}
    after.log.push({...cfgCopy(original),from:e.from});
  }
  after.log.sort((a,b)=>a.from.localeCompare(b.from));return after;
}
function historyDownload(envelope){
  const url=URL.createObjectURL(new Blob([JSON.stringify(envelope,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='shaah-backup-'+todayKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function historyBackupDownload(){
  const state=_historySafety;if(state.busy)return;
  const owner=USER?.id,epoch=_syncEpoch,current=()=>_historySafety===state&&USER?.id===owner&&_syncEpoch===epoch;
  state.busy=true;state.backup=null;state.verified=false;state.verifiedName='';state.restore=null;state.status='Preparando el respaldo…';render();
  try{
    historyIdle();const local=historyLocal(),snapshot=await historyRead(owner,current);if(!current())return;historyIdle();historyCheckBase(snapshot);
    if(!historySameLocal(local))throw Error('Tus datos cambiaron. Prepara otro respaldo.');
    const payload={app:'SHAAH',format:1,kind:'account-backup',owner:{id:owner,email:USER.email||''},created:new Date().toISOString(),day:local.day,config:cfgCopy(snapshot.settings.data._cfg),visibleConfig:local.config,days:historyServerDays(snapshot.records),records:snapshot.records,settingsRevision:snapshot.settings.settings_revision};
    const envelope={payload,sha256:await historyDigest(payload)};
    if(!current())return;historyIdle();if(!historySameLocal(local))throw Error('Tus datos cambiaron. Prepara otro respaldo.');
    let plan=null,planError='';try{plan=ensureWorkReturn2026(payload.config,payload.days,payload.day);}catch(e){planError=e.message;}
    historyDownload(envelope);
    state.backup={envelope,local,snapshot,plan,planError};state.status='Selecciona el archivo descargado para comprobar que el respaldo se conserva correctamente.';
  }catch(e){if(current())state.status=e.message||'No se pudo preparar el respaldo.';}
  finally{if(current()){state.busy=false;render();}}
}
async function historyParseBackup(file,owner){
  if(!file||!Number.isFinite(file.size)||file.size>HISTORY_BACKUP_LIMIT)throw Error('Selecciona un respaldo SHAAH de menos de 20 MB.');
  let envelope;try{envelope=JSON.parse(await file.text());}catch(e){throw Error('El archivo no es un respaldo JSON válido.');}
  const p=envelope?.payload;
  if(!p||p.app!=='SHAAH'||p.format!==1||p.kind!=='account-backup'||p.owner?.id!==owner||!p.config||typeof p.config!=='object'||Array.isArray(p.config)||!p.days||typeof p.days!=='object'||Array.isArray(p.days)||!Array.isArray(p.records)||p.records.some(r=>!r||typeof r!=='object'||Array.isArray(r))||!DATE_RE.test(p.day)||(!Number.isSafeInteger(p.settingsRevision)||p.settingsRevision<0)||typeof envelope.sha256!=='string')throw Error('El respaldo no corresponde a esta cuenta o tiene un formato incompatible.');
  const settings=p.records.find(r=>r.date==='settings');
  if(!settings||settings.settings_revision!==p.settingsRevision||!cfgEqual(settings.data?._cfg,p.config)||new Set(p.records.map(r=>r.date)).size!==p.records.length||p.records.some(r=>typeof r.date!=='string'||(r.user_id&&r.user_id!==owner))||!cfgEqual(historyServerDays(p.records),p.days))throw Error('El respaldo contiene datos incompletos o inconsistentes.');
  if(await historyDigest(p)!==envelope.sha256)throw Error('El respaldo fue modificado o está incompleto. No se aplicó ningún cambio.');
  return envelope;
}
async function historyBackupVerify(file){
  const state=_historySafety;if(state.busy)return;
  const owner=USER?.id,epoch=_syncEpoch,current=()=>_historySafety===state&&USER?.id===owner&&_syncEpoch===epoch;
  state.busy=true;state.verified=false;state.status='Verificando el archivo…';render();
  try{
    historyIdle();const envelope=await historyParseBackup(file,owner);
    if(!current())return;
    if(!state.backup||envelope.sha256!==state.backup.envelope.sha256||!historySameLocal(state.backup.local))throw Error('Necesitas descargar un respaldo nuevo del estado actual.');
    state.verified=true;state.verifiedName=String(file.name||'Respaldo SHAAH').slice(0,160);state.status=state.backup.planError||(state.backup.plan?'Respaldo verificado. Revisa los cambios previstos antes de confirmar.':'Respaldo verificado. No hay una reparación pendiente.');
  }catch(e){if(current())state.status=e.message||'No se pudo verificar el archivo.';}
  finally{if(current()){state.busy=false;render();}}
}
async function historyRestorePreview(file){
  const state=_historySafety;if(state.busy)return;
  const owner=USER?.id,epoch=_syncEpoch,current=()=>_historySafety===state&&USER?.id===owner&&_syncEpoch===epoch;
  state.busy=true;state.restore=null;state.status='Comprobando la recuperación…';render();
  try{
    if(!historyRepairAccount())throw Error('Esta reparación no corresponde a tu cuenta.');
    historyIdle();const envelope=await historyParseBackup(file,owner);if(!current())return;
    const plan=ensureWorkReturn2026(envelope.payload.config,envelope.payload.days,envelope.payload.day);
    if(!plan)throw Error('Este archivo no es anterior a la reparación.');
    const local=historyLocal(),snapshot=await historyRead(owner,current);if(!current())return;historyIdle();historyCheckBase(snapshot);
    if(!historySameLocal(local))throw Error('Tus datos cambiaron. Vuelve a revisar la recuperación.');
    let after;try{after=historyUndoConfig(plan,snapshot.settings.data._cfg);}catch(e){throw Error('Se editaron los mismos períodos después de la reparación. Se necesita una revisión manual.');}
    if(cfgEqual(after,snapshot.settings.data._cfg))throw Error('No hay cambios de esta reparación que recuperar.');
    state.restore={local,snapshot,after,fileName:String(file.name||'Respaldo SHAAH').slice(0,160),plan:{changes:historyModeChanges(local.config,after),scores:historyScoreChanges(snapshot.settings.data._cfg,after,historyServerDays(snapshot.records))}};
    state.status='Revisa la recuperación. Los registros diarios nuevos se conservarán.';
  }catch(e){if(current())state.status=e.message||'No se pudo preparar la recuperación.';}
  finally{if(current()){state.busy=false;render();}}
}
async function historyCommit(restore=false){
  const state=_historySafety;if(state.busy)return;
  const owner=USER?.id,epoch=_syncEpoch,current=()=>_historySafety===state&&USER?.id===owner&&_syncEpoch===epoch;
  let sent=false;
  try{
    if(!historyRepairAccount())throw Error('Esta reparación no corresponde a tu cuenta.');
    historyIdle();const stage=restore?state.restore:state.backup;
    if(!stage||(!restore&&(!state.verified||!stage.plan)))throw Error('Descarga y verifica el respaldo antes de continuar.');
    if(!historySameLocal(stage.local))throw Error('Tus datos cambiaron. Prepara un respaldo o una revisión nuevos.');
    if(!confirm(restore?'¿Confirmas recuperar la configuración anterior de esta reparación? Los registros diarios se conservarán.':'¿Confirmas aplicar los cambios de fechas y puntuaciones mostrados? El modo actual y los registros diarios se conservarán.'))return;
    state.busy=true;state.status='Guardando…';render();
    const snapshot=await historyRead(owner,current);if(!current())return;historyIdle();historyCheckBase(snapshot);
    if(!historySameLocal(stage.local)||historyCanonical(historyGuardRecords(snapshot.records))!==historyCanonical(historyGuardRecords(stage.snapshot.records)))throw Error('Los datos cambiaron desde la revisión. No se aplicó la operación.');
    const after=restore?stage.after:stage.plan.after,data={...cfgCopy(snapshot.settings.data),_cfg:cfgCopy(after)};
    let visibleAfter;try{visibleAfter=mergeCfg(snapshot.settings.data._cfg,stage.local.config,after);}catch(e){throw Error('Hay diferencias locales en el historial. Actualiza los datos antes de continuar.');}
    sent=true;
    const result=await sb.rpc('shaah_save_settings_v1',{p_expected_revision:snapshot.settings.settings_revision,p_data:{owner_id:owner,data}});
    if(!current())return;
    if(result.error){sent=['PT409','40001','23505','42501','PGRST202','PGRST301','PGRST302'].includes(result.error.code)?false:true;throw Error(['PT409','40001','23505'].includes(result.error.code)?'Otro dispositivo cambió la configuración. Prepara otra revisión.':'El servidor rechazó el cambio. No se guardó la operación.');}
    if(!result.data||!Number.isSafeInteger(result.data.settings_revision)||result.data.settings_revision<=snapshot.settings.settings_revision||!cfgEqual(result.data.data,data))throw Error('No se pudo verificar la respuesta del servidor.');
    if(!cfgEqual(CFG,stage.local.config)&&!cfgEqual(CFG,Object.assign(cfgCopy(DEFAULT_CFG),cfgCopy(after)))){
      if(!_cfgDraft){_cfgDraftBase=cfgCopy(stage.local.config);_cfgDraft=cfgCopy(CFG);}
      _cfgBase=cfgCopy(data);_cfgConflict=true;keepCfgDraft();
      state.backup=null;state.verified=false;state.restore=null;state.status='La operación fue confirmada, pero hay cambios nuevos en este dispositivo. Se conservaron para resolver la sincronización.';return;
    }
    _cfgBase=cfgCopy(data);CFG=Object.assign(cfgCopy(DEFAULT_CFG),visibleAfter);applyCfg();set(cfgKey(),CFG);saveCache();
    state.backup=null;state.verified=false;state.restore=null;state.status=restore?'Recuperación confirmada. Los registros diarios se conservaron.':'Reparación confirmada. Conserva el archivo de respaldo para poder recuperarla.';
  }catch(e){if(current()){state.verified=false;state.status=sent?'No se pudo confirmar el resultado. Conserva el respaldo y actualiza los datos antes de recuperar o reintentar.':e.message||'No se pudo completar la operación.';}}
  finally{if(current()){state.busy=false;render();}}
}
function historyPreviewHTML(plan){
  if(!plan)return '';
  const mode=v=>v==='work'?'Trabajo':v==='vacation'?'Vacaciones':v;
  const table=(headers,rows)=>`<div ${uiStyle('overflow:auto;max-height:240px')}><table ${uiStyle('width:100%;font-size:13px;text-align:left')}><thead><tr>${headers.map(x=>`<th ${uiStyle('padding:6px')}>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td ${uiStyle('padding:6px')}>${esc(String(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `<h3>Cambios previstos</h3>${!plan.changes.length?'<p>Los períodos ya coinciden. Al confirmar se marcará esta revisión como completada.</p>':table(['Desde','Antes','Después'],plan.changes.map(c=>[c.date,mode(c.before)+(c.workBefore?' · Trabajo activo':' · Trabajo pausado'),mode(c.after)+(c.workAfter?' · Trabajo activo':' · Trabajo pausado')]))}<p>${plan.scores.length} días guardados cambian de puntuación.</p>${plan.scores.length?table(['Fecha','Antes','Después'],plan.scores.map(c=>[c.date,c.before+'/'+c.maxBefore,c.after+'/'+c.maxAfter])):''}<p class="sf-muted">El modo actual, las notas, las personas y los registros diarios se conservarán.</p>`;
}
function historySafetyHTML(){
  const s=_historySafety,b=s.backup,fresh=b&&historySameLocal(b.local),eligible=historyRepairAccount(),button=(text,action,disabled=false)=>`<button type="button" class="sf-button" ${disabled?'disabled':''} ${ui('click',action)}>${text}</button>`;
  return `<section data-history-safety ${uiStyle('margin-bottom:18px;padding:12px;border:1px solid var(--skin-edge);border-radius:10px;min-width:0')}><h3>Respaldo completo</h3><p class="sf-muted">Descarga tus datos guardados y comprueba el archivo. Guárdalo en un lugar privado.</p>${button('Descargar respaldo','historyBackupDownload',s.busy)}${s.verified?`<p class="sf-muted">Archivo verificado: ${esc(s.verifiedName)}</p>`:''}${b?`<label class="sf-field">${s.verified?'Elegir otro archivo (opcional)':'Verificar archivo descargado'}<input type="file" accept="application/json,.json" ${s.busy?'disabled':''} ${ui('change','historyBackupVerifyFile')}></label>`:''}<p role="status" aria-live="polite">${esc(s.status)}</p>${eligible?`<h3>Revisar historial de septiembre y octubre de 2026</h3><p class="sf-muted">${Number(CFG.travelV)>=10?'Esta revisión ya figura como completada. Puedes revisar su recuperación.':'La reparación está pausada. Solo se aplicará después de verificar un respaldo y confirmar los cambios.'}</p>${s.verified&&b?.plan?historyPreviewHTML(b.plan):''}${button('Confirmar reparación','historyRepairApply',s.busy||!s.verified||!b?.plan||!fresh)}<h3>Recuperar esta reparación</h3><p class="sf-muted">Selecciona el respaldo anterior para revisar la recuperación. Los registros añadidos después se conservarán.</p>${s.restore?`<p class="sf-muted">Respaldo comprobado: ${esc(s.restore.fileName)}</p>`:''}<label class="sf-field">${s.restore?'Elegir otro respaldo anterior (opcional)':'Respaldo anterior'}<input type="file" accept="application/json,.json" ${s.busy?'disabled':''} ${ui('change','historyRestoreFile')}></label>${s.restore?historyPreviewHTML(s.restore.plan)+button('Confirmar recuperación','historyRepairRestore',s.busy):''}`:''}</section>`;
}

// One-time repair: Vacation Mode officially starts on 2026-09-08.
// Historical scores must use the mode that was active on that date, even if the
// current config was already marked as v2 before the dated vacation era existed.
function setVacationStartOnce(){
  // Canonical historical rule: Vacation Mode began on 2026-09-08.
  // This migration is intentionally idempotent. It repairs the dated timeline
  // itself, rather than relying on the current live switch or a localStorage flag.
  const START="2026-09-08";
  const lg=cfgLog();
  if(!lg.length)return false;
  let changed=false;

  let i=-1;
  for(let k=0;k<lg.length;k++){
    if(String(lg[k].from||'')<=START)i=k; else break;
  }
  if(i<0)i=0;

  if(String(lg[i].from||'')<START){
    const e=lg[i];
    lg.splice(i+1,0,{from:START,h:JSON.parse(JSON.stringify(e.h)),order:(e.order||[]).slice(),
      subs:JSON.parse(JSON.stringify(Array.isArray(e.subs)?e.subs:[])),mode:'vacation'});
    i++; changed=true;
  }

  const yesterday=keyMinus(todayKey(),1);
  for(let k=i;k<lg.length;k++){
    const e=lg[k], from=String(e.from||'');
    if(from<START)continue;
    if(from>yesterday)break;
    if(e.mode!=='vacation'){e.mode='vacation';changed=true;}
    if(e.h&&e.h.work&&e.h.work.on!==false){e.h.work.on=false;changed=true;}
  }
  if(CFG.travelV!==9){CFG.travelV=9;changed=true;}
  if(changed)_dayCfgCache={};
  return changed;
}

// Hard repair for the known 2026-09-08 vacation boundary. Unlike the old
// versioned migration, this also repairs installations that already recorded a
// previous migration version but still had Work eras stamped into Sep 8 onward.
// The repair is limited to completed dates; TODAY remains controlled by the
// explicit live Vacation/Work switch.
function repairHistoricalVacationTimeline(){
  const START="2026-09-08", yesterday=keyMinus(todayKey(),1), lg=cfgLog();
  if(!lg.length)return false;
  let changed=false;
  let i=-1;
  for(let k=0;k<lg.length;k++){
    if(String(lg[k].from||'')<=START)i=k; else break;
  }
  if(i<0)i=0;
  if(String(lg[i].from||'')<START){
    const e=lg[i];
    lg.splice(i+1,0,{from:START,h:JSON.parse(JSON.stringify(e.h)),order:(e.order||[]).slice(),
      subs:JSON.parse(JSON.stringify(Array.isArray(e.subs)?e.subs:[])),mode:'vacation'});
    i++; changed=true;
  }
  for(let k=i;k<lg.length;k++){
    const e=lg[k], from=String(e.from||'');
    if(from<START)continue;
    if(from>yesterday)break;
    if(e.mode!=='vacation'){e.mode='vacation';changed=true;}
    if(e.h&&e.h.work&&e.h.work.on!==false){e.h.work.on=false;changed=true;}
  }
  if(changed)_dayCfgCache={};
  return changed;
}
// Los días guardan a quién viste por id. Si la lista de personas se pierde pero los
// días siguen ahí, esos ids quedan huérfanos y su historial deja de contar. Esto los
// reconstruye como marcadores renombrables, en vez de dejar el pasado colgando.
function recoverPeopleFromDays(){
  const known={}; for(const q of peopleList())known[q.id]=1;
  const found=[];
  for(const k of Object.keys(_state)){
    if(!DATE_RE.test(k))continue;
    for(const id of getPeople(k)) if(!known[id]){known[id]=1;found.push(id);}
  }
  if(!found.length)return 0;
  const sub=(subsOn(subsList())[0]||{id:"friends"}).id;
  found.forEach((id,i)=>peopleList().push({id,name:`Recovered ${i+1}`,sub,every:14}));
  saveCfg();
  return found.length;
}
function widenBaseline(){
  const lg=cfgLog(); if(!lg.length)return false;
  const e=lg[0]; if(!e.auto||e.from!==CFG_EPOCH)return false;
  let changed=false;
  for(const k of Object.keys(_state)){
    if(!DATE_RE.test(k))continue;
    const ch=(_state[k]&&_state[k].checks)||{};
    for(const id of Object.keys(ch)){
      if(ch[id]&&e.h[id]&&e.h[id].on===false){e.h[id].on=true;changed=true;}
    }
  }
  if(changed){_dayCfgCache={};saveCfg();}
  return changed;
}
function offEraStart(b,cur){
  let last="";
  for(const id of Object.keys(cur.h)){
    if(cur.h[id].on!==false)continue;             // still on — not what we're dating
    if(b.h[id]&&b.h[id].on===false)continue;      // off in the past too — nothing changed
    for(const k of Object.keys(_state)){
      if(!DATE_RE.test(k))continue;
      const ch=(_state[k]&&_state[k].checks)||{};
      if(ch[id]&&k>last)last=k;
    }
  }
  const tk=todayKey();
  if(!last)return tk;
  const next=keyMinus(last,-1);                   // the day after it was last done
  return next>tk?tk:next;
}
function ensureBaseline(){
  const lg=cfgLog();
  if(lg.length)return false;
  if(!Object.keys(_state).some(k=>DATE_RE.test(k)))return false;
  const b=cfgBaseline(), cur=cfgSnap();
  lg.push({from:CFG_EPOCH,h:b.h,order:b.order,subs:b.subs,mode:b.mode,auto:true});
  // If the reconstructed past differs from how the app is set up right now, the
  // current setup is its own era starting today — the past keeps the old rules,
  // today forward keeps what the user actually has switched on.
  const same=JSON.stringify([b.h,b.order])===JSON.stringify([cur.h,cur.order]);
  if(!same)lg.push({from:offEraStart(b,cur),h:cur.h,order:cur.order,subs:cur.subs});
  _dayCfgCache={};
  saveCfg();
  return true;
}
function cfgLog(){ if(!Array.isArray(CFG.log))CFG.log=[]; return CFG.log; }
// Wrap every change that affects scoring. Seals the old config over the past,
// then stamps the new one as effective from today.
function cfgEdit(fn){
  // Loading/conflicted settings must not accept edits that cannot be persisted safely.
  if(USER&&(!_cfgReady||_cfgConflict))return false;
  const before=JSON.parse(JSON.stringify(CFG));
  const lg=cfgLog();
  if(lg.some(e=>!e||!DATE_RE.test(e.from)||!Number.isFinite(Date.parse(e.from+'T12:00:00Z'))||new Date(e.from+'T12:00:00Z').toISOString().slice(0,10)!==e.from||!e.h||!Array.isArray(e.order))||
     new Set(lg.map(e=>e.from)).size!==lg.length)return false;
  lg.sort((a,b)=>a.from.localeCompare(b.from));
  if(!lg.length){const b=cfgBaseline();lg.push({from:CFG_EPOCH,h:b.h,order:b.order,subs:b.subs,mode:b.mode,auto:true});}
  try{fn();}catch(error){CFG=before;_dayCfgCache={};throw error;}
  const tk=todayKey(), cur=cfgSnap(), last=lg.find(e=>e.from===tk);
  if(last&&last.from===tk){last.h=cur.h;last.order=cur.order;last.subs=cur.subs;last.mode=cur.mode;}
  else lg.push({from:tk,h:cur.h,order:cur.order,subs:cur.subs,mode:cur.mode});
  lg.sort((a,b)=>a.from.localeCompare(b.from));   // keep the epoch baseline
  _dayCfgCache={};
  saveCfg(); render();
  return true;
}
function cfgForDate(key){
  const lg=cfgLog();
  const liveToday=key===todayKey();
  if(!lg.length){
    const m=liveToday?travelMode():'work';
    const h=JSON.parse(JSON.stringify(CFG.h));
    const subs=subsFor(h,CFG.subs,m);
    if(m==='vacation'&&h.work)h.work.on=false;
    return {L1:levelsFor(h,CFG.order,1,subs,m,key),L2:levelsFor(h,CFG.order,2,subs,m,key),
      L3:levelsFor(h,CFG.order,3,subs,m,key),subs,inVacation:m==='vacation',mode:m};
  }

  let v=liveToday?null:_dayCfgCache[key];
  if(v)return v;

  let e=lg[0];
  for(const x of lg){ if(x.from<=key)e=x; else break; }

  let m=liveToday ? travelMode() : modeKey(e.mode||(e.h&&e.h.work&&e.h.work.on===false?'vacation':'work'));

  // Past dates retain the last mode explicitly recorded for that date.
  // The current live switch must not override historical scoring.

  let H=e.h,O=e.order,S0=e.subs;
  if(liveToday){
    H=JSON.parse(JSON.stringify(e.h));
    O=(e.order||[]).slice();
    S0=JSON.parse(JSON.stringify(Array.isArray(e.subs)?e.subs:[]));
    if(H.work)H.work.on=(m==='work');
  }

  const S=subsFor(H,S0,m);
  v={L1:levelsFor(H,O,1,S,m,key),L2:levelsFor(H,O,2,S,m,key),L3:levelsFor(H,O,3,S,m,key),
     subs:S,inVacation:m==='vacation',mode:m};
  if(!liveToday)_dayCfgCache[key]=v;
  return v;
}
function applyCfg(){
  travelEnsure();
  if(travelMode()==='vacation'&&CFG.h&&CFG.h.work) CFG.h.work.on=false;
  Object.values(CFG.h||{}).forEach(ensureModePts);
  (CFG.subs||[]).forEach(ensureModePts);
  LVL1=buildLevel(1);LVL2=buildLevel(2);LVL3=buildLevel(3);
  ROUTINES=routineViews(CFG.routines);
  // A valid import can remove an old routine while its runner is still open.
  // Keep its saved session available; stop showing controls for missing data.
  if(routineId&&!ROUTINES[routineId]){routineId=null;routineView=false;routineQueue=[];routineCompleted={};timerSecs=0;timerRunning=false;timerEndAt=null;}
  LVL1_MAX=LVL1.reduce((a,i)=>a+i.pts,0);
  LVL2_MAX=LVL2.reduce((a,i)=>a+i.pts,0);
  LVL3_MAX=LVL3.reduce((a,i)=>a+i.pts,0);
  MAX=LVL1_MAX+LVL2_MAX+LVL3_MAX;
  _dayCfgCache={};
}
// applyCfg() NO corre aquí: ver boot(). Nada debe ejecutarse en el nivel superior
// del script salvo boot() y el registro de listeners — es lo que causó el TDZ del 13/09.

const STREAK_MIN=0.30;   // una racha mide que no abandonaste, no que fuiste perfecto
const GRADE=(s,mx)=>{
  const M=(mx==null?MAX:mx);
  const p=M>0?(s/M)*100:0;
  if(p>=95)return{l:"S+",c:"#FFF1A8",g:"#FFD70099",n:"UNSTOPPABLE",bg:"rgba(255,241,168,0.07)"};
  if(p>=85)return{l:"S",c:"#FFD700",g:"#FFD70055",n:"LEGENDARY",bg:"rgba(255,215,0,0.05)"};
  if(p>=72)return{l:"A",c:"#4ade80",g:"#4ade8055",n:"EXCELLENT",bg:"rgba(74,222,128,0.05)"};
  if(p>=45)return{l:"B",c:"#60a5fa",g:"#60a5fa55",n:"SOLID",bg:"rgba(96,165,250,0.05)"};
  if(p>=30)return{l:"C",c:"#f59e0b",g:"#f59e0b55",n:"AVERAGE",bg:"rgba(245,158,11,0.05)"};
  if(p>=15)return{l:"D",c:"#f97316",g:"#f9731655",n:"LOW",bg:"rgba(249,115,22,0.05)"};
  return{l:"F",c:"#ef4444",g:"#ef444455",n:"LOST",bg:"rgba(239,68,68,0.05)"};
};

// ── El siguiente movimiento ───────────────────────────────────
// La app siempre supo cuanto faltaba para la nota siguiente y nunca lo decia.
// Devuelve {need, target, next, item, reaches} o null si ya no hay nota por encima.
// `item` es el hábito sin marcar mas barato que llega solo; si ninguno llega,
// el mas grande, y `reaches` queda en false.
function nextMove(key){
  const C=cfgForDate(key),ch=getChecked(key),soc=getSocial(key);
  const sc=calcScore(key),score=sc.score,dMax=sc.max;
  if(!(dMax>0))return null;
  const cur=GRADE(score,dMax).l;
  let target=null;
  for(let s=score+1;s<=dMax;s++){ if(GRADE(s,dMax).l!==cur){target=s;break;} }
  if(target===null)return null;                      // ya esta en la nota mas alta posible hoy
  const need=target-score;
  const items=[];
  for(const i of [...C.L1,...C.L2,...C.L3])
    if(!i.combo&&!ch[i.id]&&i.pts>0)items.push({id:i.id,label:i.label,icon:i.icon,pts:i.pts});
  // Una parte del combo suelta vale su propio `p` (marcarla enciende el combo).
  for(const x of C.subs)
    if(!soc[x.id]&&x.p>0)items.push({id:x.id,label:x.label,icon:x.icon,pts:x.p});
  const llegan=items.filter(i=>i.pts>=need).sort((a,b)=>a.pts-b.pts);
  const mayor=[...items].sort((a,b)=>b.pts-a.pts);
  // Keep a small set of actionable options for the Today Next Move card.
  // Prefer the cheapest items that can reach the next grade; if none can,
  // show the largest available moves so the card still gives useful direction.
  const options=(llegan.length?llegan:mayor).slice(0,2);
  return {need,target,next:GRADE(target,dMax),item:llegan[0]||mayor[0]||null,options,reaches:!!llegan[0]};
}
// La tira de 44 px: el marcador vive aqui, no en 168 px de anillo antes de la lista.
function scoreStripHTML(key){
  const sc=calcScore(key),score=sc.score,dMax=sc.max,gr=GRADE(score,dMax),nm=nextMove(key);
  const pct=dMax>0?Math.min(100,(score/dMax)*100):0;
  return`<div id="tb-score">
    <span class="ts-l" ${uiStyle(`color:${gr.c};text-shadow:0 0 18px ${gr.g}`)}>${esc(gr.l)}</span>
    <span class="ts-p">${score}%</span>
    <span class="ts-bar"><i ${uiStyle(`width:${pct}%;background:${gr.c};box-shadow:0 0 10px ${gr.g}`)}></i></span>
    ${nm?`<span class="ts-nx" ${uiStyle(`color:${nm.next.c}`)}>+${nm.need}% → ${esc(nm.next.l)}</span>`
        :`<span class="ts-nx" ${uiStyle(`color:${gr.c}`)}>TOPE</span>`}
  </div>`;
}


function dateKey(d){
  const tz=CFG.tz&&CFG.tz!=='device'?CFG.tz:undefined;
  try{ return new Intl.DateTimeFormat('sv-SE',tz?{timeZone:tz}:{}).format(d); }
  catch(e){ return new Intl.DateTimeFormat('sv-SE').format(d); }
}
const todayKey=()=>dateKey(new Date());
// pure date arithmetic on YYYY-MM-DD (DST-safe)
function keyMinus(key,days){
  const[y,m,dd]=key.split('-').map(Number);
  const t=new Date(Date.UTC(y,m-1,dd));
  t.setUTCDate(t.getUTCDate()-days);
  return t.toISOString().slice(0,10);
}
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;

const cfgKey=()=>`shaah_cfg_${USER?USER.id:'anon'}`;
const cacheKey=()=>`shaah_cache_${USER?USER.id:"anon"}`;
const loadCache=()=>{_state=get(cacheKey())||{};};
const saveCache=()=>set(cacheKey(),_state);

function statusEl(){return document.getElementById('sync-status');}
var _syncText='SYNC…',_syncColor='#f59e0b';
function setStatus(text,color){
  _syncText=text;if(color)_syncColor=color;
  const e=statusEl();if(e){e.title=text;e.setAttribute('aria-label',text);if(color)e.querySelector('span')?.style.setProperty('background',color);}
  const notice=document.getElementById('sync-notice');if(notice)uiReplaceHTML(notice,syncNoticeHTML());
}

// ── Data accessors — all derive from _state ────────────────
const blankSocial=()=>{const o={};for(const x of subsList())o[x.id]=false;return o;};
const getChecked=k=>(_state[k]&&_state[k].checks)||{};
const getSocial=k=>(_state[k]&&_state[k].social)||blankSocial();

function calcScore(key){
  const ch=getChecked(key),soc=getSocial(key);
  const C=cfgForDate(key);
  const dSubs=C.subs, nSubs=dSubs.length||1;
  const tickedPts=dSubs.reduce((a,x)=>a+(soc[x.id]?x.p:0),0);
  const activeSubs=dSubs.filter(x=>soc[x.id]).length;
  const l1=C.L1.reduce((a,i)=>a+Math.round(safePts(i.pts)*doneFrac(ch[i.id])),0);
  const l2=C.L2.reduce((a,i)=>a+Math.round(safePts(i.pts)*doneFrac(ch[i.id])),0);
  // combo ticked but no part picked = the whole combo, same as it always behaved
  const l3=C.L3.reduce((a,i)=>a+(i.combo?(ch[i.id]?(activeSubs>0?tickedPts:i.pts):0):Math.round(i.pts*doneFrac(ch[i.id]))),0);
  const m1=C.L1.reduce((a,i)=>a+i.pts,0),m2=C.L2.reduce((a,i)=>a+i.pts,0),m3=C.L3.reduce((a,i)=>a+i.pts,0);
  const max=m1+m2+m3, score=l1+l2+l3;
  return{score,l1,l2,l3,l1max:m1,l2max:m2,l3max:m3,max,
         pct:max>0?Math.round((score/max)*100):0,
         done:Object.values(ch).filter(Boolean).length};
}

// History score records stay score-only; day existence is tracked separately so
// notes, Day Log, people, or other saved activity are not mistaken for scored days.
function getHistory(){
  const h={};
  for(const date of Object.keys(_state)){
    if(!DATE_RE.test(date))continue;
    const{score,l1,l2,l3,done,max,pct,l1max,l2max,l3max}=calcScore(date);
    if(score>0)h[date]={score,grade:GRADE(score,max).l,l1,l2,l3,done,max,pct,l1max,l2max,l3max};
  }
  return h;
}
function hasDayData(key){
  if(!DATE_RE.test(key)||!_state[key])return false;
  const st=_state[key],ch=st.checks||{},soc=st.social||{};
  return Object.values(ch).some(Boolean)||Object.values(soc).some(Boolean)
    ||!!st.note||(Array.isArray(st.people)&&st.people.length>0)
    ||(Array.isArray(st._daylog)&&st._daylog.length>0);
}
function getDayRecord(key){
  if(!hasDayData(key))return null;
  const{score,l1,l2,l3,done,max,pct,l1max,l2max,l3max}=calcScore(key);
  return{score,grade:GRADE(score,max).l,l1,l2,l3,done,max,pct,l1max,l2max,l3max};
}

// ── Writes — optimistic local, then push to server ─────────
const _pending={};
const _offlineKey='shaah-offline-day-writes';
let _offlineQueue={},_offlineOwner=null;
const _offlineFlushing=new Set();
function readOfflineQueue(owner){
  try{const q=JSON.parse(localStorage.getItem(_offlineKey+':'+owner)||'{}');return q&&typeof q==='object'&&!Array.isArray(q)?q:{};}catch(e){return {};}
}
function selectOfflineOwner(){
  const owner=USER&&USER.id;
  if(owner!==_offlineOwner){_offlineOwner=owner;_offlineQueue=owner?readOfflineQueue(owner):{};}
  // The old shared key has no trustworthy owner. Keep it untouched for recovery.
  return owner;
}
function saveOfflineQueue(owner=_offlineOwner,queue=_offlineQueue){
  if(owner)try{localStorage.setItem(_offlineKey+':'+owner,JSON.stringify(queue));}catch(e){}
}
function acknowledgeOfflineDay(owner,key,item,queue){
  if(queue[key]===item)delete queue[key];
  const stored=readOfflineQueue(owner);
  if(stored[key]?._id===item._id){delete stored[key];saveOfflineQueue(owner,stored);}
  if(_offlineOwner===owner&&_offlineQueue[key]?._id===item._id)delete _offlineQueue[key];
}
function queueOfflineDay(key){
  const owner=selectOfflineOwner();
  if(!owner||!DATE_RE.test(key))return;
  const st=_state[key]||{};
  const ch=getChecked(key),soc=getSocial(key),ppl=getPeople(key);
  const dl=Array.isArray(st._daylog)?st._daylog:[];
  const anything=Object.values(ch).some(Boolean)||Object.values(soc).some(Boolean)
                 ||!!getNote(key)||ppl.length>0||dl.length>0;
  const {score,l1,l2,l3,done,max,pct}=calcScore(key);
  const item=JSON.parse(JSON.stringify(anything?{delete:false,data:{score,grade:GRADE(score,max).l,l1,l2,l3,done,max,pct,_checks:ch,_social:soc,_people:ppl,_note:st.note||'',_daylog:dl}}:{delete:true}));
  item._id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  _offlineQueue[key]=item;
  const stored=readOfflineQueue(owner);stored[key]=item;saveOfflineQueue(owner,stored);
  return item;
}
async function sendDayItem(owner,key,item){
  const r=item.delete
    ?await sb.from('day_logs').delete().eq('user_id',owner).eq('date',key)
    :await sb.from('day_logs').upsert({user_id:owner,date:key,data:item.data},{onConflict:'user_id,date'});
  if(r&&r.error)throw r.error;
}
async function flushOfflineQueue(){
  const owner=selectOfflineOwner(),queue=_offlineQueue;
  if(!owner||!navigator.onLine||_offlineFlushing.has(owner))return;
  _offlineFlushing.add(owner);
  try{for(const [key,item] of Object.entries(queue)){
    if(USER?.id!==owner||_offlineQueue!==queue)break;
    if(!DATE_RE.test(key)||!item||(!item.delete&&!item.data)||_pending[key])continue;
    const token=Symbol(key),pending={timer:null,token};
    _pending[key]=pending;
    try{
      await sendDayItem(owner,key,item);
      if(item.delete&&USER?.id===owner&&_pending[key]===pending){
        delete _state[key];saveCache();
      }
      acknowledgeOfflineDay(owner,key,item,queue);
    }catch(e){
      break;
    }finally{
      if(_pending[key]===pending)delete _pending[key];
    }
  }}finally{_offlineFlushing.delete(owner);}
  if(USER?.id===owner&&!Object.keys(queue).length)setStatus(_live?'LIVE':'✓','#4ade80');
}
function restoreOfflineQueue(){
  if(!selectOfflineOwner())return;
  for(const [key,item] of Object.entries(_offlineQueue)){
    if(!DATE_RE.test(key))continue;
    if(item&&item.delete){delete _state[key];continue;}
    const d=item&&item.data;if(!d)continue;
    _state[key]={checks:d._checks||{},social:d._social||blankSocial(),note:d._note||'',people:Array.isArray(d._people)?d._people:[],_daylog:Array.isArray(d._daylog)?d._daylog:[]};
  }
}
window.addEventListener('online',()=>{setStatus('SYNC…','#f59e0b');flushOfflineQueue();if(_cfgReady)flushCfgSaves();else if(USER)loadAll();render();});
function persistDay(key){
  if(!DATE_RE.test(key))return;
  saveCache();
  if(!USER)return;
  const owner=USER.id,epoch=_syncEpoch,item=queueOfflineDay(key),queue=_offlineQueue;
  const prev=_pending[key];
  if(prev&&prev.timer)clearTimeout(prev.timer);
  const token=Symbol(key);
  const pending={timer:null,token};
  _pending[key]=pending;
  pending.timer=setTimeout(async()=>{
    // Keep the pending marker alive for the entire network request. A Realtime
    // echo can arrive before the upsert/delete resolves; clearing it here would
    // let that echo overwrite a newer local edit or schedule another save.
    pending.timer=null;
    if(USER?.id!==owner||_syncEpoch!==epoch){if(_pending[key]===pending)delete _pending[key];return;}
    try{
      await sendDayItem(owner,key,item);
      if(USER?.id===owner&&_syncEpoch===epoch&&item.delete){
        // Do not delete a newer local edit that was made while this request was in flight.
        if(_pending[key]===pending){delete _state[key];saveCache();}
      }
      acknowledgeOfflineDay(owner,key,item,queue);
      if(USER?.id===owner&&_syncEpoch===epoch&&_live)setStatus('LIVE','#4ade80');
    }catch(e){
      if(USER?.id===owner&&_syncEpoch===epoch)setStatus('OFFLINE — SAVED LOCALLY','#f59e0b');
    }
    finally{
      // Only the request that owns the current marker may clear it. A newer
      // edit has already installed a different token and remains protected.
      if(_pending[key]===pending)delete _pending[key];
    }
  },250);
}

function setChecked(k,v){if(!_state[k])_state[k]={checks:{},social:blankSocial(),note:''};_state[k].checks=v;}
// ── People ────────────────────────────────────────────────
// Pure metadata: who you saw, never part of any score, so it stays clear of the
// config timeline entirely.
function peopleList(){ return Array.isArray(CFG.people)?CFG.people:(CFG.people=[]); }
function personById(id){ return peopleList().find(x=>x.id===id)||null; }
// Location groups only affect people discovery, never scoring or stored day logs.
function locationGroups(){return Array.isArray(CFG.locationGroups)?CFG.locationGroups:[];}
function selectedLocation(){return locationGroups().some(g=>g.id===CFG.selectedLocation)?CFG.selectedLocation:'all';}
// Stale memberships remain stored for recovery, but cannot hide an unassigned contact.
function personLocations(p){
  const known=new Set(locationGroups().map(g=>g.id));
  return Array.isArray(p.locations)?p.locations.filter(id=>known.has(id)):[];
}
function personVisible(p){
  if(p.inactive===true)return false;
  const loc=selectedLocation(),locations=personLocations(p);
  return loc==='all'||locations.length===0||locations.includes(loc);
}
function visiblePeople(){return peopleList().filter(personVisible);}
// Settings filter only; never changes activity scoring or historical logs.
var peopleSettingsFilter='active';
function setPeopleSettingsFilter(v){if(!['active','inactive','all'].includes(v))return;peopleSettingsFilter=v;bulkPeopleSelection=[];render();}
function settingsPeople(){return peopleList().filter(p=>peopleSettingsFilter==='all'||(peopleSettingsFilter==='inactive'?p.inactive===true:p.inactive!==true));}
function settingsOrphanPeople(){const ids=new Set(settingsPeople().map(p=>p.id));return orphanPeople().filter(p=>ids.has(p.id));}
function locationSelect(id){if(id!=='all'&&!locationGroups().some(g=>g.id===id))return;CFG.selectedLocation=id;saveCfg();render();}
function locationAdd(){
  const name=(window.prompt('Location group name (e.g. Israel)')||'').trim().slice(0,40);
  if(!name)return;
  const id='loc'+Math.random().toString(36).slice(2,10);
  CFG.locationGroups=locationGroups().concat([{id,name}]);CFG.selectedLocation=id;saveCfg();render();
}
function locationRename(id){
  const g=locationGroups().find(x=>x.id===id);if(!g)return;
  const name=window.prompt('Rename location group',g.name);
  if(name===null||!name.trim())return;g.name=name.trim().slice(0,40);saveCfg();render();
}
function locationTogglePerson(id,loc){
  if(!locationGroups().some(g=>g.id===loc))return;
  const p=personById(id);if(!p)return;
  const list=Array.isArray(p.locations)?p.locations:[];
  p.locations=list.includes(loc)?list.filter(x=>x!==loc):list.concat(loc);
  saveCfg();render();
}
// Bulk location assignment is additive by default; removal is an explicit action.
var bulkPeopleSelection=[];
var bulkPeopleQuery='';
var bulkPeopleScope='all';
function bulkPeopleCandidates(){
  const q=bulkPeopleQuery.trim().toLocaleLowerCase();
  return settingsPeople().filter(p=>{
    if(bulkPeopleScope==='unassigned'&&personLocations(p).length)return false;
    return !q||String(p.name||'').toLocaleLowerCase().includes(q);
  });
}
function bulkPeopleSearch(v){
  const input=document.getElementById('bulk-people-search');
  const focused=!!input&&document.activeElement===input,start=input?.selectionStart,end=input?.selectionEnd;
  bulkPeopleQuery=String(v||'');bulkPeopleSelection=[];render();
  const next=document.getElementById('bulk-people-search');
  if(focused&&next){next.focus();if(start!=null&&end!=null)next.setSelectionRange(start,end);}
}
function bulkPeopleSetScope(v){if(!['all','unassigned'].includes(v))return;bulkPeopleScope=v;bulkPeopleSelection=[];render();}
function bulkPeopleToggle(id,checked){
  if(!personById(id))return;
  bulkPeopleSelection=checked?[...new Set([...bulkPeopleSelection,id])]:bulkPeopleSelection.filter(x=>x!==id);
  render();
}
function bulkPeopleSelectVisible(checked){
  const ids=bulkPeopleCandidates().map(p=>p.id);
  bulkPeopleSelection=checked?[...new Set([...bulkPeopleSelection,...ids])]:bulkPeopleSelection.filter(id=>!ids.includes(id));
  render();
}
function bulkPeopleApply(locationId,action){
  if(!locationGroups().some(g=>g.id===locationId)||!['add','remove'].includes(action))return;
  const eligible=new Set(bulkPeopleCandidates().map(p=>p.id));
  const ids=new Set(bulkPeopleSelection.filter(id=>eligible.has(id)));
  if(!ids.size)return;
  for(const p of peopleList()){
    if(!ids.has(p.id))continue;
    const current=Array.isArray(p.locations)?p.locations:[];
    p.locations=action==='add'?[...new Set([...current,locationId])]:current.filter(id=>id!==locationId);
  }
  bulkPeopleSelection=[];
  saveCfg();render();
}
function bulkPeoplePanel(){
  const candidates=bulkPeopleCandidates(), selected=bulkPeopleSelection.length;
  return `<div ${uiStyle(`margin:12px 0 16px;padding:12px;background:#151523;border:1px solid #34344a;border-radius:12px`)}>
    <div class="sec">BULK ASSIGN LOCATIONS</div>
    <div ${uiStyle(`font-size:12px;color:#adadbf;margin:7px 0`)}>Select contacts below, then add or remove one location. Other location memberships are preserved.</div>
    <input id="bulk-people-search" aria-label="Search contacts for bulk assignment" placeholder="Search contacts" value="${esc(bulkPeopleQuery)}" ${ui('input','bulkPeopleSearch')} ${uiStyle(`width:100%;box-sizing:border-box;background:#10101c;border:1px solid #34344a;color:#e2e2e2;border-radius:7px;padding:9px;margin:5px 0`)}/>
    <div ${uiStyle(`display:flex;gap:6px;flex-wrap:wrap;margin:7px 0`)}>
      <button ${ui('click','bulkPeopleSetScope' ,'all')} ${uiStyle(`color:#ddd;background:${bulkPeopleScope==='all'?'#34344a':'#171725'};border:1px solid #34344a;border-radius:7px;padding:6px`)}>All contacts</button>
      <button ${ui('click','bulkPeopleSetScope' ,'unassigned')} ${uiStyle(`color:#ddd;background:${bulkPeopleScope==='unassigned'?'#34344a':'#171725'};border:1px solid #34344a;border-radius:7px;padding:6px`)}>Unassigned</button>
      <button ${ui('click','bulkPeopleSelectVisible' ,true)} ${uiStyle(`color:#ddd;background:#171725;border:1px solid #34344a;border-radius:7px;padding:6px`)}>Select visible</button>
      <button ${ui('click','bulkPeopleSelectVisible' ,false)} ${uiStyle(`color:#ddd;background:#171725;border:1px solid #34344a;border-radius:7px;padding:6px`)}>Deselect visible</button>
    </div>
    <div ${uiStyle(`max-height:220px;overflow:auto;margin:8px 0`)}>${candidates.map(p=>`<label ${uiStyle(`display:flex;align-items:center;gap:8px;padding:6px 2px;color:#e2e2e2;font-size:13px`)}><input type="checkbox" ${bulkPeopleSelection.includes(p.id)?'checked':''} ${ui('change','bulkPeopleToggle' ,p.id)}/><span ${uiStyle(`flex:1`)}>${esc(p.name)}</span><span ${uiStyle(`color:#8888a4;font-size:11px`)}>${personLocations(p).map(id=>locationGroups().find(g=>g.id===id).name).map(esc).join(', ')||'Unassigned'}</span></label>`).join('')||("<span "+uiStyle("color:#8888a4;font-size:12px")+">No matching contacts</span>")}</div>
    <div ${uiStyle(`color:#adadbf;font-size:12px;margin-bottom:7px`)}>${selected} selected</div>
    <div ${uiStyle(`display:flex;flex-wrap:wrap;gap:6px`)}>${locationGroups().map(g=>`<button ${!selected?'disabled':''} ${ui('click','bulkPeopleApply' ,g.id,'add')} ${uiStyle(`padding:8px;border:1px solid #34344a;border-radius:8px;background:#25253a;color:#e2e2e2`)}>+ ${esc(g.name)}</button><button ${!selected?'disabled':''} ${ui('click','bulkPeopleApply' ,g.id,'remove')} ${uiStyle(`padding:8px;border:1px solid #34344a;border-radius:8px;background:#171725;color:#adadbf`)}>− ${esc(g.name)}</button>`).join('')||("<span "+uiStyle("color:#8888a4;font-size:12px")+">Add a location group first</span>")}</div>
  </div>`;
}
function personSetInactive(id,val){const p=personById(id);if(!p)return;p.inactive=!!val;saveCfg();render();}
function locationSelector(){return `<div ${uiStyle(`display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:8px 0 12px`)}>
  <span ${uiStyle(`font-size:12px;color:#adadbf`)}>LOCATION</span>
  <select aria-label="Current social location" ${ui('change','locationSelect')} ${uiStyle(`background:#111120;color:#e2e2e2;border:1px solid #34344a;border-radius:8px;padding:7px;font:inherit;font-size:13px`)}>
    <option value="all" ${selectedLocation()==='all'?'selected':''}>All locations</option>
    ${locationGroups().map(g=>`<option value="${esc(g.id)}" ${selectedLocation()===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}
  </select></div>`;}

// Las pastillas del combo se leen de un vistazo; el nombre completo vive en
// WHO TO SEE. "uri {bajur}" -> "uri". Si dos del mismo grupo colisionan, las dos
// vuelven al nombre entero: mejor largo que ambiguo.
function shortName(n){
  const raw=String(n==null?"":n);
  // Corta en el primer parentesis, corchete o llave y se queda con la primera
  // palabra. La llave se compara por codigo: `lint_toplevel` cuenta llaves por
  // linea y una expresion regular con ellas le descuadra la profundidad.
  let t=raw;
  const cortes=["(","[",String.fromCharCode(123)];
  for(const c of cortes){ const i=t.indexOf(c); if(i>=0)t=t.slice(0,i); }
  t=t.replace(/\s+/g," ").trim();
  return (t.split(" ")[0]||raw).slice(0,18);
}
function shortLabels(list){
  const cuenta={},out={};
  for(const x of list){const c=shortName(x.name);cuenta[c]=(cuenta[c]||0)+1;}
  for(const x of list){const c=shortName(x.name);out[x.id]=(cuenta[c]>1||!c)?x.name:c;}
  return out;
}
const getPeople=k=>{const v=_state[k]&&_state[k].people;return Array.isArray(v)?v:[];};
function setPeople(k,arr){if(!_state[k])_state[k]={checks:{},social:blankSocial(),note:'',people:[]};_state[k].people=arr;}
function togglePerson(id,key){
  haptic(8);
  const before={...getChecked(key)};
  const cur=getPeople(key), next=cur.includes(id)?cur.filter(x=>x!==id):cur.concat([id]);
  setPeople(key,next);
  // seeing someone implies the part they belong to happened
  const p=personById(id);
  if(p&&next.includes(id)){
    const soc={...getSocial(key)}; soc[p.sub]=true; setPeople(key,next); setSocial(key,soc);
    const ch={...getChecked(key)}; ch.social=true; setChecked(key,ch);
  }
  dayLogSyncChangedCompletions(key,before);
  persistDay(key); renderDayChange(key);
}
function personAdd(sub,key){
  const name=(window.prompt("Who? (name)")||"").trim().slice(0,40);
  if(!name)return;
  // Preguntar siempre la frecuencia, con 14 precargado como sugerencia editable.
  const raw=window.prompt(`How often do you want to see ${name}?\nDays in between — 7 = weekly, 30 = monthly.`,"14");
  if(raw===null)return;                                     // cancelar aborta el alta entera
  const every=Math.max(1,Math.min(3650,parseInt(raw,10)||14));
  let id; do{ id='p'+Math.random().toString(36).slice(2,7).padEnd(5,'0'); }while(personById(id));
  peopleList().push({id,name,sub,every,locations:selectedLocation()==='all'?[]:[selectedLocation()],inactive:false});
  saveCfg();
  if(key)togglePerson(id,key); else render();
}
// Personas cuyo grupo ya no existe (o fue pausado): quedarían invisibles en el
// combo. Se listan aparte en Settings para poder reasignarlas.
function orphanPeople(){
  const live=subsOn(subsList()).map(x=>x.id);
  return peopleList().filter(x=>live.indexOf(x.sub)<0);
}
function personSet(id,k,v){
  const p=personById(id); if(!p)return;
  p[k]= k==='every'?Math.max(1,Math.min(3650,parseInt(v)||14)):String(v==null?'':v).slice(0,k==='icon'?3:40);
  saveCfg(); render();
}
function personDel(id){
  const p=personById(id); if(!p)return;
  if(!confirm(`Remove ${p.name}? Days you already logged keep their record.`))return;
  CFG.people=peopleList().filter(x=>x.id!==id); haptic(12); saveCfg(); render();
}
// Last time each person shows up in the log, and how overdue they are.
function peopleStatus(){
  const tk=todayKey(), seen={};
  for(const k of Object.keys(_state)){
    if(!DATE_RE.test(k))continue;
    for(const id of getPeople(k)) if(!seen[id]||k>seen[id])seen[id]=k;
  }
  return visiblePeople().map(p=>{
    const last=seen[p.id]||null;
    const every=Math.max(1,p.every||14);
    const days=last?Math.round((keyToDate(tk)-keyToDate(last))/86400000):null;
    return {...p,last,every,days,
            ratio:days==null?Infinity:days/every,
            overdue:days==null?Infinity:days-every};
  }).sort((a,b)=>b.ratio-a.ratio);
}
function getNote(k){const n=_state[k]&&_state[k].note;return typeof n==='string'?n:'';}
function setNote(k,v){if(!_state[k])_state[k]={checks:{},social:blankSocial(),note:''};_state[k].note=String(v==null?'':v).slice(0,5000);persistDay(k);}
function setSocial(k,v){if(!_state[k])_state[k]={checks:{},social:blankSocial(),note:''};_state[k].social=v;}

// ── Server load + realtime ─────────────────────────────────
var _cfgReady=false;   // ¿ya leímos la config del servidor en esta sesión?
var _syncEpoch=0,_cfgBase=null,_cfgDraft=null,_cfgDraftBase=null,_cfgConflict=false,_cfgSaveFailed=false,_cfgFlushPromise=null;
var _realtimeChannel=null,_syncRenderQueued=false;
const cfgPendingKey=()=>`shaah_cfg_pending_${USER?USER.id:'anon'}`;
const cfgCopy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
function cfgEqual(a,b){
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const ak=Object.keys(a),bk=Object.keys(b);
  return ak.length===bk.length&&ak.every(k=>Object.prototype.hasOwnProperty.call(b,k)&&cfgEqual(a[k],b[k]));
}
// Merge independent edits against their original base; never guess at a conflict.
function mergeCfg(base,local,remote,field=''){
  if(cfgEqual(local,base))return cfgCopy(remote);
  if(cfgEqual(remote,base)||cfgEqual(local,remote))return cfgCopy(local);
  if(Array.isArray(local)&&Array.isArray(remote)){
    const old=Array.isArray(base)?base:[];
    if(field==='locations'&&[...old,...local,...remote].every(x=>typeof x==='string')){
      return [...new Set([...remote.filter(x=>!old.includes(x)||local.includes(x)),...local.filter(x=>!old.includes(x))])];
    }
    const key=field==='log'?'from':['people','locationGroups','subs'].includes(field)?'id':null;
    if(key&&[old,local,remote].every(a=>a.every(x=>x&&typeof x[key]==='string')&&new Set(a.map(x=>x[key])).size===a.length)){
      const maps=[old,local,remote].map(a=>new Map(a.map(x=>[x[key],x])));
      const ids=[...new Set([...remote,...local,...old].map(x=>x[key]))];
      const result=ids.map(id=>mergeCfg(maps[0].get(id),maps[1].get(id),maps[2].get(id))).filter(x=>x!==undefined);
      return field==='log'?result.sort((a,b)=>a.from.localeCompare(b.from)):result;
    }
  }
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  if(object(local)&&object(remote)&&(object(base)||base===undefined)){
    const result=Object.create(null);
    for(const key of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){
      const v=mergeCfg(base?.[key],local[key],remote[key],key);
      if(v!==undefined)result[key]=v;
    }
    return result;
  }
  throw new Error('CFG_CONFLICT');
}
function keepCfgDraft(){if(_cfgDraft)set(cfgPendingKey(),{base:_cfgDraftBase,draft:_cfgDraft});}
function queueCfgSave(){
  if(!USER)return;
  if(!_cfgDraft)_cfgDraftBase=cfgCopy(_cfgBase?._cfg||DEFAULT_CFG);
  _cfgDraft=cfgCopy(CFG);keepCfgDraft();
  if(_cfgReady)Promise.resolve().then(flushCfgSaves);
}
function cfgSyncStatus(){
  if(_cfgConflict)setStatus('SAVE CONFLICT — CHANGES KEPT ON THIS DEVICE','#f59e0b');
  else if(_cfgSaveFailed)setStatus('SAVE FAILED — CHANGES KEPT ON THIS DEVICE','#ef4444');
  else setStatus(_live?'LIVE':'✓','#4ade80');
}
function flushCfgSaves(){
  if(_cfgFlushPromise)return _cfgFlushPromise;
  if(!USER||!_cfgReady||!_cfgDraft)return Promise.resolve();
  const owner=USER.id,epoch=_syncEpoch;
  const current=()=>USER?.id===owner&&_syncEpoch===epoch;
  const task=(async()=>{
    try{while(current()&&_cfgDraft){
      const draft=_cfgDraft,base=_cfgDraftBase;
      let saved=false;
      for(let attempt=0;attempt<4&&!saved;attempt++){
        const read=await sb.from('day_logs').select('data,settings_revision').eq('user_id',owner).eq('date','settings');
        if(!current())return;
        if(read.error||!Array.isArray(read.data)||read.data.length>1)throw new Error('CFG_READ_FAILED');
        const row=read.data[0],remote=row?.data;
        const merged=row?mergeCfg(base,draft,remote?._cfg||{}):cfgCopy(draft);
        const data={...(remote||{}),_cfg:merged};
        // The server binds ownership to the JWT, checks a numeric revision and
        // archives both versions atomically. Direct legacy settings writes are
        // denied there; never fall back to upsert or a JSONB filter in the URL.
        if(row&&!Number.isSafeInteger(row.settings_revision))throw new Error('CFG_PROTOCOL_UNAVAILABLE');
        // A realtime echo or another device may already have saved this draft.
        const unchanged=!!row&&cfgEqual(remote,data);
        const result=unchanged?{data:{data:remote,settings_revision:row.settings_revision}}:await sb.rpc('shaah_save_settings_v1',{
          p_expected_revision:row?row.settings_revision:null,p_data:{owner_id:owner,data}
        });
        if(!current())return;
        if(result.error){if(['23505','40001','PT409'].includes(result.error.code))continue;throw new Error('CFG_WRITE_FAILED');}
        if(!result.data||!Number.isSafeInteger(result.data.settings_revision)||result.data.settings_revision<(unchanged?0:1)||!cfgEqual(result.data.data,data))throw new Error('CFG_WRITE_UNCONFIRMED');
        _cfgBase=cfgCopy(result.data.data);_cfgConflict=false;_cfgSaveFailed=false;saved=true;
        // Realtime can clone the pending draft without changing its contents.
        if(_cfgDraft===draft||cfgEqual(_cfgDraft,draft)){
          _cfgDraft=null;_cfgDraftBase=null;localStorage.removeItem(cfgPendingKey());
          CFG=Object.assign(cfgCopy(DEFAULT_CFG),merged);
        }else{
          _cfgDraft=mergeCfg(draft,_cfgDraft,merged);_cfgDraftBase=cfgCopy(merged);
          CFG=Object.assign(cfgCopy(DEFAULT_CFG),_cfgDraft);keepCfgDraft();
        }
        applyCfg();set(cfgKey(),CFG);render();
      }
      if(!saved)throw new Error('CFG_RETRY_LIMIT');
    }
    if(current())cfgSyncStatus();
    }catch(e){if(current()){
      _cfgConflict=e.message==='CFG_CONFLICT';_cfgSaveFailed=!_cfgConflict;keepCfgDraft();cfgSyncStatus();
    }}
  })();
  const done=task.finally(()=>{if(_cfgFlushPromise===done)_cfgFlushPromise=null;});
  _cfgFlushPromise=done;return done;
}
function changeSyncUser(user){
  if(USER?.id===user?.id){USER=user;return;}
  _syncEpoch++;_cfgReady=false;_cfgBase=null;_cfgDraft=null;_cfgDraftBase=null;_cfgConflict=false;_cfgSaveFailed=false;_cfgFlushPromise=null;_syncRenderQueued=false;
  for(const [key,p] of Object.entries(_pending)){if(p.timer)clearTimeout(p.timer);delete _pending[key];}
  clearTimeout(_bakT);_bakT=null;_bak=[];
  if(_realtimeChannel){sb.removeChannel?.(_realtimeChannel);_realtimeChannel=null;}
  resetAccountView();
  USER=user;_live=false;_state={};CFG=cfgCopy(DEFAULT_CFG);_dayCfgCache={};applyCfg();selectOfflineOwner();
}
// A new identity must never inherit the previous account's live controls. Saved
// drafts and routine copies stay under their original keys for later recovery.
function resetAccountView(){
  resetDayRequest=null;
  if(timerInterval!==null)clearInterval(timerInterval);
  timerInterval=null;audioKeepAlive(false);
  sessions={};routineId=null;routineView=false;routineQueue=[];routineCompleted={};
  timerSecs=0;timerRunning=false;timerEndAt=null;
  settingsOpen=false;editDayKey=null;socialDay=null;socialExpanded=false;reviewOpen=false;
  currentTab='today';histTab='week';histMonth=null;tourStep=null;
  tourDemo={};tourOwner=null;tourReturnTab=null;tourReturnFocus=null;tourReturnSettings=false;tourFocusStep=null;tourScroll=0;
  lvlOpen={1:true,2:true,3:true};
  secOpen={tz:true,ind:true,trav:true,hab:true,ppl:true,bak:false,rout:false,data:true};
  todayRoutinesOpen=true;peopleSettingsFilter='active';socialDraft=null;socialQuery='';socialView='register';socialFormError='';socialDirectoryQuery='';socialDirectoryGroup='all';socialDirectoryCategory='all';socialPeopleOpen=false;socialBulkOpen=false;socialFamilyIncluded=true;socialGroupDraft=null;socialGroupError='';workPhaseOpenKey=null;
  bulkPeopleSelection=[];bulkPeopleQuery='';bulkPeopleScope='all';_historySafety=historySafetyState();
  window.__dayLogActive=null;window.__dayLogSelectedId=null;window.__dayLogPanelMode='edit';
  dayLogEditClose();_lastY=0;tuckNav(false);
  _syncText='SYNC…';_syncColor='#f59e0b';_signOutStatus='';
}
function restoreAccountLocal(){
  if(!USER)return;
  loadCfgLocal();loadCache();loadLvl();loadSec();loadTodayRoutines();restoreRoutine();
}
async function resolveCfgConflict(choice){
  if(!USER||!_cfgConflict||!['server','local'].includes(choice))return;
  if(!confirm(choice==='local'?'Use this device’s settings for your account? Other devices will receive these settings.':'Use the settings saved on the server? Your current version will stay in local backups.'))return;
  const owner=USER.id,epoch=_syncEpoch;
  try{
    const result=await sb.from('day_logs').select('data').eq('user_id',owner).eq('date','settings');
    if(USER?.id!==owner||_syncEpoch!==epoch)return;
    const remote=result.data?.[0]?.data;
    if(result.error||!remote?._cfg)throw new Error('CFG_READ_FAILED');
    bakPush(CFG);bakPush(remote._cfg);_cfgBase=cfgCopy(remote);_cfgConflict=false;_cfgSaveFailed=false;
    if(choice==='server'){
      _cfgDraft=null;_cfgDraftBase=null;localStorage.removeItem(cfgPendingKey());
      CFG=Object.assign(cfgCopy(DEFAULT_CFG),remote._cfg);applyCfg();set(cfgKey(),CFG);
    }else{_cfgDraftBase=cfgCopy(remote._cfg);_cfgDraft=cfgCopy(CFG);keepCfgDraft();await flushCfgSaves();}
    if(USER?.id===owner&&_syncEpoch===epoch){cfgSyncStatus();render();}
  }catch(e){if(USER?.id===owner&&_syncEpoch===epoch){_cfgSaveFailed=true;cfgSyncStatus();}}
}
function unownedOfflineQueue(){
  try{const q=JSON.parse(localStorage.getItem(_offlineKey)||'{}');return q&&typeof q==='object'&&!Array.isArray(q)?q:{};}catch(e){return {};}
}
function exportUnownedOffline(){
  const writes=unownedOfflineQueue();if(!Object.keys(writes).length)return;
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'SHAAH',owner:null,offlineWrites:writes},null,2)],{type:'application/json'}));
  a.download='shaah-unassigned-unsynced.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function syncNoticeHTML(){
  const button=(text,action,...args)=>`<button ${ui('click',action,...args)} ${uiStyle(`background:none;border:1px solid #66552a;color:inherit;border-radius:7px;padding:7px;font:inherit;cursor:pointer`)}>${text}</button>`;
  let body='';
  if(_cfgConflict||_cfgSaveFailed)body+=`<div ${uiStyle(`padding:12px;border:1px solid #66552a;border-radius:10px;margin:10px 16px;color:#fbbf24;font-size:14px;line-height:1.5`)}>
    ${_cfgConflict?'Settings changed on another device. Your edits are kept on this device. Choose which version to use.':'Settings could not be saved. Your edits are kept on this device.'}
    <div ${uiStyle(`display:flex;flex-wrap:wrap;gap:8px;margin-top:8px`)}>${_cfgConflict?button('Use saved settings','resolveCfgConflict','server')+button('Keep this device’s settings','resolveCfgConflict','local'):button('Retry saving','flushCfgSaves')}${button('Export my changes','exportData')}</div></div>`;
  if(Object.keys(unownedOfflineQueue()).some(k=>DATE_RE.test(k)))body+=`<div ${uiStyle(`padding:12px;margin:10px 16px;border:1px solid #66552a;border-radius:10px;color:#fbbf24;font-size:14px;line-height:1.5`)}>Older unsynced entries are kept on this device. Their account could not be verified, so they have not been uploaded. ${button('Export unsynced entries','exportUnownedOffline')}</div>`;
  return `<div id="sync-notice" role="status" aria-live="polite">${body}</div>`;
}
// ── Respaldo automático ───────────────────────────────────
// La config vive en una sola fila; si se pisa, se pisa en el teléfono y en el
// servidor a la vez y no queda nada. Esto guarda las últimas versiones buenas en
// una fila aparte, para poder volver atrás. (Pasó el 13/09 y costó una lista de
// personas.)
const BAK_KEEP=5;
var _bak=[], _bakT=null;
const bakKey=()=>`shaah_bak_${USER?USER.id:'anon'}`;
function bakLoad(rows){
  const l=get(bakKey()), local=Array.isArray(l)?l:[];
  const r=(rows||[]).find(x=>x.date==='cfgbak');
  const remote=(r&&r.data&&Array.isArray(r.data._bak))?r.data._bak:[];
  // unión de ambas, más recientes primero — nunca se pierde una versión local
  const seen={}, all=[];
  for(const b of local.concat(remote)){
    if(!b||!b.cfg||seen[b.cfg])continue;
    seen[b.cfg]=1; all.push(b);
  }
  all.sort((a,b)=>String(b.t).localeCompare(String(a.t)));
  _bak=all.slice(0,BAK_KEEP);
  set(bakKey(),_bak);
}
function bakPush(cfgObj){
  try{
    if(!cfgObj||typeof cfgObj!=='object')return false;
    const snap=JSON.stringify(cfgObj);
    if(_bak.length&&_bak[0].cfg===snap)return false;
    _bak.unshift({t:new Date().toISOString(),cfg:snap});
    if(_bak.length>BAK_KEEP)_bak.length=BAK_KEEP;
    set(bakKey(),_bak);          // SÍNCRONO: sobrevive a un refresco inmediato
    return true;
  }catch(e){return false;}
}
// Guarda el estado ANTERIOR al cambio: si el cambio es el que rompe algo,
// la versión buena ya quedó a salvo antes de pisarla.
function bakBefore(prev){
  if(!_cfgReady)return;
  if(!bakPush(prev))return;
  clearTimeout(_bakT);
  const owner=USER&&USER.id,epoch=_syncEpoch;
  _bakT=setTimeout(()=>{ try{ if(owner&&USER?.id===owner&&_syncEpoch===epoch)Promise.resolve(sb.from('day_logs').upsert({user_id:owner,date:'cfgbak',data:{_bak}},{onConflict:'user_id,date'})).catch(()=>{}); }catch(e){} },2000);
}
function bakSnapshot(){ bakBefore(CFG); }
function bakList(){
  return _bak.map((b,i)=>{
    let c={};try{c=JSON.parse(b.cfg)}catch(e){}
    return {i,t:b.t,people:(c.people||[]).length,habits:Object.keys(c.h||{}).length,
            names:(c.people||[]).map(x=>x.name).slice(0,4).join(", ")};
  });
}
function bakRestore(i){
  const b=_bak[i]; if(!b)return;
  let c=null; try{c=JSON.parse(b.cfg)}catch(e){return;}
  const when=new Date(b.t).toLocaleString();
  if(!confirm(`Restore the settings saved on ${when}?\n\n${(c.people||[]).length} people · ${Object.keys(c.h||{}).length} habits.\nYour daily logs are not touched.`))return;
  CFG=Object.assign(JSON.parse(JSON.stringify(DEFAULT_CFG)),c);
  haptic([30,40,30]); applyCfg(); saveCfg(); render();
}
function saveCfg(){
  const prev=get(cfgKey());           // lo que había ANTES de este guardado
  if(prev)bakBefore(prev);
  set(cfgKey(),CFG); applyCfg();
  // Guardar antes de haber leído del servidor sobreescribe la config buena con la
  // que haya en memoria (posiblemente la genérica). Pasó el 13/09 y borró personas.
  queueCfgSave();
  bakPush(CFG);                       // y también el estado nuevo
}
// One-time migration: Pomodoro 6→5 so MAX lands on 118 (100 + חי)
function migrateCfg(){
  // Canonical habit name: wake happens first, sleep second.
  if(CFG.h&&CFG.h.sleep&&/^(Sleep|Wake Up) (?:&|and) (?:Wake Up |Sleep )?Early$/i.test(String(CFG.h.sleep.l||''))){
    CFG.h.sleep.l='Wake Up and Sleep Early';
  }
  if(!Array.isArray(CFG.log))CFG.log=[];   // empty timeline = "never edited", scores as before
  subsEnsure();                            // parts must carry explicit points before any era is cut
  Object.values(CFG.h||{}).forEach(ensureModePts);
  subsEnsure();
  syncComboPts();
  if(CFG.v>=4){applyCfg();return;}
  if(!(CFG.v>=2)){
  if(CFG.h&&CFG.h.pomodoro&&Number(CFG.h.pomodoro.p)===6)CFG.h.pomodoro.p=5;
    CFG.v=2;
  }
  if(CFG.v<3){
    if(Number(CFG.nightFrom)===18)CFG.nightFrom=20.5;   // 6pm → 8:30pm
    if(CFG.nightUntil==null)CFG.nightUntil=7;           // extend night through the small hours
  }
  CFG.v=4; applyCfg();
}
function loadCfgLocal(){
  const c=get(cfgKey());
  const pending=get(cfgPendingKey());
  if(c)_cfgBase={_cfg:cfgCopy(c)};
  if(pending&&pending.base&&pending.draft){_cfgDraftBase=cfgCopy(pending.base);_cfgDraft=cfgCopy(pending.draft);}
  if(c||_cfgDraft){CFG=Object.assign(JSON.parse(JSON.stringify(DEFAULT_CFG)),_cfgDraft||c);applyCfg();migrateCfg();}
}
function rowToState(row){
  if(row.date==='cfgbak')return false;
  if(row.date==='settings'){
    if(row.data&&row.data._cfg){
      const previousCfg=CFG,previousConflict=_cfgConflict;
      const local=get(cfgKey());
      const pending=_cfgDraft?{base:_cfgDraftBase,draft:_cfgDraft}:get(cfgPendingKey());
      let incoming=cfgCopy(row.data._cfg);
      _cfgBase=cfgCopy(row.data);
      if(pending&&pending.base&&pending.draft){
        _cfgDraftBase=cfgCopy(pending.base);_cfgDraft=cfgCopy(pending.draft);
        try{incoming=mergeCfg(_cfgDraftBase,_cfgDraft,incoming);_cfgConflict=false;}
        catch(e){incoming=cfgCopy(_cfgDraft);_cfgConflict=true;}
      }
      const prevLog=Array.isArray(CFG.log)?CFG.log:(local&&Array.isArray(local.log)?local.log:[]);
      const prevV={subsV:CFG.subsV,junkV:CFG.junkV};
      CFG=Object.assign(JSON.parse(JSON.stringify(DEFAULT_CFG)),incoming);
      // La línea de tiempo es historia, no estado: una config entrante sin `log`
      // (dispositivo con versión vieja, o restauración) no puede borrar el pasado.
      if((!Array.isArray(CFG.log)||CFG.log.length<prevLog.length)&&prevLog.length)CFG.log=prevLog;
      if(CFG.subsV==null&&prevV.subsV!=null)CFG.subsV=prevV.subsV;
      if(CFG.junkV==null&&prevV.junkV!=null)CFG.junkV=prevV.junkV;
      // Rescate: personas que este dispositivo tiene guardadas y el servidor ya no.
      // Cubre el borrado del 13/09 sin pedirle nada al usuario.
      if(local&&Array.isArray(local.people)&&local.people.length){
        if(!Array.isArray(CFG.people))CFG.people=[];
        let back=0;
        for(const q of local.people) if(q&&q.id&&!CFG.people.some(x=>x.id===q.id)){CFG.people.push(q);back++;}
        if(back&&USER){if(!_cfgDraft){_cfgDraftBase=cfgCopy(row.data._cfg);_cfgDraft=cfgCopy(CFG);keepCfgDraft();}}
      }
      applyCfg();migrateCfg();set(cfgKey(),CFG);
      if(_cfgDraft&&!_cfgConflict&&_cfgReady)Promise.resolve().then(flushCfgSaves);
      loadLvl();   // el plegado viene dentro de la config: boot() la leyo antes que esta
      return !cfgEqual(previousCfg,CFG)||previousConflict!==_cfgConflict;
    }
    return false;
  }
  const d=row.data||{};
  const inc={checks:d._checks||{},social:d._social||blankSocial(),note:d._note||'',
             people:Array.isArray(d._people)?d._people:[],_daylog:Array.isArray(d._daylog)?d._daylog:[]};
  // Si esta pestaña tiene un guardado pendiente para ese día, NO fusionamos una
  // fila remota encima: la fusión anterior solo conservaba valores truthy y podía
  // resucitar un check/persona que el usuario acababa de quitar. El cambio local
  // gana durante esta ventana y su upsert será la nueva base para Realtime.
  const mine=_state[row.date];
  if(mine&&_pending[row.date])return false;
  // Even an identical UPDATE proves this row was received after any in-flight
  // DELETE reconciliation snapshot. Keep that identity guard without repainting.
  const visible=mine&&{checks:mine.checks||{},social:mine.social||blankSocial(),note:mine.note||'',people:Array.isArray(mine.people)?mine.people:[],_daylog:Array.isArray(mine._daylog)?mine._daylog:[]};
  const changed=!mine||!cfgEqual(visible,inc);
  _state[row.date]=inc;
  return changed;
}

// A user with history but no saved config predates the generic defaults —
// restore their original habit set instead of overwriting it.
function adoptLegacyIfVeteran(hadSettingsRow,rowCount){
  if(hadSettingsRow||rowCount===0)return false;
  CFG=JSON.parse(JSON.stringify(LEGACY_CFG));
  CFG.v=3; applyCfg(); set(cfgKey(),CFG); saveCfg();
  return true;
}
async function loadAll(){
  if(!USER)return;
  const owner=USER.id,epoch=_syncEpoch;
  setStatus('SYNC…','#f59e0b');
  try{
    const{data,error}=await sb.from('day_logs').select('date,data').eq('user_id',owner);
    if(USER?.id!==owner||_syncEpoch!==epoch)return;
    if(error)throw error;
    const rows=data||[];
    const hadSettings=rows.some(r=>r.date==='settings');
    const dayRows=rows.filter(r=>r.date!=='settings'&&r.date!=='cfgbak').length;
    bakLoad(rows);
    _state={};
    rows.forEach(rowToState);
    restoreOfflineQueue();
    adoptLegacyIfVeteran(hadSettings,dayRows);
    _cfgReady=true;                       // a partir de aquí ya es seguro escribir
    ensureBaseline();
    // Historical modes come from the dated configuration timeline.
    // Do not rewrite completed days to Vacation on every load.
    widenBaseline();
    addFamilyOnce();addJunkFoodOnce();rebalanceOnce();
    // Restoring the live preference is separate from the manual historical repair.
    restoreLiveTravelMode();
    // Repair malformed legacy dates before the automatic return check.
    if(normalizeTravelResume())saveCfg();
    applyCfg();
    checkTravelAuto();
    recoverPeopleFromDays();
    runShaahSocialCoreMigration();
    saveCache();
    cfgSyncStatus();
    if(_cfgDraft&&!_cfgConflict){_cfgDraft=cfgCopy(CFG);keepCfgDraft();flushCfgSaves();}
    if(Object.keys(_offlineQueue).length)flushOfflineQueue();
  }catch(e){
    if(USER?.id!==owner||_syncEpoch!==epoch)return;
    setStatus('OFFLINE','#ef4444');
  }
  render();
}

async function reconcileDeletedDays(owner,epoch){
  // Older schemas may expose only an opaque primary key in DELETE events.
  // Re-read this account through RLS; an unscoped event never supplies an owner.
  const before={..._state};
  try{
    const {data,error}=await sb.from('day_logs').select('date').eq('user_id',owner);
    if(USER?.id!==owner||_syncEpoch!==epoch||error||!Array.isArray(data))return;
    const present=new Set(data.map(row=>row.date));
    let changed=false;
    for(const key of Object.keys(before)){
      if(/^\d{4}-\d{2}-\d{2}$/.test(key)&&!present.has(key)&&
         _state[key]===before[key]&&!_pending[key]&&!_offlineQueue[key]){delete _state[key];changed=true;}
    }
    if(changed){saveCache();renderSyncedState();}cfgSyncStatus();
  }catch{}
}

// A remote update is not a new page entrance. Ignore harmless echoes before
// reaching here, and apply real changes without restarting the fade animation.
// A background tab keeps its data/cache current and repaints once on return.
function renderSyncedState(){
  if(document.hidden){_syncRenderQueued=true;return;}
  _syncRenderQueued=false;
  const root=document.getElementById('scroll');
  if(USER&&!settingsOpen&&!(routineId&&routineView)&&root?.querySelector?.('.today,.soc')){
    renderDayChange(editDayKey||(currentTab==='social'?socialKey():todayKey()),true);
  }else render();
  root?.querySelectorAll('.fade-up').forEach(node=>node.style.animation='none');
}
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&_syncRenderQueued)renderSyncedState();
});

function subscribeRealtime(){
  if(!USER)return;
  const owner=USER.id,epoch=_syncEpoch;
  if(_realtimeChannel)sb.removeChannel?.(_realtimeChannel);
  const onChange=payload=>{
        if(USER?.id!==owner||_syncEpoch!==epoch)return;
        let changed=false;
        if(payload.eventType==='DELETE'){
          // DELETE filters are not an ownership guarantee in Realtime.
          if(payload.old?.user_id&&payload.old.user_id!==owner)return;
          const key=payload.old&&payload.old.date;
          if(key==='cfgbak')return;
          if(payload.old?.user_id!==owner||!key)return reconcileDeletedDays(owner,epoch);
          // A remote DELETE must not erase a local edit that is still waiting to
          // be written. Once the local upsert completes, the echo is authoritative.
          if(key&&(_pending[key]||_offlineQueue[key]))return;
          if(key&&Object.hasOwn(_state,key)){delete _state[key];changed=true;}
        }else if(payload.new){
          if(payload.new.user_id!==owner)return;
          changed=rowToState(payload.new);
        }
        if(!changed)return;
        saveCache();
        renderSyncedState();
        cfgSyncStatus();
      };
  const owned={schema:'public',table:'day_logs',filter:`user_id=eq.${owner}`};
  _realtimeChannel=sb.channel('shaah-'+owner)
    .on('postgres_changes',{...owned,event:'INSERT'},onChange)
    .on('postgres_changes',{...owned,event:'UPDATE'},onChange)
    // DELETE payloads may lack user_id, so this subscription cannot filter on
    // it. The handler validates explicit owners or re-reads our own rows by RLS.
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'day_logs'},onChange)
    .subscribe(s=>{
      if(USER?.id!==owner||_syncEpoch!==epoch)return;
      _live=(s==='SUBSCRIBED');
      if(_live)cfgSyncStatus();
    });
}

// ── Auth ───────────────────────────────────────────────────
async function signIn(){
  AUTH_ERR=null;
  const redirectTo=location.origin+location.pathname;
  const{error}=await sb.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo}
  });
  if(error){AUTH_ERR=error.message;render();}
}
const SIGNOUT_NOTICE_KEY='shaah:signout-notice:v1';
const SIGNOUT_NOTICES={
  kept:'Signed out. Saved account copies remain on this browser.',
  cleared:'Signed out. Saved copies for this account were removed from this browser. Older unlinked recovery data, if any, was kept.',
  pending:'Signed out. New unsynced changes were kept on this browser for recovery.',
  failed:'Signed out, but this browser could not remove every saved copy. Save any recovery data before clearing browser site data on a shared device.'
};
function signOutNoticeFor(code){return Object.hasOwn(SIGNOUT_NOTICES,code)?SIGNOUT_NOTICES[code]:'';}
function signOutNoticeHTML(){return _signOutNotice?`<p role="status" ${uiStyle(`max-width:380px;font-size:14px;line-height:1.6;color:#adadbf;text-align:center`)}>${esc(_signOutNotice)}</p>`:'';}
function accountCopyStatus(owner){
  try{
    const read=key=>{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;};
    const days=read(_offlineKey+':'+owner),draft=read('shaah_cfg_pending_'+owner),routine=read('shaah_routine_'+owner);
    if(days&&(typeof days!=='object'||Array.isArray(days)))return {blocked:true};
    const live=USER?.id===owner&&(_cfgDraft||_cfgFlushPromise||Object.keys(_pending).length||_offlineFlushing.has(owner)||Object.keys(sessions).length);
    return {blocked:!!(live||(days&&Object.keys(days).length)||draft||routine)};
  }catch(e){return {blocked:true};}
}
function removeAccountCopies(owner){
  // An explicit allowlist: never erase another account, preferences or recovery queues.
  const keys=['cache','cfg','bak','routine','today_routines','lvl','sec','tour'].map(kind=>'shaah_'+kind+'_'+owner);
  keys.push('travelMode:'+owner,DAYLOG_KEY+':'+owner);
  let removed=true;
  for(const key of keys)try{localStorage.removeItem(key);}catch(e){removed=false;}
  return removed;
}
function signOutStatus(message){
  _signOutStatus=message;
  const node=document.getElementById('signout-status');if(node)node.textContent=message;
  for(const button of document.querySelectorAll?.('[data-signout]')||[]){button.disabled=_signOutBusy;button.setAttribute('aria-busy',String(_signOutBusy));}
}
async function signOut(forget=false){
  const owner=USER?.id;if(!owner||_signOutBusy)return false;
  if(forget&&accountCopyStatus(owner).blocked){signOutStatus('Sync your pending changes and finish any active routine before removing saved copies. You can also export your data.');return false;}
  if(!confirm(forget?'Sign out and remove this account’s saved copies from this browser, including local backups? Online data is not deleted. Download any local backups you want to keep first.':'Sign out of this browser session? Saved copies will stay on this browser.'))return false;
  _signOutBusy=true;signOutStatus('Signing out…');
  const screen=document.getElementById('scroll');if(screen)screen.inert=true;
  try{
    const result=await sb.auth.signOut({scope:'local'});
    if(result?.error)throw result.error;
    // A late acknowledgement from A must not clear or reload a newly opened B.
    if(USER&&USER.id!==owner){_signOutStatus='';return true;}
    let notice='kept';
    if(forget)notice=accountCopyStatus(owner).blocked?'pending':removeAccountCopies(owner)?'cleared':'failed';
    changeSyncUser(null);
    try{sessionStorage.setItem(SIGNOUT_NOTICE_KEY,notice);}catch(e){if(notice==='pending'||notice==='failed')alert(SIGNOUT_NOTICES[notice]);}
    location.reload();return true;
  }catch(e){signOutStatus('Could not sign out. Your saved copies were kept. Please try again.');return false;}
  finally{_signOutBusy=false;if(screen)screen.inert=false;signOutStatus(_signOutStatus);}
}

function renderReview(){
  const days=getDays(7), h7=getHistory();
  const logged=days.filter(d=>d.data&&d.data.score>0);
  const avg=avgW(days), tr=weekTrend();
  const best=logged.reduce((m,d)=>!m||d.data.score>m.data.score?d:m,null);
  const worst=logged.reduce((m,d)=>!m||d.data.score<m.data.score?d:m,null);
  const habits=[...LVL1,...LVL2,...LVL3];
  // completion rate per habit over the 7 days
  const rate=habits.map(x=>{
    const n=days.filter(d=>{const c=getChecked(d.key);return c&&c[x.id];}).length;
    return {...x,n,pct:Math.round(n/7*100)};
  }).sort((a,b)=>b.n-a.n);
  const top=rate.filter(r=>r.n>0).slice(0,3);
  const weak=rate.filter(r=>r.n<7).slice(-3).reverse();
  const g=GRADE(avg,100);
  const dn=k=>keyToDate(k).toLocaleDateString("en-US",{weekday:"short",day:"numeric",month:"short"});

  return`<div class="edit-day-screen" ${uiStyle(`display:flex;flex-direction:column;min-height:100%`)}>
    <div ${uiStyle(`display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top) + 12px) 20px 12px;border-bottom:1px solid #1e1e2e;background:#07070f;position:sticky;top:0;z-index:50`)}>
      <button ${ui('click','closeReview')} ${uiStyle(`background:none;border:1px solid #1e1e2e;color:#c0c0cd;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:19px;display:flex;align-items:center;justify-content:center;flex-shrink:0`)}>←</button>
      <div ${uiStyle(`font-family:'Bebas Neue';font-size:19px;letter-spacing:0.16em;color:#e2e2e2`)}>WEEKLY REVIEW</div>
    </div>
    <div class="fade-up" ${uiStyle(`padding:18px 16px calc(68px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:16px`)}>

      ${logged.length===0?`<div ${uiStyle(`text-align:center;padding:50px 20px;color:#9a9ab2;font-size:15px;line-height:1.6`)}>No days logged this week yet.<br>Check a habit and come back.</div>`:`

      <div class="card" ${uiStyle(`background:${g.bg};border:1px solid ${g.c}22`)}>
        <div ${uiStyle(`font-size:12px;letter-spacing:0.1em;color:#9a9ab2;margin-bottom:10px`)}>LAST 7 DAYS</div>
        <div ${uiStyle(`display:flex;align-items:center;gap:16px`)}>
          <div ${uiStyle(`font-family:'Bebas Neue';font-size:56px;color:${g.c};line-height:1;text-shadow:0 0 24px ${g.g}`)}>${esc(g.l)}</div>
          <div ${uiStyle(`flex:1`)}>
            <div ${uiStyle(`font-family:'Bebas Neue';font-size:32px;color:${g.c};line-height:1`)}>${avg}%</div>
            <div ${uiStyle(`font-size:13px;color:#adadbf;margin-top:4px`)}>average · ${logged.length}/7 days logged</div>
            ${tr?`<div ${uiStyle(`font-size:13px;margin-top:6px;color:${tr.diff>=0?"#4ade80":"#f97316"}`)}>${tr.diff>=0?"▲":"▼"} ${Math.abs(tr.diff)}% vs previous week</div>`:""}
          </div>
        </div>
      </div>

      <div ${uiStyle(`display:grid;grid-template-columns:1fr 1fr;gap:10px`)}>
        <div class="card">
          <div ${uiStyle(`font-size:21px;margin-bottom:6px`)}>🏆</div>
          <div ${uiStyle(`font-family:'Bebas Neue';font-size:26px;color:${best?GRADE(best.data.score,best.data.max).c:"#8a8aa0"};line-height:1`)}>${best?best.data.score+"%":"—"}</div>
          <div ${uiStyle(`font-size:12px;color:#9a9ab2;margin-top:5px;letter-spacing:0.08em`)}>BEST DAY</div>
          <div ${uiStyle(`font-size:13px;color:#adadbf;margin-top:2px`)}>${best?dn(best.key):""}</div>
        </div>
        <div class="card">
          <div ${uiStyle(`font-size:21px;margin-bottom:6px`)}>📉</div>
          <div ${uiStyle(`font-family:'Bebas Neue';font-size:26px;color:${worst?GRADE(worst.data.score,worst.data.max).c:"#8a8aa0"};line-height:1`)}>${worst?worst.data.score+"%":"—"}</div>
          <div ${uiStyle(`font-size:12px;color:#9a9ab2;margin-top:5px;letter-spacing:0.08em`)}>LOWEST DAY</div>
          <div ${uiStyle(`font-size:13px;color:#adadbf;margin-top:2px`)}>${worst?dn(worst.key):""}</div>
        </div>
      </div>

      <div>
        <div class="sec">MOST CONSISTENT</div>
        <div class="card">
          ${top.length?top.map(r=>`
          <div ${uiStyle(`display:flex;align-items:center;gap:11px;margin-bottom:12px`)}>
            <span ${uiStyle(`font-size:19px;width:24px;text-align:center`)}>${esc(r.icon)}</span>
            <div ${uiStyle(`flex:1;min-width:0`)}>
              <div ${uiStyle(`font-size:14px;color:#e2e2e2;margin-bottom:5px`)}>${esc(r.label)}</div>
              ${bar(r.pct,"#4ade80","#4ade8055",5)}
            </div>
            <div ${uiStyle(`font-size:14px;color:#4ade80;width:44px;text-align:right`)}>${r.n}/7</div>
          </div>`).join(""):`<div ${uiStyle(`font-size:14px;color:#9a9ab2`)}>Nothing checked this week yet.</div>`}
        </div>
      </div>

      <div>
        <div class="sec">NEEDS ATTENTION</div>
        <div class="card">
          ${weak.length?weak.map(r=>`
          <div ${uiStyle(`display:flex;align-items:center;gap:11px;margin-bottom:12px`)}>
            <span ${uiStyle(`font-size:19px;width:24px;text-align:center;opacity:.6`)}>${esc(r.icon)}</span>
            <div ${uiStyle(`flex:1;min-width:0`)}>
              <div ${uiStyle(`font-size:14px;color:#c0c0cd;margin-bottom:5px`)}>${esc(r.label)}</div>
              ${bar(r.pct,r.n===0?"#ef4444":"#f59e0b",(r.n===0?"#ef4444":"#f59e0b")+"55",5)}
            </div>
            <div ${uiStyle(`font-size:14px;color:${r.n===0?"#ef4444":"#f59e0b"};width:44px;text-align:right`)}>${r.n}/7</div>
          </div>`).join(""):`<div ${uiStyle(`font-size:14px;color:#4ade80`)}>Every habit hit all 7 days. 🥂</div>`}
        </div>
      </div>

      <div>
        <div class="sec">DAY BY DAY</div>
        <div class="card">
          <div ${uiStyle(`display:flex;align-items:flex-end;gap:6px;height:104px;padding-top:8px`)}>
            ${days.map(d=>{
              const sc=d.data?d.data.score:0, gg=GRADE(sc,d.data?d.data.max:null);
              const hh=sc>0?Math.max(Math.round(dPct(d.data)/100*76),6):4;
              return`<div ${uiStyle(`flex:1;display:flex;flex-direction:column;align-items:center;gap:5px`)}>
                <div ${uiStyle(`font-size:11px;color:${sc>0?gg.c:"#76768f"}`)}>${sc||""}</div>
                <div ${uiStyle(`width:100%;height:${hh}px;border-radius:4px 4px 0 0;background:${sc>0?gg.c+"33":"#14142a"};border:1px solid ${sc>0?gg.c+"55":"#1c1c30"};border-bottom:none`)}></div>
                <div ${uiStyle(`font-size:11px;color:#8888a4`)}>${keyToDate(d.key).toLocaleDateString("en-US",{weekday:"narrow"})}</div>
              </div>`;
            }).join("")}
          </div>
        </div>
      </div>
      `}
    </div>
  </div>`;
}

function settingsRowInfo(key){
  const rows={
    data:{label:'Account & data',icon:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'},
    trav:{label:'Modes',detail:'Work / Vacation',icon:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>'},
    hab:{label:'Habits & weights',icon:'<path d="m3 6 1.5 1.5L7 4.5M10 6h11M3 12h4M10 12h11M3 18h4M10 18h11"/>'},
    rout:{label:'Routines',icon:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M19 5l1.5-1.5"/>'},
    ppl:{label:'Social Settings',icon:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5.65"/>'},
    bak:{label:'Data & backup',icon:'<path d="M5 8H3v13h18V8h-2M12 3v12m-4-4 4 4 4-4M7 3h10"/>'},
    appearance:{label:'Appearance',icon:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/>'}
  };
  return rows[key];
}
function stCard(key,title,col,body,extra){
  const open=secOpen[key]!==false;
  const row=settingsRowInfo(key)||{label:title,icon:''};
  return`<section class="st-card${extra?" "+extra:""}" data-settings-section="${esc(key)}">
    <button type="button" id="settings-toggle-${esc(key)}" class="st-head" aria-expanded="${open}" aria-controls="settings-section-${esc(key)}" ${ui('click','toggleSec' ,key)}>
      <span class="st-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${row.icon}</svg></span>
      <span class="st-heading"><span class="st-title">${esc(row.label)}</span>${row.detail?`<span class="st-subtitle">${esc(row.detail)}</span>`:''}</span>
      <svg class="st-chevron${open?' is-open':''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
    </button>
    <div id="settings-section-${esc(key)}" class="lvl-b${open?"":" cl"}" role="region" aria-labelledby="settings-toggle-${esc(key)}"${open?'':' inert'}><div class="st-body">${body}</div></div>
  </section>`;
}
function renderSettings(){
  travelEnsure();subsEnsure();
  const tot=MAX;
  const lvlBlock=(n,title,col)=>`
    <div ${uiStyle(`margin-bottom:20px`)}>
      <div class="sec" ${uiStyle(`color:${col}`)}>${title} — ${buildLevel(n).filter(i=>!i.combo).reduce((a,i)=>a+i.pts,0)}%</div>
      <div ${uiStyle(`display:flex;justify-content:flex-end;gap:4px;margin:-7px 10px 5px;padding-right:42px;font-size:9px;letter-spacing:.06em;color:#66667d`)}><span ${uiStyle(`width:44px;text-align:center`)}>WORK</span><span ${uiStyle(`width:44px;text-align:center`)}>VACATION</span></div>
      ${CFG.order.filter(id=>CFG.h[id]&&CFG.h[id].lv===n&&!CFG.h[id].combo).map(id=>{const x=CFG.h[id];return `
        <div ${uiStyle(`display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:${x.on!==false?"rgba(255,255,255,0.03)":"transparent"};margin-bottom:5px;opacity:${x.on!==false?1:.45}`)}>
          <div ${uiStyle(`display:flex;flex-direction:column;gap:2px;flex-shrink:0`)}>
            <button ${ui('click','cfgMove' ,id,-1)} class="ord">▲</button>
            <button ${ui('click','cfgMove' ,id,1)} class="ord">▼</button>
            <select aria-label="Habit level" ${ui('change','cfgLevel',id)} ${uiStyle(`width:34px;height:26px;background:#111120;border:1px solid #222;border-radius:6px;color:#c0c0cd;font-family:inherit;font-size:11px;padding:0`)}>${[1,2,3].map(lv=>`<option value="${lv}" ${x.lv===lv?'selected':''}>L${lv}</option>`).join('')}</select>
          </div>
          <input value="${esc(x.i)}" ${ui('change','cfgSet' ,id,'i')} aria-label="icon"
            ${uiStyle(`width:26px;flex-shrink:0;background:none;border:none;color:#e2e2e2;font-family:inherit;font-size:17px;text-align:center;padding:0`)}/>
          <input value="${esc(x.l)}" ${ui('change','cfgSet' ,id,'l')}
            ${uiStyle(`flex:1;min-width:0;background:none;border:none;border-bottom:1px solid #222;color:#e2e2e2;font-family:inherit;font-size:15px;padding:3px 0`)}/>
          ${x.combo
            ?`<span title="Sum of the active parts below" ${uiStyle(`width:96px;flex-shrink:0;color:${col};font-size:12px;text-align:center;line-height:1.25`)}>W ${subsOn(subsList()).reduce((a,y)=>a+modePts(y,'work'),0)}% · V ${subsOn(subsList()).reduce((a,y)=>a+modePts(y,'vacation'),0)}%</span>`
            :`<div ${uiStyle(`display:flex;gap:4px;flex-shrink:0`)}>
              <input type="number" min="0" max="60" value="${esc(modePts(x,'work'))}" ${id==='work'&&CFG.shaahSocialCoreMigration?'readonly title="Configurar en Routines → Work"':ui('change','cfgSet' ,id,'pWork')} title="Work Mode" aria-label="Work Mode points"
                ${uiStyle(`width:44px;background:#111120;border:1px solid #222;border-radius:6px;color:${col};font-family:inherit;font-size:14px;padding:5px 3px;text-align:center`)}/>
              <input type="number" min="0" max="60" value="${esc(modePts(x,'vacation'))}" ${ui('change','cfgVacationPoints' ,id)} title="Vacation Mode" aria-label="Vacation Mode points"
                ${uiStyle(`width:44px;background:#111120;border:1px solid #222;border-radius:6px;color:${col};font-family:inherit;font-size:14px;padding:5px 3px;text-align:center`)}/>
            </div>`}
          <button ${ui('click','cfgToggle' ,id)} title="${x.on!==false?'Pause this habit':'Resume this habit'}" ${uiStyle(`background:none;border:1px solid #222;color:${x.on!==false?col:'#555'};border-radius:8px;font-size:15px;width:38px;height:36px;cursor:pointer`)}>${x.on!==false?'✓':'○'}</button>
          ${isCustom(id)?`<button ${ui('click','cfgDel' ,id)} title="Delete habit" ${uiStyle(`background:none;border:1px solid #222;color:#9a9ab2;border-radius:8px;font-size:13px;width:34px;height:36px;cursor:pointer;flex-shrink:0`)}>✕</button>`:""}
        </div>`}).join("")}
      <button ${ui('click','cfgAdd' ,n)} ${uiStyle(`width:100%;background:none;border:1px dashed #242436;color:#7e7e97;font-family:inherit;font-size:14px;letter-spacing:0.12em;padding:9px;border-radius:9px;cursor:pointer;margin-top:3px`)}>+ ADD HABIT</button>
    </div>`;
  return`<div class="edit-day-screen" ${uiStyle(`display:flex;flex-direction:column;min-height:100%`)}>
    <div class="settings-header">
      <button class="settings-back" ${ui('click','closeSettings')} aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button>
      <h1 class="settings-heading">Settings</h1>
      <div class="settings-max${tot===118?'':' is-custom'}">MAX ${tot}%</div>
    </div>
    <div class="fade-up settings-body">
      ${syncNoticeHTML()}
      <div class="settings-list">
            ${stCard("data","SETTINGS & DATA","#9090aa",`<select ${ui('change','cfgTz')} ${uiStyle(`width:100%;background:#111120;border:1px solid #222;border-radius:10px;color:#e2e2e2;font-family:inherit;font-size:15px;padding:11px 12px;margin-bottom:6px`)}>
        ${TIMEZONES.map(t=>`<option value="${t.id}" ${CFG.tz===t.id?'selected':''}>${esc(t.label)}</option>`).join("")}
      </select>
      <div ${uiStyle(`font-size:15px;color:#adadbf;margin-bottom:22px;line-height:1.5`)}>The day rolls over at midnight in this zone. Today is <b ${uiStyle(`color:#d0d0da`)}>${todayKey()}</b>.</div>
<div class="st-div"></div>

<div ${uiStyle(`display:flex;gap:7px;margin-bottom:16px`)}>
        ${[["chips","Chips","Side by side"],["slim","Bar","One thin line"],["circle","Circle","Smallest"]].map(([id,lbl,sub])=>`
          <button ${ui('click','cfgPill' ,id)} ${uiStyle(`flex:1;background:${(CFG.pill||'chips')===id?'rgba(255,255,255,.07)':'transparent'};border:1px solid ${(CFG.pill||'chips')===id?'#3a3a55':'#222'};color:${(CFG.pill||'chips')===id?'#e2e2e2':'#9a9ab2'};font-family:inherit;border-radius:11px;padding:11px 6px;cursor:pointer`)}>
            <div ${uiStyle(`font-size:13px`)}>${lbl}</div>
            <div ${uiStyle(`font-size:10px;color:#7e7e97;margin-top:3px`)}>${sub}</div>
          </button>`).join("")}
      </div>
<div class="st-div"></div>
<button ${ui('click','startTour')} ${uiStyle(`width:100%;background:none;border:1px solid #222;color:#d0d0da;font-family:inherit;font-size:15px;letter-spacing:0.12em;padding:13px;border-radius:10px;cursor:pointer;margin-bottom:8px`)}>▶  VIEW TUTORIAL</button>
      <button ${ui('click','exportData')} ${uiStyle(`width:100%;background:none;border:1px solid #222;color:#d0d0da;font-family:inherit;font-size:15px;letter-spacing:0.12em;padding:13px;border-radius:10px;cursor:pointer;margin-bottom:8px`)}>⬇  EXPORT JSON</button>
      ${unownedDayLogNoticeHTML()}
      <button ${ui('click','importPick')} ${uiStyle(`width:100%;background:none;border:1px solid #222;color:#d0d0da;font-family:inherit;font-size:15px;letter-spacing:0.12em;padding:13px;border-radius:10px;cursor:pointer;margin-bottom:8px`)}>⬆  IMPORT JSON</button>
      <button ${ui('click','restoreDefaults')} ${uiStyle(`width:100%;background:none;border:1px solid #221818;color:#a55;font-family:inherit;font-size:15px;letter-spacing:0.12em;padding:13px;border-radius:10px;cursor:pointer;margin-bottom:8px`)}>↺  RESTORE DEFAULTS</button>
      <div ${uiStyle(`text-align:center;font-size:12px;color:#6e6e88;letter-spacing:.1em;margin:14px 0 2px`)}>${BUILD}</div>
      <div ${uiStyle(`text-align:center;font-size:14.5px;color:#a4a4ba;margin-top:18px;letter-spacing:0.12em`)}>SHAAH · ${esc(USER?USER.email||'':'')}</div>
      <button data-signout ${ui('click','signOut' ,false)} ${uiStyle(`width:100%;background:none;border:1px solid #222;color:#adadbf;font-family:inherit;font-size:15px;letter-spacing:0.12em;padding:13px;border-radius:10px;cursor:pointer`)}>SIGN OUT</button>
      <button data-signout ${ui('click','signOut' ,true)} ${uiStyle(`width:100%;background:none;border:1px solid #34344a;color:#c0c0cd;font-family:inherit;font-size:14px;padding:12px;border-radius:10px;cursor:pointer;margin-top:10px`)}>Sign out & remove saved copies</button>
      <p ${uiStyle(`font-size:12px;color:#8888a4;line-height:1.6;margin-top:10px`)}>Removes only this account’s saved copies and local backups from this browser. Your online data stays available. Sync changes and download any local backups you want to keep first. Older unlinked recovery data is preserved.</p>
      <p id="signout-status" role="status" aria-live="polite" ${uiStyle(`font-size:13px;line-height:1.5;color:#fbbf24;margin-top:8px`)}>${esc(_signOutStatus)}</p>`,"st-full")}
            ${stCard("trav","MODE","#9090aa",`
      <div ${uiStyle(`font-size:13.5px;color:#8888a4;line-height:1.5;margin-bottom:10px`)}>Work and Vacation have independent point values for every habit. Switching mode changes which values are used; Vacation also pauses <b ${uiStyle(`color:#d0d0da`)}>Work</b> from today.</div>
      <div ${uiStyle(`display:flex;gap:7px;margin-bottom:16px`)}>
        ${[["work","💼 Work","Work active"],["vacation","🏖 Vacation","Work paused"]].map(([id,lbl,sub])=>`
          <button ${ui('click','setTravelMode' ,id)} ${uiStyle(`flex:1;background:${travelMode()===id?'rgba(255,255,255,.07)':'transparent'};border:1px solid ${travelMode()===id?'#3a3a55':'#222'};color:${travelMode()===id?'#e2e2e2':'#9a9ab2'};font-family:inherit;border-radius:11px;padding:11px 6px;cursor:pointer`)}>
            <div ${uiStyle(`font-size:14px`)}>${lbl}</div>
            <div ${uiStyle(`font-size:10px;color:#7e7e97;margin-top:3px`)}>${sub}</div>
          </button>`).join("")}
      </div>
      <div class="st-div"></div>
      <div ${uiStyle(`display:flex;align-items:center;gap:10px;margin-bottom:12px`)}>
        <span ${uiStyle(`font-size:14px;color:#c0c0cd;flex:1`)}>Auto-switch to Work on</span>
        <input type="date" value="${esc(CFG.travel.resumeOn||'')}" ${ui('change','setTravelResume')} ${uiStyle(`background:#111120;border:1px solid #222;border-radius:8px;color:#e2e2e2;font-family:inherit;font-size:14px;padding:7px 9px`)}/>
      </div>
      <button ${ui('click','setTravelAuto' ,!CFG.travel.auto)} ${uiStyle(`width:100%;background:${CFG.travel.auto?'rgba(255,255,255,.07)':'transparent'};border:1px solid ${CFG.travel.auto?'#3a3a55':'#222'};color:${CFG.travel.auto?'#e2e2e2':'#7e7e97'};font-family:inherit;font-size:14px;letter-spacing:.06em;padding:10px;border-radius:10px;cursor:pointer`)}>${CFG.travel.auto?'✓':'○'} AUTOMATIC${CFG.travel.auto&&CFG.travel.resumeOn?` — switches to Work on ${esc(CFG.travel.resumeOn)}`:''}</button>`,"st-col-b")}
            ${stCard("hab","HABITS & WEIGHTS","#9090aa",`${lvlBlock(1,"⬛ LVL 1 — CORE","#e2e2e2")}
      ${lvlBlock(2,"▪ LVL 2 — HABITS","#a78bfa")}
      ${lvlBlock(3,"· LVL 3 — BONUS","#fbbf24")}
`,"st-col-a")}
            ${stCard("rout","ROUTINES","#9090aa",`${CFG.shaahSocialCoreMigration?workMilestonesSettings():''}${Object.keys(ROUTINES).filter(rid=>rid!=="work"||!CFG.shaahSocialCoreMigration).map(rid=>{const r=ROUTINES[rid];const tm=r.steps.reduce((a,s)=>a+s.dur,0);return`
        <div class="card" ${uiStyle(`margin-bottom:10px;padding:14px`)}>
          <div ${uiStyle(`display:flex;align-items:center;gap:8px;margin-bottom:10px`)}>
            <span ${uiStyle(`font-size:17px`)}>${esc(r.icon)}</span>
            <span ${uiStyle(`font-size:16.5px;color:#e2e2e2`)}>${esc(r.label)}</span>
            <span ${uiStyle(`margin-left:auto;font-size:15px;color:#adadbf`)}>${r.steps.length} steps · ${tm} min</span>
          </div>
          ${r.steps.map((s,i)=>`
            <div ${uiStyle(`display:flex;align-items:center;gap:8px;margin-bottom:4px`)}>
              <span ${uiStyle(`font-size:16.5px;width:20px;text-align:center`)}>${esc(s.icon)}</span>
              <input value="${esc(s.label)}" ${ui('change','stepSet' ,rid,i,'label')}
                ${uiStyle(`flex:1;min-width:0;background:none;border:none;border-bottom:1px solid #1c1c2c;color:#bbb;font-family:inherit;font-size:15px;padding:3px 0`)}/>
              <input type="number" min="1" max="180" value="${esc(s.dur)}" ${ui('change','stepSet' ,rid,i,'dur')}
                ${uiStyle(`width:48px;background:#111120;border:1px solid #222;border-radius:6px;color:${r.col};font-family:inherit;font-size:15px;padding:4px;text-align:center`)}/>
              <span ${uiStyle(`font-size:14.5px;color:#a2a2b6`)}>m</span>
            </div>`).join("")}
        </div>`}).join("")}`,"st-col-b")}
            ${stCard("ppl","SOCIAL SETTINGS","#9090aa",`${socialGeneralSettings()}<p class="sf-muted">Personas, grupos y frecuencias se administran en Social.</p><button class="sf-button" ${ui('click','socialManage')}>Abrir Social →</button>`,"st-col-b")}
            ${stCard("bak","BACKUPS","#9090aa",`${historySafetyHTML()}
      <div ${uiStyle(`font-size:13.5px;color:#8888a4;line-height:1.5;margin-bottom:10px`)}>Your settings are saved automatically on every change. Restore any version here — your daily logs are never touched.</div>
      ${bakList().length?bakList().map(b=>`
        <div ${uiStyle(`display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:rgba(255,255,255,0.03);margin-bottom:5px`)}>
          <div ${uiStyle(`flex:1;min-width:0`)}>
            <div ${uiStyle(`font-size:14.5px;color:#e2e2e2`)}>${new Date(b.t).toLocaleString(undefined,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
            <div ${uiStyle(`font-size:13px;color:#8888a4;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)}>${b.habits} habits · ${b.people} ${b.people===1?"person":"people"}${b.names?" — "+esc(b.names):""}</div>
          </div>
          <button ${ui('click','bakRestore' ,b.i)} ${uiStyle(`flex-shrink:0;background:none;border:1px solid #222;color:#c0c0cd;font-family:inherit;font-size:13px;letter-spacing:.08em;padding:7px 12px;border-radius:8px;cursor:pointer`)}>RESTORE</button>
        </div>`).join(""):`<div ${uiStyle(`font-size:14px;color:#9a9ab2;padding:6px 0`)}>No versions saved yet — the first one appears after your next settings change.</div>`}`,"st-col-b")}
      ${stCard("appearance","APPEARANCE · SKINS","#9090aa",skinPickerHTML(),"skin-settings")}
</div></div>
  </div>`;
}

function cfgSet(id,k,v){
  if(!CFG.h[id])return;
  cfgEdit(()=>{
    if(k==='p'||k==='pWork'){
      ensureModePts(CFG.h[id]);
      CFG.h[id][k==='pWork'?'pWork':travelMode()==='vacation'?'pVacation':'pWork']=Math.max(0,parseInt(v)||0);
      CFG.h[id].p=modePts(CFG.h[id],travelMode());
    }else CFG.h[id][k]=v;
  });
}
const isCustom=id=>/^c[a-z0-9]{5}$/.test(id);
function cfgAdd(lv){
  if(Object.keys(CFG.h).length>=40)return;
  let id; do{ id='c'+Math.random().toString(36).slice(2,7).padEnd(5,'0'); }while(CFG.h[id]);
  haptic(12);
  cfgEdit(()=>{ CFG.h[id]={l:"New habit",p:5,pWork:5,pVacation:5,i:"⭐",lv:Number(lv)||1,on:true}; CFG.order.push(id); });
}
function cfgDel(id){
  if(!CFG.h[id]||!isCustom(id))return;
  if(!confirm(`Remove "${esc(CFG.h[id].l)}"? Past days keep the score they already had.`))return;
  haptic(12);
  cfgEdit(()=>{ delete CFG.h[id]; CFG.order=CFG.order.filter(x=>x!==id); });
}
function cfgPill(v){CFG.pill=v;haptic(10);saveCfg();render();}
function cfgLevel(id,level){
  if(!Number.isInteger(level)||level<1||level>3||!CFG.h[id]||CFG.h[id].combo||CFG.h[id].lv===level)return;
  cfgEdit(()=>{CFG.h[id].lv=level;});
}
function cfgMove(id,dir){
  const lv=CFG.h[id]&&CFG.h[id].lv; if(!lv)return;
  const peers=CFG.order.filter(x=>CFG.h[x]&&CFG.h[x].lv===lv);
  const i=peers.indexOf(id), j=i+dir;
  if(i<0||j<0||j>=peers.length)return;
  haptic(12);
  // swap the two ids in the global order array
  const a=CFG.order.indexOf(peers[i]), b=CFG.order.indexOf(peers[j]);
  cfgEdit(()=>{ [CFG.order[a],CFG.order[b]]=[CFG.order[b],CFG.order[a]]; });
}
function cfgToggle(id){ if(!CFG.h[id])return; haptic(10); cfgEdit(()=>{ CFG.h[id].on=CFG.h[id].on===false; }); }
function cfgTz(v){ CFG.tz=v; saveCfg(); render(); }
// Por defecto SOCIAL es su propio tab; el ajuste sirve para integrarlo de vuelta.
// Sin el campo guardado = true, así que las cuentas existentes lo estrenan activado.
function socialOwnTab(){ return true; }
function subsEnsure(){
  if(!Array.isArray(CFG.subs)||!CFG.subs.length)CFG.subs=SOCIAL_SUBS_BASE.map(x=>({...x,pWork:6,pVacation:6}));
  const cid=comboIdIn(CFG.h);
  const cpW=cid&&CFG.h[cid]?modePts(CFG.h[cid],'work'):18;
  const cpV=cid&&CFG.h[cid]?modePts(CFG.h[cid],'vacation'):18;
  const n=CFG.subs.length||1;
  for(const x of CFG.subs){
    if(x.pWork==null)x.pWork=x.p!=null?safePts(x.p):Math.round(cpW/n);
    if(x.pVacation==null)x.pVacation=x.p!=null?safePts(x.p):Math.round(cpV/n);
    x.p=modePts(x,travelMode());
  }
}
function syncComboPts(){
  const cid=comboIdIn(CFG.h); if(!cid)return;
  ensureModePts(CFG.h[cid]);
  CFG.h[cid].pWork=subsOn(CFG.subs||[]).reduce((a,x)=>a+modePts(x,'work'),0);
  CFG.h[cid].pVacation=subsOn(CFG.subs||[]).reduce((a,x)=>a+modePts(x,'vacation'),0);
  CFG.h[cid].p=modePts(CFG.h[cid],travelMode());
}
function subSet(i,k,v){ subsEnsure(); if(!CFG.subs[i])return;
  cfgEdit(()=>{
    const x=CFG.subs[i];
    if(k==='p'||k==='pWork'||k==='pVacation'){
      ensureModePts(x);
      const key=k==='p'?(travelMode()==='vacation'?'pVacation':'pWork'):k;
      x[key]=Math.max(0,Math.min(99,parseInt(v)||0));
      x.p=modePts(x,travelMode());
    }else x[k]=String(v==null?'':v).slice(0,k==='icon'?3:28);
    syncComboPts();
  }); }
function subAdd(){ subsEnsure(); if(CFG.subs.length>=8)return; haptic(12);
  let id; do{ id='s'+Math.random().toString(36).slice(2,7).padEnd(5,'0'); }while(CFG.subs.some(x=>x.id===id));
  cfgEdit(()=>{ CFG.subs.push({id,label:"New",icon:"•",p:6,pWork:6,pVacation:6}); syncComboPts(); }); }
function subToggle(i){ subsEnsure(); const x=CFG.subs[i]; if(!x)return;
  if(x.on!==false&&subsOn(CFG.subs).length<=1)return;   // never leave the combo with zero parts
  haptic(10); cfgEdit(()=>{ x.on=x.on===false; syncComboPts(); }); }
function subDel(i){ subsEnsure(); if(CFG.subs.length<=1||!CFG.subs[i])return;
  if(!confirm(`Remove "${esc(CFG.subs[i].label)}" from the Social Combo? Past days keep the score they already had.`))return;
  haptic(12); cfgEdit(()=>{ CFG.subs.splice(i,1); syncComboPts(); }); }
function stepSet(rid,i,k,v){ const s=CFG.routines[rid]&&CFG.routines[rid].steps[i]; if(!s)return; s[k]= k==='dur'?Math.max(1,Math.min(600,parseInt(v)||1)):String(v==null?'':v).slice(0,k==='icon'?3:40); saveCfg(); render(); }
function noteGrow(t){t.style.height='auto';t.style.height=Math.max(70,t.scrollHeight)+'px';}
function openReview(){ reviewOpen=true; haptic(10); render(); }
function closeReview(){ reviewOpen=false; render(); }
function openSettings(){ settingsOpen=true; haptic(10); render(); }
function closeSettings(){ settingsOpen=false; render(); }
// Importa un export de SHAAH, o un archivo suelto de personas.
// Nunca pisa días que ya existen, y deja instantánea antes de tocar la config.
function importPick(){
  const el=document.createElement("input");
  el.type="file"; el.accept="application/json,.json";
  el.onchange=()=>{ const f=el.files&&el.files[0]; if(!f)return;
    if(f.size>10*1024*1024){alert('Please choose a SHAAH JSON file smaller than 10 MB.');return;}
    const rd=new FileReader();
    rd.onload=()=>{ try{ importApply(JSON.parse(String(rd.result))); }
                    catch(e){ alert("That file isn't valid JSON."); } };
    rd.readAsText(f); };
  el.click();
}
// Validate the entire file before confirmation, backup, local edits or writes.
// Rendering is protected separately: old cache/server data is also untrusted.
function importPrepare(input){
  const bad=()=>{throw new Error('Invalid SHAAH data');};
  const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const text=(v,max=10000)=>typeof v==='string'&&v.length<=max;
  const id=v=>text(v,256)&&v.length>0&&!/[\u0000-\u001f]/.test(v)&&!['__proto__','prototype','constructor'].includes(v);
  const list=(v,check,max=10000)=>Array.isArray(v)&&v.length<=max&&v.every(check);
  const optional=(o,k,check)=>o[k]===undefined||check(o[k]);
  const number=v=>(typeof v==='number'||(typeof v==='string'&&v.trim()!==''&&v.length<=32))&&Number.isFinite(Number(v));
  const seen=new WeakSet();let nodes=0;
  const tree=(v,depth=0)=>{
    if(++nodes>100000||depth>40)bad();
    if(v===null||typeof v==='boolean')return;
    if(typeof v==='string'){if(v.length>1000000)bad();return;}
    if(typeof v==='number'){if(!Number.isFinite(v))bad();return;}
    if(!v||typeof v!=='object'||seen.has(v))bad();
    seen.add(v);
    for(const k of Object.keys(v)){
      if(['__proto__','prototype','constructor'].includes(k))bad();
      tree(v[k],depth+1);
    }
    seen.delete(v);
  };
  tree(input);
  if(!obj(input))bad();
  const j=JSON.parse(JSON.stringify(input));
  if(!optional(j,'config',obj)||!optional(j,'people',Array.isArray)||!optional(j,'days',obj))bad();
  const cfg=j.config||null,days=j.days||null;
  const ppl=j.people||(cfg&&cfg.people)||null;
  if(!cfg&&!ppl&&!days)bad();
  const person=(p,requireId)=>obj(p)&&optional(p,'id',id)&&(!requireId||id(p.id))&&text(p.name,10000)
    &&optional(p,'sub',id)&&optional(p,'every',number)&&optional(p,'locations',v=>list(v,id))&&optional(p,'inactive',v=>typeof v==='boolean');
  if(ppl&&!list(ppl,p=>person(p,false)))bad();
  const habits=h=>obj(h)&&Object.keys(h).length>0&&Object.entries(h).every(([k,x])=>id(k)&&obj(x)
    &&[1,2,3].includes(x.lv)&&optional(x,'l',text)&&optional(x,'i',text)
    &&['p','pWork','pVacation'].every(k=>optional(x,k,number))
    &&['on','combo','routine'].every(k=>optional(x,k,v=>typeof v==='boolean')));
  const subs=s=>list(s,x=>obj(x)&&id(x.id)&&optional(x,'label',text)&&optional(x,'icon',text)
    &&['p','pWork','pVacation'].every(k=>optional(x,k,number))&&optional(x,'on',v=>typeof v==='boolean'));
  const era=e=>obj(e)&&typeof e.from==='string'&&DATE_RE.test(e.from)&&habits(e.h)&&list(e.order,id)
    &&optional(e,'subs',subs)&&optional(e,'mode',v=>['work','vacation'].includes(v));
  if(cfg){
    if(!habits(cfg.h)||!list(cfg.order,id)||!optional(cfg,'people',v=>list(v,p=>person(p,true)))
      ||!optional(cfg,'subs',subs)||!optional(cfg,'log',v=>list(v,era))
      ||!optional(cfg,'locationGroups',v=>list(v,g=>obj(g)&&id(g.id)&&text(g.name)))
      ||!optional(cfg,'selectedLocation',id)||!optional(cfg,'tz',v=>text(v,100))
      ||!optional(cfg,'routines',obj)||!optional(cfg,'travel',obj))bad();
    for(const [rid,r] of Object.entries(cfg.routines||{})){
      if(!id(rid)||!obj(r)||!optional(r,'label',text)||!optional(r,'icon',text)
        ||!optional(r,'col',v=>safeColor(v,null)!==null)
        ||!list(r.steps,s=>obj(s)&&optional(s,'id',id)&&optional(s,'label',text)&&optional(s,'icon',text)
          &&number(s.dur)&&Number(s.dur)>0&&Number(s.dur)<=600,500)||!r.steps.length)bad();
    }
    const routines=cfg.routines||DEFAULT_CFG.routines;
    if(Object.entries(cfg.h).some(([id,h])=>h.routine&&!Object.hasOwn(routines,id)))bad();
    if(cfg.travel&&(!optional(cfg.travel,'mode',v=>['work','vacation'].includes(v))
      ||!optional(cfg.travel,'auto',v=>typeof v==='boolean')
      ||!optional(cfg.travel,'resumeOn',v=>v===''||(typeof v==='string'&&DATE_RE.test(v)))))bad();
    if(cfg.tz&&cfg.tz!=='device'){try{new Intl.DateTimeFormat('en',{timeZone:cfg.tz});}catch(e){bad();}}
  }
  for(const [key,d] of Object.entries(days||{})){
    if(!DATE_RE.test(key))continue;
    if(!obj(d)||!optional(d,'checks',v=>obj(v)&&Object.entries(v).every(([k,x])=>id(k)&&(typeof x==='boolean'||(typeof x==='number'&&x>=0&&x<=1))))
      ||!optional(d,'social',v=>obj(v)&&Object.entries(v).every(([k,x])=>id(k)&&typeof x==='boolean'))
      ||!optional(d,'note',v=>text(v,1000000))||!optional(d,'people',v=>list(v,id))
      ||!optional(d,'_daylog',v=>list(v,e=>obj(e)&&id(e.id)&&text(e.title)
        &&text(e.start,100)&&Number.isFinite(Date.parse(e.start))
        &&(e.end==null||(text(e.end,100)&&Number.isFinite(Date.parse(e.end))))
        &&['habit','routine','manual'].includes(e.type)&&optional(e,'meta',obj),2000)))bad();
  }
  return {cfg,ppl,days,onlyPeople:!cfg&&!!ppl};
}
function importApply(j){
  let prepared;
  try{prepared=importPrepare(j);}catch(e){alert("That file doesn't contain valid SHAAH data. Nothing was changed.");return;}
  const {cfg,ppl,days,onlyPeople}=prepared;
  const nDays=days?Object.keys(days).filter(k=>DATE_RE.test(k)&&!_state[k]).length:0;
  const what=onlyPeople?`${ppl.length} people`
    :`settings${ppl?` (${ppl.length} people)`:""}${nDays?` and ${nDays} new days`:""}`;
  if(!confirm(`Import ${what}?\n\nDays you already have are never overwritten. Your previous settings stay in BACKUPS.`))return;
  bakSnapshot();
  if(onlyPeople){
    if(!Array.isArray(CFG.people))CFG.people=[];
    let added=0;
    for(const q of ppl){
      if(!q||!q.name)continue;
      const id=q.id||('p'+Math.random().toString(36).slice(2,7).padEnd(5,'0'));
      if(CFG.people.some(x=>x.id===id||x.name===q.name))continue;
      const contact={id,name:String(q.name).slice(0,40),sub:q.sub||"friends",
                     every:Math.max(1,Math.min(3650,parseInt(q.every,10)||14))};
      if(Array.isArray(q.locations))contact.locations=[...new Set(q.locations.filter(x=>typeof x==='string'))];
      if(typeof q.inactive==='boolean')contact.inactive=q.inactive;
      CFG.people.push(contact);
      added++;
    }
    alert(`${added} added.`);
  }else if(cfg){
    const clean=cfg;
    if(!Array.isArray(clean.subs)||!clean.subs.length)delete clean.subs;
    if(!Array.isArray(clean.log))delete clean.log;
    if(!Array.isArray(clean.people))delete clean.people;
    CFG=Object.assign(JSON.parse(JSON.stringify(DEFAULT_CFG)),clean);
  }
  if(days){
    for(const k of Object.keys(days)){
      if(!DATE_RE.test(k)||_state[k])continue;      // nunca pisa un día existente
      const d=days[k]||{};
      _state[k]={checks:d.checks||{},social:d.social||blankSocial(),
                 note:typeof d.note==="string"?d.note:"",people:Array.isArray(d.people)?d.people:[]};
      if(Array.isArray(d._daylog))_state[k]._daylog=d._daylog;
      persistDay(k);
    }
    saveCache();
  }
  applyCfg(); saveCfg(); render();
}
function exportData(){
  const payload={app:"SHAAH",exported:new Date().toISOString(),user:USER?USER.email:null,config:CFG,days:{}};
  for(const k of Object.keys(_state)){ if(DATE_RE.test(k)) payload.days[k]={..._state[k],score:calcScore(k).score}; }
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=`shaah-${todayKey()}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function renderLogin(){
  return`<div ${uiStyle(`height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:32px`)}>
    <div ${uiStyle(`text-align:center`)}>
      <div class="matrix-wordmark" ${uiStyle(`font-family:'Bebas Neue';font-size:56px;letter-spacing:0.16em;color:#e2e2e2;line-height:1`)}>SHAAH</div>
      <div ${uiStyle(`font-size:15px;letter-spacing:0.11em;color:#adadbf;margin-top:8px`)}>שעה · THE HOUR</div>
    </div>
    <div ${uiStyle(`font-size:15px;color:#adadbf;text-align:center;max-width:280px;line-height:1.6`)}>
      Sign in to sync your habits across all your devices.
    </div>
    ${signOutNoticeHTML()}
    ${AUTH_ERR?`<div ${uiStyle(`max-width:320px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px 14px;font-size:15px;color:#ef8888;line-height:1.5;word-break:break-word`)}>⚠ ${esc(String(AUTH_ERR).slice(0,2000))}</div>`:""}
    <button ${ui('click','signIn')} ${uiStyle(`display:flex;align-items:center;gap:12px;background:#fff;color:#1a1a1a;border:none;font-family:inherit;font-size:16.5px;font-weight:500;padding:14px 26px;border-radius:12px;cursor:pointer`)}>
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.600v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.3 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z"/></svg>
      Continue with Google
    </button>
  </div>`;
}

// ── Boot ───────────────────────────────────────────────────
// ── Native-feel gesture guards ──────────────────────────────
document.addEventListener('gesturestart',e=>e.preventDefault());
// Desktop: Esc mirrors the swipe-back gesture
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(tourStep!==null){tourDone();return;}
  if(settingsOpen){closeSettings();return;}
  if(editDayKey){closeEditDay();return;}
  if(routineId&&routineView){e.preventDefault();exitRoutine();return;}
});
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
let _lastTap=0;
document.addEventListener('touchend',e=>{
  const now=Date.now();
  if(now-_lastTap<300&&e.cancelable)e.preventDefault();
  _lastTap=now;
},{passive:false});

window.addEventListener('error',e=>{
  const el=document.getElementById('scroll');
  if(el&&!el.innerHTML.trim()){
    uiHTML(el,`<div ${uiStyle(`padding:2px 24px;font-size:15px;color:#ef8888;line-height:1.6`)}>
      <div ${uiStyle(`font-family:'Bebas Neue';font-size:21px;letter-spacing:0.12em;color:#ef4444;margin-bottom:12px`)}>ERROR</div>
      <div ${uiStyle(`word-break:break-word`)}>${esc(e.message)}</div>
      <div ${uiStyle(`color:#a2a2b6;margin-top:8px;font-size:15px`)}>${esc((e.filename||'').split('/').pop())}:${esc(e.lineno)}</div>
    </div>`);
  }
});

async function boot(){
  initSkin();
  try{_signOutNotice=signOutNoticeFor(sessionStorage.getItem(SIGNOUT_NOTICE_KEY));sessionStorage.removeItem(SIGNOUT_NOTICE_KEY);}catch(e){}
  applyCfg();   // primera sentencia ejecutable del programa: aquí ya está todo declarado
  // Surface any OAuth error returned in the URL
  const q=new URLSearchParams(location.search), hp=new URLSearchParams(location.hash.slice(1));
  const err=q.get('error_description')||hp.get('error_description')||q.get('error')||hp.get('error');
  if(err)AUTH_ERR=err.slice(0,2000); // URLSearchParams already decoded it once.

  let session=null;
  try{
    const r=await sb.auth.getSession();
    session=r.data.session;
    // PKCE: if a ?code= is present but no session yet, exchange it explicitly
    if(!session&&q.get('code')){
      const ex=await sb.auth.exchangeCodeForSession(window.location.href);
      if(ex.error)AUTH_ERR=ex.error.message; else session=ex.data.session;
    }
  }catch(e){AUTH_ERR=e.message;}

  changeSyncUser(session?session.user:null);

  // Clean auth params out of the URL once handled
  if(USER&&(location.search||location.hash)){
    history.replaceState({},'',location.pathname);
  }

  if(USER){
    restoreAccountLocal();
    if(!get(tourKey()))tourStep=0,currentTab=TOUR[0].tab;
    render();
    const owner=USER.id,epoch=_syncEpoch;
    await loadAll();
    if(USER?.id===owner&&_syncEpoch===epoch)subscribeRealtime();
  }else{
    render();
  }
}

sb.auth.onAuthStateChange((event,session)=>{
  const wasUser=USER?USER.id:null;
  changeSyncUser(session?session.user:null);
  if(USER&&USER.id!==wasUser){
    // loadCfgLocal() PRIMERO: sin esto se pintaba un frame con la config genérica
    // (p.ej. "No Junk Food") antes de que llegara la del usuario ("No Smoking").
    restoreAccountLocal();render();
    const owner=USER.id,epoch=_syncEpoch;
    loadAll().then(()=>{if(USER?.id===owner&&_syncEpoch===epoch)subscribeRealtime();});
  }else if(!USER){
    _state={};render();
  }
});

function getStreak(){
  const hh=getHistory(),tk=todayKey();let s=0;
  for(let i=0;i<3650;i++){const k=keyMinus(tk,i);const d=hh[k];if(d&&d.score>=(d.max||MAX)*STREAK_MIN)s++;else if(i>0)break;}
  return s;
}
function getBestStreak(){
  const hh=getHistory(),keys=Object.keys(hh).filter(k=>DATE_RE.test(k)&&hh[k].score>=(hh[k].max||MAX)*STREAK_MIN).sort();
  let best=0,run=0,prev=null;
  for(const k of keys){
    const d=new Date(k+'T12:00:00');
    if(prev&&Math.round((d-prev)/86400000)===1)run++; else run=1;
    if(run>best)best=run; prev=d;
  }
  return best;
}
function weekTrend(){
  const d=getDays(14);
  const prev=avgW(d.slice(0,7)),cur=avgW(d.slice(7));
  if(!prev||!cur)return null;
  return{cur,prev,diff:cur-prev};
}
// key "YYYY-MM-DD" → Date at local noon (DST-safe for display)
function keyToDate(key){return new Date(key+'T12:00:00');}
function getDays(n){
  const days=[],tk=todayKey();
  for(let i=n-1;i>=0;i--){
    const key=keyMinus(tk,i);
    days.push({key,date:new Date(key+'T12:00:00'),data:getDayRecord(key)});
  }
  return days;
}
function getWeeks(){const d=getDays(28);return[0,1,2,3].map(w=>d.slice(w*7,w*7+7));}
// Days can have different maxes now, so averages run on normalised percentages.
const dPct=d=>d&&(d.pct!=null?d.pct:(d.max?Math.round(d.score/d.max*100):d.score));
function avgW(days){const f=days.filter(d=>d.data&&d.data.score>0);return f.length?Math.round(f.reduce((a,d)=>a+dPct(d.data),0)/f.length):0;}

function ring(score,max,size,thick,col,glow){
  const r=(size-thick)/2-2,c=2*Math.PI*r,off=c-(Math.min(score,max)/max)*c,cx=size/2;
  return`<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" ${uiStyle(`transform:rotate(-90deg);filter:drop-shadow(0 0 ${size*.1}px ${glow});overflow:visible`)}><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#0f0f1e" stroke-width="${thick}"/><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${col}" stroke-width="${thick}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" ${uiStyle(`transition:stroke-dashoffset 0.18s ease-out,stroke 0.12s ease-out`)}/></svg>`;
}
function chk(on,col,size){
  if(size==null)size=(window.matchMedia&&window.matchMedia("(min-width:880px)").matches)?26:22;
  const br=Math.round(size*.32);
  return`<div ${uiStyle(`width:${size}px;height:${size}px;border-radius:${br}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background-color .12s ease-out,border-color .12s ease-out,box-shadow .12s ease-out;${on?`background:${col};box-shadow:0 0 10px ${col}66;border:none`:`border:1.5px solid #252535;background:transparent`}`)}>${on?`<svg width="${size*.55}" height="${size*.55}" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="#080810" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`:""}</div>`;
}
// Same as chk() but understands the "light" (0.5) state for routine habits —
// a hollow ring with a half-fill instead of full box or empty.
function chk3(v,col,size){
  if(v!==0.5)return chk(v===true,col,size);
  if(size==null)size=(window.matchMedia&&window.matchMedia("(min-width:880px)").matches)?26:22;
  const br=Math.round(size*.32);
  return`<div ${uiStyle(`width:${size}px;height:${size}px;border-radius:${br}px;flex-shrink:0;overflow:hidden;border:1.5px solid ${col}88;background:linear-gradient(90deg,${col} 50%,transparent 50%)`)}></div>`;
}
function bar(pct,col,glow,h=6){
  return`<div ${uiStyle(`height:${h}px;border-radius:99px;background:#0f0f1e;overflow:hidden`)}><div ${uiStyle(`height:100%;border-radius:99px;width:${Math.min(pct,100)}%;background:${col};${pct>0?`box-shadow:0 0 8px ${glow}`:""}`)}></div></div>`;
}

let settingsOpen=false;
let lvlOpen={1:true,2:true,3:true};
let secOpen={tz:true,ind:true,trav:true,hab:true,ppl:true,bak:false,rout:false,data:true};
function secKey(){return `shaah_sec_${USER?USER.id:'anon'}`;}
function loadSec(){const v=get(secKey());if(v&&typeof v==='object')secOpen={...secOpen,...v};}
function toggleSec(k){secOpen[k]=secOpen[k]===false;haptic(9);set(secKey(),secOpen);render();document.getElementById('settings-toggle-'+k)?.focus({preventScroll:true});}
function lvlKey(){return `shaah_lvl_${USER?USER.id:'anon'}`;}
// Preferencia de interfaz: se guarda sin pasar por saveCfg() para no tocar el
// anillo de respaldos (5 huecos; una copia buena vale mas que un plegado).
function saveCfgPref(){
  set(cfgKey(),CFG);
  queueCfgSave();
}
// La config manda; localStorage es solo el eco local (y la migracion de quien ya
// tenia niveles plegados antes de que esto viajara al servidor).
function loadLvl(){
  const v=(CFG&&CFG.lvlOpen&&typeof CFG.lvlOpen==='object')?CFG.lvlOpen:get(lvlKey());
  if(v&&typeof v==='object')lvlOpen={1:v[1]!==false,2:v[2]!==false,3:v[3]!==false};
}
function toggleLvl(n){
  lvlOpen[n]=!lvlOpen[n];haptic(9);
  set(lvlKey(),lvlOpen);                    // instantaneo y sobrevive sin red
  CFG.lvlOpen={...lvlOpen};saveCfgPref();    // y alcanza al otro dispositivo
  render();
}
// SOCIAL mira un dia concreto: null = hoy. Antes solo sabia de hoy y para tocar
// el pasado habia que ir a HISTORY -> EDIT, que son cuatro pasos para un toque.
let socialDay=null;
function socialKey(){ const t=todayKey(); return (socialDay&&socialDay<=t)?socialDay:t; }
function socialShift(d){
  const t=todayKey(), n=keyMinus(socialKey(),-d);
  if(n>t)return;                                  // el futuro no se registra
  socialDay=(n===t)?null:n; socialExpanded=true; render();
}
function socialToday(){ socialDay=null; render(); }
let reviewOpen=false;
let histMonth=null;
let currentTab="today",sessions={},routineView=false,routineId=null,routineQueue=[],routineCompleted={},timerSecs=0,timerRunning=false,timerInterval=null,timerEndAt=null,socialExpanded=false,histTab="week",editDayKey=null;

// ── Feedback: haptics + audible cue ───────────────────────────
let _actx=null;
function haptic(ms){try{navigator.vibrate&&navigator.vibrate(ms||10);}catch(e){}}
function unlockAudio(){
  try{ if(!_actx)_actx=new (window.AudioContext||window.webkitAudioContext)();
       if(_actx.state==='suspended')_actx.resume(); }catch(e){}
}
function chime(times){
  try{
    unlockAudio(); if(!_actx)return;
    const n=times||1;
    for(let i=0;i<n;i++){
      const t=_actx.currentTime+i*0.22;
      const o=_actx.createOscillator(),g=_actx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(880,t);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(0.35,t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
      o.connect(g);g.connect(_actx.destination);o.start(t);o.stop(t+0.2);
    }
  }catch(e){}
}
// ── Keep the audio session alive so the chime fires on a locked screen.
//    iOS suspends AudioContext when locked unless audio is actively playing.
let _keepNode=null;


function alertStepDone(){ haptic([120,60,120]); chime(3); }

// Hold the audio session open so the chime still fires with the screen locked.
let _keepAlive=null;
function audioKeepAlive(on){
  try{
    if(on){
      unlockAudio(); if(!_actx||_keepAlive)return;
      const o=_actx.createOscillator(),g=_actx.createGain();
      o.frequency.value=20; g.gain.value=0.0008;
      o.connect(g); g.connect(_actx.destination); o.start();
      _keepAlive={o,g};
    }else if(_keepAlive){ try{_keepAlive.o.stop();}catch(e){} _keepAlive=null; }
  }catch(e){}
}

// ── Routine session persistence (survives refresh) ────────────
const RKEY=()=>`shaah_routine_${USER?USER.id:'anon'}`;
function saveRoutine(){
  if(!USER)return;
  if(!Object.keys(sessions).length){del(RKEY());return;}
  set(RKEY(),{sessions,routineId,routineView,day:todayKey()});
}
function restoreRoutine(){
  if(!USER)return false;
  const r=get(RKEY()); if(!r)return false;
  if(r.day&&r.day!==todayKey()){del(RKEY());return false;}   // yesterday's — discard
  sessions=r.sessions||{};
  for(const id of Object.keys(sessions)) if(!ROUTINES[id]) delete sessions[id];
  if(!Object.keys(sessions).length)return false;
  routineId=(r.routineId&&sessions[r.routineId])?r.routineId:null;
  routineView=!!r.routineView&&!!routineId;
  // recompute anything that was running while the app was closed
  for(const id of Object.keys(sessions)){
    const s=sessions[id];
    if(s.running&&s.endAt){
      s.secs=Math.max(0,Math.round((s.endAt-Date.now())/1000));
      if(s.secs<=0){s.running=false;s.endAt=null;advanceSession(id);}
    }
  }
  syncFromSession(); ensureTick();
  return true;
}

// ── Dock auto-hide: content rises, dock tucks away ──────────
let _lastY=0,_navTucked=false;
function tuckNav(on){
  if(on===_navTucked)return;
  const n=document.getElementById("nav");if(!n)return;
  _navTucked=on; n.classList.toggle("tucked",on);
}
function initScrollHide(){
  const sc=document.getElementById("scroll");if(!sc||sc._hooked)return;
  sc._hooked=true;
  sc.addEventListener("scroll",()=>{
    if(!USER||(routineId&&routineView)||editDayKey||settingsOpen||tourStep!==null)return;
    const y=sc.scrollTop,dy=y-_lastY;
    const atBottom=sc.scrollHeight-y-sc.clientHeight<8;
    if(y<48||atBottom)tuckNav(false);       // near top or bottom → always visible
    else if(dy>5)tuckNav(true);             // scrolling down → tuck away
    else if(dy<-5)tuckNav(false);           // scrolling up → bring back
    _lastY=y;
  },{passive:true});
}

// ── First-run tour ────────────────────────────────────────────
let tourStep=null;
let tourDemo={},tourReturnTab=null,tourReturnFocus=null,tourScroll=0,tourInert=[],tourReturnSettings=false,tourOwner=null,tourFocusStep=null;
const TOUR=[
 {tab:'today',ico:'👋',t:'WELCOME TO SHAAH',b:'Build your day one action at a time. Explore the interface and try safe demos in nine short steps. You can skip, go back or replay this guide in Settings.'},
 {tab:'today',target:'.t-ring',ico:'◎',t:'YOUR DAY SCORE',b:'Completed habits earn points. Your grade compares earned points with the available maximum for that date and mode. Weights and maximums depend on your configuration; S+ begins at 95% completion.'},
 {tab:'today',target:'.t-lvl1',ico:'⬛',t:'THREE LEVELS',b:'CORE holds your essentials, HABITS supports consistency and BONUS adds extra goals. Each level uses your configured weights. Expand a level to see its habits.'},
 {tab:'today',target:'.wg-card',ico:'△',t:'WORK & ITS GEOMETRY',demo:'work',b:'Each Work milestone lights one segment. Three milestones form a triangle; the shape adapts to your milestone count. Today’s amount appears left, the weekly total right. Complete the demo, then reset it. Your real Work progress stays unchanged.'},
 {tab:'today',target:'.t-lvl2',ico:'👆',t:'TRY A HABIT',demo:'habit',b:'Try checking this example habit, then undo it. This demo never changes your habits or score.'},
 {tab:'today',target:'.t-rout-toggle',ico:'⚡',t:'TRY A ROUTINE',demo:'routine',b:'Routines guide you through timed steps. Try advancing this two-step example. No real timer or session is started.'},
 {tab:'log',target:'.logdesk-card-title',ico:'◷',t:'TRY DAY LOG',demo:'log',b:'Day Log helps reconstruct your day. Add an example activity below; it stays only inside this tutorial.'},
 {tab:'history',target:'.htab',ico:'◈',t:'HISTORY & STATS',b:'HISTORY lets you review dated entries. STATS shows trends and streaks. Historical scores use the configuration for that date. The navigation below takes you to each area after the guide.'},
 {tab:'today',target:'#gear',ico:'⚙',t:'MAKE IT YOURS',b:'Open Settings to customize habits, weights, timezone and backups. Work/Vacation affects your current day. You can replay this tutorial with VIEW TUTORIAL. Ready for your next small action?'}
];
const tourKey=()=>`shaah_tour_${USER?USER.id:'anon'}`;
function startTour(){
 if(!USER||tourStep!==null)return;
 tourOwner=USER.id;tourReturnSettings=settingsOpen;tourReturnTab=currentTab;tourReturnFocus=document.activeElement;tourScroll=document.getElementById('scroll').scrollTop;
 tourDemo={};tourStep=0;settingsOpen=false;currentTab=TOUR[0].tab;haptic(10);render();
}
function tourGo(i){
 if(tourStep===null||!USER)return;
 if(i>=TOUR.length)return tourDone();
 if(!Number.isInteger(i)||i<0)return;
 tourStep=i;currentTab=TOUR[i].tab;haptic(8);render();
}
function tourDone(){
 if(tourStep===null)return;
 const sameOwner=USER&&(!tourOwner||USER.id===tourOwner),returnSettings=tourReturnSettings;
 tourStep=null;tourDemo={};tourFocusStep=null;
 if(sameOwner){set(tourKey(),1);if(tourReturnTab)currentTab=tourReturnTab;settingsOpen=returnSettings;}
 render();
 if(sameOwner){
  document.getElementById('scroll').scrollTop=tourScroll;
  const focus=tourReturnFocus&&tourReturnFocus.isConnected?tourReturnFocus:
   returnSettings?document.querySelector('[data-ui-click="startTour"]'):document.querySelector('.nav-btn[aria-current="page"]')||document.getElementById('gear');
  if(focus)focus.focus({preventScroll:true});
 }
 tourReturnTab=null;tourReturnFocus=null;tourReturnSettings=false;tourOwner=null;haptic(12);
}
function tourPractice(kind){
 if(tourStep===null||TOUR[tourStep].demo!==kind)return;
 if(kind==='work')tourDemo.work=((tourDemo.work||0)+1)%4;
 if(kind==='habit')tourDemo.habit=!tourDemo.habit;
 if(kind==='routine')tourDemo.routine=((tourDemo.routine||0)+1)%3;
 if(kind==='log'){const input=document.getElementById('tour-activity');const value=input.value.trim();tourDemo.draft=input.value;if(!value){input.focus();return;}tourDemo.log=value.slice(0,80);}
 renderTour();
 const control=document.getElementById('tour-practice');if(control)control.focus();
}
let routineDockObserver=null;
function positionCompactSessions(){
  const el=document.getElementById('resume'),nav=document.getElementById('nav');
  if(!el?.classList.contains('cr-mini-sessions')||!nav)return;
  const inset=parseFloat(getComputedStyle(nav).bottom)||0;
  const gap=window.innerWidth<=879?6:14;
  el.style.bottom=(nav.offsetHeight+Math.max(0,inset)+gap)+'px';
  if(!routineDockObserver&&typeof ResizeObserver!=='undefined'){
    routineDockObserver=new ResizeObserver(()=>positionCompactSessions());routineDockObserver.observe(nav);
  }
}
window.addEventListener('resize',()=>positionCompactSessions());
function routineOrbId(){
 const ids=liveSessions();return ids.find(id=>id===routineDialogReturnId&&sessions[id].running)||ids.find(id=>sessions[id].running)||ids.find(id=>sessions[id].paused)||ids[0]||null;
}
let productEndId=null;
let resetDayRequest=null;
function requestResetDay(key){
  if(!USER||key!==todayKey())return;
  resetDayRequest={key,owner:USER.id,epoch:_syncEpoch};
  render();document.getElementById('reset-day-cancel')?.focus();
}
function confirmResetDay(key){
  const request=resetDayRequest;resetDayRequest=null;
  if(!request||request.key!==key||request.owner!==USER?.id||request.epoch!==_syncEpoch||key!==todayKey())return;
  resetDay(key);
}
function resetDayControl(key){
  const armed=resetDayRequest?.key===key&&resetDayRequest.owner===USER?.id&&resetDayRequest.epoch===_syncEpoch;
  return `<div class="t-reset" ${ui('keydown','resetDayEscape')}><button class="reset-day-trigger" ${ui('click','resetDay',key)} aria-label="Reset day" aria-expanded="${armed}"><span aria-hidden="true">×</span> RESET DAY</button>${armed?`<div class="product-end-menu reset-day-confirm" role="group" aria-label="Confirmar borrado de todos los datos de hoy"><span class="reset-day-warning">¿Borrar todos los datos de hoy?</span><button id="reset-day-cancel" ${ui('click','resetDayCancel')} aria-label="Cancelar borrado">×</button><button ${ui('click','resetDayConfirm',key)} aria-label="Borrar todos los datos de hoy">✓</button></div>`:''}</div>`;
}
function routineOrb(){
 const id=routineOrbId(),s=sessions[id],rt=ROUTINES[id];if(!id||!s||!rt)return '';
 return `<div class="cr-log-orb"><button class="product-orb-close" ${ui('click','productEndAsk',id)} aria-label="End activity">×</button>${productEndId===id?`<div class="product-end-menu" role="group" aria-label="Save time and end activity"><button ${ui('click','productEndCancel')} aria-label="Cancel">×</button><button ${ui('click','productEndConfirm',id)} aria-label="Confirm">✓</button></div>`:''}<button class="cr-orb-button" ${s.paused?ui('click','routineResume',id):ui('click','openRoutine',id)} aria-label="${s.paused?'Resume':'Open'} ${esc(rt.label)}"><span class="cr-orb-icon">${esc(rt.icon)}</span><b data-routine-clock="${esc(id)}">${routineTime(s.secs)}</b><span class="cr-orb-step">${s.paused?'PAUSED · ':''}${Object.keys(s.done).length+1} / ${rt.steps.length}</span></button><button class="cr-orb-add" ${ui('click','openDayLogStart')} aria-label="Log an activity" title="Log an activity">+</button><span class="cr-orb-label">${esc(rt.label)}${liveSessions().length>1?' · +'+(liveSessions().length-1):''}</span></div>`;
}
function renderResume(){
  const el=document.getElementById("resume");if(!el)return;
  const ids=liveSessions().filter(id=>!(routineView&&id===routineId));
  const show=USER&&ids.length&&!settingsOpen&&!editDayKey&&tourStep===null;
  if(!show){el.className="";uiHTML(el,"");return;}
  {
    el.className='on cr-mini-sessions'+(currentTab==='today'?' cr-mini-in-orb':'');
    positionCompactSessions();
    requestAnimationFrame(()=>positionCompactSessions());
    uiHTML(el,ids.map(id=>{const rt=ROUTINES[id],s=sessions[id],step=rt?.steps[s.q[0]];if(!step)return '';
      return `<button class="cr-mini" ${s.paused?ui('click','routineResume',id):ui('click','openRoutine',id)} aria-label="${s.paused?'Resume':'Open'} ${esc(rt.label)}"><span class="cr-mini-icon">${esc(rt.icon)}</span><span class="cr-mini-text"><strong>${esc(rt.label)}</strong><span>${s.running?'Running':s.paused?'Paused':'Ready'} · Step ${Object.keys(s.done).length+1}/${rt.steps.length} · ${esc(step.label)}</span></span><b id="resume-clock-${esc(id)}">${routineTime(s.secs)}</b><span aria-hidden="true">↗</span></button>`;
    }).join(''));return;
  }
}

function tourPosition(){
 const hole=document.getElementById('tour-hole'),card=document.querySelector('#tour .tour-card');
 if(!hole||!card||tourStep===null)return;
 const target=document.querySelector(TOUR[tourStep].target||'#missing-tour-target');
 const r=target&&target.getBoundingClientRect(),c=card.getBoundingClientRect();
 const visible=r&&r.width&&r.height&&r.bottom>8&&r.top<c.top-12&&r.right>0&&r.left<innerWidth;
 hole.hidden=!visible;
 document.querySelector('#tour .tour-scrim').style.background=visible?'transparent':'rgba(4,4,10,.82)';
 if(visible){const top=Math.max(4,r.top-5),left=Math.max(4,r.left-5);Object.assign(hole.style,{top:top+'px',left:left+'px',width:Math.max(0,Math.min(innerWidth-4,r.right+5)-left)+'px',height:Math.max(0,Math.min(c.top-16,r.bottom+5)-top)+'px'});}
}
function renderTour(){
 const t=document.getElementById('tour');if(!t)return;
 if(tourStep===null||!USER){t.className='';uiHTML(t,'');tourDemo={};tourFocusStep=null;tourInert.forEach(([el,value])=>el.inert=value);tourInert=[];return;}
 if(!tourOwner)tourOwner=USER.id;
 if(!tourInert.length)Array.from(document.getElementById('app').children).filter(el=>el!==t).forEach(el=>{tourInert.push([el,el.inert]);el.inert=true;});
 const active=document.activeElement,focusId=t.contains(active)?active.id:null,selection=active?.selectionStart;
 const s=TOUR[tourStep],last=tourStep===TOUR.length-1;
 let demo='';
 if(s.demo==='work')demo=`<div class="tour-work-figure">${workGeometry(3,tourDemo.work||0)}</div><p role="status">${tourDemo.work===3?'3 / 3 · Triangle complete. Next tap resets the example.':`${tourDemo.work||0} / 3 · Example milestones completed`}</p><button id="tour-practice" class="tour-example" ${ui('click','tourPractice','work')}>${tourDemo.work===3?'Reset Work example':'Complete example milestone'}</button>`;
 if(s.demo==='habit')demo=`<button id="tour-practice" class="tour-example" aria-pressed="${!!tourDemo.habit}" ${ui('click','tourPractice','habit')}>${tourDemo.habit?'✓':'○'} Drink water · example</button><p role="status">${tourDemo.habit?'Example complete. Tap again to undo.':'Tap the example to complete it.'}</p>`;
 if(s.demo==='routine')demo=`<p role="status">${['1 / 2 · Breathe','2 / 2 · Stretch','Example routine complete'][tourDemo.routine||0]}</p><button id="tour-practice" class="tour-example" ${ui('click','tourPractice','routine')}>${tourDemo.routine===2?'Restart example':'Complete example step'}</button>`;
 if(s.demo==='log')demo=`<label for="tour-activity">Example activity</label><input id="tour-activity" maxlength="80" value="${esc(tourDemo.draft||'')}" placeholder="e.g. Reading" ${ui('keydown','tourPracticeEnter')} ${ui('input','tourDraft')}><button id="tour-practice" class="tour-example" ${ui('click','tourPractice','log')}>Add example</button><p role="status">${tourDemo.log?'Added to demo: '+esc(tourDemo.log):'Your real Day Log stays unchanged.'}</p>`;
 t.className='on';
 uiHTML(t,`<div class="tour-scrim" aria-hidden="true"></div><div id="tour-hole" hidden aria-hidden="true"></div>
 <section class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description">
 <div class="tour-dots" aria-hidden="true">${TOUR.map((_,i)=>`<div class="tour-dot ${i===tourStep?'cur':i<tourStep?'done':''}"></div>`).join('')}</div>
 <div class="tour-meta">STEP ${tourStep+1} OF ${TOUR.length} · ${s.demo?'SAFE DEMO':'GUIDED TOUR'}</div>
 <div class="tour-ico" aria-hidden="true">${s.ico}</div><h2 id="tour-title" class="tour-t" tabindex="-1">${s.t}</h2>
 <div id="tour-description" class="tour-b">${s.b}</div>${demo?`<div class="tour-demo">${demo}</div>`:''}
 <div class="tour-row"><button id="tour-close" class="tour-skip" ${ui('click','tourDone')}>Skip / close</button><button id="tour-back" class="tour-skip" ${tourStep===0?'disabled':''} ${ui('click','tourGo',tourStep-1)}>Back</button><button id="tour-next" class="tour-next" ${ui('click','tourGo',tourStep+1)}>${last?'Finish':'Next'}</button></div></section>`);
 const changed=tourFocusStep!==tourStep;tourFocusStep=tourStep;
 if(changed){
  document.getElementById('tour-title').focus({preventScroll:true});
  const target=document.querySelector(s.target||'#missing-tour-target'),scroll=document.getElementById('scroll');
  if(target)scroll.scrollTop+=target.getBoundingClientRect().top-20;
 }
 if(!changed&&focusId){const focus=document.getElementById(focusId);if(focus){focus.focus({preventScroll:true});if(typeof selection==='number'&&focus.setSelectionRange)focus.setSelectionRange(selection,selection);}}
 tourPosition();
 requestAnimationFrame(tourPosition);
}
document.addEventListener('keydown',event=>{
 if(tourStep===null||!document.querySelector('#tour .tour-card'))return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();tourDone();return;}
 if(event.key==='Tab'){
 const buttons=Array.from(document.querySelectorAll('#tour button:not(:disabled),#tour input'));
 const first=buttons[0],last=buttons[buttons.length-1],active=document.activeElement;
 if(event.shiftKey&&(active===first||!buttons.includes(active))){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&(active===last||!buttons.includes(active))){event.preventDefault();first.focus();}
 }
},true);
window.addEventListener('resize',tourPosition);
document.addEventListener('scroll',tourPosition,true);

function topbarHTML(){
  const d=keyToDate(todayKey()),hr=new Date().getHours();
  const greet=hr<12?"MORNING":hr<18?"AFTERNOON":"EVENING";
  const dot=_cfgConflict?'#f59e0b':_cfgSaveFailed?'#ef4444':_live?"#4ade80":"#f59e0b";
  return`<div id="topbar">
    <button id="gear" ${ui('click','openSettings')} aria-label="Settings">⚙</button>
    <div id="tb-date">
      <span class="tb-day">${d.toLocaleDateString("en-US",{weekday:"short"}).toUpperCase()}</span>
      <span class="tb-dt">${d.toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase()}</span>
      <span class="tb-gr">${greet}</span>
    </div>
    <div id="mode-status" title="Current mode">${travelMode()==='vacation'?'VACATION':'WORK'}</div>
    <div id="sync-status" title="${esc(_syncText)}" aria-label="${esc(_syncText)}"><span ${uiStyle(`background:${dot}`)}></span></div>
  </div>
  ${syncNoticeHTML()}
  ${currentTab==="today"?scoreStripHTML(todayKey()):""}`;
}
function render(){
  socialGroupDialogSync();
  routineDialogSync();
  const el=document.getElementById("scroll"),nav=document.getElementById("nav");
  if(!USER){uiHTML(el,renderLogin());nav.style.display="none";tuckNav(false);renderTour();renderResume();return;}
  // Full-screen modes own the whole viewport — no top bar, no nav
  if(settingsOpen){uiHTML(el,renderSettings());nav.style.display="none";tuckNav(false);renderTour();renderResume();return;}
  if(editDayKey){uiHTML(el,renderEditDay());nav.style.display="none";tuckNav(false);renderTour();renderResume();return;}
  nav.style.display="flex";
  const sbtn=nav.querySelector('.nav-btn[data-tab="social"]');
  if(sbtn)sbtn.hidden=!socialOwnTab();
  // Placement hides the navigation tab, but explicit Social shortcuts still open it.
  const bar=topbarHTML();   // scrolls away with the content
  document.querySelectorAll(".nav-btn").forEach(b=>{
    const active=b.dataset.tab===currentTab;
    b.classList.toggle("active",active);
    if(active)b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  });
  if(currentTab==="social")uiHTML(el,bar+renderSocial());
  else if(currentTab==="today")uiHTML(el,bar+renderToday(todayKey()));
  else if(currentTab==="log")uiHTML(el,bar+renderDayLogTab());
  else if(currentTab==="stats")uiHTML(el,bar+renderStats());
  else if(currentTab==="history")uiHTML(el,bar+renderHistory());
  renderTour();
  renderResume();
  initScrollHide();
}

// Keep local day interactions in the existing screen. Only changed text,
// attributes and controls are patched; inputs keep their draft, selection and focus.
function patchDayNode(current,next,fromSync=false){
  if(current.isEqualNode(next))return;
  if(current.nodeType!==next.nodeType||current.nodeName!==next.nodeName||current.namespaceURI!==next.namespaceURI){
    current.replaceWith(next.cloneNode(true));return;
  }
  if(current.nodeType!==1){if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;return;}
  if(current.matches('input,textarea,select')){
    if(fromSync&&current.matches('textarea,input:not([type=checkbox]):not([type=radio])')&&current.value===current.defaultValue){
      if(current.value!==next.value)current.value=next.value;
      if(current.defaultValue!==next.defaultValue)current.defaultValue=next.defaultValue;
    }else if(fromSync&&current.matches('select')&&document.activeElement!==current){
      current.replaceChildren(...[...next.childNodes].map(node=>node.cloneNode(true)));current.value=next.value;
    }
    return;
  }
  for(const attr of [...current.attributes])if(!next.hasAttribute(attr.name))current.removeAttribute(attr.name);
  for(const attr of [...next.attributes])if(current.getAttribute(attr.name)!==attr.value){if(attr.name==='style')uiCopyStyle(current,next);else current.setAttribute(attr.name,attr.value);}
  const before=[...current.childNodes],after=[...next.childNodes];
  for(let i=0;i<Math.max(before.length,after.length);i++){
    if(!before[i])current.append(after[i].cloneNode(true));
    else if(!after[i])before[i].remove();
    else patchDayNode(before[i],after[i],fromSync);
  }
}
function renderDayChange(key,fromSync=false){
  const scroll=document.getElementById('scroll');
  const nested=editDayKey===key;
  const today=nested||(!editDayKey&&currentTab==='today'&&key===todayKey());
  const social=!editDayKey&&currentTab==='social'&&key===socialKey();
  const current=scroll?.querySelector(today?'.today':'.soc');
  if(!USER||settingsOpen||(routineId&&routineView)||(!today&&!social)||!current){render();return;}
  const patch=(node,markup)=>{
    if(!node)return;
    const template=document.createElement('template');uiHTML(template,markup);
    const next=template.content.firstElementChild;
    if(next.classList.contains('fade-up'))next.style.animation='none';
    // Normalize the same palette and icons as the live tree before comparing.
    skinPaintTree(next);
    patchDayNode(node,next,fromSync);
  };
  patch(current,today?renderToday(key,nested):renderSocial());
  if(today&&!nested)patch(scroll.querySelector('#tb-score'),scoreStripHTML(key));
  if(fromSync&&!nested)patch(scroll.querySelector('#topbar'),topbarHTML());
}

function isNight(){
  const d=new Date(), hr=d.getHours()+d.getMinutes()/60;
  const from=Number(CFG.nightFrom??20.5), till=Number(CFG.nightUntil??7);
  // window wraps past midnight when `from` is later in the day than `till`
  return from>till ? (hr>=from||hr<till) : (hr>=from&&hr<till);
}
// El bloque del Social Combo vive en TODAY o en su propio tab, según CFG.socialTab.
// Se extrae aquí para que las dos vistas rendericen exactamente lo mismo.
function legacyComboBlock(key,alwaysOpen){
  const C=cfgForDate(key), ch=getChecked(key), soc=getSocial(key);
  const dSubs=C.subs, nSubs=dSubs.length||1;
  const activeSubs=dSubs.filter(x=>soc[x.id]).length;
  const comboPts=(C.L3.find(x=>x.combo)||{pts:18}).pts;
  const socialPts=ch.social?(activeSubs>0?dSubs.reduce((a,x)=>a+(soc[x.id]?x.p:0),0):comboPts):0;
  const expanded=alwaysOpen?true:socialExpanded;   // let de nivel superior, no window
  return`      <div ${uiStyle(`border-radius:13px;border:1px solid ${ch.social||expanded?"rgba(251,191,36,0.18)":"transparent"};background:${ch.social||expanded?"rgba(251,191,36,0.04)":"transparent"};margin-bottom:3px`)}>
        <div role="button" tabindex="0" aria-label="Toggle social activity" ${uiStyle(`display:flex;align-items:center;justify-content:space-between;padding:13px 14px;cursor:pointer`)} ${ui('click','handleSocial' ,key)} ${ui('keydown','activate')}>
          <div ${uiStyle(`display:flex;align-items:center;gap:13px`)}>
            ${chk(!!ch.social,"#fbbf24",18)}
            <div>
              <div class="cb-tit" ${uiStyle(`font-size:16.5px;font-weight:${ch.social?600:450}`)}>👥 Social Combo</div>
              ${expanded?`<div class="cb-sub" ${uiStyle(`font-size:14.5px;color:#adadbf;margin-top:2px`)}>${activeSubs}/${nSubs} active · ${socialPts}%</div>`:""}
            </div>
          </div>
          <div ${uiStyle(`display:flex;align-items:center;gap:10px;flex-shrink:0`)} ${ui('click','stop')}>
            ${alwaysOpen?"":`<button class="edit-btn" ${ui('click','toggleSocialExpand' ,key)}>${expanded?"✕":"EDIT"}</button>`}
            <span ${uiStyle(`font-size:15px;color:${ch.social?"#fbbf2499":"#8a8aa0"};min-width:38px;text-align:right`)}>${ch.social?socialPts:comboPts}%</span>
          </div>
        </div>
        ${expanded?`<div ${uiStyle(`padding:0 12px 12px;display:flex;flex-direction:column;gap:2px`)}>
          ${dSubs.map(s=>{
            const mine=peopleList().filter(x=>!x.inactive&&x.sub===s.id), tag=getPeople(key), corto=shortLabels(mine);
            return`<div ${uiStyle(`border-radius:10px;background:${soc[s.id]?"rgba(251,191,36,0.05)":"transparent"}`)}>
            <div class="cb-row" role="button" tabindex="0" aria-pressed="${!!soc[s.id]}" ${ui('click','toggleSub' ,s.id,key)} ${ui('keydown','activate')} ${uiStyle(`display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:15px;color:${soc[s.id]?"#e2e2e2":"#8a8aa0"};user-select:none`)}>
              ${chk(!!soc[s.id],"#fbbf24",18)}
              <span>${esc(s.icon)} ${esc(s.label)}</span>
              <span ${uiStyle(`margin-left:auto;font-size:14.5px;color:#adadbf`)}>${s.p}%</span>
            </div>
            ${soc[s.id]?`<div ${uiStyle(`display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 11px 41px`)}>
              ${mine.map(x=>{const on=tag.includes(x.id);return`<button class="cb-pill" ${ui('click','togglePerson' ,x.id,key)} ${uiStyle(`background:${on?"rgba(251,191,36,0.16)":"transparent"};border:1px solid ${on?"#fbbf2466":"#22223a"};color:${on?"#fbbf24":"#7e7e97"};font-family:inherit;font-size:13.5px;padding:5px 11px;border-radius:99px;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)} title="${esc(x.name)}">${esc(corto[x.id]||x.name)}</button>`;}).join("")}
              <button class="cb-pill" ${ui('click','personAddDay' ,s.id,key)} title="Add someone" ${uiStyle(`background:none;border:1px dashed #242436;color:#9a9ab2;font-family:inherit;font-size:13.5px;padding:5px 11px;border-radius:99px;cursor:pointer`)}>+ who?</button>
            </div>`:""}
          </div>`;}).join("")}
        </div>`:""}
      </div>`;
}

let todayRoutinesOpen=true;
function todayRoutinesKey(){return `shaah_today_routines_${USER?USER.id:'anon'}`;}
function loadTodayRoutines(){
  const v=get(todayRoutinesKey());
  if(v===true||v===false) todayRoutinesOpen=v;
}
function toggleTodayRoutines(el){
  // ONLY mobile can collapse Today's Routines. Desktop is permanently open.
  if(window.innerWidth >= 880){
    const box=el?.closest('.t-rout');
    if(box){
      box.classList.remove('collapsed');
      const body=box.querySelector('.t-rout-body');
      if(body)body.style.display='';
      const toggle=box.querySelector('.t-rout-toggle');
      if(toggle)toggle.setAttribute('aria-expanded','true');
    }
    return;
  }
  todayRoutinesOpen=!todayRoutinesOpen;
  set(todayRoutinesKey(),todayRoutinesOpen);
  render();
}

function earnedPointsForItem(item,state){
  const frac=doneFrac(state);
  const raw=safePts(item.pts)*frac;
  return Number.isInteger(raw)?String(raw):String(Math.round(raw*10)/10);
}
function pointsLabel(item,state){
  return `${earnedPointsForItem(item,state)} / ${safePts(item.pts)}`;
}

function renderToday(key,nested=false){
  const _hr=new Date().getHours();
  const greetShort=_hr<12?"MORNING":_hr<18?"AFTERNOON":"EVENING";
  const C=cfgForDate(key);
  const ch=getChecked(key),soc=getSocial(key),{score,l1,l2,l3,done,max:dMax,l1max:dM1,l2max:dM2,l3max:dM3}=calcScore(key),gr=GRADE(score,dMax),streak=getStreak();
  const dSubs=C.subs, nSubs=dSubs.length||1;
  const activeSubs=dSubs.filter(x=>soc[x.id]).length;
  const comboPts=(C.L3.find(x=>x.combo)||{pts:18}).pts;
  const allBtn=(lv,items)=>{ if(!items.length)return"";
    const on=items.every(i=>ch[i.id]), col=LVL_COL[lv];
    return`<button ${ui('click','toggleLevelAll' ,lv,key)} title="${on?'Clear this level':'Check this level'}" ${uiStyle(`background:${on?col:'none'};border:1.5px solid ${on?col:'#252535'};color:${on?'#080810':'#9a9ab2'};border-radius:8px;font-size:13px;line-height:1;width:36px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0`)}>✓</button>`;};
  const socialPts=ch.social?(activeSubs>0?Math.round((activeSubs/nSubs)*comboPts):comboPts):0;
  const isToday=key===todayKey();
  // LVL 1 se lista entero, rutinas incluidas: esconderlas dejaba el nivel a medias
  // y `work` (que no es rutina) descolgado. Para no verlas dos veces se plega el
  // nivel — la preferencia vive en CFG.lvlOpen y viaja entre dispositivos.
  // Work is a live-mode habit. Keep a final render-level guard so a stale
  // cached/config snapshot can never resurrect it on TODAY after a refresh.
  // Render from the resolved day configuration, never from today's live switch.
  // This keeps historical Vacation days (including routines) consistent with
  // the scoring model and prevents a stale Work item from appearing in L1.
  const L1vis=C.inVacation?C.L1.filter(i=>i.id!=='work'):C.L1;
  const core=coreLayoutFor(key);
  // En movil el anillo comparte fila con la tarjeta de nota: 118 px. En
  // escritorio sigue a 168 (y la hoja le aplica su zoom .95).
  const RSZ=(window.matchMedia&&window.matchMedia("(min-width:880px)").matches)?196:115;
  return`<div class="fade-up today${nested?" history-day-editor":""}${core&&!nested&&isToday?" sf-today-v27":""}${(!nested&&isToday&&isNight())?" night":""}" ${uiStyle(`padding:${nested?"10px":"2px"} 16px ${nested?"24px":`calc(50px + env(safe-area-inset-bottom))`};display:flex;flex-direction:column;align-items:center;gap:10px`)}>
    ${(!nested&&!isToday)?`<div class="t-head" ${uiStyle(`text-align:center;width:100%`)}>
      <div ${uiStyle(`font-family:'Bebas Neue';font-size:15px;letter-spacing:0.13em;color:#8888a4`)}>DAY SCORE</div>
      <div ${uiStyle(`font-size:14.5px;color:#c0c0cd;letter-spacing:0.12em;margin-top:3px`)}>${keyToDate(key).toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long"}).toUpperCase()}</div>
    </div>`:""}
    <div class="t-score-hero" ${uiStyle(`display:flex;align-items:center;justify-content:center;gap:18px;width:100%;max-width:760px`)}>
      <div class="t-score-stack" ${uiStyle(`display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px`)}>
        <div class="t-ring" ${uiStyle(`position:relative;width:${RSZ}px;height:${RSZ}px;color:${gr.c}`)}>
      ${ring(score,dMax,RSZ,RSZ>140?12:9,gr.c,gr.g)}
      <div ${uiStyle(`position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px`)}>
        <div ${uiStyle(`font-family:'Bebas Neue';font-size:${RSZ>140?54:38}px;line-height:1;color:${gr.c};text-shadow:0 0 40px ${gr.g}`)}>${score}%</div>
        <div ${uiStyle(`font-size:${RSZ>140?14:11.5}px;color:${gr.c};letter-spacing:0.12em;opacity:0.65`)}>${gr.n}</div>
      </div>
        </div>
        ${isToday?`<button class="today-log-start ${dayLogActiveId()?"live":""} ${routineOrbId()?'cr-log-has-orb':''}" type="button" ${ui('click','openDayLogStart')} aria-label="${dayLogActiveId()?"View active Day Log":"Log an activity"}">
          <span>${dayLogActiveId()?"●":"+"}</span>${dayLogActiveId()?`<b>${dayLogFmt((Date.now()-new Date(dayLogEvents(todayKey()).find(e=>e.id===dayLogActiveId()).start).getTime())/60000)}</b>`:""}
        </button>${routineOrb()}`:""}
      </div>
    <div class="t-grade t-nextmove t-levelstatus" ${uiStyle(`width:100%;max-width:520px;background:${gr.bg};border:1px solid ${gr.c}1a;border-radius:16px;padding:15px 20px;box-sizing:border-box`)}>
      ${(()=>{
        const nm=nextMove(key);
        if(!nm)return`<div class="ls-top"><span class="ls-kicker">NEXT LEVEL</span><span class="ls-need" ${uiStyle(`color:${gr.c}`)}>TOPE</span></div>
          <div class="ls-path"><b ${uiStyle(`color:${gr.c}`)}>${esc(gr.l)}</b><span>MAX</span></div>
          <div class="ls-bar"><i ${uiStyle(`width:100%;background:${gr.c};box-shadow:0 0 12px ${gr.g}`)}></i></div>
          <div class="ls-footer"><span ${uiStyle(`color:${gr.c}`)}>MAX LEVEL REACHED</span></div>`;
        const targetScore=Math.max(1,nm.target);
        const progress=Math.max(0,Math.min(100,(score/targetScore)*100));
        return`<div class="ls-top">
          <span class="ls-kicker">◎&nbsp; NEXT LEVEL</span>
          <span class="ls-need" ${uiStyle(`color:${nm.next.c}`)}>+${nm.need}%</span>
        </div>
        <div class="ls-path"><b ${uiStyle(`color:${gr.c}`)}>${esc(gr.l)}</b><span>→</span><b ${uiStyle(`color:${nm.next.c}`)}>${esc(nm.next.l)}</b></div>
        <div class="ls-bar"><i ${uiStyle(`width:${progress}%;background:linear-gradient(90deg,${gr.c},${nm.next.c});box-shadow:0 0 12px ${nm.next.g||gr.g}`)}></i></div>
        <div class="ls-footer">
          <span ${uiStyle(`color:${nm.next.c}`)}>${nm.need}% REMAINING</span>
          <span>${score} / ${targetScore} pts</span>
        </div>`;
      })()}
    </div>
    </div>


${(nested||!isToday||!L1vis.some(i=>core||(i.routine&&ROUTINES[i.id])))?"":`<div class="t-rout${todayRoutinesOpen?"":" collapsed"}" ${uiStyle(`width:100%;max-width:390px`)}>
      <div class="sec t-rout-toggle" role="button" tabindex="0" aria-expanded="${todayRoutinesOpen}" ${ui('click','toggleTodayRoutines')} ${ui('keydown','activate')} ${uiStyle(`display:flex;align-items:center;cursor:pointer;gap:7px`)}><span class="t-rout-arrow">${todayRoutinesOpen?"▾":"▸"}</span>${core?'▪ CORE ROUTINES':"TODAY'S ROUTINES"}${core?`<span class="sf-core-total">${l1}/${dM1}</span>`:''}</div>
      <div class="t-rout-body" ${uiStyle(`${todayRoutinesOpen?"":"display:none;"}`)}>${L1vis.filter(i=>core||(i.routine&&ROUTINES[i.id])).map(item=>{
        if(core&&item.id==='work')return workPhaseCard(key,item);
        if(core&&!item.routine)return coreHabitCard(key,item);
        const rt=ROUTINES[item.id],st=ch[item.id],full=st===true,light=st===0.5,done=full||light,totalMin=rt.steps.reduce((a,s)=>a+s.dur,0);
        const session=sessions[item.id];
        // The three shared controls retain daily credit toggles and the existing runner.
        return`<div class="sf-core-routine cr-compact-card" data-routine-card="${esc(item.id)}">
          <div class="cr-compact-icon" aria-hidden="true">${esc(rt.icon)}</div>
          <div class="cr-compact-copy">
            <div class="r-lab"><span class="cr-routine-name">${esc(rt.label)}</span>${core?`<span class="sf-routine-total">${Math.round(item.pts*doneFrac(st))}/${item.pts}</span>`:''}</div>
            <div class="r-sub">${rt.steps.length} steps · ${totalMin} min</div>
          </div>
          <div class="cr-compact-actions">
            <button type="button" class="r-btn" aria-label="LIGHT" aria-pressed="${light}" title="${light?'Clear light credit':'Light version — half credit'}" ${ui('click','setHabitState',item.id,key,light?false:0.5)}><svg class="cr-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" stroke="none"/></svg></button>
            <button type="button" class="r-btn sf-routine-primary" aria-label="${item.id==='production'?'PLAY':'START'}" title="${session?(session.running?'Open running routine':session.paused?'Resume routine':'Play prepared step'):'Play routine'}" ${session&&!session.running?ui('click','routineResume',item.id):ui('click','startRoutine',item.id)} ${uiStyle(`background:${rt.col};color:#080810`)}><svg class="cr-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 4 20 12 8 20Z" fill="currentColor" stroke="none"/></svg></button>
            <button type="button" class="r-btn" aria-label="DONE" aria-pressed="${full}" title="${full?'Clear completed routine':'Mark done without the timer'}" ${ui('click','setHabitState',item.id,key,full?false:true)}><svg class="cr-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 5 5L20 6"/></svg></button>
          </div>
        </div>`;
      }).join("")}</div>
    </div>`}

    ${!(core&&isToday&&!nested?[]:L1vis).length?"":`<div class="t-lvl t-lvl1" ${uiStyle(`width:100%;max-width:390px`)}>
      <div class="sec lvl-h" ${uiStyle(`display:flex;align-items:center;gap:8px`)}><button type="button" class="lvl-toggle" aria-expanded="${lvlOpen[1]}" ${ui('click','toggleLvl' ,1)} ${uiStyle(`display:flex;align-items:center;gap:8px;flex:1;min-width:0;background:none;border:0;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer`)}><span class="lvl-ar${lvlOpen[1]?"":" cl"}">▾</span>${core?'CORE HABITS':'⬛ LVL 1 — CORE'}<span class="lvl-toggle-count" ${uiStyle(`margin-left:auto;display:flex;align-items:center;gap:9px`)}><span class="lvl-n" ${uiStyle(`font-size:11px;color:#7e7e97`)}>${l1}/${dM1}</span></span></button>${allBtn(1,C.L1)}</div>
      <div class="lvl-b${lvlOpen[1]?"":" cl"}">
      ${(core&&isToday&&!nested?[]:L1vis).map(item=>{if(core&&item.id==="work")return nested?workHistoryRow(key,item):workPhaseCard(key,item);
        const st=ch[item.id],half=halfCreditItem(item.id),light=(item.routine||half)&&st===0.5;
        return`
      <div class="row${st?" on":""}" role="button" tabindex="0" aria-pressed="${!!st}" ${uiStyle(`margin-bottom:3px`)} ${ui('click','toggleHabit' ,item.id,key)} ${ui('keydown','activate')}>
        <div ${uiStyle(`display:flex;align-items:center;gap:13px;min-width:0;flex:1`)}>
          ${(item.routine||half)?chk3(st,item.col):chk(!!st,item.col)}
          <span ${uiStyle(`font-size:16.5px;font-weight:${st?600:450};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)}>${esc(item.icon)} ${esc(item.label)}</span>
        </div>
        <div ${uiStyle(`display:flex;align-items:center;gap:10px;flex-shrink:0`)}>
          ${item.routine&&ROUTINES[item.id]&&st!==true&&isToday&&!nested?`
          <button ${ui('click','startRoutineNested' ,item.id)} title="Start routine" ${uiStyle(`background:${ROUTINES[item.id].col};color:#080810;border:none;font-family:inherit;font-size:15px;padding:7px 12px;border-radius:9px;cursor:pointer;font-weight:700;box-shadow:0 0 10px ${ROUTINES[item.id].col}55;flex-shrink:0`)}>▶</button>`:""}
          <span ${uiStyle(`font-size:15px;color:${st?(light?"#f59e0b":"#e2e2e299"):"#8a8aa0"};min-width:38px;text-align:right`)}>${pointsLabel(item,st)}</span>
        </div>
      </div>`;}).join("")}
      </div>
    </div>`}
    <div class="t-lvl t-lvl2" ${uiStyle(`width:100%;max-width:390px`)}>
      <div class="sec lvl-h" ${uiStyle(`display:flex;align-items:center;gap:8px`)}><button type="button" class="lvl-toggle" aria-expanded="${lvlOpen[2]}" ${ui('click','toggleLvl' ,2)} ${uiStyle(`display:flex;align-items:center;gap:8px;flex:1;min-width:0;background:none;border:0;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer`)}><span class="lvl-ar${lvlOpen[2]?"":" cl"}">▾</span>▪ LVL 2 — HABITS<span class="lvl-toggle-count" ${uiStyle(`margin-left:auto;display:flex;align-items:center;gap:9px`)}><span class="lvl-n" ${uiStyle(`font-size:11px;color:#7e7e97`)}>${l2}/${dM2}</span></span></button>${allBtn(2,C.L2)}</div>
      <div class="lvl-b${lvlOpen[2]?"":" cl"}">
      ${C.L2.map(item=>{
        const st=ch[item.id],half=halfCreditItem(item.id),light=half&&st===0.5;
        return`
      <div class="row${st?" on":""}" role="button" tabindex="0" aria-pressed="${!!st}" ${uiStyle(`margin-bottom:3px`)} ${ui('click','toggleHabit' ,item.id,key)} ${ui('keydown','activate')}>
        <div ${uiStyle(`display:flex;align-items:center;gap:13px`)}>
          ${half?chk3(st,item.col):chk(!!st,item.col)}
          <span ${uiStyle(`font-size:16.5px;font-weight:${st?600:450}`)}>${esc(item.icon)} ${esc(item.label)}</span>
        </div>
        <span ${uiStyle(`font-size:15px;color:${st?(light?"#f59e0b":"#a78bfa99"):"#8a8aa0"}`)}>${pointsLabel(item,st)}</span>
      </div>`;}).join("")}
      </div>
    </div>
    <div class="t-lvl t-lvl3" ${uiStyle(`width:100%;max-width:390px`)}>
      <div class="sec lvl-h" ${uiStyle(`display:flex;align-items:center;gap:8px`)}><button type="button" class="lvl-toggle" aria-expanded="${lvlOpen[3]}" ${ui('click','toggleLvl' ,3)} ${uiStyle(`display:flex;align-items:center;gap:8px;flex:1;min-width:0;background:none;border:0;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer`)}><span class="lvl-ar${lvlOpen[3]?"":" cl"}">▾</span>· LVL 3 — BONUS<span class="lvl-toggle-count" ${uiStyle(`margin-left:auto;display:flex;align-items:center;gap:9px`)}><span class="lvl-n" ${uiStyle(`font-size:11px;color:#7e7e97`)}>${core?bonusSummary(key).earned:l3}/${core?bonusSummary(key).max:dM3}</span></span></button>${allBtn(3,core?C.L3.filter(i=>!i.combo):C.L3)}</div>
      <div class="lvl-b${lvlOpen[3]?"":" cl"}">
      ${core?"":comboBlock(key)}
      ${C.L3.filter(x=>!x.combo).map(item=>{
        const st=ch[item.id];
        return `
      <div class="row${st?" on":""}" role="button" tabindex="0" aria-pressed="${!!st}" ${uiStyle(`margin-bottom:3px`)} ${ui('click','toggleHabit' ,item.id,key)} ${ui('keydown','activate')}>
        <div ${uiStyle(`display:flex;align-items:center;gap:13px`)}>
          ${chk(!!st,core?"#a78bfa":"#fbbf24")}
          <span ${uiStyle(`font-size:16.5px;font-weight:${st?600:450}`)}>${esc(item.icon)} ${esc(item.label)}</span>
        </div>
        <span ${uiStyle(`font-size:15px;color:${st?"#fbbf2499":"#8a8aa0"}`)}>${pointsLabel(item,st)}</span>
      </div>`;
      }).join("")}
      </div>
    </div>
    ${core?`<div class="t-lvl t-social-independent">${comboBlock(key)}</div>`:""}
    ${isToday?`<div class="t-daylog" ${uiStyle(`width:100%;max-width:390px`)}>
      <div class="t-daylog-card ${dayLogActiveId()?"running":""}">
        <div class="t-daylog-row">
          <input id="dayLogInput" type="text" placeholder="${dayLogActiveId()?"Current activity":"What are you doing?"}" autocomplete="off" ${ui('keydown','dayLogEnter')}>
          <button id="dayLogStartBtn" type="button" ${ui('click','dayLogToggle')}>${dayLogActiveId()?"STOP":"START"}</button>
        </div>
        <div class="t-daylog-meta">${dayLogActiveId()?"LOGGING NOW":"Track an activity"} · ${dayLogFmt(dayLogSummary(key).tracked)} tracked</div>
      </div>
    </div>`:""}
    <div class="t-note" ${uiStyle(`width:100%;max-width:390px`)}>
      <div class="sec">✎ DAY NOTE</div>
      <div class="notecard${getNote(key)?" filled":""}">
        <div class="notebar"></div>
        <textarea id="note-${key}" placeholder="How was your day? What did you learn?"
          ${ui('input','noteGrow')} ${ui('change','setNote' ,key)}
          ${uiStyle(`width:100%;min-height:70px;resize:none;overflow:hidden;background:transparent;border:none;color:#d8d8d8;font-family:inherit;font-size:15.5px;line-height:1.65;padding:14px 16px 14px 20px;outline:none;-webkit-user-select:text;user-select:text`)}>${(getNote(key)||"").replace(/</g,"&lt;")}</textarea>
        ${getNote(key)?`<div ${uiStyle(`position:absolute;bottom:8px;right:12px;font-size:14px;letter-spacing:.1em;color:#4ade8088`)}>SAVED</div>`:""}
      </div>
    </div>
    ${isToday?resetDayControl(key):""}
  </div>`;
}


function openDayLogStart(){
  const activeId=dayLogActiveId();
  window.__dayLogSelectedId=activeId;
  window.__dayLogPanelMode=activeId?'edit':'new';
  setTab('log');
  setTimeout(()=>{
    const input=document.querySelector('#logPanelName')||document.querySelector('#logPanelStart');
    if(input){
      input.focus();
      input.scrollIntoView({behavior:'smooth',block:'center'});
    }
  },60);
}

window.__dayLogPanelMode=window.__dayLogPanelMode||'edit';
window.__dayLogSelectedId=window.__dayLogSelectedId||null;
function dayLogPanelSelect(id){window.__dayLogSelectedId=id;window.__dayLogPanelMode='edit';render();}
function dayLogPanelNew(){window.__dayLogPanelMode='new';window.__dayLogSelectedId=null;render();setTimeout(()=>document.getElementById('logPanelName')?.focus(),40);}
function dayLogPanelCancel(){window.__dayLogPanelMode='edit';render();}
function dayLogPanelTime(iso){const m=dayLogMinutes(iso);return m==null?'':`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function dayLogPanelParseTime(v){if(!/^\d{2}:\d{2}$/.test(v||''))return null;const [h,m]=v.split(':').map(Number);return h*60+m;}
function dayLogPanelSave(key){
  const ev=dayLogEvents(key).find(e=>e.id===window.__dayLogSelectedId);
  const title=(document.getElementById('logPanelName')?.value||ev?.title||'').trim();
  const sm=document.getElementById('logPanelStart')?.value||'';
  const em=document.getElementById('logPanelEnd')?.value||'';
  const a=dayLogPanelParseTime(sm),b=dayLogPanelParseTime(em);
  const sleepWake=window.__dayLogPanelMode==='edit'&&dayLogIsSleepWake(ev);
  if(!title){alert('Please enter an activity name.');return;}
  if(a==null||(!sleepWake&&b==null)||(b!=null&&!sleepWake&&b<a)){alert('Please enter valid start and end times.');return;}
  const start=dayLogDateTime(key,a).toISOString(),end=sleepWake?null:(b==null?null:dayLogDateTime(key,b).toISOString());
  if(window.__dayLogPanelMode==='new'){
    dayLogAdd(title,start,end,'manual');
  }else{
    if(!ev)return;
    if(sleepWake&&ev.end)ev.meta={...(ev.meta||{}),legacyRange:{start:ev.start,end:ev.end}};
    Object.assign(ev,{title,start,end});
    if(sleepWake){const role=dayLogSleepRole(ev);ev.meta={...(ev.meta||{}),sleepWake:true,...(role?{sleepRole:role,completed:role==='sleep'}:{})};}
    dayLogPersist(key);
  }
  window.__dayLogPanelMode='edit';window.__dayLogSelectedId=null;haptic(8);render();
}
function dayLogPanelDelete(key){
  const ev=dayLogEvents(key).find(e=>e.id===window.__dayLogSelectedId);if(!ev)return;
  if(!confirm(`Delete "${ev.title}" from the Day Log?`))return;
  dayLogDelete(ev.id,key);window.__dayLogSelectedId=null;window.__dayLogPanelMode='edit';haptic(8);render();
}

function renderDayLogTab(){
  const key=todayKey();
  dayLogNormalizeSleepWake(key);
  const s=dayLogSummary(key), evs=dayLogSort(dayLogEvents(key));
  const active=!!dayLogActiveId();
  if(!window.__dayLogSelectedId || !evs.some(e=>e.id===window.__dayLogSelectedId)) window.__dayLogSelectedId=evs[0]?.id||null;
  const selected=evs.find(e=>e.id===window.__dayLogSelectedId)||null;
  const mode=window.__dayLogPanelMode==='new'?'new':(selected?'edit':'new');
  window.__dayLogPanelMode=mode;
  const panelEv=mode==='edit'?selected:null;
  const panelSleepRole=dayLogSleepRole(panelEv);
  const panelTitle=panelEv?.title||'';
  const panelStart=panelEv?dayLogPanelTime(panelEv.start):'';
  const panelEnd=panelEv?dayLogPanelTime(panelEv.end):'';
  const totalStart=6*60,totalEnd=24*60,span=totalEnd-totalStart;
  const ticks=[6,8,10,12,14,16,18,20,22,24];
  const icon=panelEv?.type==='habit'?'◐':panelEv?.type==='routine'?'◆':'✣';
  const byHour=Array.from({length:24},()=>0);
  evs.forEach(e=>{const a=dayLogMinutes(e.start),d=dayLogDuration(e);if(a!=null&&d>0)byHour[Math.min(23,Math.floor(a/60))]+=d;});
  return `<div class="fade-up logdesk-shell">
    <div class="logdesk-grid">
      <div class="logdesk-left">
        <div class="logdesk-timeline-card">
          <div class="logdesk-card-title">TODAY'S TIMELINE</div>
          <div class="logdesk-ticks">${ticks.map(h=>`<span>${String(h).padStart(2,'0')}</span>`).join('')}</div>
          <div class="logdesk-timeline">
            ${evs.filter(e=>!dayLogIsSleepWake(e)).map((e,i)=>{
              const a=dayLogMinutes(e.start),b=dayLogMinutes(e.end);if(a==null)return '';
              const aa=Math.max(totalStart,Math.min(totalEnd,a)),bb=Math.max(aa+2,Math.min(totalEnd,b??Math.min(totalEnd,a+20)));
              const left=((aa-totalStart)/span)*100,width=((bb-aa)/span)*100;
              return `<button type="button" class="logdesk-seg s${i%4} ${e.id===window.__dayLogSelectedId?'selected':''}" ${uiStyle(`left:${left}%;width:${Math.max(1.2,width)}%`)} title="${dayLogEsc(e.title)}" ${ui('click','dayLogPanelSelect' ,e.id)} aria-label="Edit ${dayLogEsc(e.title)}"></button>`;
            }).join('')}
          </div>
          <div class="logdesk-legend">${evs.filter(e=>!dayLogIsSleepWake(e)).slice(0,6).map((e,i)=>`<span><i class="s${i%4}" ${uiStyle(`background:${['#12cfa8','#f4b62b','#178ee8','#9b45e9'][i%4]}`)}></i>${dayLogEsc(e.title)}</span>`).join('')}${!evs.some(e=>!dayLogIsSleepWake(e))?'<span>No timeline blocks yet</span>':''}</div>
        </div>

        <div class="logdesk-list-card">
          <div class="logdesk-list-head"><div class="logdesk-card-title">ACTIVITY LOGS</div><select class="logdesk-sort" aria-label="Sort activity logs"><option>Sort by: Time</option></select></div>
          <div class="logdesk-table-head"><span>TIME</span><span>ACTIVITY</span><span>TYPE</span><span>DURATION</span><span></span></div>
          ${evs.length?evs.map(e=>{
            const dur=dayLogDuration(e),running=!e.end&&!dayLogIsSleepWake(e);
            return `<div class="logdesk-row ${e.id===window.__dayLogSelectedId&&mode==='edit'?'selected':''}" role="button" tabindex="0" aria-label="Edit activity" ${ui('click','dayLogPanelSelect' ,e.id)} ${ui('keydown','activate')}>
              <div class="logdesk-time">${dayLogPanelTime(e.start)}${e.end?` – ${dayLogPanelTime(e.end)}`:(dayLogIsSleepWake(e)?'':' · NOW')}</div>
              <div class="logdesk-activity"><div class="logdesk-activity-name">${dayLogEsc(e.title)}</div><div class="logdesk-activity-sub">${dayLogIsSleepWake(e)?(dayLogSleepRole(e)==='sleep'?'SLEEP':dayLogSleepRole(e)==='wake'?'WAKE':'RECORDED TIME'):(running?'<span class="logdesk-running"><span class="logdesk-running-dot"></span>RUNNING</span>':(e.meta?.endedEarly?'INCOMPLETE':e.meta?.completed?'COMPLETED':''))}</div></div>
              <div><span class="logdesk-type ${esc(e.type)}">${dayLogTypeLabel(e.type)}</span></div>
              <div class="logdesk-duration">${dur==null?'—':dayLogFmt(dur)}</div>
              <button class="logdesk-edit" type="button" ${ui('click','dayLogPanelSelectNested' ,e.id)} aria-label="Edit ${dayLogEsc(e.title)}">✎</button>
            </div>`;
          }).join(''):`<div class="logdesk-empty">No activities logged yet.<br>Use <b>LOG ACTIVITY</b> to add your first entry.</div>`}
        </div>
      </div>

      <aside class="logdesk-editor" aria-label="Activity editor">
        <div class="logdesk-editor-top"><button type="button" class="logdesk-new" ${ui('click','dayLogPanelNew')}>＋ &nbsp;LOG ACTIVITY</button></div>
        <div class="logdesk-editor-body">
          <div class="logdesk-editor-head"><div><div class="logdesk-editor-kicker">${mode==='new'?'NEW ACTIVITY':'EDIT ACTIVITY'}</div><div class="logdesk-editor-title">${mode==='new'?'Log a new activity':dayLogEsc(panelTitle)}</div></div></div>
          ${mode==='edit'&&panelEv&&panelEv.type==='manual'?`<div class="logdesk-identity"><div class="logdesk-icon">${icon}</div><div><span class="logdesk-badge">${dayLogTypeLabel(panelEv.type)}</span></div></div>`:''}
          ${mode==='new'||(mode==='edit'&&panelEv&&panelEv.type==='manual')?`<div class="logdesk-field"><label for="logPanelName">ACTIVITY</label><input id="logPanelName" class="logdesk-input" type="text" maxlength="120" value="${dayLogEsc(panelTitle)}" placeholder="e.g. Deep Work, Lunch, Gym…" autocomplete="off"></div>`:''}
          ${mode==='edit'&&panelEv&&dayLogIsSleepWake(panelEv)?`<div class="logdesk-note">Wake & Sleep Early uses two timestamps: the first tap logs when you woke up, the second logs when you went to sleep. The overnight span is not drawn on the timeline.</div>`:mode==='edit'&&panelEv&&panelEv.type!=='manual'?`<div class="logdesk-note">This activity is linked to ${dayLogTypeLabel(panelEv.type).toLowerCase()} completion. Its name and type are managed automatically; you can edit the time.</div>`:''}
          ${panelEv&&dayLogIsSleepWake(panelEv)?`<div class="logdesk-field"><label>${panelSleepRole==='sleep'?'SLEEP TIME':panelSleepRole==='wake'?'WAKE TIME':'RECORDED TIME'}</label><div class="logdesk-times"><input id="logPanelStart" class="logdesk-input" type="time" value="${panelStart}"></div></div>`:`<div class="logdesk-field"><label>START / END</label><div class="logdesk-times"><input id="logPanelStart" class="logdesk-input" type="time" value="${panelStart}"><input id="logPanelEnd" class="logdesk-input" type="time" value="${panelEnd}"></div></div>`}
          <div class="logdesk-duration-line"><span>${panelEv&&dayLogIsSleepWake(panelEv)?'POINT EVENT':'DURATION'}</span><b>${panelEv&&dayLogIsSleepWake(panelEv)?(panelSleepRole==='sleep'?'SLEEP LOGGED':panelSleepRole==='wake'?'WAKE LOGGED':'RECORDED TIME'):panelEv&&dayLogDuration(panelEv)!=null?dayLogFmt(dayLogDuration(panelEv)):'Calculated on save'}</b></div>
          <div class="logdesk-actions">${mode==='new'?`<button type="button" class="logdesk-cancel" ${ui('click','dayLogPanelCancel')}>CANCEL</button><button type="button" class="logdesk-save" ${ui('click','dayLogPanelSave' ,key)}>ADD ACTIVITY</button>`:`<button type="button" class="logdesk-delete" ${ui('click','dayLogPanelDelete' ,key)}>DELETE</button><button type="button" class="logdesk-save" ${ui('click','dayLogPanelSave' ,key)}>SAVE</button>`}</div>
        </div>
      </aside>
    </div>
  </div>`;
}
function dayLogQuickAdd(){
  const i=document.querySelector('#dayLogQuickInput'),title=(i?.value||'').trim();if(!title)return;
  const now=dayLogNowISO();dayLogAdd(title,now,now,'manual');i.value='';haptic(8);render();
}

function renderEditDay(){
  const dateStr=new Date(editDayKey+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",day:"numeric",month:"short"}).toUpperCase();
  return`<div class="edit-day-screen" ${uiStyle(`display:flex;flex-direction:column;min-height:100%`)}>
    <div ${uiStyle(`display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top) + 12px) 20px 12px;border-bottom:1px solid #1e1e2e;background:#07070f;position:sticky;top:0;z-index:50`)}>
      <button ${ui('click','closeEditDay')} ${uiStyle(`background:none;border:1px solid #1e1e2e;color:#d0d0da;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:19px;display:flex;align-items:center;justify-content:center;flex-shrink:0`)}>←</button>
      <div ${uiStyle(`font-family:'Bebas Neue';font-size:17px;letter-spacing:0.12em;color:#e2e2e2`)}>EDIT DAY</div>
      <div ${uiStyle(`font-size:14.5px;color:#adadbf;margin-left:4px`)}>${dateStr}</div>
    </div>
    ${renderToday(editDayKey,true)}
  </div>`;
}

// ── Weekly review: turns the log into a decision ──────────────
function weekReview(){
  const d=getDays(14),cur=d.slice(7),prev=d.slice(0,7);
  const logged=cur.filter(x=>x.data);
  if(!logged.length)return null;
  const avg=Math.round(logged.reduce((a,x)=>a+dPct(x.data),0)/logged.length);
  const pl=prev.filter(x=>x.data);
  const pavg=pl.length?Math.round(pl.reduce((a,x)=>a+dPct(x.data),0)/pl.length):null;
  // per-habit hit rate across the week
  const byId=new Map();
  for(const x of cur){
    const cfg=cfgForDate(x.key),checks=getChecked(x.key)||{};
    for(const it of [...cfg.L1,...cfg.L2,...cfg.L3]){
      if(it.pts<=0)continue;
      const t=byId.get(it.id)||{...it,done:0,eligible:0};
      t.eligible++;t.done+=doneFrac(checks[it.id]);byId.set(it.id,t);
    }
  }
  const tally=[...byId.values()].map(t=>({...t,rate:Math.round(t.done/t.eligible*100)}));
  const sorted=[...tally].sort((a,b)=>b.rate-a.rate);
  const best=sorted[0],worst=sorted[sorted.length-1];
  const bestDay=logged.reduce((m,x)=>!m||dPct(x.data)>dPct(m.data)?x:m,null);
  return{avg,pavg,diff:pavg==null?null:avg-pavg,tally:sorted,best,worst,bestDay,days:logged.length,cur};
}
function renderWeekReview(){
  const r=weekReview();
  if(!r)return "";
  const g=GRADE(r.avg,100);
  const arrow=r.diff==null?"":(r.diff>0?"▲":r.diff<0?"▼":"—");
  const acol=r.diff==null?"#9a9ab4":(r.diff>0?"#4ade80":r.diff<0?"#ef4444":"#9a9ab4");
  return`<div>
    <div class="sec">THIS WEEK</div>
    <div class="card">
      <div ${uiStyle(`display:flex;align-items:center;gap:16px;margin-bottom:18px`)}>
        <div ${uiStyle(`position:relative;width:74px;height:74px;flex-shrink:0`)}>
          ${ring(r.avg,100,74,6,g.c,g.g)}
          <div ${uiStyle(`position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center`)}>
            <span ${uiStyle(`font-family:'Bebas Neue';font-size:19px;color:${g.c};line-height:1`)}>${r.avg}</span>
            <span ${uiStyle(`font-size:9px;color:${g.c};opacity:.65`)}>AVG</span>
          </div>
        </div>
        <div ${uiStyle(`flex:1;min-width:0`)}>
          <div ${uiStyle(`font-family:'Bebas Neue';font-size:30px;color:${g.c};line-height:1`)}>${esc(g.l)} · ${g.n}</div>
          <div ${uiStyle(`font-size:13px;color:${acol};margin-top:5px`)}>
            ${r.diff==null?`${r.days} day${r.days!==1?"s":""} logged`:`${arrow} ${Math.abs(r.diff)}% vs last week`}
          </div>
          ${r.bestDay?`<div ${uiStyle(`font-size:12px;color:#9a9ab4;margin-top:3px`)}>Best: ${keyToDate(r.bestDay.key).toLocaleDateString("en-US",{weekday:"short"})} · ${dPct(r.bestDay.data)}%</div>`:""}
        </div>
      </div>
      <div ${uiStyle(`display:flex;gap:8px;margin-bottom:16px`)}>
        ${r.cur.map(x=>{const dg=x.data?GRADE(x.data.score,x.data.max):null;const hh=x.data?Math.max(6,(dPct(x.data)/100)*44):4;
          return`<div ${uiStyle(`flex:1;display:flex;flex-direction:column;align-items:center;gap:5px`)}>
            <div ${uiStyle(`width:100%;height:44px;display:flex;align-items:flex-end`)}>
              <div ${uiStyle(`width:100%;height:${hh}px;border-radius:4px 4px 0 0;background:${dg?dg.c+"33":"#14141f"};border:1px solid ${dg?dg.c+"55":"#1a1a28"};border-bottom:none`)}></div>
            </div>
            <div ${uiStyle(`font-size:10px;color:#8888a4`)}>${keyToDate(x.key).toLocaleDateString("en-US",{weekday:"narrow"})}</div>
          </div>`}).join("")}
      </div>
    </div>
  </div>`;
}
// Tab SOCIAL: el mismo combo que en TODAY (siempre desplegado, es el motivo del tab),
// más el registro de personas. El scoring no cambia — el combo sigue contando en LVL 3.
function renderSocial(){
  const tk=socialKey(), hoy=todayKey(), esHoy=tk===hoy;
  const C=cfgForDate(tk),soc=getSocial(tk);
  const cb=(C.L3.find(x=>x.combo)||{pts:0}).pts;
  const got=getChecked(tk).social?(C.subs.some(x=>soc[x.id])?C.subs.reduce((a,x)=>a+(soc[x.id]?x.p:0),0):cb):0;
  const d=keyToDate(tk);
  const etiqueta=esHoy?"TODAY":d.toLocaleDateString("en-US",{weekday:"short",day:"numeric",month:"short"}).toUpperCase();
  const nav=(paso,txt,on)=>`<button class="sd-nav" ${on?ui('click','socialShift',paso):''} ${on?"":"disabled"}>${txt}</button>`;
  return`<div class="fade-up soc" ${uiStyle(`padding:0 14px 8px;display:flex;flex-direction:column;gap:7px`)}>
    <div>
      <div class="sec sd-bar">
        ${nav(-1,"‹",true)}
        <span class="sd-day">${esc(etiqueta)}</span>
        ${nav(1,"›",!esHoy)}
        ${esHoy?"":`<button class="sd-hoy" ${ui('click','socialToday')}>TODAY</button>`}
        <span class="sd-pts" ${uiStyle(`margin-left:auto;color:${got>0?"#fbbf24":"#7e7e97"}`)}>${got}/${cb}%</span></div>
      ${socialWorkspace(tk)}
    </div>

  </div>`;
}

// ── Consistencia: una fila por habito, un punto por dia ──────────────────
// Es el unico sitio donde se ve QUE habito te esta hundiendo sin deducirlo.
// -1 = dia sin registrar (no cuenta), 0 = registrado y sin marcar, 1 = hecho.
function habitGrid(dias){
  const tk=todayKey(), C=cfgForDate(tk), keys=[];
  for(let i=dias-1;i>=0;i--)keys.push(keyMinus(tk,i));
  return [...C.L1,...C.L2,...C.L3].map(it=>{
    const cells=keys.map(k=>_state[k]===undefined?-1:(getChecked(k)[it.id]?1:0));
    const con=cells.filter(v=>v>=0).length, hechos=cells.filter(v=>v===1).length;
    return {id:it.id,label:it.label,icon:it.icon,col:it.col,cells,hechos,con,
            rate:con?Math.round(hechos/con*100):0,streak:habitStreak(it.id)};
  });
}
function habitStreak(id){
  const tk=todayKey(); let s=0;
  for(let i=0;i<400;i++){ if(getChecked(keyMinus(tk,i))[id])s++; else if(i>0)break; else break; }
  return s;
}
function weekdayAvg(){
  const h=getHistory(), acc=[[],[],[],[],[],[],[]];
  for(const k of Object.keys(h)){ if(!DATE_RE.test(k))continue;
    acc[keyToDate(k).getDay()].push(dPct(h[k])); }
  return acc.map((xs,i)=>({dia:i,n:xs.length,
    avg:xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length):0}));
}
function renderConsistency(){
  const rows=habitGrid(60).filter(r=>r.con>0);
  if(!rows.length)return"";
  return`<div><div class="sec" ${uiStyle(`display:flex;align-items:center;gap:8px`)}>CONSISTENCY — 60 DAYS
      <span ${uiStyle(`margin-left:auto;font-size:11px;color:#7e7e97`)}>STREAK · HIT RATE</span></div>
    <div class="card" ${uiStyle(`display:flex;flex-direction:column;gap:10px`)}>
      ${rows.map(r=>`<div class="cg-row">
        <span class="cg-lab">${esc(r.icon)} ${esc(r.label)}</span>
        <span class="cg-strip">${r.cells.map(v=>`<i ${uiStyle(`background:${v===1?(r.col||"#8a8aa0"):v===0?"#1e1e38":"#101020"}`)}></i>`).join("")}</span>
        <span class="cg-st" ${uiStyle(`color:${r.streak>0?"#FFD700":"#2a2a40"}`)}>${r.streak>0?"\ud83d\udd25 "+r.streak:"—"}</span>
        <span class="cg-rate" ${uiStyle(`color:${r.rate>=70?"#4ade80":r.rate>=40?"#f59e0b":"#ef4444"}`)}>${r.rate}%</span>
      </div>`).join("")}
    </div></div>`;
}
function renderWeekday(){
  const w=weekdayAvg(); if(!w.some(x=>x.n))return"";
  const N=["SUN","MON","TUE","WED","THU","FRI","SAT"];
  // Escala ABSOLUTA sobre 100, no sobre el maximo: con 22-28% todas las barras
  // salian casi llenas y parecia una semana estupenda. La altura dice el nivel,
  // no solo quien gana.
  const con=w.filter(x=>x.n);
  const mejor=con.reduce((m,x)=>!m||x.avg>m.avg?x:m,null);
  const peor=con.reduce((m,x)=>!m||x.avg<m.avg?x:m,null);
  return`<div><div class="sec">ALL-TIME BY WEEKDAY</div><div class="card">
    <div ${uiStyle(`display:flex;align-items:flex-end;gap:8px;height:118px`)}>
      ${w.map(x=>{const g=x.n?GRADE(x.avg,100):null, h=x.n?Math.max(7,Math.round(x.avg/100*82)):3;
      return`<div ${uiStyle(`flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end;min-width:0`)}>
        <span ${uiStyle(`font-size:13px;color:${x.n?g.c:"#2a2a40"}`)}>${x.n?x.avg+"%":"—"}</span>
        <div ${uiStyle(`width:100%;height:${h}px;border-radius:5px;background:${x.n?g.c:"#14142a"};opacity:${x.n?.9:1}`)}></div>
        <span ${uiStyle(`font-size:12.5px;color:#8888a4;letter-spacing:.08em`)}>${N[x.dia]}</span>
      </div>`;}).join("")}
    </div>
    ${mejor&&peor&&mejor.dia!==peor.dia?`<div ${uiStyle(`margin-top:13px;font-size:14.5px;color:#9a9ab2;line-height:1.5`)}>Best historical weekday: <b ${uiStyle(`color:${GRADE(mejor.avg,100).c}`)}>${N[mejor.dia]}</b> (${mejor.avg}%) · Weakest: <b ${uiStyle(`color:${GRADE(peor.avg,100).c}`)}>${N[peor.dia]}</b> (${peor.avg}%)</div>`:""}
  </div></div>`;
}

function renderStats(){
  const tk=todayKey(),{score}=calcScore(tk),h=getHistory();
  const allDays=Object.entries(h).sort(([a],[b])=>a.localeCompare(b));
  const total=allDays.length,best=allDays.reduce((m,[,d])=>Math.max(m,dPct(d)),0);
  const oAvg=total?Math.round(allDays.reduce((a,[,d])=>a+dPct(d),0)/total):0,streak=getStreak();
  const bestStreak=getBestStreak(),trend=weekTrend(),review=weekReview();
  if(total===0&&score===0){
    return`<div class="fade-up" ${uiStyle(`height:calc(100dvh - 60px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center`)}>
      <div ${uiStyle(`font-size:44px;opacity:.5`)}>📊</div>
      <div ${uiStyle(`font-family:'Bebas Neue';font-size:23px;letter-spacing:0.12em;color:#c0c0cd`)}>NO DATA YET</div>
      <div ${uiStyle(`font-size:15px;color:#adadbf;max-width:260px;line-height:1.6`)}>Log your first habit in <b ${uiStyle(`color:#d0d0da`)}>TODAY</b> and your stats start building.</div>
      <button ${ui('click','setTab' ,'today')} ${uiStyle(`margin-top:8px;background:#e2e2e2;color:#07070f;border:none;font-family:inherit;font-size:15px;letter-spacing:0.1em;font-weight:700;padding:12px 24px;border-radius:10px;cursor:pointer`)}>START →</button>
    </div>`;
  }
  const metrics = [
    {icon:"🔥",label:"CURRENT STREAK",val:`${streak}d`,col:"#FFD700",sub:`${bestStreak>0?`record ${bestStreak}d · `:``}days in a row ≥${Math.round(STREAK_MIN*100)}%`},
    {icon:review?.best?.icon||"✓",label:"MOST CONSISTENT",val:`${review?.best?.done??0}/${review?.best?.eligible??7}`,col:"#4ade80",sub:review?.best?.label||"—"},
    {icon:review?.worst?.icon||"·",label:"NEEDS WORK",val:`${review?.worst?.done??0}/${review?.worst?.eligible??7}`,col:"#ef4444",sub:review?.worst?.label||"—"},
    {icon:"🏆",label:"BEST DAY",val:`${best}%`,col:best>0?GRADE(best,100).c:"#333",sub:best>0?GRADE(best,100).n:"—"},
    {icon:"📊",label:"AVERAGE",val:`${oAvg}%`,col:oAvg>0?GRADE(oAvg,100).c:"#333",sub:trend?`${trend.diff>=0?"▲":"▼"} ${Math.abs(trend.diff)}% vs prev week`:(oAvg>0?GRADE(oAvg,100).n:"—")},
    {icon:"📅",label:"DAYS LOGGED",val:total,col:"#60a5fa",sub:"total"}
  ];
  return`<div class="fade-up stats-page" ${uiStyle(`padding:2px 16px calc(68px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:16px`)}>
    ${renderWeekday()}
    <div class="stats-six-grid">
      ${metrics.map(m=>`<div class="card stats-metric-card" ${uiStyle(`border:1px solid ${m.col}20;background:${m.col}08`)}>
        <div class="stats-metric-icon">${esc(m.icon)}</div>
        <div class="stats-metric-main"><div class="stats-metric-value" ${uiStyle(`color:${m.col}`)}>${esc(m.val)}</div><div class="stats-metric-label">${esc(m.label)}</div></div>
        <div class="stats-metric-sub" ${uiStyle(`color:${m.col}`)}>${esc(m.sub)}</div>
      </div>`).join("")}
    </div>
    ${total>0?`<div><div class="sec">GRADE DISTRIBUTION</div><div class="card">${[["S+",100],["S",88],["A",78],["B",65],["C",50],["D",30],["F",0]].map(([l,t])=>{const count=allDays.filter(([,d])=>GRADE(d.score,d.max).l===l).length,pct=total?(count/total)*100:0,gc=GRADE(t,100);return`<div ${uiStyle(`display:flex;align-items:center;gap:12px;margin-bottom:11px`)}><div ${uiStyle(`font-family:'Bebas Neue';font-size:19px;color:${count>0?gc.c:"#1e1e2e"};width:14px;text-align:center`)}>${l}</div><div ${uiStyle(`flex:1;height:5px;border-radius:99px;background:#0f0f1e;overflow:hidden`)}><div ${uiStyle(`height:100%;width:${pct}%;background:${gc.c};border-radius:99px`)}></div></div><div ${uiStyle(`font-family:'Bebas Neue';font-size:15px;color:${count>0?gc.c:"#1e1e2e"};width:22px;text-align:right`)}>${count}</div><div ${uiStyle(`font-size:14.5px;color:#8888a4;width:32px;text-align:right`)}>${pct>0?Math.round(pct)+"%":""}</div></div>`;}).join("")}</div></div>`:""}
    ${total>=2?`<div><div class="sec">TREND — 4 WEEKS</div><div class="card"><div ${uiStyle(`display:flex;align-items:flex-end;gap:8px;height:90px;padding-top:20px`)}>${getWeeks().map((week,wi)=>{const a=avgW(week),g=a>0?GRADE(a,100):null,bh=a>0?Math.max((a/100)*72,6):4;return`<div ${uiStyle(`flex:1;display:flex;flex-direction:column;align-items:center;gap:6px`)}>${a>0?`<div ${uiStyle(`font-size:14.5px;color:${g.c}`)}>${a}</div>`:("<div "+uiStyle("font-size:14.5px")+">&nbsp;</div>")}<div ${uiStyle(`width:100%;border-radius:5px 5px 0 0;height:${bh}px;background:${g?g.c+"28":"#0f0f1e"};border:1px solid ${g?g.c+"44":"#161626"};border-bottom:none`)}></div><div ${uiStyle(`font-size:14px;color:#9090aa`)}>W${4-wi}</div></div>`;}).join("")}</div><div ${uiStyle(`height:1px;background:#111120`)}></div></div></div>`:""}
    ${socialOwnTab()?"":renderWhoToSee()}
  </div>`;
}

// WHO TO SEE — sorted by how far past each person's own target you are.
function renderWhoToSee(){
  const st=peopleStatus();
  if(!st.length)return`<div>${locationSelector()}<div class="sec">WHO TO SEE</div><div class="card" ${uiStyle(`text-align:center;padding:22px 18px`)}>
    <div ${uiStyle(`font-size:15px;color:#adadbf;line-height:1.6;max-width:280px;margin:0 auto`)}>Tick a part of the Social Combo in <b ${uiStyle(`color:#d0d0da`)}>TODAY</b> and tap <b ${uiStyle(`color:#fbbf24`)}>+ who?</b> to start tracking who you spend time with.</div></div></div>`;
  const late=st.filter(p=>p.ratio>1).length;
  const col=p=>p.ratio===Infinity?"#8888a4":p.ratio>1.5?"#ef4444":p.ratio>1?"#f59e0b":"#4ade80";
  const when=p=>p.days==null?"never logged":p.days===0?"today":p.days===1?"yesterday":`${p.days} days ago`;
  const due=p=>p.days==null?`every ${p.every}d`:p.overdue>0?`${p.overdue}d over`:p.overdue===0?"due today":`${-p.overdue}d left`;
  return`<div>${locationSelector()}<div class="sec" ${uiStyle(`display:flex;align-items:center;gap:8px`)}>WHO TO SEE
      <span ${uiStyle(`margin-left:auto;font-size:11px;color:${late?"#f59e0b":"#4ade80"}`)}>${late?`${late} OVERDUE`:"ALL CURRENT"}</span></div>
    <div class="card" ${uiStyle(`display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px 22px`)}>
      ${st.map(p=>{const c=col(p),sb=subsList().find(x=>x.id===p.sub);
      return`<div ${uiStyle(`display:flex;align-items:center;gap:11px`)}>
        <span ${uiStyle(`font-size:15px;width:20px;text-align:center;flex-shrink:0`)}>${esc(sb?sb.icon:"·")}</span>
        <div ${uiStyle(`min-width:0;flex:1`)}>
          <div class="w-name" ${uiStyle(`font-size:15px;color:#e2e2e2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`)}>${esc(p.name)}</div>
          <div class="w-when" ${uiStyle(`font-size:13.5px;color:#8888a4;margin-top:2px`)}>${when(p)}</div>
        </div>
        <div ${uiStyle(`width:72px;flex-shrink:0`)}>
          ${bar(p.ratio===Infinity?100:Math.min(p.ratio*100,100),c,c+"55",4)}
          <div class="w-due" ${uiStyle(`font-size:13px;color:${c};text-align:right;margin-top:4px`)}>${due(p)}</div>
        </div>
      </div>`;}).join("")}
    </div></div>`;
}

function renderHistory(){
  return`<div class="fade-up" ${uiStyle(`padding:2px 16px calc(68px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:16px`)}>
    <div ${uiStyle(`display:flex;gap:8px`)}>
      ${["week","month","year"].map(t=>`<button class="htab${histTab===t?" active":""}" ${ui('click','setHistTab' ,t)}>${t==="week"?"7 DAYS":t==="month"?"MONTH":"YEAR"}</button>`).join("")}
    </div>
    ${histTab==="week"?renderHistWeek():histTab==="month"?renderHistMonth():renderHistYear()}
  </div>`;
}

function renderHistWeek(){
  const days=getDays(7).reverse(),tk=todayKey();
  return`<div class="history-week-list" ${uiStyle(`display:flex;flex-direction:column;gap:8px`)}><div class="sec" ${uiStyle(`margin-bottom:0`)}>LAST 7 DAYS</div>
    ${days.map(({key,date,data})=>{
      const g=data?GRADE(data.score,data.max):null,isT=key===tk,tgr=GRADE(calcScore(tk).score);
      return`<div class="card history-week-card" ${uiStyle(`border:1px solid ${isT?tgr.c+"25":"#111120"};${isT?`background:${tgr.bg}`:""}`)}>
        <div ${uiStyle(`display:flex;align-items:center;justify-content:space-between;margin-bottom:${data?14:0}px`)}>
          <div>
            <div class="h-day" ${uiStyle(`font-size:15px;color:${isT?"#e2e2e2":"#8a8aa0"};letter-spacing:0.06em`)}>${date.toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"short"}).toUpperCase()}</div>
            ${isT?`<div class="h-today" ${uiStyle(`font-size:14px;color:${tgr.c};letter-spacing:0.1em;margin-top:2px`)}>TODAY</div>`:""}
          </div>
          <div ${uiStyle(`display:flex;align-items:center;gap:10px`)}>
            ${data?`<div ${uiStyle(`position:relative;width:42px;height:42px`)}>${ring(data.score,data.max||MAX,42,3,g.c,g.g)}<div ${uiStyle(`position:absolute;inset:0;display:flex;align-items:center;justify-content:center`)}><span class="h-num" ${uiStyle(`font-family:'Bebas Neue';font-size:16.5px;color:${g.c}`)}>${data.score}</span></div></div><div class="h-grade" ${uiStyle(`font-family:'Bebas Neue';font-size:32px;color:${g.c};text-shadow:0 0 14px ${g.g};line-height:1`)}>${esc(g.l)}</div><button class="h-edit" ${ui('click','openEditDay' ,key)} ${uiStyle(`background:none;border:1px solid #1e1e2e;color:#a2a2b6;font-family:inherit;font-size:14.5px;padding:5px 10px;border-radius:7px;cursor:pointer`)}>EDIT</button>`:`<button ${ui('click','openEditDay' ,key)} ${uiStyle(`background:#161626;border:1px solid #1e1e2e;color:#c0c0cd;font-family:inherit;font-size:14.5px;padding:7px 14px;border-radius:8px;cursor:pointer;font-weight:500`)}>+ LOG</button>`}
          </div>
        </div>
        ${data?`<div ${uiStyle(`display:flex;gap:8px`)}>${[["CORE",data.l1,data.l1max||LVL1_MAX,"#e2e2e2"],["HABITS",data.l2,data.l2max||LVL2_MAX,"#a78bfa"],["BONUS",data.l3,data.l3max||LVL3_MAX,"#fbbf24"]].map(([lb,v,mx,c])=>`<div ${uiStyle(`flex:1`)}><div class="h-lvl" ${uiStyle(`display:flex;justify-content:space-between;font-size:14px;color:#9090aa;margin-bottom:5px`)}><span>${lb}</span><span ${uiStyle(`color:${v>0?c+"aa":"#252535"}`)}>${v}</span></div>${bar((v/mx)*100,c,c+"44",4)}</div>`).join("")}</div>`:""}
      </div>`;
    }).join("")}
  </div>`;
}

function renderHistMonth(){
  const tk=todayKey(), nowYM=tk.slice(0,7);
  const ym=histMonth||nowYM, cells=monthGrid(ym);
  const[yy,mm]=ym.split('-').map(Number);
  const title=new Date(Date.UTC(yy,mm-1,1,12)).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"});
  const logged=cells.filter(c=>c&&c.data);
  const scored=logged.filter(c=>c.data.score>0);
  const a=scored.length?Math.round(scored.reduce((t,c)=>t+dPct(c.data),0)/scored.length):0;
  const g=a>0?GRADE(a,100):null;
  const best=scored.reduce((m,c)=>!m||dPct(c.data)>dPct(m.data)?c:m,null);
  const canFwd=ym<nowYM;
  const nav=(d,lab,on)=>`<button class="history-month-nav" ${on?ui('click','histMonthShift',d):''} ${on?"":"disabled"}>${lab}</button>`;
  return`<div class="history-month-wrap" ${uiStyle(`display:flex;flex-direction:column;gap:14px`)}>
    <div class="history-month-head history-month-bar">
      ${nav(-1,"‹",true)}
      <div class="history-month-summary">
        <div class="history-month-title" ${uiStyle(`font-family:'Bebas Neue';letter-spacing:0.09em;color:#e2e2e2`)}>${title.toUpperCase()}</div>
        <span class="history-month-divider"></span>
        <div class="history-month-meta">${logged.length?`${logged.length}d logged`:"no days logged"}</div>
        ${g?`<span class="history-month-divider"></span><div class="history-month-meta">AVG ${a}%</div><span class="history-month-divider"></span><div class="history-month-grade" ${uiStyle(`color:${g.c}`)}>${esc(g.l)}</div>`:""}
      </div>
      ${best?`<div class="history-month-best-inline">
        <span class="history-month-best-icon">🏆</span>
        <span class="history-month-best-label">BEST DAY</span>
        <span class="history-month-best-date">${new Date(Date.UTC(yy,mm-1,best.day,12)).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"})}</span>
        <span class="history-month-best-score" ${uiStyle(`color:${GRADE(best.data.score,best.data.max).c}`)}>${best.data.score} · ${GRADE(best.data.score,best.data.max).l}</span>
      </div>`:""}
      ${nav(1,"›",canFwd)}
    </div>
    <div class="card history-month-card ${Math.ceil(cells.length/7)>=6?"history-month-card--six-weeks":""}">
      <div class="month-weekdays" ${uiStyle(`display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:7px`)}>
        ${["S","M","T","W","T","F","S"].map(d=>`<div ${uiStyle(`text-align:center;font-size:13px;color:#9a9ab2;letter-spacing:.06em`)}>${d}</div>`).join("")}
      </div>
      <div class="month-days" ${uiStyle(`display:grid;grid-template-columns:repeat(7,1fr);gap:5px`)}>
        ${cells.map(c=>{
          if(!c)return`<div></div>`;
          const isT=c.key===tk, future=c.key>tk;
          const dg=c.data?GRADE(c.data.score,c.data.max):null;
          if(future)return`<div class="month-day" ${uiStyle(`height:102px;border-radius:9px;border:1px dashed #101020;display:flex;align-items:flex-start;justify-content:flex-start;padding:2px 0 0 5px;box-sizing:border-box`)}><span ${uiStyle(`font-size:11px;line-height:1;color:#22223a`)}>${c.day}</span></div>`;
          return`<div class="month-day" role="button" tabindex="0" aria-label="Open ${c.key}" ${ui('click','openEditDay' ,c.key)} ${ui('keydown','activate')} title="${c.key}" ${uiStyle(`position:relative;height:102px;border-radius:9px;background:${c.data?dg.c+"18":"#0a0a14"};border:1.5px solid ${isT?(dg?dg.c:"#e2e2e2")+"66":c.data?dg.c+"28":"#111120"};display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer`)}>
            <span ${uiStyle(`position:absolute;top:2px;left:5px;font-size:13px;line-height:1;color:${c.data?dg.c+"88":"#8a8aa0"}`)}>${c.day}</span>
            ${c.data?`<span class="month-grade" ${uiStyle(`font-family:'Bebas Neue';font-size:23px;color:${dg.c};line-height:1;margin-top:9px`)}>${esc(dg.l)}</span><span class="month-score" ${uiStyle(`font-size:15px;color:#9a9ab2;line-height:1.2`)}>${c.data.score}</span>`:`<span ${uiStyle(`font-size:20px;color:#9a9ab2;margin-top:7px`)}>+</span>`}
          </div>`;
        }).join("")}
      </div>
    </div>
  </div>`;
}

function renderHistYear(){
  const days=getDays(365),months={};
  days.forEach(d=>{const mk=d.date.toLocaleDateString("en",{month:"long",year:"numeric"});if(!months[mk])months[mk]=[];months[mk].push(d);});
  const filled=Object.entries(months).filter(([,md])=>md.some(d=>d.data||d.key===todayKey()));
  if(!filled.length)return`<div ${uiStyle(`text-align:center;padding:48px 24px;color:#a2a2b6;font-size:15px;line-height:1.6`)}>No days logged this year yet.</div>`;
  return`<div ${uiStyle(`display:flex;flex-direction:column;gap:14px`)}><div class="sec">YEAR CALENDAR</div>
    ${filled.reverse().map(([month,mdays])=>{
      const ma=avgW(mdays),mg=ma>0?GRADE(ma,100):null;
      return`<div class="card">
        <div ${uiStyle(`display:flex;justify-content:space-between;align-items:center;margin-bottom:14px`)}>
          <div ${uiStyle(`font-size:15px;color:#aaaabe;text-transform:uppercase;letter-spacing:0.12em`)}>${month}</div>
          ${mg?`<div ${uiStyle(`font-family:'Bebas Neue';font-size:17px;color:${mg.c}`)}>AVG ${ma}%</div>`:""}
        </div>
        <div ${uiStyle(`display:flex;flex-wrap:wrap;gap:4px`)}>
          ${mdays.map(({key,data})=>{
            const dg=data?GRADE(data.score,data.max):null,isT=key===todayKey(),tgr=GRADE(calcScore(todayKey()).score);
            return`<div role="button" tabindex="0" aria-label="Open ${key}" ${ui('click','openEditDay' ,key)} ${ui('keydown','activate')} title="${data?`${key}: ${data.score}%`:key}" ${uiStyle(`width:24px;height:24px;border-radius:6px;background:${data?dg.c+"20":"#090914"};border:1px solid ${isT?(dg?dg.c:tgr.c)+"66":data?dg.c+"28":"#111120"};display:flex;align-items:center;justify-content:center;cursor:pointer`)}>
              ${data?`<span ${uiStyle(`font-family:'Bebas Neue';font-size:15px;color:${dg.c}`)}>${esc(dg.l)}</span>`:`<span ${uiStyle(`font-size:14px;color:#9a9ab2`)}>·</span>`}
            </div>`;
          }).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

// Session presentation only; daily checks and linked Day Log writes stay in the existing engine.
let routineDialogReturnId=null;
function routineState(s){return s.running?'Active':s.paused?'Paused':'Ready';}
function routineTime(secs){return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;}
function routineDialogSync(){
  let dialog=document.getElementById('cr-dialog');
  if(!USER||!routineView||!routineId||!S()||settingsOpen||editDayKey){
    if(dialog){dialog.close();dialog.remove();
      const id=routineDialogReturnId;setTimeout(()=>document.querySelector(`[data-routine-card="${CSS.escape(id||'')}"] button`)?.focus(),0);}
    return;
  }
  if(!dialog){
    routineDialogReturnId=routineId;
    dialog=document.createElement('dialog');dialog.id='cr-dialog';dialog.className='cr-dialog';
    dialog.setAttribute('aria-labelledby','cr-title');document.body.appendChild(dialog);
    dialog.addEventListener('cancel',e=>{e.preventDefault();exitRoutine();});
    // Escape is handled above even when the browser dispatches its cancel event.
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();const menu=dialog.querySelector('.cr-session-menu[open]');if(menu){menu.open=false;menu.querySelector('summary')?.focus();}else exitRoutine();}});
    dialog.addEventListener('click',e=>{const menu=dialog.querySelector('.cr-session-menu[open]');if(menu&&!menu.contains(e.target))menu.open=false;});
  }
  const action=dialog.contains(document.activeElement)?document.activeElement.getAttribute('data-ui-click'):null;
  uiHTML(dialog,renderRoutine());
  placeRoutineControls(dialog);
  if(!dialog.open)dialog.showModal();
  (action?dialog.querySelector(`[data-ui-click="${action}"]`):null)?.focus();
  if(!dialog.contains(document.activeElement))dialog.querySelector('[autofocus]')?.focus();
}
// Mobile keeps one set of controls in a fixed bottom row; desktop keeps them by the timer.
function placeRoutineControls(dialog=document.getElementById('cr-dialog')){
 if(!dialog)return;
 const controls=dialog.querySelector('.cr-controls'),current=dialog.querySelector('.cr-current');if(!controls||!current)return;
 let dock=dialog.querySelector('.cr-bottom-dock');
 if(window.innerWidth<=879){if(!dock){dock=document.createElement('div');dock.className='cr-bottom-dock';dialog.append(dock);}dock.append(controls);}
 else{current.append(controls);dock?.remove();}
}
window.addEventListener('resize',()=>placeRoutineControls());
function renderRoutine(){
  const rt=ROUTINES[routineId],s=S();if(!rt||!s)return '';
  const index=s.q[0],step=rt.steps[index];if(!step)return '';
  const done=Object.keys(s.done).length;
  return `<header class="cr-header"><div><h2 id="cr-title">${esc(rt.icon)} ${esc(rt.label)}</h2></div><div class="cr-header-actions"><details class="cr-session-menu"><summary aria-label="Routine options" title="Routine options">⋯</summary><div class="cr-session-menu-panel"><button type="button" ${ui('click','routineFinishEarly',routineId)}>Finalizar antes</button></div></details><button ${ui('click','exitRoutine')} aria-label="Close routine">✕</button></div></header>
    <div class="cr-body"><section class="cr-current"><div class="cr-step-label" role="status">STEP ${done+1} / ${rt.steps.length}${step.isBreak?' · BREAK':step.ses!==undefined?' · SESSION '+esc(step.ses):''}</div><h3><span class="cr-step-icon">${esc(step.icon)}</span>${esc(step.label)}</h3><div class="cr-timer-row"><button class="cr-reset" aria-label="Reset Step" title="Reset Step" ${ui('click','routineReset')}>↺</button><div class="cr-timer-face"><svg viewBox="0 0 220 220" aria-hidden="true"><circle class="cr-timer-track" cx="110" cy="110" r="96"/><circle id="timer-ring" class="cr-timer-progress" cx="110" cy="110" r="96" stroke-dasharray="${2*Math.PI*96}" stroke-dashoffset="${2*Math.PI*96*(1-s.secs/(step.dur*60))}"/></svg><div class="cr-timer-center"><div id="timer-clock" class="cr-clock" role="timer" aria-live="off">${routineTime(s.secs)}</div><span>REMAINING</span></div></div></div><div class="cr-controls"><button autofocus class="cr-primary" aria-label="${s.running?'Pause':s.paused?'Resume':'Start Step'}" ${ui('click','routineToggle')}>${s.running?'Ⅱ Pause':s.paused?'▶ Resume':'▶ Start Step'}</button><button ${ui('click','routineNext',routineId,index)}>${s.q.length===1?'Finish Routine':'Next →'}</button></div></section>
    <section class="cr-sequence" aria-label="Session steps"><ol>${s.q.map((idx,i)=>`<li ${i===0?'aria-current="step"':''}><span>${esc(rt.steps[idx].icon)} ${esc(rt.steps[idx].label)}</span><span>${rt.steps[idx].dur}m</span></li>`).join('')}${Object.keys(s.done).map(idx=>`<li class="cr-step-done"><span>✓ ${esc(rt.steps[idx]?.label)}</span></li>`).join('')}</ol></section></div>`;
}

function setTab(t){resetDayRequest=null;currentTab=t;_lastY=0;tuckNav(false);render();}
function setHistTab(t){histTab=t;if(t==="month"&&!histMonth)histMonth=todayKey().slice(0,7);render();}
function monthShift(ym,d){let[y,m]=ym.split('-').map(Number);m+=d;while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}return`${y}-${String(m).padStart(2,'0')}`;}
function histMonthShift(d){
  const now=todayKey().slice(0,7);
  const next=monthShift(histMonth||now,d);
  histMonth=next>now?now:next;        // never past the current month
  haptic(9);render();
}
// Real calendar month: leading blanks so weekdays line up, one cell per real day.
function monthGrid(ym){
  const[y,m]=ym.split('-').map(Number);
  const dim=new Date(Date.UTC(y,m,0)).getUTCDate();
  const lead=new Date(Date.UTC(y,m-1,1)).getUTCDay();
  const out=[];
  for(let i=0;i<lead;i++)out.push(null);
  for(let d=1;d<=dim;d++){const key=`${ym}-${String(d).padStart(2,'0')}`;out.push({key,day:d,data:getDayRecord(key)});}
  return out;
}
function isRoutineItem(id,key){const C=cfgForDate(key);return halfCreditItem(id)||[...C.L1,...C.L2,...C.L3].some(i=>i.id===id&&i.routine);}
// Tap-cycle for routine habits: none → light (½ pts) → full → none.
// Everything else keeps the plain boolean toggle it always had.
function toggleHabit(id,key){
  haptic(10);const ch={...getChecked(key)};
  if(id==='sleep' && key===todayKey()){
    // Wake Up and Sleep Early is a three-step point-event cycle:
    // none → WAKE (½ credit) → SLEEP (full credit) → none. The first tap logs wake;
    // the second tap logs sleep and upgrades the habit to full credit.
    dayLogNormalizeSleepWake(key);
    const evs=dayLogEvents(key).filter(e=>e.type==='habit'&&e.sourceId==='sleep');
    const hasWake=evs.some(e=>e.meta?.sleepRole==='wake');
    const hasSleep=evs.some(e=>e.meta?.sleepRole==='sleep');
    if(!hasWake){
      ch[id]=0.5;setChecked(key,ch);persistDay(key);dayLogSyncCompletion(id,key,0.5);
    }else if(!hasSleep){
      ch[id]=true;setChecked(key,ch);persistDay(key);dayLogSyncCompletion(id,key,true);
    }else{
      ch[id]=false;setChecked(key,ch);persistDay(key);dayLogSyncCompletion(id,key,false);
    }
    renderDayChange(key);return;
  }
  if(isRoutineItem(id,key)){const v=ch[id];ch[id]=!v?0.5:(v===0.5?true:false);}
  else ch[id]=!ch[id];
  setChecked(key,ch);persistDay(key);
  dayLogSyncCompletion(id,key,ch[id]);
  renderDayChange(key);
}
// Explicit set (used by the LIGHT/FULL/CLEAR buttons on routine cards).
function setHabitState(id,key,v){
  haptic(10);const ch={...getChecked(key)};ch[id]=v;setChecked(key,ch);persistDay(key);
  dayLogSyncCompletion(id,key,v);
  if(key===todayKey()){
    // Completing Today also ends its timer; historical edits never touch live sessions.
    if(v===true&&sessions[id]&&id!=='work')endRoutineSession(id,true);
  }
  renderDayChange(key);
}
// One tap ticks (or clears) every habit in a level, combo sub-items included.
function toggleLevelAll(lv,key){
  const C=cfgForDate(key), items=lv===1?C.L1:lv===2?C.L2:(coreLayoutFor(key)?C.L3.filter(i=>!i.combo):C.L3);
  if(!items.length)return;
  const before={...getChecked(key)},ch={...before};
  const v=!items.every(i=>ch[i.id]===true);
  let soc=null;
  for(const i of items){ ch[i.id]=v; if(i.combo){soc={};for(const x of C.subs)soc[x.id]=v;} }
  haptic(v?18:10);
  setChecked(key,ch); if(soc)setSocial(key,soc);
  dayLogSyncChangedCompletions(key,before);
  persistDay(key); renderDayChange(key);
}
function quickComplete(id){haptic(18);const k=todayKey(),ch={...getChecked(k)};ch[id]=true;setChecked(k,ch);persistDay(k);dayLogSyncCompletion(id,k,true);renderDayChange(k);}
// Antes un toque marcaba las cuatro partes a la vez — 24 puntos por decir que hoy
// hiciste todo lo social. Ahora el toque abre la lista y cada parte se marca aparte.
function handleSocial(key){ haptic(10); socialExpanded=!socialExpanded; renderDayChange(key); }
function toggleSocialExpand(key){socialExpanded=!socialExpanded;renderDayChange(key);}
function toggleSub(id,key){
  haptic(8);
  const before={...getChecked(key)};
  const soc={...getSocial(key)};soc[id]=!soc[id];setSocial(key,soc);
  // Una sola persona en esta parte = no hay a quien elegir: se marca sola.
  // Con dos o mas, decide el usuario. Al apagar la parte se sueltan sus personas.
  const mine=visiblePeople().filter(x=>x.sub===id);
  let ppl=getPeople(key);
  if(soc[id]){ if(mine.length===1&&!ppl.includes(mine[0].id))ppl=ppl.concat([mine[0].id]); }
  else ppl=ppl.filter(pid=>!peopleList().some(x=>x.id===pid&&x.sub===id));
  setPeople(key,ppl);
  const ch={...getChecked(key)};ch.social=Object.values(soc).some(Boolean);setChecked(key,ch);
  dayLogSyncChangedCompletions(key,before);
  persistDay(key);renderDayChange(key);
}
function resetDay(key){
  haptic([30,40,30]);resetDayRequest=null;
  if(key===todayKey()){
    // Stop timers without recording a final event that would refill the day.
    for(const id of Object.keys(sessions))closeRoutine(id);
    productEndId=null;window.__dayLogActive=null;window.__dayLogSelectedId=null;window.__dayLogPanelMode='edit';
  }
  _state[key]={checks:{},social:blankSocial(),note:'',people:[],_daylog:[]};
  // Persist the empty cache and enqueue deletion through the existing owner-bound
  // offline protocol, so reload/reconnect cannot replay the earlier day snapshot.
  dayLogSaveLocal(key);persistDay(key);renderDayChange(key);
}
function openEditDay(key){editDayKey=key;socialExpanded=false;render();}
function closeEditDay(){editDayKey=null;socialExpanded=false;render();}

// ═══ Routine engine — independent, concurrent sessions ═══════
// sessions[id] = {q:[stepIdx], done:{}, secs, running, endAt}
// routineId = which session is currently OPEN on screen (null = none)
function newSession(id){
  return {q:ROUTINES[id].steps.map((_,k)=>k),done:{},
          secs:ROUTINES[id].steps[0].dur*60,running:false,endAt:null,startedAt:null};
}
function S(id){return sessions[id||routineId]||null;}
function anyRunning(){return liveSessions().some(id=>sessions[id].running);}
function liveSessions(){return Object.keys(sessions).filter(id=>ROUTINES[id]&&Array.isArray(sessions[id]?.q));}

// keep the legacy view-globals in sync so render code stays unchanged
function syncFromSession(){
  const s=S(); if(!s)return;
  routineQueue=s.q; routineCompleted=s.done;
  timerSecs=s.secs; timerRunning=s.running; timerEndAt=s.endAt;
}
function syncToSession(){
  const s=S(); if(!s)return;
  s.q=routineQueue; s.done=routineCompleted;
  s.secs=timerSecs; s.running=timerRunning; s.endAt=timerEndAt;
}

function startRoutine(id){
  const productWasOpen=!!document.getElementById('cr-dialog');
  const productOrigin=document.activeElement?.getBoundingClientRect?.();
  productEndId=null;
  if(!USER||!ROUTINES[id])return;
  if(!sessions[id])sessions[id]=newSession(id);   // resume if it already exists
  routineId=id; routineView=true;
  if(!sessions[id].startedAt)sessions[id].startedAt=dayLogNowISO();
  syncFromSession(); unlockAudio(); haptic(12);
  ensureTick(); saveRoutine(); render();
  const panel=document.getElementById('cr-dialog');
  if(!productWasOpen&&panel&&productOrigin&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
    const box=panel.getBoundingClientRect();
    panel.animate?.([{opacity:.15,transform:`translate(${productOrigin.left+productOrigin.width/2-box.left-box.width/2}px,${productOrigin.top+productOrigin.height/2-box.top-box.height/2}px) scale(.12)`},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
  }
}
function exitRoutine(){hideRoutine();}
function hideRoutine(){
  const panel=document.getElementById('cr-dialog'),from=panel?.getBoundingClientRect?.();
  const ghost=panel?.cloneNode?.(true);
  syncToSession();routineView=false;routineId=null;haptic(8);saveRoutine();render();
  const target=ghost&&document.querySelector('.cr-orb-button')?.getBoundingClientRect?.();
  if(ghost&&from&&target&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
    ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));ghost.setAttribute('aria-hidden','true');ghost.classList.add('product-minimizing');document.body.appendChild(ghost);
    const box=ghost.getBoundingClientRect();
    const animation=ghost.animate([{opacity:1,transform:'none'},{opacity:0,transform:`translate(${target.left+target.width/2-box.left-box.width/2}px,${target.top+target.height/2-box.top-box.height/2}px) scale(.08)`}],{duration:220,easing:'ease-in'});
    animation.onfinish=()=>ghost.remove();animation.oncancel=()=>ghost.remove();
  }
}
function resumeRoutine(id){
  if(!USER||!sessions[id]||!ROUTINES[id])return;
  startRoutine(id);if(S()&&!S().running)routineToggle();
}
function openRoutine(id){startRoutine(id);}
function reopenRoutine(id){startRoutine(id||liveSessions()[0]);}

// Discard just this session
function closeRoutine(id){
  const target=id||routineId; if(!target)return;
  delete sessions[target];
  if(routineId===target){routineId=null;routineView=false;routineQueue=[];routineCompleted={};timerSecs=0;timerRunning=false;timerEndAt=null;}
  if(!anyRunning())audioKeepAlive(false);
  if(!liveSessions().length&&timerInterval){clearInterval(timerInterval);timerInterval=null;}
  saveRoutine(); render();
}
// End a single session without altering daily credit. Early sessions are independent
// log entries so later check/uncheck actions cannot overwrite their recorded time.
function endRoutineSession(id,completed=false){
  const session=sessions[id],rt=ROUTINES[id];if(!session||!rt)return false;
  const end=dayLogNowISO(),start=session.startedAt||end;
  if(completed){
    const key=todayKey(),old=dayLogFindLinked('routine',id,key);
    if(old){old.start=start;old.end=end;old.meta={...(old.meta||{}),completed:true,light:false};dayLogPersist(key);}
    else dayLogAdd(rt.label,start,end,'routine',id,{meta:{completed:true}});
  }else{
    dayLogAdd(rt.label+' · incompleta',start,end,'routine',null,{meta:{completed:false,endedEarly:true,routineId:id}});
  }
  closeRoutine(id);return true;
}
function finishRoutineEarly(id=routineId){
  if(!USER||!endRoutineSession(id,false))return;
  haptic(10);setTab('today');
}
function finishRoutine(){
  const id=routineId; haptic([40,60,120]); chime(3);
  const s=S(id),end=dayLogNowISO(),start=s?.startedAt||end;
  closeRoutine(id);
  if(id){
    quickComplete(id);
    const key=todayKey(),old=dayLogFindLinked('routine',id,key);
    if(old){old.start=start;old.end=end;old.meta={...(old.meta||{}),completed:true};dayLogPersist(key);}
    else dayLogAdd(ROUTINES[id]?.label||id,start,end,'routine',id,{completed:true});
  }
  setTab('today');
}

// ── One interval drives every running session ──
function ensureTick(){
  if(!USER||timerInterval)return;
  const owner=USER.id,epoch=_syncEpoch;
  const interval=setInterval(()=>{
    // clearInterval cannot revoke a callback already queued by the browser.
    // Retire only this timer; a newer account may already have started another.
    if(USER?.id!==owner||_syncEpoch!==epoch){
      clearInterval(interval);if(timerInterval===interval)timerInterval=null;return;
    }
    let dirty=false;
    for(const id of liveSessions()){
      const s=sessions[id];
      if(!s.running||!s.endAt)continue;
      s.secs=Math.max(0,Math.round((s.endAt-Date.now())/1000));
      if(s.secs<=0){s.running=false;s.endAt=null;alertStepDone();advanceSession(id);dirty=true;}
    }
    if(!anyRunning())audioKeepAlive(false);
    syncFromSession();
    if(dirty){saveRoutine();render();}
    else{
      // the open runner AND any background pills both need refreshing
      if(routineId&&routineView)renderRoutineTimer();
      updateResumeClock();
    }
  },250);
  timerInterval=interval;
}
function advanceSession(id){
  const s=sessions[id],rt=ROUTINES[id];
  if(!s||!rt||!Array.isArray(s.q)||!s.q.length||s.q.some(i=>!rt.steps[i]))return;
  s.done[s.q[0]]=true; s.q=s.q.slice(1);
  s.secs=s.q.length?ROUTINES[id].steps[s.q[0]].dur*60:0;
  s.running=false; s.paused=false; s.endAt=null;
  if(!s.q.length){
    const end=dayLogNowISO(),start=s.startedAt||end,key=todayKey();
    quickComplete(id);
    const old=dayLogFindLinked('routine',id,key);
    if(old){old.start=start;old.end=end;old.meta={...(old.meta||{}),completed:true};dayLogPersist(key);}
    else dayLogAdd(ROUTINES[id]?.label||id,start,end,'routine',id,{completed:true});
    delete sessions[id];
    if(routineId===id){routineId=null;routineView=false;routineQueue=[];routineCompleted={};timerSecs=0;timerRunning=false;timerEndAt=null;}
  }
}

function routineToggle(){
  const s=S(); if(!s)return;
  unlockAudio(); haptic(12);
  s.running=!s.running;s.paused=!s.running;
  if(s.running){s.endAt=Date.now()+s.secs*1000;ensureTick();audioKeepAlive(true);}
  else{s.secs=Math.max(0,Math.round((s.endAt-Date.now())/1000));s.endAt=null;if(!anyRunning())audioKeepAlive(false);}
  syncFromSession(); saveRoutine(); render();
}
function routineReset(){
  const s=S(); if(!s)return;
  haptic(12); s.running=false; s.paused=false; s.endAt=null;
  if(s.q.length)s.secs=ROUTINES[routineId].steps[s.q[0]].dur*60;
  if(!anyRunning())audioKeepAlive(false);
  syncFromSession(); saveRoutine(); render();
}
function routineNext(id=routineId,expected=S(id)?.q[0]){
  const s=S(id);if(id!==routineId||!s||!s.q.length||s.q[0]!==expected)return;
  advanceSession(id);
  const next=S(id);
  if(next){next.running=true;next.paused=false;next.endAt=Date.now()+next.secs*1000;unlockAudio();ensureTick();audioKeepAlive(true);}
  syncFromSession();
  if(!anyRunning())audioKeepAlive(false);
  saveRoutine(); render();
}
function routineSendToEnd(){
  const s=S(); if(!s||s.q.length<2)return;
  haptic(12); s.q=[...s.q.slice(1),s.q[0]];
  s.running=false; s.paused=false; s.endAt=null; s.secs=ROUTINES[routineId].steps[s.q[0]].dur*60;
  syncFromSession(); saveRoutine(); render();
}
function updateResumeClock(){
  for(const id of liveSessions()){
    const c=document.getElementById("resume-clock-"+id),s=sessions[id];
    if(!s)continue;
    if(c)c.textContent=routineTime(s.secs);
    for(const clock of document.querySelectorAll(`[data-routine-clock="${CSS.escape(id)}"]`))clock.textContent=routineTime(s.secs);
  }
}
function renderRoutineTimer(){
  const rt=ROUTINES[routineId];if(!rt)return;
  const current=routineQueue[0]!==undefined?rt.steps[routineQueue[0]]:null;
  if(!current)return;
  const mins=Math.floor(timerSecs/60),secs=timerSecs%60;
  const clock=document.getElementById('timer-clock');
  if(clock)clock.textContent=`${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
  const ring=document.getElementById('timer-ring');
  if(ring){
    const r=96,c=2*Math.PI*r,pct=timerSecs/(current.dur*60);
    ring.setAttribute('stroke-dashoffset',c*(1-pct));
  }
}

function tabsOrder(){ return socialOwnTab()?["today","log","social","stats","history"]:["today","log","stats","history"]; }
let touchStartX=0,touchStartY=0;
document.addEventListener("touchstart",e=>{touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;},{passive:true});
document.addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].clientX-touchStartX,dy=e.changedTouches[0].clientY-touchStartY;
  if(Math.abs(dx)<50||Math.abs(dy)>Math.abs(dx)*0.8)return;
  if(dx>0){if(settingsOpen){closeSettings();return;}if(editDayKey){closeEditDay();return;}if(routineId&&routineView){exitRoutine();return;}}
  if((routineId&&routineView)||editDayKey||settingsOpen)return;
  const T=tabsOrder(), idx=T.indexOf(currentTab);
  if(dx<0&&idx<T.length-1)setTab(T[idx+1]);
  if(dx>0&&idx>0)setTab(T[idx-1]);
},{passive:true});

// Production Social/Core config migration v1. Pure, versioned, idempotent, never edits day rows.
function upgradeShaahSocialCoreConfig(input,from,owner){
  const c=JSON.parse(JSON.stringify(input));
  if(c.shaahSocialCoreMigration?.version>=1)return {config:c,changed:false};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!owner)throw Error('Migration requires date and owner');
  const log=c.log||[];
  if(log.some((e,i)=>!/^\d{4}-\d{2}-\d{2}$/.test(e.from)||(i>0&&e.from<=log[i-1].from)))throw Error('Configuration timeline needs review before migration');
  const restored=[];
  for(const p of c.people||[]){if(p.inactive===true){p.every=180;restored.push(p.id);}delete p.inactive;}
  c.socialRules={...(c.socialRules||{}),romanticLimit:Number.isInteger(c.socialRules?.romanticLimit)&&c.socialRules.romanticLimit>=1?c.socialRules.romanticLimit:1};
  // Seal the exact old rules, not reconstructed defaults, before changing Work.
  if(!log.length)log.push({from:'0001-01-01',h:JSON.parse(JSON.stringify(c.h)),order:[...c.order],subs:JSON.parse(JSON.stringify(c.subs||[])),mode:'work'});
  let era=log[0];for(const e of log){if(e.from<=from)era=e;else break;}
  if(era.from>from)throw Error('Timeline has no baseline for migration');
  if(era.from!==from){era={...JSON.parse(JSON.stringify(era)),from};log.push(era);log.sort((a,b)=>a.from.localeCompare(b.from));}
  const update=h=>{if(h.work){h.work.p=25;h.work.pWork=25;h.work.routine=true;}};
  for(const e of log)if(e.from>=from)update(e.h);
  update(c.h);c.log=log;
  c.routines={...(c.routines||{}),work:{label:'Work',icon:'💼',col:'#e2e2e2',steps:[{id:'w400',label:'₪400 · +10 pts',dur:1},{id:'w650',label:'₪650 · +10 pts',dur:1},{id:'w800',label:'₪800+ · +5 pts',dur:1}]}};
  c.shaahSocialCoreMigration={version:1,effectiveFrom:from,owner,restoredIds:restored};
  return {config:c,changed:true};
}
function runShaahSocialCoreMigration(){
  if(!USER||!_cfgReady||_cfgConflict||SUPABASE_URL!=='https://llpyxktcfubhmthqujpa.supabase.co')return false;
  try{
    const result=upgradeShaahSocialCoreConfig(CFG,todayKey(),USER.id);
    if(!result.changed)return false;
    bakBefore(CFG);CFG=result.config;_dayCfgCache={};saveCfg();return true;
  }catch(e){_cfgSaveFailed=true;console.error('Social/Core migration paused:',e.message);return false;}
}
function coreLayoutFor(key){return !!CFG.shaahSocialCoreMigration&&key>=CFG.shaahSocialCoreMigration.effectiveFrom;}
function workPhaseSet(key,phase){
  if(!coreLayoutFor(key)||!Number.isInteger(phase)||phase<0||phase>workMilestonesFor(key).length||!workMilestonesFor(key).length||cfgForDate(key).inVacation)return;
  const item=cfgForDate(key).L1.find(i=>i.id==='work');if(!item)return;
  const phases=workMilestonesFor(key);
  setHabitState('work',key,phase===0?false:phase===phases.length?true:phases[phase-1][2]);
}

// Social integration: same CFG.people and day logs, no new scoring model.
var socialView='register',socialQuery='',socialDraft=null,socialFormError='';
function socialViewSet(view){
  if(!['register','people','groups','combo','categories'].includes(view))return;
  socialView=view;socialQuery='';socialDraft=null;socialFormError='';bulkPeopleSelection=[];render();
}
function socialManage(){settingsOpen=false;currentTab='social';socialViewSet('register');}
function socialLast(id){return Object.keys(_state).filter(k=>DATE_RE.test(k)&&k<=todayKey()&&getPeople(k).includes(id)).sort().pop()||'';}
function socialSearch(value){
  socialQuery=String(value).slice(0,80);
  const box=document.getElementById('social-search-results');
  if(box)uiHTML(box,socialSearchRows(socialKeyForView()));
}
function socialKeyForView(){return editDayKey|| (currentTab==='social'?socialKey():todayKey());}
function socialButton(label,action,args=[],primary=false){return `<button type="button" class="sf-button${primary?' sf-primary':''}" ${ui('click',action,...args)}>${label}</button>`;}
function socialPersonButton(p,key){const on=getPeople(key).includes(p.id);return `<button type="button" class="sf-button${on?' sf-selected':''}" aria-pressed="${on}" ${ui('click','socialRecord',p.id,key)}>${on?'✓ ':''}${esc(p.name)}</button>`;}
function socialSearchRows(key){
  if(!socialQuery.trim())return '';
  const q=socialQuery.trim().toLocaleLowerCase();
  const list=peopleList().filter(p=>String(p.name).toLocaleLowerCase().includes(q));
  return list.map(p=>`<div class="sf-person"><div>${esc(p.name)}<div class="sf-muted">${p.inactive?'En pausa · ':''}${socialPlaces(p)}</div></div>${socialPersonButton(p,key)}</div>`).join('')||'<p class="sf-muted">No se encontró a nadie. Usa «Alguien nuevo».</p>';
}
function socialPlaces(p){return personLocations(p).map(id=>esc(locationGroups().find(g=>g.id===id)?.name)).join(' · ')||'Todos los lugares';}
function socialCapture(key,compact=false){
  if(socialDraft&&socialDraft.key===key)return socialEditor();
  const recent=peopleList().filter(p=>!p.inactive).sort((a,b)=>socialLast(b.id).localeCompare(socialLast(a.id))).slice(0,compact?4:8);
  const seen=peopleList().filter(p=>getPeople(key).includes(p.id));
  return `<section class="sf-capture"><div class="sf-heading"><strong>¿Con quién te viste?</strong>${compact?socialButton('Abrir Social →','setTab',['social']):''}</div><div class="sf-muted">${compact?'Registra aquí el encuentro de este día.':'Toca un nombre para registrar el encuentro.'}</div>
    <div class="sf-buttons">${recent.map(p=>socialPersonButton(p,key)).join('')}${socialButton('+ Alguien nuevo','socialNew',[key],true)}</div>
    <label class="sf-field">Buscar cualquier persona<input id="social-search" type="search" maxlength="80" placeholder="Nombre, en cualquier grupo" value="${esc(socialQuery)}" ${ui('input','socialSearch')}></label><div id="social-search-results">${socialSearchRows(key)}</div>
    ${seen.length?`<div class="sf-muted">Registrados este día · ${seen.length}</div><div class="sf-buttons">${seen.map(p=>socialPersonButton(p,key)).join('')}</div>`:''}
  </section>`;
}
function socialNew(key,sub){
  const categories=subsOn(subsList());
  socialDraft={id:null,key,name:'',every:'',relationship:'friends',sub:sub||categories.find(s=>s.id==='friends')?.id||categories[0]?.id||'',locations:selectedLocation()==='all'?[]:[selectedLocation()]};socialFormError='';renderDayChange(key);
}
function socialEdit(id){const p=personById(id);if(!p)return;socialDraft={...p,sub:socialCategory(p),locations:[...(p.locations||[])],key:socialKeyForView()};socialFormError='';render();}
function socialDraftField(field,value){if(!socialDraft||!['name','every','sub','relationship'].includes(field))return;socialDraft[field]=value;}
function socialDraftLocation(id,on){if(!socialDraft||!locationGroups().some(g=>g.id===id))return;socialDraft.locations=on?[...new Set([...socialDraft.locations,id])]:socialDraft.locations.filter(x=>x!==id);}
function socialCancel(){socialDraft=null;socialFormError='';render();}
function socialSave(){
  const d=socialDraft;if(!d)return;
  const name=String(d.name||'').trim().slice(0,40),every=Number(d.every);
  if(!name||!Number.isInteger(every)||every<1||every>3650||(d.sub!=='family'&&!socialCategories().some(s=>s.id===d.sub)&&!(d.id&&socialCategory(personById(d.id)||{})===d.sub))){
    socialFormError='Completa el nombre, la frecuencia (1–3650 días) y una categoría activa.';render();return;
  }
  let p=d.id?personById(d.id):null;
  if(d.id&&!p){socialCancel();return;}
  if(d.sub==='flirt'&&p?.sub!=='flirt'&&peopleList().filter(x=>x.sub==='flirt').length>=socialRomanticLimit()){socialFormError=(subsList().find(s=>s.id==='flirt')?.label||'Flirting')+' alcanzó el límite. Cambia la categoría de otra persona o aumenta el límite en Settings.';render();return;}
  const fresh=!p;
  if(fresh){let id;do{id='p'+Math.random().toString(36).slice(2,10);}while(personById(id));p={id};peopleList().push(p);}
  // Keep unknown location references so editing cannot silently lose legacy data.
  Object.assign(p,{name,every,sub:d.sub,relationship:d.sub==='family'?'family':d.sub==='flirt'?'romantic':socialCategories().some(s=>s.id===d.sub)?'friends':(p.relationship||d.relationship||'friends'),locations:[...d.locations]});
  const key=d.key;socialDraft=null;socialFormError='';saveCfg();
  if(fresh&&key)socialRecord(p.id,key);else render();
}
function socialEditor(){
  const d=socialDraft;if(!d)return '';
  const history=d.id?Object.keys(_state).filter(k=>DATE_RE.test(k)&&getPeople(k).includes(d.id)).sort().reverse():[];
  return `<section class="card sf-editor"><div class="sf-heading"><strong>${d.id?'Editar persona':'Alguien nuevo'}</strong>${socialButton('Cancelar','socialCancel')}</div>
    ${socialFormError?`<p role="alert">${esc(socialFormError)}</p>`:''}
    <label class="sf-field">Nombre<input id="sf-name" maxlength="40" value="${esc(d.name)}" ${ui('input','socialDraftName')}></label>
    <label class="sf-field">Verlo cada cuántos días<input id="sf-every" type="number" min="1" max="3650" step="1" placeholder="7 = semanal · 30 = mensual" value="${esc(d.every)}" ${ui('input','socialDraftEvery')}></label>
    <label class="sf-field">Categoría<select id="sf-sub" ${ui('change','socialDraftSub')}>${socialCategories().map(s=>`<option value="${esc(s.id)}" ${d.sub===s.id?'selected':''}>${esc(s.label)}</option>`).join('')}${!socialCategories().some(s=>s.id===d.sub)?`<option value="${esc(d.sub)}" selected>${d.sub==='family'?'Family':esc(d.sub)+' · categoría anterior'}</option>`:''}</select></label>

    <fieldset class="sf-locations"><legend>Lugares</legend>${locationGroups().map(g=>`<label><input type="checkbox" ${d.locations.includes(g.id)?'checked':''} ${ui('change','socialDraftLocation',g.id)}> ${esc(g.name)}</label>`).join('')||'<span class="sf-muted">Puedes crear lugares desde Social → Grupos.</span>'}<div class="sf-muted">Sin lugares asignados: aparece en todos.</div></fieldset>
    ${socialButton(d.id?'Guardar cambios':d.key?'Guardar y registrar encuentro':'Guardar persona','socialSave',[],true)}
    ${d.id?`<h3>Encuentros registrados · ${history.length}</h3><div class="sf-muted">${history.map(esc).join(' · ')||'Sin encuentros todavía.'}</div>`:`<p class="sf-muted">Se registra el encuentro del ${esc(d.key)} en Today y Social.</p>`}
  </section>`;
}
var socialDirectoryQuery='',socialDirectoryGroup='all',socialDirectoryCategory='all';
function socialDirectorySet(field,value){
  if(field==='query')socialDirectoryQuery=String(value).slice(0,80);
  else if(field==='group')socialDirectoryGroup=value;
  else if(field==='category')socialDirectoryCategory=value;
  const box=document.getElementById('social-directory-results');if(box)uiHTML(box,socialDirectoryRows());
}
function socialDirectoryRows(){
 const q=socialDirectoryQuery.toLocaleLowerCase();
 const list=peopleList().filter(p=>String(p.name).toLocaleLowerCase().includes(q)&&(socialDirectoryGroup==='all'||personLocations(p).includes(socialDirectoryGroup))&&(socialDirectoryCategory==='all'||p.sub===socialDirectoryCategory));
 return list.map(p=>socialTile(p,socialKeyForView(),true)).join('')||'<p class="sf-muted">Sin resultados.</p>';
}
var socialDirectoryView='people';
function socialDirectoryToggle(){
 socialDirectoryView=socialDirectoryView==='people'?'groups':'people';
 const groups=socialDirectoryView==='groups';
 const button=document.getElementById('social-directory-toggle');
 if(button){button.textContent=groups?'People':'Groups';button.setAttribute('aria-pressed',String(groups));}
 const people=document.getElementById('social-directory-results');
 const panel=document.getElementById('social-groups-view');
 if(people)people.hidden=groups;
 if(panel)panel.hidden=!groups;
}
var socialPeopleOpen=false;
var socialBulkOpen=false;
var socialFamilyIncluded=true;
function socialPeople(){return `<section class="card sf-people-box" aria-label="People & Groups"><button type="button" class="sec sf-people-toggle" aria-expanded="${socialPeopleOpen}" ${ui('click','socialPeopleToggle')}>${socialPeopleOpen?'▾':'▸'} People &amp; Groups <span>${peopleList().length}</span></button><div class="sf-reveal${socialPeopleOpen?' is-open':''}" aria-hidden="${!socialPeopleOpen}" ${socialPeopleOpen?'':'inert'}><div class="sf-reveal-inner"><div class="sf-heading sf-directory-actions">${socialButton('+ Persona','socialNew',[''],true)}<button type="button" id="social-directory-toggle" class="sf-button" aria-controls="social-directory-results social-groups-view" aria-pressed="${socialDirectoryView==='groups'}" ${ui('click','socialDirectoryToggle')}>${socialDirectoryView==='groups'?'People':'Groups'}</button></div><div class="sf-directory-filters"><label class="sf-field">Buscar<input type="search" value="${esc(socialDirectoryQuery)}" ${ui('input','socialDirectorySearch')}></label><label class="sf-field">Grupo<select ${ui('change','socialDirectoryGroup')}><option value="all">Todos</option>${locationGroups().map(g=>`<option value="${esc(g.id)}" ${socialDirectoryGroup===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label><label class="sf-field">Categoría<select ${ui('change','socialDirectoryCategory')}><option value="all">Todas</option>${socialCategories().map(g=>`<option value="${esc(g.id)}" ${socialDirectoryCategory===g.id?'selected':''}>${esc(g.label)}</option>`).join('')}</select></label></div><div id="social-directory-results" class="sf-directory" ${socialDirectoryView==='groups'?'hidden':''}>${socialDirectoryRows()}</div><div id="social-groups-view" ${socialDirectoryView==='groups'?'':'hidden'}>${socialGroups()}</div></div></div></section>`;}
function socialGroups(){return `<section class="card sf-groups"><div class="sec">GRUPOS</div><p class="sf-muted">Una persona puede pertenecer a varios grupos.</p><div class="sf-group-grid">${locationGroups().map(g=>{const count=peopleList().filter(p=>personLocations(p).includes(g.id)).length;return `<article class="sf-group-tile"><strong>${esc(g.name)}</strong><span class="sf-muted">${count} ${count===1?'persona':'personas'}</span>${socialButton('Renombrar','locationRename',[g.id])}</article>`;}).join('')}<button type="button" class="sf-button sf-group-add" ${ui('click','locationAdd')}>+ Añadir grupo</button></div><p class="sf-muted">El foco de grupo filtra sugerencias de Friends y Strangers; todos siguen disponibles para registrar encuentros.</p></section>`;}
function socialSuggestions(){
  const list=peopleStatus().filter(p=>p.days==null||p.overdue>=0);
  return `<div class="sec">A QUIÉN TE TOCA VER</div><div class="sf-grid">${list.map(p=>socialTile(p,socialKeyForView())).join('')||'<p class="sf-muted">Sin encuentros pendientes en este lugar.</p>'}</div>`;
}
function socialWorkspace(key){return `${socialDraft?socialEditor():''}<section aria-label="Who to See"><h2 class="sec">Who to See</h2>${socialDashboard(key)}</section><section aria-label="Social Combo"><h2 class="sec">Social Combo</h2>${socialComboPanel(key)}</section>${socialPeople()}`;}
function socialComboPanel(key){return comboBlock(key,true);}
// Discovery only: Family visibility never writes contacts, day records or scores.
function socialLocationControl(){return `<div class="sd-location-control"><div>${locationSelector()}</div><button type="button" class="sd-location-toggle" aria-label="Family" title="Include Family in Who to See" aria-pressed="${socialFamilyIncluded}" ${ui('click','socialFamilyToggle')}>Family</button></div>`;}
function socialDashboard(key){
 const list=socialSuggestionList();
 return `<div class="sd-toolbar">${socialLocationControl()}</div><section class="card sd-grid" aria-label="Contactos sugeridos">${list.map(p=>socialDenseContact(p,key)).join('')||'<p class="sf-muted">Sin contactos en este foco.</p>'}</section>`;
}
function socialSuggestionList(){
 const tk=todayKey(),loc=selectedLocation();
 return peopleList().filter(p=>socialIsFamily(p)?socialFamilyIncluded:(!['friends','strangers'].includes(p.sub)||loc==='all'||personLocations(p).length===0||personLocations(p).includes(loc))).map(p=>{
  const last=socialLast(p.id)||null,every=Math.max(1,Number(p.every)||14),days=last?Math.round((keyToDate(tk)-keyToDate(last))/86400000):null;
  return {...p,last,every,days,ratio:days==null?Infinity:days/every,overdue:days==null?Infinity:days-every};
 }).sort((a,b)=>b.ratio-a.ratio);
}
function socialTimePill(p){
 const every=Math.max(1,Number(p.every)||14);
 if(p.days==null)return {fill:0,color:'#8888a4',label:'—',description:'Sin encuentros registrados'};
 const overdue=Math.max(0,Number(p.days)||0)-every,remaining=-overdue;
 // Remaining days drain to zero; overdue days refill until one full interval late.
 const fill=Math.min(100,Math.abs(remaining)/every*100);
 const color=remaining>0?'#4ade80':overdue*10>every*4?'#ef4444':'#f59e0b';
 return {fill,color,label:remaining===0?'0d':(remaining>0?'+':'')+remaining+'d',description:remaining>0?'Próximo encuentro en '+remaining+' días':remaining===0?'Toca hoy':'Pendiente desde hace '+(-remaining)+' días'};
}
function socialDenseContact(p,key){
 const on=getPeople(key).includes(p.id),category=socialCategoryName(p),sub=subsList().find(s=>s.id===p.sub);
 const timing=socialTimePill(p);
 const timingTextColor={'#4ade80':'#a7f3c1','#f59e0b':'#ffe0a3','#ef4444':'#ffb7b7','#8888a4':'#c8c8dc'}[timing.color];
 const when=p.days==null?'Sin encuentros':p.days===0?'Hoy':p.days===1?'Ayer':'Hace '+p.days+' días';
 return `<div class="sd-contact${on?' sd-done':''}"><button class="sd-person" aria-pressed="${on}" aria-label="${on?'Deshacer encuentro con':'Registrar encuentro con'} ${esc(p.name)}" ${ui('click','socialRecord',p.id,key)}><span class="sd-icon" title="${esc(category)}">${on?'✓':esc(socialCategory(p)==='family'?'♧':sub?.icon||'◉')}</span><span class="sd-identity"><span class="w-name">${esc(p.name)}</span><span class="w-when">${when} <span class="sd-category">· ${esc(category)}</span></span></span><span class="sd-time-pill" aria-label="${esc(timing.description)}" ${uiStyle('color:'+timing.color)}><span class="sd-pill-fill" aria-hidden="true" ${uiStyle('width:'+timing.fill+'%;background:'+timing.color)}></span><span class="sd-pill-label" ${uiStyle("color:"+timingTextColor)}>${timing.label}</span></span></button><button class="sd-edit" aria-label="Editar ${esc(p.name)}" title="Editar persona" ${ui('click','socialEdit',p.id)}>✎</button></div>`;
}

function socialCategories(){return subsOn(subsList());}
function socialIsFamily(p){return p.sub==='family'||p.sub==='__family_pending'||p.relationship==='family';}
function socialCategory(p){return p.sub==='__family_pending'?'family':p.sub;}
function socialCategoryName(p){const id=socialCategory(p);return socialCategories().find(s=>s.id===id)?.label||id||'Sin categoría';}
function socialTile(p,key,manage=false){const on=getPeople(key).includes(p.id),last=socialLast(p.id);return `<article class="sf-tile${manage?' sf-managed':''}${on?' sf-seen':''}"><div class="sf-heading"><span class="sf-category">${esc(socialCategoryName(p))}</span>${socialButton('Editar','socialEdit',[p.id])}</div><strong class="sf-name">${esc(p.name)}</strong><div class="sf-muted">${last===todayKey()?'Visto hoy':last?'Último encuentro · '+esc(last):'Sin encuentros registrados'}<br>Cada ${p.every||14} días · ${socialPlaces(p)}</div>${manage?'':`<button class="sf-button${on?' sf-selected':''}" aria-pressed="${on}" ${ui('click','socialRecord',p.id,key)}>${on?'✓ Registrado · quitar':'Lo vi hoy'}</button>`}</article>`;}
function socialRecord(id,key){
 const p=personById(id);if(!p)return;
 const before={...getChecked(key)};
 const category=socialCategory(p),cur=getPeople(key),next=cur.includes(id)?cur.filter(x=>x!==id):cur.concat(id);setPeople(key,next);
 if(next.includes(id)&&cfgForDate(key).subs.some(s=>s.id===category)){const soc={...getSocial(key),[category]:true};setSocial(key,soc);setChecked(key,{...getChecked(key),social:true});}
 dayLogSyncChangedCompletions(key,before);persistDay(key);renderDayChange(key);
}
function socialCategoryToggle(id,key){
 const before={...getChecked(key)};
 const soc={...getSocial(key)};soc[id]=!soc[id];setSocial(key,soc);
 const ch={...getChecked(key)};ch.social=Object.values(soc).some(Boolean);setChecked(key,ch);
 dayLogSyncChangedCompletions(key,before);persistDay(key);renderDayChange(key);
}
function comboBlock(key,alwaysOpen){
 if(socialDraft&&socialDraft.key===key&&currentTab!=='social')return socialEditor();
 const C=cfgForDate(key),soc=getSocial(key),checked=getChecked(key).social;
 const total=C.subs.reduce((n,s)=>n+s.p,0),earned=checked?(C.subs.some(s=>soc[s.id])?C.subs.reduce((n,s)=>n+(soc[s.id]?s.p:0),0):total):0;
 return `<section class="card sf-compact-combo" aria-label="Social Combo"><div class="sec lvl-h sf-heading sf-combo-heading"><strong>👥 Social Combo</strong><span>${alwaysOpen?earned+' / '+total+' pts':earned+'/'+total}</span></div>${C.subs.map(s=>`<div class="sf-combo-category"><button type="button" class="sf-category-toggle${soc[s.id]?' sf-selected':''}" aria-pressed="${!!soc[s.id]}" aria-expanded="${!!soc[s.id]}" ${ui('click','socialCategoryToggle',s.id,key)}><span>${soc[s.id]?'✓':'○'} ${esc(s.icon)} ${esc(s.label)}</span><span>${s.p} pts</span></button><div class="sf-reveal${soc[s.id]?' is-open':''}" aria-hidden="${!soc[s.id]}" ${soc[s.id]?'':'inert'}><div class="sf-reveal-inner"><div class="sf-buttons">${peopleList().filter(p=>socialCategory(p)===s.id).map(p=>socialPersonButton(p,key)).join('')}${socialButton('+ Persona','socialNewCategory',[key,s.id])}</div></div></div></div>`).join('')}</section>`;
}
function socialRomanticLimit(){const n=CFG.socialRules?.romanticLimit;return Number.isInteger(n)&&n>=1?n:1;}
function socialRomanticLimitSet(value){const n=Number(value);if(!Number.isInteger(n)||n<1||n>1000)return;CFG.socialRules={...(CFG.socialRules||{}),romanticLimit:n};saveCfg();render();}
function socialRulesHTML(){const label=subsList().find(s=>s.id==='flirt')?.label||'Flirting',count=peopleList().filter(p=>p.sub==='flirt').length;return `<label class="sf-field">${esc(label)} · máximo de personas asignadas<input type="number" min="1" max="1000" value="${socialRomanticLimit()}" ${ui('change','socialRomanticLimitSet')}></label><p class="sf-muted">${count} asignadas · límite ${socialRomanticLimit()}. ${count>socialRomanticLimit()?'Se conservan todas las personas existentes; las nuevas asignaciones requieren liberar un lugar o aumentar el límite.':''} No afecta puntos ni sugerencias.</p>`;}
function settingsPeople(){return peopleList();}

function bonusSummary(key){const C=cfgForDate(key),ch=getChecked(key);return {earned:C.L3.filter(i=>!i.combo).reduce((n,i)=>n+Math.round(i.pts*doneFrac(ch[i.id])),0),max:C.L3.filter(i=>!i.combo).reduce((n,i)=>n+i.pts,0)};}

var socialGroupDraft=null,socialGroupError='';
function locationAdd(){socialGroupDraft={id:null,name:''};socialGroupError='';render();}
function locationRename(id){const group=locationGroups().find(g=>g.id===id);if(!group)return;socialGroupDraft={id,name:group.name};socialGroupError='';render();}
function socialGroupName(value){if(socialGroupDraft)socialGroupDraft.name=String(value).slice(0,40);}
function socialGroupCancel(){socialGroupDraft=null;socialGroupError='';render();}
function socialGroupSave(){
 if(!socialGroupDraft)return;
 const name=String(socialGroupDraft.name).trim();
 if(!name){socialGroupError='Escribe un nombre para el grupo.';render();return;}
 if(socialGroupDraft.id){const group=locationGroups().find(g=>g.id===socialGroupDraft.id);if(!group)return;group.name=name;}
 else{let id;do{id='loc'+Math.random().toString(36).slice(2,10);}while(locationGroups().some(g=>g.id===id));CFG.locationGroups=locationGroups().concat({id,name});}
 socialGroupDraft=null;socialGroupError='';saveCfg();render();
}
function socialGroupEditor(){return socialGroupDraft?`<section class="sf-group-dialog-card"><h2 id="sf-group-dialog-title">${socialGroupDraft.id?'Renombrar grupo':'Añadir grupo'}</h2><label class="sf-field">Nombre del grupo<input autofocus maxlength="40" value="${esc(socialGroupDraft.name)}" ${ui('input','socialGroupName')}></label>${socialGroupError?`<p role="alert">${esc(socialGroupError)}</p>`:''}<div class="sf-buttons">${socialButton('Cancelar','socialGroupCancel')}${socialButton('Guardar grupo','socialGroupSave',[],true)}</div></section>`:'';}
function socialGroupDialogSync(){
 let dialog=document.getElementById('sf-group-dialog');if(dialog?.tagName!=='DIALOG')dialog=null;
 if(!socialGroupDraft||!USER){if(dialog){dialog.close();dialog.remove();}return;}
 if(!dialog){dialog=document.createElement('dialog');dialog.id='sf-group-dialog';dialog.className='sf-group-dialog';dialog.setAttribute('aria-labelledby','sf-group-dialog-title');document.body.appendChild(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();socialGroupCancel();});dialog.addEventListener('click',e=>{if(e.target===dialog)socialGroupCancel();});}
 const focused=dialog.contains(document.activeElement),start=focused?document.activeElement.selectionStart:null,end=focused?document.activeElement.selectionEnd:null;
 uiHTML(dialog,socialGroupEditor());if(!dialog.open)dialog.showModal();
 const input=dialog.querySelector('input');input?.focus();if(focused&&start!=null)input?.setSelectionRange(start,end);
}


// Dated Work milestones; changing tomorrow never rewrites recorded days.
// Per-account, dated Work targets. The default keeps existing 10/10/5 scoring.
function workMilestoneRules(key){
 let rules=[{amount:400,points:10},{amount:650,points:10},{amount:800,points:5}];
 for(const era of (CFG.workMilestones||[]).slice().sort((a,b)=>a.from.localeCompare(b.from))){
  if(era.from<=key&&Array.isArray(era.steps)&&era.steps.every(p=>Number.isSafeInteger(p.amount)&&p.amount>0&&Number.isInteger(p.points)&&p.points>0))rules=era.steps;
 }
 return rules;
}
function workMilestonesFor(key){
 const rules=workMilestoneRules(key),total=rules.reduce((n,p)=>n+p.points,0);let cumulative=0;
 return rules.map((p,i)=>{cumulative+=p.points;return ['₪'+p.amount+(i===rules.length-1?'+':''),cumulative,cumulative/total];});
}
function workMilestonesRead(){
 return Array.from(document.querySelectorAll('.sf-work-settings-row')).map(row=>({amount:Number(row.querySelector('[data-work-amount]').value),points:Number(row.querySelector('[data-work-points]').value)}));
}
function workMilestonesSummary(){
 const summary=document.getElementById('work-settings-max');if(summary)summary.textContent='Máximo desde mañana: '+workMilestonesRead().reduce((n,p)=>n+p.points,0)+' puntos.';
}
function workMilestonesChange(index){
 const card=document.querySelector('.sf-work-settings');if(!card)return;
 const steps=workMilestonesRead();
 if(index<0)steps.push({amount:(steps.at(-1)?.amount||0)+100,points:5});else steps.splice(index,1);
 uiHTML(card,workMilestonesSettings(steps).replace(/^<div class="card sf-work-settings">/,'').replace(/<\/div>$/,''));
}
function workMilestonesSettings(draft){
 const rules=draft||workMilestoneRules(keyMinus(todayKey(),-1));
 return `<div class="card sf-work-settings"><div class="sec">💼 Work Milestones · ${rules.length} milestones</div><p class="sf-muted">Puntos adicionales por hito. Los cambios se aplican desde mañana; hoy y el historial conservan sus reglas. Tras el último hito, el siguiente toque vuelve a cero.</p>${rules.map((p,i)=>`<div class="sf-work-settings-row"><span>${i+1}</span><label>Monto ₪<input data-work-amount id="work-amount-${i}" type="number" min="1" step="1" value="${esc(p.amount)}"></label><label>Puntos +<input data-work-points ${ui('input','workMilestonesSummary')} id="work-points-${i}" type="number" min="1" max="1000" step="1" value="${esc(p.points)}"></label><button type="button" class="sf-button" aria-label="Eliminar milestone ${i+1}" ${ui('click','workMilestonesDelete',i)}>🗑</button></div>`).join('')}<button type="button" class="sf-button" ${ui('click','workMilestonesAdd')}>+ Agregar milestone</button><p id="work-settings-max" class="sf-muted">Máximo desde mañana: ${rules.reduce((n,p)=>n+p.points,0)} puntos.</p><p id="work-settings-error" role="alert"></p><button class="sf-button sf-primary" ${ui('click','workMilestonesSave')}>Guardar milestones</button></div>`;
}
function workMilestonesSave(){
 const steps=workMilestonesRead();
 if(!steps.every(p=>Number.isSafeInteger(p.amount)&&p.amount>0&&p.amount<=1000000000&&Number.isInteger(p.points)&&p.points>0&&p.points<=1000)||steps.some((p,i)=>i&&p.amount<=steps[i-1].amount)){
  const error=document.getElementById('work-settings-error');if(error)error.textContent='Usa montos enteros crecientes y entre 1 y 1000 puntos por hito.';return false;
 }
 workMilestonesApply(steps);return true;
}
function workMilestonesApply(steps){
 const key=keyMinus(todayKey(),-1);
 // Only the dated milestone timeline changes. Never stamp today's scoring config.
 CFG.workMilestones=(CFG.workMilestones||[]).filter(e=>e.from!==key);
 CFG.workMilestones.push({from:key,steps:JSON.parse(JSON.stringify(steps))});
 CFG.workMilestones.sort((a,b)=>a.from.localeCompare(b.from));
 _dayCfgCache={};saveCfg();render();
}
var workPhaseOpenKey=null;
function workPhaseToggle(key){workPhaseOpenKey=workPhaseOpenKey===key?null:key;renderDayChange(key);}
function workPhaseAdvance(key){
 const fraction=doneFrac(getChecked(key).work);
 const completed=workMilestonesFor(key).filter(p=>fraction+1e-9>=p[2]).length;
 const count=workMilestonesFor(key).length;if(!count)return;
 workPhaseSet(key,completed>=count?0:completed+1);
}
function workWeeklyCash(key){
 const weekday=new Date(key+'T12:00:00Z').getUTCDay();
 const from=keyMinus(key,weekday),to=keyMinus(from,-6),today=todayKey();let total=0;
 for(let i=0;i<7;i++){
  const day=keyMinus(from,-i);if(day>today||cfgForDate(day).inVacation)continue;
  const fraction=doneFrac(getChecked(day).work),phases=workMilestonesFor(day);
  let amount=0;phases.forEach((p,n)=>{if(fraction+1e-9>=p[2])amount=workMilestoneRules(day)[n].amount;});
  total+=amount;
 }
 return {from,to,total};
}
function workGeometry(count,completed){
 const point=(i)=>count===2?[8+i*16,24]:[24+17*Math.cos(-Math.PI/2+i*2*Math.PI/count),24+17*Math.sin(-Math.PI/2+i*2*Math.PI/count)];
 let shape='';
 if(count===1)shape=`<circle class="wg-segment${completed?' lit latest':''}" cx="24" cy="24" r="3"/>`;
 else if(count>1){
  if(count>2)shape+=`<polygon class="wg-interior" points="${Array.from({length:count},(_,i)=>point(i).join(',')).join(' ')}"/>`;
  shape+=Array.from({length:count},(_,i)=>{const a=point(i),b=point(count===2?i+1:(i+1)%count);return `<path class="wg-segment${i<completed?' lit':''}${i===completed-1?' latest':''}" pathLength="1" d="M${a.join(' ')} L${b.join(' ')}"/>`;}).join('');
 }
 // Fit the three-step triangle to its drawn bounds, not the old 48-unit canvas.
 // The square viewBox keeps its proportions; CSS width now equals triangle width.
 const triangleWidth=17*Math.sqrt(3);
 const viewBox=count===3?`${24-triangleWidth/2} ${19.75-triangleWidth/2} ${triangleWidth} ${triangleWidth}`:'0 0 48 48';
 return `<svg class="wg-figure${count&&completed===count?' complete':''}" viewBox="${viewBox}" aria-hidden="true">${shape}</svg>`;
}
// History uses the day's dated milestones; Today keeps its existing Work card.
function workHistoryRow(key,item){
 const fraction=doneFrac(getChecked(key).work),phases=workMilestonesFor(key);
 const completed=phases.filter(p=>fraction+1e-9>=p[2]).length;
 const full=fraction>=1,partial=fraction>0&&!full;
 const box=partial?`<span class="history-work-check" ${uiStyle(`border-color:${item.col};background:linear-gradient(90deg,${item.col} ${fraction*100}%,transparent ${fraction*100}%)`)}></span>`:chk(full,item.col);
 return `<div class="row history-work-row${fraction?' on':''}" role="checkbox" tabindex="${phases.length?'0':'-1'}" aria-checked="${partial?'mixed':full?'true':'false'}" aria-disabled="${!phases.length}" aria-label="${esc(item.label)} · ${completed} / ${phases.length} milestones · ${pointsLabel(item,getChecked(key).work)} puntos" ${phases.length?ui('click','workPhaseAdvance',key):''} ${ui('keydown','activate')}><div class="history-work-name">${box}<span>${esc(item.icon)} ${esc(item.label)}</span></div><span class="history-work-points">${pointsLabel(item,getChecked(key).work)}</span></div>`;
}
function workPhaseCard(key,item){
 const fraction=doneFrac(getChecked(key).work);
 const phases=workMilestonesFor(key);
 const completed=phases.filter(p=>fraction+1e-9>=p[2]).length,points=Math.round(item.pts*fraction);
 const next=phases[completed],legacy=![0,...phases.map(p=>p[2])].some(v=>Math.abs(v-fraction)<1e-9);
 const action=next?'Completar '+next[0]+' · '+next[1]+' puntos':'Reiniciar avance · volver a 0 de '+phases.length+' y 0 puntos';
 const weekly=workWeeklyCash(key);
 const cash=completed?workMilestoneRules(key)[completed-1].amount:0;
 return `<button type="button" class="sf-core-routine sf-work wg-card" ${phases.length?'':'disabled'} aria-label="WORK${legacy?' · Avance previo conservado':''} · ${points}/${item.pts} puntos · ${completed} de ${phases.length} hitos. ${esc(action)}" ${ui('click','workPhaseAdvance',key)}><span class="wg-head"><span>💼 WORK</span><span class="wg-points">${points}/${item.pts} pts</span></span><span class="wg-row"><span class="wg-daily"><span>HOY</span><strong>₪${cash.toLocaleString('en-US')}</strong></span>${workGeometry(phases.length,completed)}<span class="wg-weekly"><span>ESTA SEMANA</span><strong>≈ ₪${weekly.total.toLocaleString('en-US')}</strong></span></span></button>`;
}
function coreHabitCard(key,item){const state=getChecked(key)[item.id];return `<section class="sf-core-routine sf-core-extra"><div class="sf-work-head"><div class="sf-core-icon">${esc(item.icon)}</div><div class="sf-work-info"><div class="r-lab">${esc(item.label)}</div><div class="r-sub">${Math.round(item.pts*doneFrac(state))} / ${item.pts} pts</div></div></div><div class="sf-core-actions">${socialButton(state?'Desmarcar':'Completar','toggleHabit',[item.id,key],!!state)}</div></section>`;}

function socialGeneralSettings(){const bulkOpen=!!document.getElementById('social-bulk-details')?.open;return `      <div ${uiStyle(`margin-bottom:4px`)}>
        <div class="sec" ${uiStyle(`color:#fbbf24`)}>👥 SOCIAL COMBO — ${subsOn(subsList()).length} ACTIVE${subsOn(subsList()).length<subsList().length?` · ${subsList().length-subsOn(subsList()).length} PAUSED`:""}</div>
        <div ${uiStyle(`font-size:13.5px;color:#8888a4;line-height:1.5;margin-bottom:8px`)}>Each part is worth its own points and the combo is their sum — <b ${uiStyle(`color:#fbbf24`)}>${subsOn(subsList()).reduce((a,y)=>a+safePts(y.p),0)}%</b> right now. Adding or pausing a part changes the combo from today on; past days keep what they were scored with.</div>
        ${subsList().map((x,i)=>`
        <div ${uiStyle(`display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;background:${x.on!==false?"rgba(255,255,255,0.03)":"transparent"};opacity:${x.on!==false?1:.45};margin-bottom:5px`)}>
          <input value="${esc(x.icon)}" ${ui('change','subSet' ,i,'icon')} aria-label="icon"
            ${uiStyle(`width:26px;flex-shrink:0;background:none;border:none;color:#e2e2e2;font-family:inherit;font-size:17px;text-align:center;padding:0`)}/>
          <input value="${esc(x.label)}" ${ui('change','subSet' ,i,'label')}
            ${uiStyle(`flex:1;min-width:0;background:none;border:none;border-bottom:1px solid #222;color:#e2e2e2;font-family:inherit;font-size:15px;padding:3px 0`)}/>
          <input type="number" min="0" max="99" value="${esc(modePts(x,'work'))}" ${ui('change','subSet' ,i,'pWork')}
             title="Work Mode" aria-label="Work Mode points"
             ${uiStyle(`width:44px;flex-shrink:0;background:#111120;border:1px solid #222;border-radius:6px;color:#fbbf24;font-family:inherit;font-size:14px;padding:5px 3px;text-align:center`)}/>
          <input type="number" min="0" max="99" value="${esc(modePts(x,'vacation'))}" ${ui('change','subSet' ,i,'pVacation')}
             title="Vacation Mode" aria-label="Vacation Mode points"
             ${uiStyle(`width:44px;flex-shrink:0;background:#111120;border:1px solid #222;border-radius:6px;color:#fbbf24;font-family:inherit;font-size:14px;padding:5px 3px;text-align:center`)}/>
          <button ${ui('click','subToggle' ,i)} title="${x.on!==false?"Pause this part":"Resume this part"}" ${uiStyle(`background:none;border:1px solid #222;color:${x.on!==false?"#fbbf24":"#555"};border-radius:8px;font-size:15px;width:38px;height:36px;cursor:pointer;flex-shrink:0`)}>${x.on!==false?"✓":"○"}</button>
          ${subsList().length>1?`<button ${ui('click','subDel' ,i)} title="Remove" ${uiStyle(`background:none;border:1px solid #222;color:#9a9ab2;border-radius:8px;font-size:13px;width:34px;height:36px;cursor:pointer;flex-shrink:0`)}>✕</button>`:""}
        </div>`).join("")}
        <button ${ui('click','subAdd')} ${uiStyle(`width:100%;background:none;border:1px dashed #242436;color:#7e7e97;font-family:inherit;font-size:14px;letter-spacing:0.12em;padding:9px;border-radius:9px;cursor:pointer;margin-top:3px`)}>+ ADD TO COMBO</button>
      </div>${socialRulesHTML()}<details id="social-bulk-details" class="sf-scoring" ${bulkOpen?'open':''}><summary>Organizar varias personas por grupo</summary>${bulkPeoplePanel()}</details>`;}


boot();
  try{dayLogInit();}catch(e){console.warn('Day Log init',e);}
