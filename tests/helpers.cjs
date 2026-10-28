const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = process.env.SHAAH_HTML || path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attrs]) => !/\bsrc\s*=/.test(attrs)).map(([, , script]) => script);
const externalApp = html.match(/<script data-shaah-app src="(\.\/assets\/app\.[a-f0-9]{16}\.js)(?:\?[^"\s]*)?"[^>]*><\/script>/);
if (scripts.length !== 0 || !externalApp) throw new Error('Expected the versioned external application script');
const appPath = path.resolve(path.dirname(htmlPath), externalApp[1]);
const source = fs.readFileSync(process.env.SHAAH_SOURCE || appPath, 'utf8');
if (process.env.SHAAH_SOURCE) {
  const sri = 'sha384-' + require('node:crypto').createHash('sha384').update(source).digest('base64');
  html = html.replace(/<script data-shaah-app[^>]*>/, tag => tag.replace(/integrity="[^"]*"/, 'integrity="' + sri + '"'));
}
const cssSource = process.env.SHAAH_CSS ? fs.readFileSync(process.env.SHAAH_CSS, 'utf8') : null;
if (cssSource !== null) {
  const sri = 'sha384-' + require('node:crypto').createHash('sha384').update(cssSource).digest('base64');
  html = html.replace(/<link[^>]*href="\.\/assets\/app\.[a-f0-9]{16}\.css"[^>]*>/, tag => tag.replace(/integrity="[^"]*"/, 'integrity="' + sri + '"'));
}
const clone = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const h = {
    work: { l: 'Work', p: 20, pWork: 20, pVacation: 0, lv: 1, on: true, i: 'W' },
    meditation: { l: 'Meditate', p: 10, pWork: 10, pVacation: 6, lv: 2, on: true, i: 'M' },
    social: { l: 'Social', p: 18, pWork: 18, pVacation: 24, lv: 3, on: true, combo: true, i: 'S' }
  };
  const subs = [
    { id: 'flirt', label: 'Flirting', icon: 'F', p: 2, pWork: 2, pVacation: 4 },
    { id: 'strangers', label: 'Strangers', icon: 'S', p: 0, pWork: 0, pVacation: 0 },
    { id: 'friends', label: 'Friends', icon: 'P', p: 16, pWork: 16, pVacation: 20 }
  ];
  const era = (from, mode) => ({ from, mode, h: clone(h), order: Object.keys(h), subs: clone(subs) });
  const config = {
    h, order: Object.keys(h), subs, routines: {}, tz: 'UTC',
    people: [
      { id: 'pold01', name: 'Ana Existing', sub: 'friends', every: 7 },
      { id: 'pold02', name: 'Luis Existing', sub: 'friends', every: 14 },
      { id: 'pold03', name: 'Alex Existing', sub: 'flirt', every: 30 }
    ],
    travel: { mode: 'work', auto: false, resumeOn: '', modeUpdatedAt: 1792065600000 },
    v: 4, subsV: 2, junkV: 1, balV: 1, travelV: 10, socialTab: true,
    log: [era('0001-01-01', 'work'), era('2026-09-08', 'vacation'), era('2026-10-08', 'work')]
  };
  const day = () => ({
    checks: { work: true, meditation: 0.5, social: true },
    social: { flirt: true, friends: false, strangers: false },
    people: ['pold03'], note: 'Synthetic history — preserve me',
    _daylog: [{ id: 'synthetic-event', title: 'Synthetic visit', type: 'manual', start: '12:00', end: '12:30' }]
  });
  const days = Object.fromEntries(['2026-09-07', '2026-09-08', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-10-08', '2026-10-15'].map(k => [k, day()]));
  return { config, days };
}

function loadApp(data = fixture(), options = {}) {
  const values = new Map();
  const timers = new Map();
  const writes = [];
  const effects = [];
  let timerId = 0;
  const context = vm.createContext({
    console, URL, URLSearchParams, Intl, TextEncoder, crypto:require('node:crypto').webcrypto,
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [options.now || '2026-10-16T12:00:00Z'])); }
      static now() { return Date.parse(options.now || '2026-10-16T12:00:00Z'); }
    },
    navigator: { onLine: false, vibrate() {} },
    localStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) },
    document: { addEventListener() {}, getElementById: () => null },
    window: { addEventListener() {}, supabase: { createClient: () => options.client || ({
      auth: { onAuthStateChange() {} },
      from: table => ({ upsert: row => { writes.push({ table, row: clone(row) }); return Promise.resolve({ error: null }); } })
    }) } },
    confirm: () => true, alert: message => effects.push(message),
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout: id => timers.delete(id), setInterval() {}, clearInterval() {}
  });
  // Keep every application function intact; suppress only automatic boot and Day Log startup.
  const marker = '\nboot();';
  const testedSource=options.source||source;
  const end = testedSource.lastIndexOf(marker);
  if (end < 0) throw new Error('Application boot marker missing');
  vm.runInContext(testedSource.slice(0, end), context, { filename: htmlPath });
  const run = code => vm.runInContext(code, context);
  const read = code => clone(run(code));
  context.fixtureData = clone(data);
  run('CFG=fixtureData.config; _state=fixtureData.days; applyCfg(); render=()=>{}; haptic=()=>{};');
  return { run, read, writes, effects, values, timers };
}

function serverRows(data) {
  return [{ date: 'settings', data: { _cfg: data.config } }, ...Object.entries(data.days).map(([date, day]) => ({
    date, data: { _checks: day.checks, _social: day.social, _people: day.people, _note: day.note, _daylog: day._daylog }
  }))];
}

module.exports = { html, source, cssSource, htmlPath, fixture, loadApp, clone, serverRows };
