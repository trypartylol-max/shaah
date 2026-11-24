/* Cocina — puente con la API de Apps Script (sustituye a google.script.run).
   La sesión es la de Google de SHAAH (mismo sitio). Este archivo no contiene datos personales. */
const COCINA_API = 'https://script.google.com/macros/s/AKfycbxpMXAXEnQxyQ305l_IUNW4RLLXfgL22LJJXfVFBUZUuSi7bDvZ4E6i6f3LWmFkCnSpsA/exec';
const COCINA_SB_URL = 'https://llpyxktcfubhmthqujpa.supabase.co';
const COCINA_SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscHl4a3RjZnViaG10aHF1anBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTQyMzEsImV4cCI6MjA5NTM5MDIzMX0.4dutcaJzjhuR9IQRlpBetGgLalaSZCiEDdl3oSI_f2A';
let cocinaSb = null;
try { if (window.supabase) cocinaSb = window.supabase.createClient(COCINA_SB_URL, COCINA_SB_ANON, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage: window.localStorage } }); } catch (e) {}

function cocinaLogin(msg) {
  const el = document.getElementById('login'); if (!el) return;
  el.hidden = false;
  document.getElementById('loginErr').textContent = msg || '';
}
document.addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('loginBtn'); if (!b) return;
  b.addEventListener('click', async () => {
    if (!cocinaSb) { cocinaLogin('No se pudo cargar el inicio de sesión.'); return; }
    const { error } = await cocinaSb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) cocinaLogin(error.message);
  });
});
async function cocinaToken() {
  if (!cocinaSb) return null;
  try { const r = await cocinaSb.auth.getSession(); return (r && r.data && r.data.session && r.data.session.access_token) || null; } catch (e) { return null; }
}
async function cocinaCall(fn, args) {
  const jwt = await cocinaToken();
  if (!jwt) { cocinaLogin(); throw new Error('Inicia sesión'); }
  const body = JSON.stringify({ jwt, fn, args });
  const r = await fetch(COCINA_API, { method: 'POST', body, keepalive: body.length < 60000 });
  const j = await r.json();
  if (!j.ok) {
    if (j.error === 'auth') cocinaLogin('Esta cuenta no tiene acceso. Entra con la tuya.');
    throw new Error(j.error === 'auth' ? 'Sin acceso' : (j.error || 'error'));
  }
  document.getElementById('login').hidden = true;
  return j.data;
}
/* Imita google.script.run: GS().withSuccessHandler(f).withFailureHandler(g).funcion(...args) */
function GS() {
  let ok = () => {}, fail = () => {};
  const p = new Proxy({}, { get(_, k) {
    if (k === 'withSuccessHandler') return f => { ok = f; return p; };
    if (k === 'withFailureHandler') return f => { fail = f; return p; };
    return (...args) => { cocinaCall(k, args).then(v => ok(v), e => fail(e instanceof Error ? e : new Error(String(e)))); };
  } });
  return p;
}
