const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { html, fixture, serverRows } = require('./helpers.cjs');

let browser;
before(async () => {
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); });

async function openApp(t, data = fixture(), viewport = { width: 1440, height: 1000 }, options = {}) {
  const context = await browser.newContext({ viewport, timezoneId: 'UTC', serviceWorkers: 'block' });
  t.after(() => context.close());
  const unexpectedRequests = [];
  const errors = [];
  await context.route('**/*', async route => {
    const url = route.request().url();
    const parsed = new URL(url);
    if (parsed.origin === 'http://shaah.test' && parsed.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (url.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')) {
      return route.fulfill({ contentType: 'application/javascript', body: '/* Supabase is replaced by the local test double. */' });
    }
    // Fonts and any other external resource never leave this test context.
    if (!url.startsWith('https://fonts.')) unexpectedRequests.push(url);
    return route.abort();
  });
  await context.addInitScript(({ rows, loggedOut }) => {
    const copy = value => JSON.parse(JSON.stringify(value));
    if (!localStorage.getItem('shaah_test_seed')) {
      localStorage.setItem('shaah_test_seed', '1');
      localStorage.setItem('shaah_mock_rows', JSON.stringify(rows.map(r=>({...r,settings_revision:r.settings_revision??0}))));
      localStorage.setItem('shaah_tour_regression-user', '1');
    }
    const getRows = () => JSON.parse(localStorage.getItem('shaah_mock_rows'));
    window.__mockWrites = [];
    window.__mockClientCreated = false;
    window.supabase = { createClient() {
      window.__mockClientCreated = true;
      return {
        auth: {
          getSession: async () => ({ data: { session: loggedOut ? null : { user: { id: 'regression-user', email: 'synthetic@example.invalid' } } } }),
          onAuthStateChange() {}
        },
        async rpc(name,args){
          if(name!=='shaah_save_settings_v1')throw new Error('Unexpected RPC');
          if(args.p_data?.owner_id!=='regression-user')return {data:null,error:{code:'42501'}};
          const rows=getRows(),old=rows.find(r=>r.date==='settings');
          if((old?.settings_revision??null)!==args.p_expected_revision)return {data:null,error:{code:'PT409'}};
          const row={user_id:'regression-user',date:'settings',data:copy(args.p_data.data),settings_revision:(old?.settings_revision??0)+1};
          localStorage.setItem('shaah_mock_rows',JSON.stringify([...rows.filter(r=>r!==old),row]));
          window.__mockWrites.push(copy(row));return {data:{data:copy(row.data),settings_revision:row.settings_revision},error:null};
        },
        from(table) {
          if (table !== 'day_logs') throw new Error('Unexpected table: ' + table);
          let action='select',payload,returning=false;
          const filters=[];
          const equal=(a,b)=>{
            if(a===b)return true;
            if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
            const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
          };
          const query={
            select(){if(action!=='select')returning=true;return query;},
            eq(k,v){if(k==='user_id'&&v!=='regression-user')throw new Error('Unexpected owner');filters.push([k,v]);return query;},
            upsert(row){action='upsert';payload=copy(row);return query;},
            insert(row){action='insert';payload=copy(row);return query;},
            update(row){action='update';payload=copy(row);return query;},
            delete(){action='delete';return query;},
            then(resolve,reject){return Promise.resolve().then(()=>{
              let rows=getRows().map(r=>({user_id:'regression-user',...r}));
              const matches=r=>filters.every(([k,v])=>k==='data'?equal(r.data,JSON.parse(v)):r[k]===v);
              if(action==='select')return {data:copy(rows.filter(matches)),error:null};
              if((action==='upsert'||action==='insert')&&payload.user_id!=='regression-user')throw new Error('Unexpected write owner');
              if(action==='insert'&&rows.some(r=>r.date===payload.date))return {data:null,error:{code:'23505'}};
              let changed=[];
              if(action==='upsert'||action==='insert'){
                rows=rows.filter(r=>r.date!==payload.date);rows.push(copy(payload));changed=[payload];
              }else{
                changed=rows.filter(matches).map(r=>action==='update'?{...r,...copy(payload)}:r);
                rows=rows.flatMap(r=>matches(r)?(action==='delete'?[]:[{...r,...copy(payload)}]):[r]);
              }
              window.__mockWrites.push(...copy(changed));
              localStorage.setItem('shaah_mock_rows',JSON.stringify(rows));
              return {data:returning?copy(changed):null,error:null};
            }).then(resolve,reject);}
          };
          return query;
        },
        channel() {
          return { on() { return this; }, subscribe(fn) { fn('SUBSCRIBED'); return this; } };
        }
      };
    } };
  }, { rows: serverRows(data), loggedOut: !!options.loggedOut });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
  await page.goto(options.url || 'http://shaah.test/');
  if (options.loggedOut) await page.getByRole('button', { name: 'Continue with Google' }).waitFor();
  else {
    await page.waitForFunction(() => typeof _cfgReady !== 'undefined' && _cfgReady && _live);
    await page.locator('.nav-btn[data-tab="social"]').click();
  }
  t.after(() => {
    assert.deepEqual(errors, [], 'No browser runtime exceptions');
    assert.deepEqual(unexpectedRequests, [], 'No unmocked network request, including Supabase');
  });
  assert.equal(await page.evaluate(() => window.__mockClientCreated), true);
  return page;
}


module.exports = { openApp };
