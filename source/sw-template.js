'use strict';
const RELEASE=__RELEASE__;
const INTEGRITY=__INTEGRITY__;
const STATIC_FILES=__STATIC_FILES__;
const root=new URL('./',self.location.href);
const CACHE_PREFIX='shaah:'+root.pathname+':release:';
const CACHE_NAME=CACHE_PREFIX+RELEASE;
const urls=new Set(STATIC_FILES.map(path=>new URL(path,root).href));
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try{
      // Failure is atomic: keep the preceding complete release available.
      await cache.addAll(STATIC_FILES.map(path=>new Request(new URL(path,root),{cache:'reload',integrity:INTEGRITY[path]})));
    }catch(error){await caches.delete(CACHE_NAME);throw error;}
  })());
  // Let existing tabs finish with their current release; no forced reload.
});
// A waiting release activates only when the page asks (offline-register.js):
// right after opening, before any interaction, or when the app goes to the background.
// Without this, an app that is never fully closed (iPhone, desktop pane) stays on an old release.
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const name of await caches.keys())if(name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME)await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==root.origin)return;
  const shell=request.mode==='navigate'&&(url.pathname===root.pathname||url.pathname===root.pathname+'index.html');
  // Never intercept API/auth traffic, control pages, other paths or arbitrary URLs.
  if(!shell&&!urls.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    return (await cache.match(shell?new URL('./index.html',root).href:request))||fetch(request);
  })());
});
// Daily reminder (opt-in in Settings). The payload is text only; nothing from the account is cached or read here.
// Same wording as the app's pending-habits notification (pendingNoteShow in source/app.js).
function pendingTitle(n,lang){
  if(lang==='es')return n===1?'Te queda 1 hábito hoy':`Te quedan ${n} hábitos hoy`;
  if(lang==='he')return n===1?'נשאר הרגל אחד להיום':`נשארו ${n} הרגלים להיום`;
  return n===1?'1 habit left today':`${n} habits left today`;
}
self.addEventListener('push',event=>{
  let d={};try{d=event.data?event.data.json():{};}catch(error){d={};}
  // Midnight icon number: the badge on iPhone, and the silent pending notification that marks the icon on Android.
  // Every push must show a notification (iOS revokes subscriptions that don't), so it is the same pending one.
  if(d.kind==='badge'){
    const n=Math.max(0,Math.min(999,Math.floor(Number(d.count))||0));
    event.waitUntil((async()=>{
      try{if(self.navigator&&typeof self.navigator.setAppBadge==='function')await(n?self.navigator.setAppBadge(n):self.navigator.clearAppBadge());}catch(error){}
      for(const old of await self.registration.getNotifications({tag:'shaah-pending'}))old.close();
      await self.registration.showNotification(pendingTitle(n,d.lang),{tag:'shaah-pending',silent:true,icon:new URL('./assets/icon-192.png',root).href,data:{url:root.href}});
    })());
    return;
  }
  const title=typeof d.title==='string'&&d.title?d.title.slice(0,60):'SHAAH';
  const body=typeof d.body==='string'?d.body.slice(0,200):'';
  event.waitUntil(self.registration.showNotification(title,{body,tag:'shaah-daily',icon:new URL('./assets/icon-192.png',root).href,data:{url:root.href}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true})){
      if(client.url.startsWith(root.href)&&'focus' in client)return client.focus();
    }
    return self.clients.openWindow(root.href);
  })());
});
