const test=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {bridgeQaWebSocket}=require('../qa/supabase/websocket-bridge.cjs');
const {QA_ORIGIN}=require('../qa/supabase/guard.cjs');
test('QA bridge forwards real protocol frames without exposing payloads in audit',()=>{
  const server=new EventEmitter();server.readyState=0;server.sent=[];server.send=x=>server.sent.push(x);server.close=()=>{server.closed=true;};
  const received=[];let fromClient,onClose;
  const route={url:()=>QA_ORIGIN.replace('https:','wss:')+'/realtime/v1/websocket',onMessage:f=>fromClient=f,onClose:f=>onClose=f,send:x=>received.push(x),close:()=>{}};
  const audit={};bridgeQaWebSocket(route,{audit,transport:{offline:false}},()=>server);
  fromClient('synthetic-JWT-frame');server.readyState=1;server.emit('open');server.emit('message',Buffer.from('server-frame'),false);
  assert.deepEqual(server.sent,['synthetic-JWT-frame']);assert.deepEqual(received,['server-frame']);
  assert.equal(JSON.stringify(audit).includes('synthetic-JWT-frame'),false);onClose();assert.equal(server.closed,true);
});
test('QA bridge refuses other destinations and offline connections before creating a socket',()=>{
  let opened=0,closed=0;const create=()=>{opened++;};
  assert.throws(()=>bridgeQaWebSocket({url:()=> 'wss://unapproved.supabase.co/realtime/v1/websocket'},{audit:{},transport:{offline:false}},create));
  bridgeQaWebSocket({url:()=>QA_ORIGIN.replace('https:','wss:')+'/realtime/v1/websocket',close:()=>closed++},{audit:{},transport:{offline:true}},create);
  assert.equal(opened,0);assert.equal(closed,1);
});
