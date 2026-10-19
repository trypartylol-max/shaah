// Verify the approved original deployment with a fresh, logged-out browser.
// Only public HTML, the exact pinned SDK and font assets may be fetched.
// Never forward Auth/API/WebSocket requests or use a personal session.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');

const SITE = 'https://trypartylol-max.github.io/shaah/';
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js';
const EXPECTED = '37daead4e8112445213b838d4a51266c4ac9d0f6ec48ac05b2ba8e3116e62b2d';
const releaseCommit = process.env.SHAAH_RELEASE_COMMIT;
assert.match(releaseCommit || '', /^[a-f0-9]{40}$/, 'Provide the actual published commit SHA');
const report = {
  checkedAtUtc: new Date().toISOString(), url: SITE,
  releaseCommit,
  scope: 'Published original HTML and real SDK; logged-out GET-only smoke. No authenticated integration.',
  expectedHtmlSha256: EXPECTED, cases: [], runtimeErrors: 0,
  forbiddenMethods: 0, supabaseAttempts: 0, webSocketAttempts: 0,
  blockedDestinations: 0, publicAssetGets: 0, sdkIntegrityErrors: 0
};
const cache = new Map();
const record = name => report.cases.push({ name, status: 'passed' });
const allowed = u => u.href === SITE || u.href === SDK ||
  (u.protocol === 'https:' && !u.username && !u.password &&
    ((u.hostname === 'fonts.googleapis.com' && u.pathname === '/css2') || u.hostname === 'fonts.gstatic.com'));

async function publicGet(url) {
  const u = new URL(url);
  assert.ok(allowed(u), 'Only approved public resources');
  if (cache.has(u.href)) return cache.get(u.href);
  const response = await fetch(u, { headers: { 'Cache-Control': 'no-cache' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, 'Public resource available');
  const headers = Object.fromEntries(response.headers);
  // Node fetch decompresses; do not advertise compression for decoded bytes.
  delete headers['content-encoding']; delete headers['content-length']; delete headers['transfer-encoding'];
  const asset = { status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) };
  cache.set(u.href, asset); report.publicAssetGets++;
  return asset;
}

(async () => {
  let browser;
  try {
    const root = await publicGet(SITE);
    report.htmlSha256 = createHash('sha256').update(root.body).digest('hex');
    assert.equal(report.htmlSha256, EXPECTED, 'Published source is the exact tested candidate');
    record('published_HTML_matches_the_exact_Matrix_candidate');
    const html = root.body.toString('utf8');
    assert.ok(html.includes('APPEARANCE · SKINS') && html.includes('Bajo estímulo') && html.includes("label:'Matrix'"));
    assert.ok(html.includes('llpyxktcfubhmthqujpa.supabase.co') && !html.includes('kpnwiwaiwnndpvtxkvva'));
    record('published_picker_and_original_backend_identity');
    const dock = html.match(/<nav[^>]*id="nav"[^>]*>([\s\S]*?)<\/nav>/);
    assert.ok(dock, 'Static dock exists before SDK initialization');
    assert.deepEqual([...dock[1].matchAll(/data-tab="([^"]+)"/g)].map(match => match[1]), ['today', 'log', 'social', 'stats', 'history']);
    record('all_five_static_dock_tabs_in_existing_order');
    const sdk = await publicGet(SDK);
    const integrity = 'sha384-' + createHash('sha384').update(sdk.body).digest('base64');
    assert.ok(html.includes('integrity="' + integrity + '" crossorigin="anonymous"'));
    record('public_SDK_matches_published_SRI');

    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'no-preference' });
      try {
        await context.route('**/*', async route => {
          const request = route.request(), u = new URL(request.url());
          if (request.method() !== 'GET') { report.forbiddenMethods++; return route.abort(); }
          if (u.hostname.endsWith('.supabase.co')) { report.supabaseAttempts++; return route.abort(); }
          if (!allowed(u)) { report.blockedDestinations++; return route.abort(); }
          try { return await route.fulfill(await publicGet(u.href)); }
          catch { report.blockedDestinations++; return route.abort(); }
        });
        await context.routeWebSocket('**/*', socket => { report.webSocketAttempts++; socket.close(); });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.on('pageerror', () => report.runtimeErrors++);
        page.on('console', message => {
          if (message.type() === 'error' && /integrity|digest/i.test(message.text())) report.sdkIntegrityErrors++;
        });
        await page.goto(SITE);
        await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => USER), null);
        assert.equal(await page.evaluate(() => typeof window.supabase.createClient), 'function');
        record(name + '_real_SDK_and_logged_out_login_render');
        const backgrounds = [];
        for (const id of ['matrix', 'minimal', 'classic']) {
          await page.evaluate(id => setSkin(id), id);
          await page.reload();
          await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor();
          assert.equal(await page.locator('html').getAttribute('data-skin'), id);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          assert.equal(await page.evaluate(() => USER), null);
          backgrounds.push(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
          if (id === 'matrix') {
            const matrix = await page.evaluate(() => {
              const logo = getComputedStyle(document.querySelector('.matrix-wordmark'));
              const edge = getComputedStyle(document.body, '::before');
              return { color: logo.color, logoAnimation: logo.animationName, edgeAnimation: edge.animationName, edgePointer: edge.pointerEvents, edgeWidth: parseFloat(edge.width), edgeOpacity: parseFloat(edge.opacity) };
            });
            assert.equal(matrix.color, 'rgb(0, 255, 65)');
            assert.equal(matrix.logoAnimation, 'matrix-microtwitch');
            assert.equal(matrix.edgeAnimation, 'matrix-code-drift');
            assert.equal(matrix.edgePointer, 'none');
            assert.ok(matrix.edgeWidth <= 9 && matrix.edgeOpacity <= .12);
            await page.emulateMedia({ reducedMotion: 'reduce' });
            assert.deepEqual(await page.evaluate(() => [
              getComputedStyle(document.querySelector('.matrix-wordmark')).animationName,
              getComputedStyle(document.body, '::before').animationName,
              getComputedStyle(document.body, '::after').animationName
            ]), ['none', 'none', 'none']);
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            record(name + '_Matrix_neon_passive_edges_and_reduced_motion');
          } else {
            assert.equal(await page.evaluate(() => getComputedStyle(document.body, '::before').content), 'none');
            assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.matrix-wordmark')).animationName), 'none');
          }
        }
        assert.equal(new Set(backgrounds).size, 3);
        record(name + '_three_palettes_persist_after_reload_without_overflow');
      } finally { await context.close(); }
    }
    for (const key of ['runtimeErrors', 'forbiddenMethods', 'supabaseAttempts', 'webSocketAttempts', 'blockedDestinations', 'sdkIntegrityErrors']) {
      assert.equal(report[key], 0, key + ' must stay zero');
    }
    record('no_runtime_errors_Auth_API_writes_or_WebSocket_requests');
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.errorClass = error.name;
  } finally {
    await browser?.close();
    const dir = path.join(__dirname, '../../test-results/original-matrix-release');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'published-readonly.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
    if (report.status !== 'passed') process.exitCode = 2;
  }
})();
