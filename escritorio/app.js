'use strict';
/* Escritorio — app independiente. Los datos llegan de la API de Apps Script con una clave
   que solo vive en este dispositivo (localStorage). Este archivo no contiene datos personales. */
const API = 'https://script.google.com/macros/s/AKfycbyljFHpv10NvGR2XKSZTw401TdhNsw_KeL53iIgMKIHxaL5y1ll-J5PwLUepsBu1FkVDQ/exec';
const PRIV = 'https://script.google.com/macros/s/AKfycbz7uwOF4lhMMvCY0L_ttaWZ09Bi6fUaO7t3C49FxJXe6mVxvvBvZuizQhfC5DKJ-Y6hPw/exec';
const LS = { key: 'esc-key', cache: 'esc-cache-v1', queue: 'esc-queue-v1', priv: 'esc-priv', apps: 'hub-custom-v1', cmp: 'esc-cmp-open' };
const SECTIONS = ['Apps', 'Dinero', 'Casa'];
const BUILTIN = [
  { s: 'Apps', n: 'SHAAH', i: 'S', c: '#1d2b22', u: 'https://trypartylol-max.github.io/shaah/' },
  { s: 'Apps', n: 'Torre de Control', i: '🗼', c: '#1f1b2b', u: 'https://trypartylol-max.github.io/shaah/control/' },
  { s: 'Apps', n: 'SHAAH local', i: '⌂', c: '#16202a', u: 'http://localhost:8080/' },
  { s: 'Dinero', n: 'Caja', i: '₪', c: '#142a22', u: PRIV + '?p=caja' },
  { s: 'Dinero', n: 'Libro Mayor', i: '📒', c: '#2a2618', u: PRIV + '?p=libro' },
  { s: 'Casa', n: 'WiFi Doctor', i: '📶', c: '#13232e', u: PRIV + '?p=wifi' }
];

const $ = id => document.getElementById(id);
const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (n < 0 ? '−' : '') + '₪' + Math.abs(Math.round(n || 0)).toLocaleString('en-US');
const moneyH = n => (n < 0 ? '−' : '') + '<span class="cur">₪</span>' + Math.abs(Math.round(n || 0)).toLocaleString('en-US');
const B = s => '<b>' + esc(s) + '</b>';
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const cap = s => String(s || '').replace(/^./, c => c.toUpperCase());

let KEY = get(LS.key, '');
let D = null, AG = [];
let custom = get(LS.apps, []);

/* ---------- red ---------- */
/* Sesión: la de Google de SHAAH (mismo sitio) o, si no hay, la clave del dispositivo. */
const SB_URL = 'https://llpyxktcfubhmthqujpa.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscHl4a3RjZnViaG10aHF1anBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTQyMzEsImV4cCI6MjA5NTM5MDIzMX0.4dutcaJzjhuR9IQRlpBetGgLalaSZCiEDdl3oSI_f2A';
let sb = null;
try { if (window.supabase) sb = window.supabase.createClient(SB_URL, SB_ANON, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: window.localStorage } }); } catch (e) {}
async function session() {
  if (!sb) return null;
  try { const r = await sb.auth.getSession(); return (r && r.data && r.data.session) || null; } catch (e) { return null; }
}
async function cred() {
  if (KEY) return { key: KEY };
  const s = await session();
  return s ? { jwt: s.access_token } : null;
}
async function apiPost(body) {
  const c = await cred();
  if (!c) throw new Error('clave');
  const r = await fetch(API, { method: 'POST', body: JSON.stringify(Object.assign({ tipo: 'esc' }, c, body)) });
  return r.json();
}
async function apiGet(force) {
  const j = await apiPost({ op: 'all', force: force ? 1 : 0 });
  if (!j.ok) throw new Error(j.error || 'error');
  return j;
}

/* ---------- animación de cifras ---------- */
function countTo(el, v) {
  if (!el) return;
  const from = typeof el._v === 'number' ? el._v : 0;
  el._v = v;
  if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches || from === v) { el.innerHTML = moneyH(v); return; }
  const t0 = performance.now(), dur = 700;
  const step = t => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.innerHTML = moneyH(from + (v - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- render ---------- */
function render(d) {
  if (!d) return;
  D = d;
  const now = new Date(), day = now.getDate(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  $('month').textContent = d.month || 'Escritorio';
  const budget = d.budget || 0, spent = d.spent || 0, earned = d.earned || 0, fut = d.future || 0, week = d.week || 0;
  const left = budget - spent, p = budget ? spent / budget : 0, m = day / dim;

  countTo($('left'), left);
  $('left').style.color = left < 0 ? 'var(--out)' : '';
  $('pct').textContent = Math.round(p * 100) + '% usado';
  $('leftBar').style.width = Math.min(100, p * 100) + '%';
  $('leftBar').style.background = p >= 1 ? 'var(--out)' : p > m + .05 ? 'var(--gold)' : 'var(--in)';
  $('paceMk').style.left = (m * 100) + '%';
  $('heroSub').innerHTML = 'quedan ' + B(dim - day) + ' días' + (fut ? ' · con futuros ' + B(money(left - fut)) : '');

  countTo($('earn'), earned);
  const base = Math.max(0, earned - week), tot = Math.max(1, base + week);
  $('splitA').style.width = (base / tot * 100) + '%'; $('splitB').style.width = (week / tot * 100) + '%';
  $('earnSub').innerHTML = 'base ' + B(money(base)) + (week ? ' · ' + B('+' + money(week)) + ' semana' : '');

  countTo($('spent'), spent);
  $('spentBar').style.width = Math.min(100, p * 100) + '%';
  const C = d.cmp || [], tn = C.reduce((s, x) => s + x.now, 0), tf = C.reduce((s, x) => s + (x.prevFull || 0), 0), df = Math.round(tn - tf);
  $('spentSub').innerHTML = 'de ' + B(money(budget)) + (C.length ? ' · ' + B((df > 0 ? '+' : '−') + money(Math.abs(df))) + ' vs ' + esc(d.prevMonth || 'mes pasado') : '');

  const bal = earned - spent, r = earned / Math.max(1, spent);
  countTo($('bal'), bal);
  $('bal').style.color = bal < 0 ? 'var(--out)' : 'var(--in)';
  $('ratioBar').style.width = Math.min(100, r * 100) + '%';
  $('balSub').innerHTML = B(Math.round(Math.min(r, 9.99) * 100) + '%') + ' cubierto' + (fut ? ' · con futuros ' + B(money(bal - fut)) : '');

  // foco
  $('fLeft').innerHTML = moneyH(left);
  $('fSub').innerHTML = B(Math.round(p * 100) + '%') + ' usado · quedan ' + B(dim - day) + ' días';

  // categorías
  const sel = $('aCat'), cur = sel.value;
  if (d.cats && d.cats.length) { sel.innerHTML = '<option value="">Categoría</option>' + d.cats.map(c => '<option value="' + esc(c.code) + '">' + esc(c.name) + '</option>').join(''); sel.value = cur; }

  renderMetas(d.metas || []);
  renderCmp(d, C, tn, tf, df);
  renderVouchers(d.vouchers || []);
  renderQuick(d);
}

/* ---------- gastos rápidos ---------- */
let armed = null;
function renderQuick(d) {
  const names = {}; (d.cats || []).forEach(c => { names[c.code] = c.name; });
  const Q = (d.quick || []).filter(q => q.cat !== 'fij').slice(0, 6);
  $('quick').hidden = !Q.length;
  $('quick').innerHTML = Q.map((q, i) => '<button type="button" class="qc" data-i="' + i + '" title="' + esc((names[q.cat] || q.cat) + ' · usado ' + q.n + ' veces') + '"><span>' + esc(cap(q.com)) + '</span><b class="pv">' + money(q.monto) + '</b></button>').join('');
  $('quick')._q = Q;
}
$('quick').addEventListener('click', async ev => {
  const b = ev.target.closest('.qc'); if (!b) return;
  const q = $('quick')._q[+b.dataset.i];
  if (armed !== b) {
    if (armed) armed.classList.remove('armed');
    armed = b; b.classList.add('armed'); b.querySelector('span').textContent = '¿Guardar ' + cap(q.com) + '? ✓';
    clearTimeout(armed._t); b._t = setTimeout(() => { if (armed === b) { armed = null; b.classList.remove('armed'); b.querySelector('span').textContent = cap(q.com); } }, 3500);
    return;
  }
  clearTimeout(b._t); armed = null; b.disabled = true;
  await addGasto({ monto: q.monto, categoria: q.cat, comercio: q.com });
  b.disabled = false; b.classList.remove('armed'); b.querySelector('span').textContent = cap(q.com);
});

/* ---------- SHAAH: nota de hoy y racha ---------- */
const ymd = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
const gradeColor = g => /^S/.test(g) ? 'var(--gold)' : g === 'A' ? 'var(--in)' : g === 'B' ? '#5fb3c7' : g === 'C' ? '#d9a54a' : '#e0796b';
async function loadShaah() {
  const s = await session();
  if (!s) { $('shaahCard').hidden = true; return; }
  try {
    const t = new Date(), from = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 60);
    const { data, error } = await sb.from('day_logs').select('date,score:data->score,grade:data->>grade,pct:data->pct,max:data->max').gte('date', ymd(from)).lte('date', ymd(t)).order('date', { ascending: false });
    if (error) throw error;
    const H = {}; (data || []).forEach(r => { H[r.date] = r; });
    const ok = r => r && r.max > 0 && r.score >= r.max * 0.3;
    let streak = 0;
    for (let i = 0; i < 60; i++) { const r = H[ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() - i))]; if (ok(r)) streak++; else if (i > 0) break; }
    const today = H[ymd(t)];
    const g = today && today.grade ? today.grade : '–';
    $('shaahCard').style.setProperty('--g', today ? gradeColor(g) : 'var(--dim)');
    $('shGrade').textContent = g;
    $('shToday').textContent = today ? (today.pct || 0) + '% · ' + Math.round(today.score || 0) + ' pts' : 'Sin marcar todavía';
    $('shStreak').innerHTML = streak ? 'racha ' + B(streak + (streak === 1 ? ' día' : ' días')) : 'sin racha';
    let bars = '';
    for (let i = 13; i >= 0; i--) { const r = H[ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() - i))]; const pc = r && r.max ? Math.min(100, r.score / r.max * 100) : 0; bars += '<i class="' + (ok(r) ? 'ok' : '') + '" style="height:' + Math.max(7, pc) + '%"></i>'; }
    $('shBars').innerHTML = bars;
    $('shaahCard').hidden = false;
  } catch (e) { /* sin datos de SHAAH: se queda oculto */ }
}

function renderMetas(M) {
  $('metasCard').hidden = !M.length;
  $('metas').innerHTML = M.map(x => {
    const pc = x.target ? Math.min(100, x.saved / x.target * 100) : 0, done = pc >= 100, falta = Math.max(0, (x.target || 0) - (x.saved || 0));
    return '<div class="mc' + (done ? ' done' : '') + (pc <= 0 ? ' zero' : '') + '" data-meta="' + esc(x.name) + '">' +
      '<div class="t"><span class="nm">' + esc(x.name) + '</span><span class="pc">' + Math.round(pc) + '%</span></div>' +
      '<div class="tr"><i style="width:' + pc + '%"></i></div>' +
      '<div class="s pv"><span>' + money(x.saved) + ' de ' + money(x.target) + '</span><span>' + (done ? '✓ lista' : 'faltan ' + money(falta)) + '</span></div>' +
      '<div class="ap"><button type="button" class="add">+ aportar</button></div></div>';
  }).join('');
}

function renderCmp(d, C, tn, tf, df) {
  $('cmpCard').hidden = !C.length;
  if (!C.length) return;
  $('prevName').textContent = d.prevMonth || 'mes pasado';
  $('cmpS').innerHTML = '<span class="' + (df > 0 ? 'up' : 'dn') + '">' + (df > 0 ? '+' : '−') + money(Math.abs(df)) + '</span><small>vs ' + esc(d.prevMonth || '') + ' completo</small>';
  const Dd = C.map(x => ({ n: x.name, d: Math.round(x.now - (x.prevFull || 0)) })).filter(x => Math.abs(x.d) >= 10);
  const ups = Dd.filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 5), dns = Dd.filter(x => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 5);
  const mx = Math.max(1, ...Dd.map(x => Math.abs(x.d)));
  const col = (t, L, cls, clr) => '<div class="mvc"><h3>' + t + '</h3>' + (L.length ? L.map(x => '<div class="mvr"><div class="t"><span>' + esc(x.n) + '</span><b class="' + cls + ' pv">' + (x.d > 0 ? '+' : '−') + money(Math.abs(x.d)) + '</b></div><div class="tb"><i style="width:' + (Math.abs(x.d) / mx * 100) + '%;background:' + clr + '"></i></div></div>').join('') : '<div class="muted">nada</div>') + '</div>';
  $('cmp').innerHTML = '<div class="mv">' + col('Gastas más en', ups, 'up', '#e0796b') + col('Gastas menos en', dns, 'dn', 'var(--in)') + '</div>';
}

function vState(x, today) {
  if (!x.vence) return { cls: '', txt: '' };
  if (/venc/i.test(x.vence)) return { cls: ' gone', txt: 'vencido' };
  if (/^\d{4}-\d{2}-\d{2}$/.test(x.vence)) {
    const dd = Math.round((new Date(x.vence + 'T00:00:00') - today) / 864e5);
    return dd < 0 ? { cls: ' gone', txt: 'vencido' } : { cls: dd <= 30 ? ' soon' : '', txt: dd === 0 ? 'vence hoy' : 'vence en ' + dd + ' días' };
  }
  return { cls: '', txt: 'vence ' + x.vence };
}
function renderVouchers(V) {
  $('vouCard').hidden = !V.length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const L = V.map(x => Object.assign({}, x, vState(x, today))).sort((a, b) => ((a.cls === ' gone') - (b.cls === ' gone')) || (b.amount - a.amount));
  $('vouTot').textContent = money(L.filter(x => x.cls !== ' gone').reduce((s, x) => s + (x.amount || 0), 0));
  $('vou').innerHTML = L.map(x => {
    const nm = cap(([x.name, x.what].filter(Boolean).join(' · ') || x.group || 'Voucher').trim());
    return '<div class="vc' + x.cls + '"><span class="av">' + esc(nm[0] || '?') + '</span><span class="n">' + esc(nm) + '</span><span class="a pv">' + money(x.amount) + '</span><span class="v">' + esc(x.txt || x.group || '') + '</span></div>';
  }).join('');
  vouMore();
}
function vouMore() {
  const n = $('vou').children.length;
  $('vouMore').hidden = n <= 4;
  $('vouMore').textContent = $('vou').classList.contains('all') ? 'Ver menos' : '+ ' + (n - 4) + ' más';
}

function renderAgenda(list) {
  AG = list || [];
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 5; i++) days.push({ d: new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + i), ev: [], i });
  AG.forEach(e => {
    const s = new Date(e.s);
    let i = Math.round((new Date(s.getFullYear(), s.getMonth(), s.getDate()) - t0) / 864e5);
    if (i < 0 && e.e > t0.getTime()) i = 0;
    if (i >= 0 && i < 5) days[i].ev.push(e);
  });
  const busy = days.filter(x => x.ev.length);
  $('agenda').classList.toggle('muted', !busy.length);
  $('agenda').innerHTML = busy.length ? busy.map(x => '<div class="day"><div class="dd' + (x.i ? '' : ' today') + '"><small>' + (x.i ? esc(x.d.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')) : 'Hoy') + '</small><b>' + x.d.getDate() + '</b></div><div class="devs">' +
    x.ev.map(e => '<div class="ev"><span class="d" style="background:' + esc(e.c || '#6aa0e6') + '"></span><span class="h">' + (e.all ? 'día' : new Date(e.s).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })) + '</span><span>' + esc(e.t) + '</span></div>').join('') + '</div></div>').join('')
    : 'Libre los próximos 5 días';
}

/* ---------- carga ---------- */
function setStatus(ok, at) {
  const t = new Date(at || Date.now()).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  $('status').textContent = ok ? 'en vivo · ' + t : 'sin conexión · datos de las ' + t;
  $('liveDot').classList.toggle('off', !ok);
}
let loading = false;
async function load(force) {
  if (!(await cred())) { showSetup(); return; }
  loadShaah();
  if (loading) return;
  loading = true;
  try {
    const j = await apiGet(force);
    set(LS.cache, { data: j.data, agenda: j.agenda || [], at: Date.now() });
    render(j.data); renderAgenda(j.agenda || []);
    setStatus(true);
  } catch (e) {
    if (String(e.message) === 'clave') { const had = !!KEY; KEY = ''; set(LS.key, ''); showSetup(had ? 'La clave no es válida.' : 'Inicia sesión otra vez.'); }
    else { const c = get(LS.cache, null); setStatus(false, c && c.at); }
  } finally { loading = false; }
}

/* ---------- gastos (con cola sin conexión) ---------- */
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3200);
}
async function sendGasto(g) {
  const r = await apiPost({ op: 'gasto', monto: g.monto, categoria: g.categoria, comercio: g.comercio });
  if (!r || !r.ok) throw Object.assign(new Error((r && r.error) || 'error'), { server: true });
  return r;
}
async function addGasto(g) {
  try {
    const r = await sendGasto(g);
    toast('✓ ' + money(g.monto) + ' guardado en ' + (r.pestana || 'Plata26'));
    load(true);
    return true;
  } catch (e) {
    if (e.server) { toast('Error: ' + e.message); return false; }
    const q = get(LS.queue, []); q.push(g); set(LS.queue, q);
    toast('Sin conexión: ' + money(g.monto) + ' se guardará al volver');
    return true;
  }
}
async function flushQueue() {
  const q = get(LS.queue, []);
  if (!q.length || !(await cred())) return;
  const rest = [];
  for (const g of q) { try { await sendGasto(g); } catch (e) { if (!e.server) rest.push(g); } }
  set(LS.queue, rest);
  if (rest.length < q.length) { toast('✓ ' + (q.length - rest.length) + ' gasto(s) pendientes enviados'); load(true); }
}
$('addForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const monto = parseFloat(String($('aMonto').value).replace(',', '.')), com = $('aCom').value.trim();
  if (!monto || !com) return;
  $('aBtn').disabled = true;
  const ok = await addGasto({ monto, categoria: $('aCat').value, comercio: com });
  $('aBtn').disabled = false;
  if (ok) { $('aMonto').value = ''; $('aCom').value = ''; }
});

/* ---------- aportar a metas ---------- */
$('metas').addEventListener('click', async ev => {
  const mc = ev.target.closest('.mc'); if (!mc) return;
  const ap = mc.querySelector('.ap'), name = mc.dataset.meta;
  if (ev.target.classList.contains('add')) {
    ap.innerHTML = '<input type="number" inputmode="decimal" step="any" placeholder="₪ cuánto" aria-label="Monto a aportar"><button type="button" class="ok">Sumar</button><button type="button" class="x" aria-label="Cancelar">✕</button>';
    ap.classList.add("open"); ap.querySelector("input").focus(); return;
  }
  if (ev.target.classList.contains("x")) { ap.classList.remove("open"); ap.innerHTML = '<button type="button" class="add">+ aportar</button>'; return; }
  if (ev.target.classList.contains('ok')) {
    const v = ap.querySelector('input').value; if (!v) return;
    ap.innerHTML = '<span class="muted">Guardando…</span>';
    try { const r = await apiPost({ op: 'aporte', nombre: name, monto: v }); if (!r.ok) throw new Error(r.error); render(r.data); toast('✓ ' + money(+v) + ' sumado a ' + name); }
    catch (e) { ap.innerHTML = '<span class="muted">Error: ' + esc(e.message || 'sin conexión') + '</span>'; }
  }
});
$('metas').addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.closest('.ap')) { const b = ev.target.closest('.ap').querySelector('.ok'); if (b) b.click(); } });
$('vouMore').addEventListener('click', () => { $('vou').classList.toggle('all'); vouMore(); });
$('cmpCard').addEventListener('toggle', () => set(LS.cmp, $('cmpCard').open));
$('cmpCard').open = !!get(LS.cmp, false);

/* ---------- panel de detalle ---------- */
function openDrawer(kind) {
  if (!D) return;
  const d = D, budget = d.budget || 0, spent = d.spent || 0, earned = d.earned || 0, fut = d.future || 0, week = d.week || 0;
  const row = (a, b, s) => '<div class="row2"><span>' + a + (s ? '<small>' + s + '</small>' : '') + '</span><span class="pv">' + b + '</span></div>';
  let h = '';
  if (kind === 'budget') h = '<h2>Budget de ' + esc(d.month) + '</h2><div class="big pv">' + moneyH(budget - spent) + '</div>' + row('Budget', money(budget)) + row('Gastado', money(spent)) + row('Futuros', money(fut), 'marcados con # o ?') + row('Con futuros te queda', money(budget - spent - fut)) + '<div class="row2"><span>Ver todo en Caja</span><span><a href="' + PRIV + '?p=caja" target="_blank" rel="noopener" style="color:var(--in)">abrir ↗</a></span></div>';
  if (kind === 'earn') h = '<h2>Ganado en ' + esc(d.month) + '</h2><div class="big pos pv">' + moneyH(earned) + '</div>' + row('Base del mes', money(earned - week)) + row('Esta semana (SHAAH)', money(week), 'se suma sola cada hora');
  if (kind === 'spent') {
    const C = (d.cmp || []).filter(x => x.now > 0).sort((a, b) => b.now - a.now), mx = C.length ? C[0].now : 1;
    h = '<h2>Gastado en ' + esc(d.month) + '</h2><div class="big neg pv">' + moneyH(spent) + '</div>' + C.map(x => '<div class="row2"><span>' + esc(x.name) + '<small>' + esc(d.prevMonth || '') + ' ' + money(x.prevFull || 0) + '</small></span><span class="pv">' + money(x.now) + '</span></div><div class="bar" style="margin:-4px 0 6px"><i style="width:' + (x.now / mx * 100) + '%;background:var(--out)"></i></div>').join('');
  }
  if (kind === 'bal') h = '<h2>Balance</h2><div class="big pv" style="color:' + (earned - spent < 0 ? 'var(--out)' : 'var(--in)') + '">' + moneyH(earned - spent) + '</div>' + row('Ganado', money(earned)) + row('Gastado', money(spent)) + row('Futuros', money(fut)) + row('Con futuros', money(earned - spent - fut));
  $('drawerBody').innerHTML = h;
  $('drawer').hidden = false; $('scrim').hidden = false;
}
function closeDrawer() { $('drawer').hidden = true; $('scrim').hidden = true; }
document.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => openDrawer(b.dataset.detail)));
$('drawerX').onclick = closeDrawer; $('scrim').onclick = closeDrawer;

/* ---------- modos ---------- */
function setPriv(on) { document.body.classList.toggle('priv', on); set(LS.priv, on); }
setPriv(!!get(LS.priv, false));
$('privBtn').onclick = () => setPriv(!document.body.classList.contains('priv'));
document.addEventListener('click', ev => {
  if (!document.body.classList.contains('priv')) return;
  const el = ev.target.closest('.pv'); if (!el || el.classList.contains('rv')) return;
  ev.preventDefault(); ev.stopPropagation();
  el.classList.add('rv'); setTimeout(() => el.classList.remove('rv'), 4000);
}, true);
function setFocus(on) { $('focus').hidden = !on; }
$('focusBtn').onclick = () => setFocus(true);
$('focusX').onclick = () => setFocus(false);

/* ---------- apps ---------- */
function allApps() { return BUILTIN.concat(custom.map((x, k) => Object.assign({}, x, { k }))); }
function renderApps() {
  let n = 0;
  const all = allApps();
  $('apps').innerHTML = SECTIONS.map(sec => {
    const items = all.filter(a => a.s === sec); if (!items.length) return '';
    return '<div class="dsec">' + sec + '</div><div class="dgrid">' + items.map(a => {
      n++;
      return '<a class="app" href="' + esc(a.u) + '" target="_blank" rel="noopener"><span class="ic" style="--c:' + esc(a.c || '#1a1e25') + '">' + esc(a.i || a.n[0]) + '</span><span class="nm">' + esc(a.n) + '</span>' + (n <= 9 ? '<span class="kb">' + n + '</span>' : '') + (a.k !== undefined ? '<button type="button" class="del" data-k="' + a.k + '" aria-label="Quitar ' + esc(a.n) + '">✕</button>' : '') + '</a>';
    }).join('') + '</div>';
  }).join('');
  document.querySelectorAll('.app .del').forEach(b => b.onclick = e => { e.preventDefault(); custom.splice(+b.dataset.k, 1); set(LS.apps, custom); renderApps(); });
}
$('fSec').innerHTML = SECTIONS.map(s => '<option>' + s + '</option>').join('');
$('addApp').onclick = () => { $('appModal').hidden = false; $('fName').focus(); };
$('fCancel').onclick = () => { $('appModal').hidden = true; };
$('appForm').onsubmit = e => {
  e.preventDefault();
  let u = $('fUrl').value.trim(); if (!/^https?:\/\//.test(u)) u = 'https://' + u;
  custom.push({ s: $('fSec').value, n: $('fName').value.trim(), u, i: $('fIcon').value.trim(), c: '#1a1e25' });
  set(LS.apps, custom); renderApps(); e.target.reset(); $('appModal').hidden = true;
};
$('editApps').onclick = e => { const on = document.body.classList.toggle('editing'); e.target.textContent = on ? 'Listo' : 'Editar'; };

/* ---------- paleta de comandos (⌘K) ---------- */
function parseGasto(q) {
  const toks = q.trim().split(/\s+/).filter(Boolean);
  const ai = toks.findIndex(t => /^\d+([.,]\d+)?$/.test(t));
  if (ai < 0) return null;
  const monto = parseFloat(toks[ai].replace(',', '.'));
  const rest = toks.filter((_, i) => i !== ai);
  let cat = null, ci = -1;
  const cats = (D && D.cats) || [];
  rest.some((t, i) => {
    const n = norm(t); if (n.length < 2) return false;
    const c = cats.find(c => norm(c.code) === n) || (n.length >= 3 && cats.find(c => norm(c.name).startsWith(n)));
    if (c) { cat = c; ci = i; return true; } return false;
  });
  const com = rest.filter((_, i) => i !== ci).join(' ');
  return { monto, cat, com };
}
let palItems = [], palSel = 0;
function palBuild() {
  const q = $('palIn').value, nq = norm(q), items = [];
  const g = parseGasto(q);
  if (g && g.monto) items.push({ t: 'Registrar ' + money(g.monto) + (g.com ? ' · ' + g.com : ''), s: g.cat ? g.cat.name : 'sin categoría', run: () => { if (!g.com) { toast('Falta dónde / qué'); return; } addGasto({ monto: g.monto, categoria: g.cat ? g.cat.code : '', comercio: g.com }); } });
  const cmds = [
    { t: 'Modo privado', s: 'P', run: () => setPriv(!document.body.classList.contains('priv')) },
    { t: 'Modo foco', s: 'F', run: () => setFocus(true) },
    { t: 'Recargar datos', s: 'R', run: () => load(true) },
    { t: 'Registrar gasto en el formulario', s: 'G', run: () => $('aMonto').focus() },
    { t: 'Detalle de lo gastado', s: '', run: () => openDrawer('spent') }
  ].concat(allApps().map(a => ({ t: 'Abrir ' + a.n, s: 'app', run: () => window.open(a.u, '_blank', 'noopener') })));
  cmds.forEach(c => { if (!nq || norm(c.t).includes(nq)) items.push(c); });
  palItems = items.slice(0, 9); palSel = 0;
  $('palList').innerHTML = palItems.map((x, i) => '<div class="pi' + (i ? '' : ' on') + '" data-i="' + i + '"><span>' + esc(x.t) + '</span><small>' + esc(x.s) + '</small></div>').join('') || '<div class="pi"><small>Escribe un monto y dónde: "45 super shufersal"</small></div>';
}
function palOpen() { $('pal').hidden = false; $('palIn').value = ''; palBuild(); $('palIn').focus(); }
function palClose() { $('pal').hidden = true; }
function palRun(i) { const x = palItems[i]; palClose(); if (x) x.run(); }
$('cmdBtn').onclick = palOpen;
$('palIn').addEventListener('input', palBuild);
$('palIn').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % Math.max(1, palItems.length);
    document.querySelectorAll('.pi').forEach((el, i) => el.classList.toggle('on', i === palSel));
  } else if (e.key === 'Enter') { e.preventDefault(); palRun(palSel); }
});
$('palList').addEventListener('click', e => { const el = e.target.closest('[data-i]'); if (el) palRun(+el.dataset.i); });
$('pal').addEventListener('click', e => { if (e.target === $('pal')) palClose(); });

/* ---------- atajos de teclado ---------- */
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('pal').hidden ? palOpen() : palClose(); return; }
  if (e.key === 'Escape') { palClose(); closeDrawer(); setFocus(false); $('appModal').hidden = true; return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'g') { e.preventDefault(); $('aMonto').focus(); }
  else if (k === 'p') setPriv(!document.body.classList.contains('priv'));
  else if (k === 'f') setFocus($('focus').hidden);
  else if (k === 'r') load(true);
  else if (/^[1-9]$/.test(k)) { const a = allApps()[+k - 1]; if (a) window.open(a.u, '_blank', 'noopener'); }
});

/* ---------- configuración inicial ---------- */
function showSetup(msg) { $('setup').hidden = false; $('setupMsg').textContent = msg || ''; }
$('googleBtn').onclick = async () => {
  if (!sb) { $('setupMsg').textContent = 'No pude cargar el login.'; return; }
  $('setupMsg').textContent = 'Abriendo Google…';
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  if (error) $('setupMsg').textContent = 'Error: ' + error.message;
};
$('setupForm').onsubmit = async e => {
  e.preventDefault();
  KEY = $('setupKey').value.trim(); if (!KEY) return; set(LS.key, KEY);
  $('setupMsg').textContent = 'Conectando…';
  try { const j = await apiGet(false); set(LS.cache, { data: j.data, agenda: j.agenda || [], at: Date.now() }); render(j.data); renderAgenda(j.agenda || []); setStatus(true); $('setup').hidden = true; $('setupKey').value = ''; flushQueue(); }
  catch (err) { $('setupMsg').textContent = String(err.message) === 'clave' ? 'Clave incorrecta.' : 'No pude conectar.'; }
};

/* ---------- arranque ---------- */
renderApps();
const cached = get(LS.cache, null);
if (cached && cached.data) { render(cached.data); renderAgenda(cached.agenda); setStatus(false, cached.at); $('status').textContent = 'actualizando…'; }
load(false).then(flushQueue);
setInterval(() => load(false), 10 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(false); });
window.addEventListener('online', () => { flushQueue(); load(false); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
