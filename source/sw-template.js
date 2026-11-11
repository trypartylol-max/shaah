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
