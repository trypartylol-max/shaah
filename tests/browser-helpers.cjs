const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const { html, htmlPath, source, cssSource, fixture, serverRows } = require('./helpers.cjs');

let browser;
before(async () => {
  if(process.env.SHAAH_BROWSER_ENGINE==='webkit'){
    browser=await webkit.launch({headless:true,executablePath:process.env.SHAAH_WEBKIT_EXECUTABLE||undefined});return;
  }
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); });

async function openApp(t, data = fixture(), viewport = { width: 1440, height: 1000 }, options = {}) {
  const pageHtml=options.htmlFile?fs.readFileSync(options.htmlFile,'utf8'):html;
  const appOrigin=new URL(options.url||'http://shaah.test/').origin;
  const pageRoot=options.assetsRoot||path.dirname(options.htmlFile||htmlPath);
  const context = await browser.newContext({ viewport, timezoneId: 'UTC', serviceWorkers: 'block' });
  t.after(() => context.close());
  const unexpectedRequests = [];
  const errors = [];
  await context.route('**/*', async route => {
    const url = route.request().url();
    const parsed = new URL(url);
    if (options.worker && parsed.origin === appOrigin) {
      if (route.request().method() !== 'GET') { unexpectedRequests.push('Unmocked method: ' + route.request().method()); return route.abort(); }
      if (parsed.pathname === '/sdk.js') return route.fulfill({ contentType: 'application/javascript', body: '/* local SDK test double already installed */' });
      const response = await options.worker.fetch(new Request(url), options.workerEnv);
      return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    }
    if (parsed.origin === appOrigin && parsed.pathname === '/') return route.fulfill({ contentType: 'text/html', body: pageHtml });
    if(parsed.origin===appOrigin&&/^\/assets\/[\w.-]+\.(?:js|css|woff2?)$/.test(parsed.pathname)){
      const appAsset=!options.htmlFile && /^\/assets\/app\.[a-f0-9]{16}\.(js|css)$/.exec(parsed.pathname);
      const body=appAsset?.[1]==='js' && process.env.SHAAH_SOURCE ? source
        : appAsset?.[1]==='css' && cssSource!==null ? cssSource
        : fs.readFileSync(path.join(pageRoot,parsed.pathname.slice(1)));
      return route.fulfill({contentType:parsed.pathname.endsWith('.css')?'text/css':/\.woff2?$/.test(parsed.pathname)?'font/woff2':'application/javascript',body});
    }
    if (url.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')) {
      return route.fulfill({ contentType: 'application/javascript', body: '/* Supabase is replaced by the local test double. */' });
    }
    // The previous Original loaded Google font CSS. Compare it with the same
    // validated self-contained font bytes, without any external request.
    if(parsed.origin==='https://fonts.googleapis.com'){
      return route.fulfill({contentType:'text/css',body:fs.readFileSync(options.fontCSSFile||path.join(pageRoot,'assets','fonts.css'),'utf8')});
    }
    // Fonts and any other external resource never leave this test context.
    if (!url.startsWith('https://fonts.')) unexpectedRequests.push(url);
    return route.abort();
  });
  await context.routeWebSocket('**/*',socket=>{unexpectedRequests.push('Unmocked WebSocket');socket.close();});
  await context.addInitScript(({ rows, loggedOut, extraRows, authEmail }) => {
    const copy = value => JSON.parse(JSON.stringify(value));
    const allowedOwners=new Set(['regression-user',...Object.keys(extraRows)]);
    const rowsKey=owner=>owner==='regression-user'?'shaah_mock_rows':'shaah_mock_rows:'+owner;
    if (!localStorage.getItem('shaah_test_seed')) {
      localStorage.setItem('shaah_test_seed', '1');
      localStorage.setItem('shaah_mock_rows', JSON.stringify(rows.map(r=>({...r,settings_revision:r.settings_revision??0}))));
      localStorage.setItem('shaah_tour_regression-user', '1');
      for(const [owner,records] of Object.entries(extraRows)){
        localStorage.setItem(rowsKey(owner),JSON.stringify(records.map(r=>({...r,user_id:owner,settings_revision:r.settings_revision??0}))));
        localStorage.setItem('shaah_tour_'+owner,'1');
      }
    }
    const getRows = (owner='regression-user') => JSON.parse(localStorage.getItem(rowsKey(owner)));
    window.__mockWrites = [];
    window.__mockClientCreated = false;
    window.supabase = { createClient() {
      window.__mockClientCreated = true;
      return {
        auth: {
          getSession: async () => ({ data: { session: loggedOut || sessionStorage.getItem('shaah_mock_signedout') ? null : { user: { id: 'regression-user', email: authEmail } } } }),
          signOut: async options => {
            const calls = JSON.parse(sessionStorage.getItem('shaah_mock_signout_calls') || '[]'); calls.push(options);
            sessionStorage.setItem('shaah_mock_signout_calls', JSON.stringify(calls));
            if (window.__mockSignOutError) return { error: { message: 'Synthetic signout failure' } };
            sessionStorage.setItem('shaah_mock_signedout', '1'); return { error: null };
          },
          onAuthStateChange(callback) {
            window.__emitMockAuth=(event,user)=>callback(event,user?{user}:null);
          }
        },
        async rpc(name,args){
          if(name!=='shaah_save_settings_v1')throw new Error('Unexpected RPC');
          const owner=args.p_data?.owner_id;
          if(!allowedOwners.has(owner))return {data:null,error:{code:'42501'}};
          const rows=getRows(owner),old=rows.find(r=>r.date==='settings');
          if((old?.settings_revision??null)!==args.p_expected_revision)return {data:null,error:{code:'PT409'}};
          const row={user_id:owner,date:'settings',data:copy(args.p_data.data),settings_revision:(old?.settings_revision??0)+1};
          localStorage.setItem(rowsKey(owner),JSON.stringify([...rows.filter(r=>r!==old),row]));
          window.__mockWrites.push(copy(row));return {data:{data:copy(row.data),settings_revision:row.settings_revision},error:null};
        },
        from(table) {
          if (table !== 'day_logs') throw new Error('Unexpected table: ' + table);
          let action='select',payload,returning=false,countExact=false,sortKey=null,bounds=null;
          const filters=[];
          const equal=(a,b)=>{
            if(a===b)return true;
            if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
            const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
          };
          const query={
            select(_columns,options){if(action!=='select')returning=true;countExact=options?.count==='exact';return query;},
            order(key){sortKey=key;return query;},
            range(from,to){bounds=[from,to];return query;},
            eq(k,v){if(k==='user_id'&&!allowedOwners.has(v))throw new Error('Unexpected owner');filters.push([k,v]);return query;},
            upsert(row){action='upsert';payload=copy(row);return query;},
            insert(row){action='insert';payload=copy(row);return query;},
            update(row){action='update';payload=copy(row);return query;},
            delete(){action='delete';return query;},
            then(resolve,reject){return Promise.resolve().then(()=>{
              const owner=filters.find(([k])=>k==='user_id')?.[1]||payload?.user_id;
              if(!allowedOwners.has(owner))throw new Error('Missing or unexpected owner');
              let rows=getRows(owner).map(r=>({user_id:owner,...r}));
              const matches=r=>filters.every(([k,v])=>k==='data'?equal(r.data,JSON.parse(v)):r[k]===v);
              if(action==='select'){const found=rows.filter(matches);if(sortKey)found.sort((a,b)=>String(a[sortKey]).localeCompare(String(b[sortKey])));return {data:copy(bounds?found.slice(bounds[0],bounds[1]+1):found),count:countExact?found.length:null,error:null};}
              if((action==='upsert'||action==='insert')&&payload.user_id!==owner)throw new Error('Unexpected write owner');
              if(action==='insert'&&rows.some(r=>r.date===payload.date))return {data:null,error:{code:'23505'}};
              let changed=[];
              if(action==='upsert'||action==='insert'){
                rows=rows.filter(r=>r.date!==payload.date);rows.push(copy(payload));changed=[payload];
              }else{
                changed=rows.filter(matches).map(r=>action==='update'?{...r,...copy(payload)}:r);
                rows=rows.flatMap(r=>matches(r)?(action==='delete'?[]:[{...r,...copy(payload)}]):[r]);
              }
              window.__mockWrites.push(...copy(changed));
              localStorage.setItem(rowsKey(owner),JSON.stringify(rows));
              return {data:returning?copy(changed):null,error:null};
            }).then(resolve,reject);}
          };
          return query;
        },
        removeChannel() {},
        channel() {
          const handlers=[];
          return { on(_event,filter,callback) { handlers.push({filter,callback});return this; }, subscribe(fn) {
            window.__emitMockRealtime=payload=>{
              const handler=handlers.find(h=>h.filter.event===payload.eventType);
              return handler?.callback(payload);
            };
            fn('SUBSCRIBED');return this;
          } };
        }
      };
    } };
    // Keep the controlled client while loading the exact real SDK bytes under
    // their normal SRI. The SDK export cannot replace this synthetic adapter.
    const syntheticSDK=window.supabase;
    Object.defineProperty(window,'supabase',{configurable:true,get:()=>syntheticSDK,set(){}});
  }, { rows: serverRows(data), loggedOut: !!options.loggedOut, authEmail: options.authEmail ?? 'synthetic@example.invalid',extraRows:Object.fromEntries(Object.entries(options.syntheticAccounts||{}).map(([owner,data])=>[owner,serverRows(data)])) });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console',message=>{
    if(message.type()==='error'&&/content security policy|violates the following|refused to execute inline|integrity|digest/i.test(message.text()))errors.push('Unexpected CSP or integrity violation');
  });
  await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
  await page.goto(options.url || 'http://shaah.test/');
  if (options.loggedOut) await page.getByRole('button', { name: options.loginButtonName || 'Continue with Google' }).waitFor();
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
