// Bump VERSION whenever a published asset changes. Only this game's scope is used.
const VERSION = '2026-11-27-click-balance-3';
const SCOPE = new URL(self.registration.scope);
const PREFIX = `ussr-simulator:${SCOPE.pathname}:`;
const CACHE = `${PREFIX}${VERSION}`;
const FILES = [
  './', './index.html', './styles.css', './app.js', './engine.js', './game-data.js', './world.js', './anthem-clip.js',
   './runtime-click-v3/app.js', './runtime-click-v3/engine.js', './runtime-click-v3/game-data.js', './runtime-click-v3/world.js', './runtime-click-v3/anthem-clip.js', './runtime-click-v3/styles.css',
   './runtime/app.js', './runtime/engine.js', './runtime/world.js', './runtime/game-data.js', './runtime/anthem-clip.js', './runtime/styles.css',
  './manifest.webmanifest', './assets/icon.svg', './assets/icon-192.png',
  './assets/icon-512.png', './assets/factory.svg', './assets/symbols.svg', './assets/anthem-world.png', './LICENSE.txt',
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
  } else if (ASSETS.has(url.origin + url.pathname)) {
    const canonical=url.origin+url.pathname;
    // Network-first for code: a cached older engine must never silently
    // replace a deployed update. The latest verified copy remains offline.
    const isCode=/\\.(?:js|css)$/.test(url.pathname);
    if(isCode){
      event.respondWith((async()=>{
        try {
          const fresh=await fetch(new Request(request,{cache:'no-store'}));
          if(fresh.ok){
            const cache=await caches.open(CACHE);
            await cache.put(canonical,fresh.clone());
          }
          return fresh;
        }catch{
          return await caches.match(canonical)||Response.error();
        }
      })());
    }else{
      event.respondWith(caches.match(canonical).then(cached=>cached||fetch(request)));
    }
  }
});
