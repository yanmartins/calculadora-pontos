var CACHE_NAME = 'calc-pontos-v60';
var ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
          .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  // só cacheia GET do próprio app; chamadas à API do Ícarus vão direto à rede
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (resp) {
      var clone = resp.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
      return resp;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
