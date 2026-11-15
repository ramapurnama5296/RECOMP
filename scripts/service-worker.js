/* global self, caches, fetch, URL, Request, PRECACHE_FILES */
const SCOPE = self.registration.scope;
const PREFIX = 'recomp-shell:' + SCOPE + ':';
const CACHE = PREFIX + 'BUILD_ID';
const FILES = PRECACHE_FILES;
const INDEX = new URL('index.html', SCOPE).href;
const installed = new Set(FILES.map(path => new URL(path, SCOPE).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    [...installed].map(url => new Request(url, { cache: 'reload' }))
  )));
});
self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const previous = await caches.keys();
    await Promise.all(previous.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(SCOPE)) return;
  const navigation = event.request.mode === 'navigate';
  if (!navigation && !installed.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(navigation ? INDEX : event.request)) ?? fetch(event.request);
  })());
});

