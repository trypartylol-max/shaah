// Non-destructive public-key preflight. No Auth login, writes or existing row content.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { QA_REF, QA_ORIGIN, validateKey, guardedFetch } = require('./guard.cjs');

async function publicPreflight(key, send = guardedFetch()) {
  validateKey(key);
  const headers = { apikey: key };
  const settings = await send(QA_ORIGIN + '/auth/v1/settings', { method: 'GET', headers });
  const flags = settings.ok ? await settings.json() : {};
  // limit=0 never requests application row content, even if the grants are wrong.
  const anonymous = await send(QA_ORIGIN + '/rest/v1/day_logs?select=user_id&limit=0', { method: 'GET', headers });
  return {
    projectRef: QA_REF,
    scope: 'public-key gateway and anonymous table permission only',
    status: settings.status === 200 && [401, 403].includes(anonymous.status) ? 'passed' : 'blocked',
    authSettingsHttpStatus: settings.status,
    passwordProviderEnabled: flags.external?.email === true,
    signupDisabled: typeof flags.disable_signup === 'boolean' ? flags.disable_signup : null,
    emailAutoConfirm: typeof flags.mailer_autoconfirm === 'boolean' ? flags.mailer_autoconfirm : null,
    anonymousTableHttpStatus: anonymous.status,
    authenticatedSyncExecuted: false,
    applicationRowsRequested: 0,
    writes: 0,
    keyPrinted: false
  };
}

async function main() {
  let key;
  if (process.argv.includes('--key-stdin')) {
    const input = readline.createInterface({ input: process.stdin, terminal: false });
    key = await new Promise(resolve => {
      input.once('line', line => { resolve(line.trim()); input.close(); process.stdin.pause(); });
      input.once('close', () => resolve(''));
    });
    process.stdin.unref?.();
  } else key = process.env.SHAAH_TEST_SUPABASE_PUBLISHABLE_KEY;
  let report;
  try { report = await publicPreflight(key || ''); }
  catch { report = { projectRef: QA_REF, status: 'blocked', code: 'QA_PUBLIC_PREFLIGHT_UNAVAILABLE', authenticatedSyncExecuted: false }; }
  const output = path.resolve(__dirname, '../../test-results/supabase-phase2');
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(output, 'public-preflight.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'passed') process.exitCode = 2;
}
if (require.main === module) main().catch(() => { console.log('QA_PUBLIC_PREFLIGHT_UNAVAILABLE'); process.exitCode=2; });
module.exports = { publicPreflight };
