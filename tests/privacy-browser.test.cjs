const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { openApp } = require('./browser-helpers.cjs');
const { locationFixture } = require('./location-fixtures.cjs');

const openPrivacy = async t => {
  const page=await openApp(t,locationFixture(),{width:390,height:844});
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  page.on('dialog',dialog=>dialog.accept());
  return page;
};

test('shared-device removal signs out locally, clears only that account and leaves synthetic online rows unchanged',async t=>{
  const page=await openPrivacy(t);
  const server=await page.evaluate(()=>localStorage.getItem('shaah_mock_rows'));
  await page.evaluate(()=>{
    localStorage.setItem('shaah_cache_other-account','other-account-copy');
    localStorage.setItem('shaah_bak_regression-user','[{"synthetic":"local backup"}]');
    localStorage.setItem('dayLogV2:regression-user','{"2026-10-15":[]}');
  });
  await page.getByRole('button',{name:'Sign out & remove saved copies',exact:true}).click();
  await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>USER),null);
  for(const key of ['shaah_cache_regression-user','shaah_cfg_regression-user','shaah_bak_regression-user','dayLogV2:regression-user'])assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null,key);
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_cache_other-account')),'other-account-copy');
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_mock_rows')),server);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('shaah_mock_signout_calls'))),[{scope:'local'}]);
  assert.match(await page.getByRole('status').textContent(),/were removed/);
});

test('pending drafts prevent shared-device removal without signing out or losing the draft',async t=>{
  const page=await openPrivacy(t);
  await page.evaluate(()=>localStorage.setItem('shaah_cfg_pending_regression-user',JSON.stringify({base:CFG,draft:CFG})));
  const before=await page.evaluate(()=>localStorage.getItem('shaah_cfg_pending_regression-user'));
  await page.getByRole('button',{name:'Sign out & remove saved copies',exact:true}).click();
  assert.match(await page.locator('#signout-status').textContent(),/Sync your pending changes/);
  assert.equal(await page.evaluate(()=>USER.id),'regression-user');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('shaah_mock_signout_calls')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_cfg_pending_regression-user')),before);
});

test('sign-out failure keeps the app session and displays a safe retry message',async t=>{
  const page=await openPrivacy(t);await page.evaluate(()=>window.__mockSignOutError=true);
  const cache=await page.evaluate(()=>localStorage.getItem('shaah_cache_regression-user'));
  await page.getByRole('button',{name:'Sign out & remove saved copies',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('signout-status').textContent.includes('Could not sign out'));
  assert.equal(await page.evaluate(()=>USER.id),'regression-user');
  assert.equal(await page.evaluate(()=>localStorage.getItem('shaah_cache_regression-user')),cache);
});

test('account editors pause while sign-out waits and become usable again after a failure',async t=>{
  const page=await openPrivacy(t);
  await page.evaluate(()=>{sb.auth.signOut=()=>new Promise(resolve=>{window.__finishSyntheticSignOut=()=>resolve({error:{message:'Synthetic delay failure'}});});});
  await page.getByRole('button',{name:'Sign out & remove saved copies',exact:true}).click();
  await page.waitForFunction(()=>typeof window.__finishSyntheticSignOut==='function');
  assert.equal(await page.locator('#scroll').evaluate(node=>node.inert),true);
  await page.evaluate(()=>window.__finishSyntheticSignOut());
  await page.waitForFunction(()=>!document.getElementById('scroll').inert);
  assert.equal(await page.evaluate(()=>USER.id),'regression-user');
  assert.match(await page.locator('#signout-status').textContent(),/Could not sign out/);
});

test('older unlinked activity stays out of the account and can be downloaded for recovery',async t=>{
  const page=await openApp(t,locationFixture());
  await page.evaluate(()=>localStorage.setItem('dayLogV1',JSON.stringify({'2026-01-01':[{title:'Synthetic unlinked activity'}]})));
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
  assert.equal(await page.evaluate(()=>_state['2026-01-01']),undefined);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Download older activity',exact:true}).first().waitFor();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download older activity',exact:true}).first().click();
  const file=await(await download).path();const body=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(body.owner,null);assert.equal(body.activityCopies.dayLogV1['2026-01-01'][0].title,'Synthetic unlinked activity');
});

test('the original static Pages artifact runs navigation and skins under its actual script-element CSP',async t=>{
  const {html}=require('./helpers.cjs');
  const csp=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp,/script-src 'self'; script-src-elem 'self';/);
  assert.match(csp,/script-src-attr 'unsafe-inline';/,'Legacy handler exception remains explicit');
  assert.equal([...html.matchAll(/<script\b([^>]*)>/g)].filter(([,attrs])=>! /\bsrc\s*=/.test(attrs)).length,0);
  const page=await openApp(t,locationFixture(),{width:390,height:844});
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.locator('[data-skin-choice="matrix"]').click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  for(const tab of ['today','log','social','stats','history']){
    await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
    assert.equal(await page.locator(`.nav-btn[data-tab="${tab}"]`).getAttribute('aria-current'),'page');
  }
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const output=path.join(__dirname,'../test-results/original-v10-release');fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,'strict-csp-settings-mobile.png'),animations:'disabled'});
  assert.equal(await page.evaluate(()=>SUPABASE_URL),'https://llpyxktcfubhmthqujpa.supabase.co');
  assert.equal(await page.evaluate(()=>window.SHAAH_QA_TARGET),undefined);
});
