// Escritorio se mudó a /escritorio/. Este service worker borra la caché vieja, se da de baja
// y recarga las pestañas abiertas para que lleguen a la página de redirección.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('escritorio-')) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
