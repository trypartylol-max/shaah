const { QA_ORIGIN, guardedFetch } = require('./guard.cjs');

function apiClient(config, send = guardedFetch()) {
  const audit = { requests: 0 };
  async function request(method, path, token, body, extraHeaders = {}) {
    const headers = { apikey: config.key, ...extraHeaders };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    audit.requests++;
    let response;
    try {
      response = await send(QA_ORIGIN + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body),signal:AbortSignal.timeout(30000) });
    } catch (error) { const safe=error?.name==='TimeoutError'?'QA_NETWORK_TIMEOUT':'QA_NETWORK_UNAVAILABLE';throw new Error(safe); }
    let data = null;
    try { data = await response.json(); } catch {}
    return { status: response.status, ok: response.ok, data };
  }
  async function login(who) {
    const user = config.users[who];
    const result = await request('POST', '/auth/v1/token?grant_type=password', null, { email: user.email, password: user.password });
    const session = result.data;
    if (!result.ok || !session?.access_token || !session?.refresh_token) throw new Error('QA_AUTH_FAILED');
    if (session.user?.id !== user.id) throw new Error('QA_IDENTITY_MISMATCH');
    const verified = await request('GET', '/auth/v1/user', session.access_token);
    if (!verified.ok || verified.data?.id !== user.id) throw new Error('QA_IDENTITY_MISMATCH');
    session.expires_at ||= Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
    return session;
  }
  async function rows(who, session) {
    const result = await request('GET', `/rest/v1/day_logs?select=user_id,date,data&user_id=eq.${config.users[who].id}&order=date.asc`, session.access_token);
    if (!result.ok || !Array.isArray(result.data)) throw new Error('QA_TABLE_NOT_ACCESSIBLE');
    if (result.data.some(row => row.user_id !== config.users[who].id)) throw new Error('QA_OWNER_MISMATCH');
    return result.data;
  }
  async function seed(who, session, data) {
    const settings=data.filter(row=>row.date==='settings'),days=data.filter(row=>row.date!=='settings');
    if(settings.length>1)throw new Error('QA_SEED_INVALID');
    if(settings.length){
      const cfg=await request('POST','/rest/v1/rpc/shaah_save_settings_v1',session.access_token,{p_expected_revision:null,p_data:{owner_id:config.users[who].id,data:settings[0].data}});
      if(!cfg.ok)throw new Error('QA_SEED_REJECTED');
    }
    if(days.length){
      const result = await request('POST', '/rest/v1/day_logs', session.access_token,
        days.map(row => ({ ...row, user_id: config.users[who].id })), { Prefer: 'return=minimal' });
      if (!result.ok) throw new Error('QA_SEED_REJECTED');
    }
  }
  return { request, login, rows, seed, audit };
}

async function waitFor(read, predicate, timeout = 15000) {
  const deadline = Date.now() + timeout;
  do {
    const value = await read();
    if (predicate(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (Date.now() < deadline);
  throw new Error('QA_CONVERGENCE_TIMEOUT');
}

module.exports = { apiClient, waitFor };
