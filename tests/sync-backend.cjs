// In-memory PostgREST semantics for deterministic concurrency/failure tests.
const { isDeepStrictEqual } = require('node:util');
const { clone } = require('./helpers.cjs');
function syncBackend(rows = []) {
  const state = { rows: clone(rows).map(r=>({...r,settings_revision:r.settings_revision??0})), writes: [], beforeMutation: null };
  async function rpc(name,args,userId){
    if(name!=='shaah_save_settings_v1')throw new Error('Unexpected RPC');
    if(args.p_data?.owner_id!==userId)return {data:null,error:{code:'42501'}};
    const data=args.p_data.data;
    const filters=[['user_id',userId],['date','settings']],payload={data:clone(data)};
    const action=args.p_expected_revision===null?'insert':'update';
    await state.beforeMutation?.({action,payload,filters,rpc:name});
    const old=state.rows.find(r=>r.user_id===userId&&r.date==='settings');
    if((old?.settings_revision??null)!==args.p_expected_revision)return {data:null,error:{code:'PT409'}};
    const row={user_id:userId,date:'settings',data:clone(data),settings_revision:(old?.settings_revision??0)+1};
    state.rows=state.rows.filter(r=>r!==old);state.rows.push(row);state.writes.push({action,rows:clone([row]),rpc:name});
    return {data:{data:clone(row.data),settings_revision:row.settings_revision},error:null};
  }
  state.client = { auth: { onAuthStateChange() {} }, rpc:(name,args)=>rpc(name,args,state.userId||state.rows[0]?.user_id||'synthetic-A'), from(table) {
    if (table !== 'day_logs') throw new Error('Unexpected table');
    let action = 'select', payload, returning = false;
    const filters = [];
    const query = {
      select() { if (action !== 'select') returning = true; return query; },
      eq(k,v) { filters.push([k,v]); return query; },
      like(k,v) { filters.push([k,v,'prefix']);return query; },
      update(data) { action='update';payload=clone(data);return query; },
      insert(data) { action='insert';payload=clone(data);return query; },
      upsert(data) { action='upsert';payload=clone(data);return query; },
      delete() { action='delete';return query; },
      then(resolve,reject) { return execute().then(resolve,reject); }
    };
    async function execute() {
      if(action!=='select') await state.beforeMutation?.({action,payload,filters});
      const matches = r => filters.every(([k,v,op]) => op==='prefix'?String(r[k]).startsWith(v.slice(0,-1)):k==='data' ? isDeepStrictEqual(r.data,JSON.parse(v)) : r[k]===v);
      if(action==='select') {await state.beforeSelect?.({filters});return {data:clone(state.rows.filter(matches)),error:null};}
      if(action==='insert' && state.rows.some(r=>r.user_id===payload.user_id&&r.date===payload.date)) return {data:null,error:{code:'23505'}};
      let changed=[];
      if(action==='insert'||action==='upsert') {
        state.rows=state.rows.filter(r=>r.user_id!==payload.user_id||r.date!==payload.date);
        state.rows.push(clone(payload));changed=[payload];
      } else {
        changed=state.rows.filter(matches).map(r=>action==='update'?{...r,...clone(payload)}:r);
        state.rows=state.rows.flatMap(r=>matches(r)?(action==='delete'?[]:[{...r,...clone(payload)}]):[r]);
      }
      state.writes.push({action,rows:clone(changed)});
      return {data:returning?clone(changed):null,error:null};
    }
    return query;
  } };
  state.clientFor=userId=>Object.assign(Object.create(state.client),{rpc:(name,args)=>rpc(name,args,userId)});
  return state;
}
module.exports={syncBackend};
