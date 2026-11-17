'use strict';
const RELEASE="c41c345f60c0a75f236c";
const INTEGRITY={"./assets/app.643731af3b4c1475.css": "sha384-dh0pY+NK3AVshY0usvdq+Mmz8q0B4+/BVwyltVU4kxWWtdfvDOwiQh6F/d0Ldiwb", "./assets/app.cb9d024a0c002776.js": "sha384-ZA26+Na/a95m4fzP/XrzSHoUOsgEJBOEhfEpmAG7AL6pZtOXYBmUiKY9tY8rrbXB", "./assets/aurora-skin.js?v=85b841c8e7ba2ff9": "sha384-0yctcfMdDP52+/l+6YGb/s4d8YLXrtx6XR/QbwNhXw6yTTFymfe5WbPDsc7n7C2C", "./assets/bebas-neue-400.bf7132a31e7ad38f.woff2": "sha384-e2phQb2a6uZGU8muHecyPMu0Fb8T/Vs8I/HAXKuHaz5omVH7mDupW+EOk33zFW4d", "./assets/display-adaptation.js?v=426c3a0b9696b5fb": "sha384-1vxmjBqbc4gvZk0B/qDb0C2KOHh9Mlb8iiUmtmF8+sB1i0fOjeFhq7kGC6R1eHe+", "./assets/dm-mono-400.6d1177cfe7e683de.woff2": "sha384-i8juG31YWQ4zsD35dpL2grpgsiLMYxN5uZS36HsXt//GfnUMKc5WnBzDxq3TZaH3", "./assets/dm-mono-500.444e10abbed84d93.woff2": "sha384-714LhmC+vkXJOaGcqJBODg5uJo44YiVk1dgY5uO2rgSp+QjMMZipphNRrRygIeFg", "./assets/dm-sans-400.2ea1bf6e4127eebf.woff2": "sha384-np9ujh8sykh8wQXvSiUHO7G8ukiQCsKbOJpWC+oyg/bRpVzFLGI5p59xvlxhkmYt", "./assets/dm-sans-500.5db7ec8890b78af7.woff2": "sha384-1uouVuWSd1+Wc9xxW3EDBUljqPefeb3/8TSiJ0aDIRKaM5exdCtlAJImaUOzQlxd", "./assets/dm-sans-700.9b1a44756787bbc9.woff2": "sha384-wkJLk+WZIPzS4sjW4sGgSfSovxWID0432ehFLQeZvsV4VQr0cviZW0Tcu56bBrNa", "./assets/fonts.33f25e9f3651a683.css": "sha384-M5wIlUaWphs4AljzVgdHIGd8zUP2oLfiNjf3/NIFq4LiiqZZC81ylQmOz73onyOA", "./assets/history-back-first-click-20261026.js?v=51376aafaddc17dd": "sha384-WVMQVMYFnCyjFWX8id8J++Twp3iGeYDIex1mAoP5vSXI3iPqMqMYECuBUdQq2wtG", "./assets/offline-register.js?v=568d6a9bad9bee58": "sha384-kGIdfqhBVq+rl+2sJEOxdXbKiW8/MYQwV7r1av2XRKbm1c8JdRQxiSAFWaZDN5nn", "./assets/performance.6744a86054de4e87.js": "sha384-scVpZSSl0U0q+/ax1MA/rv0UmrJBLWgMT6R2AuUhzdfArOBSINI0RtWL9Q3ChMtJ", "./assets/supabase-2.118.0.js": "sha384-TcHRA3zBbn+Lexh5n+Oil4guNPOS3rjNDpGRAN46u/s/mB2IZ50ceC6TYDU2yvgK", "./assets/today-mobile-disclosure-20261027.js?v=729338ca1b170695": "sha384-fbW/kt0oEPMsH4d/t+9G06dvrR7ti+5Ad+sNNN40Uqa/74DzMOUorI9rHtGKBpIR", "./index.html": "sha384-2gOyjjuWm+MuIgIyMa/whOPkigJ2HMxdAr3vrEg4IzwntBWSJqscussNqRL0c+Tk"};
const STATIC_FILES=["./assets/app.643731af3b4c1475.css", "./assets/app.cb9d024a0c002776.js", "./assets/aurora-skin.js?v=85b841c8e7ba2ff9", "./assets/bebas-neue-400.bf7132a31e7ad38f.woff2", "./assets/display-adaptation.js?v=426c3a0b9696b5fb", "./assets/dm-mono-400.6d1177cfe7e683de.woff2", "./assets/dm-mono-500.444e10abbed84d93.woff2", "./assets/dm-sans-400.2ea1bf6e4127eebf.woff2", "./assets/dm-sans-500.5db7ec8890b78af7.woff2", "./assets/dm-sans-700.9b1a44756787bbc9.woff2", "./assets/fonts.33f25e9f3651a683.css", "./assets/history-back-first-click-20261026.js?v=51376aafaddc17dd", "./assets/offline-register.js?v=568d6a9bad9bee58", "./assets/performance.6744a86054de4e87.js", "./assets/supabase-2.118.0.js", "./assets/today-mobile-disclosure-20261027.js?v=729338ca1b170695", "./index.html"];
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
self.addEventListener('push',event=>{
  let d={};try{d=event.data?event.data.json():{};}catch(error){d={};}
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
