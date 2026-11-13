// Escritorio — service worker propio (scope /shaah/escritorio/). Guarda solo los archivos de la app;
// nunca los datos ni las llamadas a la API.
const CACHE = 'escritorio-v1';
const FILES = ['./', './index.html', './app.css', './app.js', './manifest.webmanifest', './icon.svg', './icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('escritorio-') && k !== CACHE) await caches.delete(k); await self.clients.claim(); })()); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  // Red primero (para recibir cambios), caché si no hay conexión.
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
