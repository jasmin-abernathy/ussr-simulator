/* No offline caching during web playtesting. */
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for(const name of await caches.keys()) {
      if(name.startsWith('ussr-simulator:')) await caches.delete(name);
    }
    await self.registration.unregister();
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', () => { /* no interception */ });
