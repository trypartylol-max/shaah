// One unauthenticated, read-only request to the explicitly authorized QA gateway.
const fs = require('node:fs');
const path = require('node:path');
const { QA_REF, QA_ORIGIN, guardedFetch } = require('./guard.cjs');

(async () => {
  const result = { projectRef: QA_REF, operation: 'GET /auth/v1/settings', authenticated: false, productionRequests: 0 };
  try {
    const response = await guardedFetch()(QA_ORIGIN + '/auth/v1/settings', { method: 'GET' });
    result.httpStatus = response.status;
    result.gatewayResponded = true;
  } catch { result.gatewayResponded = false; process.exitCode = 1; }
  const target = path.join(__dirname, '../../test-results/supabase-phase2');
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'gateway-probe.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(() => { console.log('QA_PROBE_ERROR'); process.exitCode = 1; });
