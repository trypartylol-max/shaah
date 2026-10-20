// Fresh logged-out browser: public assets only, never Auth/API/WebSocket traffic.
// --candidate checks the local Pages artifact; default checks the deployed original.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const candidate = process.argv.includes('--candidate');
const releaseCommit = process.env.SHAAH_RELEASE_COMMIT;
assert.match(releaseCommit || '', /^[a-f0-9]{40}$/);
const site = candidate ? 'http://shaah.test/shaah/' : 'https://trypartylol-max.github.io/shaah/';
const expectedHtml = fs.readFileSync(path.join(root, 'index.html'));
const markup = expectedHtml.toString('utf8');
const appFile = markup.match(/<script data-shaah-app src="\.\/([^"]+)"/)[1];
const expectedApp = fs.readFileSync(path.join(root, appFile));
const sdkFile = 'assets/supabase-2.118.0.js';
const paths = new Map([[new URL(site).pathname, 'index.html'],
  [new URL(appFile, site).pathname, appFile], [new URL(sdkFile, site).pathname, sdkFile]]);
for(const match of markup.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)) paths.set(new URL(match[1],site).pathname,match[1]);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = { checkedAtUtc: new Date().toISOString(), environment: 'ORIGINAL',
  mode: candidate ? 'local-candidate' : 'published', releaseCommit, url: site,
  scope: 'Logged-out asset GETs only; no authenticated synchronization or personal session.',
  cases: [], runtimeErrors: 0, forbiddenMethods: 0, supabaseAttempts: 0,
  webSocketAttempts: 0, blockedDestinations: 0, integrityOrCspErrors: 0, publicAssetGets: 0 };
const cache = new Map();
const record = name => report.cases.push({ name, status: 'passed' });
const allowed = u => !u.username && !u.password && (
  u.origin === new URL(site).origin && paths.has(u.pathname) &&
    (!u.search || (u.pathname === new URL(site).pathname && u.search === '?release=' + releaseCommit)));
async function assetGet(input) {
  const u = new URL(input); assert.ok(allowed(u), 'Public asset allowlist');
  const key = u.origin + u.pathname + (paths.has(u.pathname) ? '' : u.search);
  if (cache.has(key)) return cache.get(key);
  let asset;
  if (candidate && u.origin === new URL(site).origin) {
    const file = paths.get(u.pathname);
    asset = { status: 200, contentType: file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css')?'text/css':'application/javascript', body: fs.readFileSync(path.join(root, file)) };
  } else {
    const response = await fetch(u, { headers: { 'Cache-Control': 'no-cache' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, 'Public asset HTTP status');
    const headers = Object.fromEntries(response.headers);
    for (const h of ['content-encoding', 'content-length', 'transfer-encoding']) delete headers[h];
    asset = { status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) };
  }
  cache.set(key, asset); report.publicAssetGets++; return asset;
}
(async () => {
  let browser;
  try {
    const landing = site + '?release=' + releaseCommit;
    const response = await assetGet(landing);
    report.htmlSha256 = hash(response.body);
    assert.equal(report.htmlSha256, hash(expectedHtml));
    record('HTML_matches_the_exact_tested_original_candidate');
    if(!candidate){
      const ordinary=await fetch(site,{headers:{'Cache-Control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(20000)});
      assert.equal(ordinary.status,200);const bytes=Buffer.from(await ordinary.arrayBuffer());
      assert.equal(hash(bytes),hash(expectedHtml));report.normalUrlHtmlSha256=hash(bytes);
      record('normal_original_URL_without_release_parameter_serves_the_tested_version');
    }
    const csp = response.body.toString('utf8').match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    assert.match(csp, /script-src 'self'; script-src-elem 'self';/);
    assert.match(csp, /script-src-attr 'none';/);
    assert.match(csp,/style-src 'self'; style-src-elem 'self'; style-src-attr 'none';/);
    assert.doesNotMatch(csp,/unsafe-inline|unsafe-eval|unsafe-hashes/);
    assert.doesNotMatch(markup,/<style\b|\sstyle\s*=/i);
    assert.match(csp, /connect-src 'self' https:\/\/llpyxktcfubhmthqujpa\.supabase\.co wss:\/\/llpyxktcfubhmthqujpa\.supabase\.co;/);
    assert.equal([...markup.matchAll(/<script\b([^>]*)>/g)].filter(([,attrs]) => !/\bsrc\s*=/.test(attrs)).length, 0);
    record('actual_meta_CSP_limits_script_elements_and_preserves_original_backend');
    for (const match of markup.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*integrity="([^"]+)"[^>]*>/g)) {
      const asset = await assetGet(new URL(match[1], site));
      assert.equal(match[2], 'sha384-' + crypto.createHash('sha384').update(asset.body).digest('base64'));
    }
    const app = await assetGet(new URL(appFile, site));
    assert.equal(hash(app.body), hash(expectedApp)); report.appSha256 = hash(app.body);
    assert.equal(hash((await assetGet(new URL(sdkFile, site))).body), hash(fs.readFileSync(path.join(root, sdkFile))));
    record('same_origin_versioned_application_and_pinned_SDK_bytes_match_SRI');
    const code = app.body.toString('utf8');
    assert.ok(code.includes('Sign out &amp; remove saved copies') || code.includes('Sign out & remove saved copies'));
    assert.ok(code.includes('dayLogLocalKey') && code.includes('accountCopyStatus') && code.includes("scope:'local'"));
    assert.ok(!code.includes('kpnwiwaiwnndpvtxkvva') && !code.includes('SHAAH_QA_'));
    assert.ok(code.includes('function resetAccountView(')&&code.includes('function restoreAccountLocal('));
    assert.ok(code.includes('const UI_ACTIONS=')&&code.includes('function uiStyle('));
    assert.doesNotMatch(code,/\son[a-z]+\s*=\s*["']/i);
    record('session_isolation_and_strict_UI_controls_present_without_QA_runtime');
    const dock = markup.match(/<nav[^>]*id="nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
    assert.deepEqual([...dock.matchAll(/data-tab="([^"]+)"/g)].map(x => x[1]), ['today', 'log', 'social', 'stats', 'history']);
    record('all_five_dock_tabs_exist_before_initialization');
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    for (const [name, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 1000 }]]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      try {
        await context.route('**/*', async route => {
          const request = route.request(), u = new URL(request.url());
          if (request.method() !== 'GET') { report.forbiddenMethods++; return route.abort(); }
          if (u.hostname.endsWith('.supabase.co')) { report.supabaseAttempts++; return route.abort(); }
          if (!allowed(u)) { report.blockedDestinations++; return route.abort(); }
          return route.fulfill(await assetGet(u.href));
        });
        await context.routeWebSocket('**/*', socket => { report.webSocketAttempts++; socket.close(); });
        const page = await context.newPage(); page.setDefaultTimeout(15000);
        page.on('pageerror', () => report.runtimeErrors++);
        page.on('console', message => { if (message.type() === 'error' && /integrity|digest|content security policy|violates the following/i.test(message.text())) report.integrityOrCspErrors++; });
        await page.goto(landing);
        await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => USER), null);
        assert.equal(await page.evaluate(() => typeof window.supabase.createClient), 'function');
        record(name + '_real_SDK_renders_logged_out_login');
        const palettes = [];
        for (const skin of ['matrix', 'minimal', 'classic']) {
          await page.evaluate(skin => setSkin(skin), skin); await page.reload();
          await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor();
          assert.equal(await page.locator('html').getAttribute('data-skin'), skin);
          assert.equal(await page.evaluate(() => USER), null);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          palettes.push(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
          if (skin === 'matrix') {
            // The original deliberately hides its dock on the logged-out screen.
            // Verify the themed artwork without treating sign-in as a requirement.
            assert.equal(await page.locator('#nav .matrix-icon').count(), 5);
            assert.notEqual(await page.locator('#nav .matrix-icon').first().evaluate(el => getComputedStyle(el).display), 'none');
            assert.equal(await page.locator('.matrix-wordmark').evaluate(el => getComputedStyle(el).color), 'rgb(0, 255, 65)');
            await page.emulateMedia({ reducedMotion: 'reduce' });
            assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('.matrix-wordmark')).animationName, getComputedStyle(document.body, '::before').animationName]), ['none','none']);
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            record(name + '_Matrix_icons_phosphor_and_reduced_motion');
          } else assert.equal(await page.locator('.matrix-icon:visible').count(), 0);
        }
        assert.equal(new Set(palettes).size, 3);
        record(name + '_three_skins_persist_without_overflow_or_signin');
      } finally { await context.close(); }
    }
    for (const key of ['runtimeErrors','forbiddenMethods','supabaseAttempts','webSocketAttempts','blockedDestinations','integrityOrCspErrors']) assert.equal(report[key], 0, key);
    record('no_runtime_integrity_CSP_Auth_API_or_WebSocket_errors_or_requests'); report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.errorClass = error.name; report.errorMessage = String(error.message).replace(/[A-Za-z0-9_-]{80,}/g,'[redacted]').slice(0,300); }
  finally {
    await browser?.close();
    const output = path.join(root, 'test-results/security-promotion'); fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, candidate ? 'candidate-readonly.json' : 'published-readonly.json'), JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report)); if (report.status !== 'passed') process.exitCode=2;
  }
})();
