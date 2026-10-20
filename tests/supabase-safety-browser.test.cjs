const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { html } = require('./helpers.cjs');
const { PRODUCTION_REF, LOCAL_ORIGIN, temporaryHtml, installBrowserGuard } = require('../qa/supabase/guard.cjs');

test('Chromium loads the actual local SDK and blocks production HTTP/WS before forwarding', async () => {
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const audit = { blocked: [], allowedHttp: 0, allowedWebSockets: 0 };
    const sdk = fs.readFileSync(path.join(path.dirname(require.resolve('@supabase/supabase-js')), 'umd/supabase.js'), 'utf8');
    // Exercise the request guard independently of application CSP, which can
    // reject a forbidden destination before a request reaches that guard.
    await installBrowserGuard(context, { html:'<!doctype html><html><head><script src="/sdk.js"></script></head><body>Isolated request guard</body></html>', sdk, audit });
    const page = await context.newPage();
    await page.goto(LOCAL_ORIGIN + '/');
    assert.equal(await page.evaluate(() => typeof window.supabase.createClient), 'function');
    const blocked = await page.evaluate(async ref => {
      try { await fetch(`https://${ref}.supabase.co/rest/v1/day_logs`); return false; }
      catch { return true; }
    }, PRODUCTION_REF);
    assert.equal(blocked, true);
    const closed = await page.evaluate(ref => new Promise(resolve => {
      const socket = new WebSocket(`wss://${ref}.supabase.co/realtime/v1/websocket`);
      socket.onopen = () => resolve(false);
      socket.onclose = () => resolve(true);
      socket.onerror = () => resolve(true);
      setTimeout(() => resolve(false), 3000);
    }), PRODUCTION_REF);
    assert.equal(closed, true);
    assert.equal(audit.allowedHttp, 0);
    assert.equal(audit.allowedWebSockets, 0);
    assert.equal(audit.blocked.filter(item => item.production).length, 2);
  } finally { await browser.close(); }
});
