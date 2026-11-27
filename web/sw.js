// Bump VERSION whenever a published asset changes. Only this game's scope is used.
const VERSION = '2026-11-27-world-economy-1';
const SCOPE = new URL(self.registration.scope);
const PREFIX = `ussr-simulator:${SCOPE.pathname}:`;
const CACHE = `${PREFIX}${VERSION}`;
const FILES = [
  './', './index.html', './styles.css', './app.js', './engine.js', './game-data.js', './world.js', './anthem-clip.js',
  './manifest.webmanifest', './assets/icon.svg', './assets/icon-192.png',
  './assets/icon-512.png', './assets/factory.svg', './assets/symbols.svg', './assets/anthem-world.svg', './LICENSE.txt',
];
const ASSETS = new Set(FILES.map(path => new URL(path, SCOPE).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...ASSETS].map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
        return await caches.match(new URL('./index.html', SCOPE).href) || response;
      } catch {
        return await caches.match(new URL('./index.html', SCOPE).href) || Response.error();
      }
    })());
  } else if (ASSETS.has(url.href)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});
