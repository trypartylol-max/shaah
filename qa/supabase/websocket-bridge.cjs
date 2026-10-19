// Real QA-only WebSocket transport through the session HTTP proxy and CA trust.
// No payload logging, TLS exceptions, local fake server or destination fallback.
const {WebSocket}=require('ws');
const {HttpsProxyAgent}=require('https-proxy-agent');
const {assertQaUrl}=require('./guard.cjs');
function bridgeQaWebSocket(route,{audit,transport,table='day_logs'},createSocket){
  assertQaUrl(route.url(),true);
  if(transport.offline){route.close({code:1001,reason:'QA offline simulation'});return null;}
  const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
  const server=createSocket?createSocket(route.url()):new WebSocket(route.url(),{handshakeTimeout:15000,...(proxy?{agent:new HttpsProxyAgent(proxy)}:{})});
  const queue=[];
  route.onMessage(message=>{if(server.readyState===WebSocket.OPEN)server.send(message);else if(server.readyState===WebSocket.CONNECTING)queue.push(message);});
  route.onClose(()=>{if(server.readyState===WebSocket.OPEN||server.readyState===WebSocket.CONNECTING)server.close();});
  server.on('open',()=>{for(const item of queue.splice(0))server.send(item);});
  server.on('message',(data,binary)=>{
    try{
      const raw=JSON.parse(data.toString()),message=Array.isArray(raw)?{event:raw[3],payload:raw[4]}:raw;
      const change=message.payload?.data;
      if(message.event==='postgres_changes'&&change?.table===table) (audit.realtimeEvents||=[]).push({type:change.type,date:change.record?.date||change.old_record?.date,oldKeys:Object.keys(change.old_record||{}).sort()});
    }catch{}
    route.send(binary?data:data.toString());
  });
  server.on('close',code=>route.close({code:code===1000?1000:1001,reason:'QA transport closed'}));
  server.on('error',error=>{
    (audit.websocketErrors||=[]).push({code:/^[A-Z_0-9]+$/.test(error.code||'')?error.code:'QA_WS_ERROR'});
    route.close({code:1011,reason:'QA websocket transport error'});
  });
  return server;
}
module.exports={bridgeQaWebSocket};
