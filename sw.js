// PPA Clock service worker: lets the page (and the libraries / face models) load without internet.
// index.html is network-first (so a new version is picked up); everything else is cache-first.
var CACHE = 'ppa-clock-v6';
var SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'logo.png', 'header_bottles.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // POSTs to the server are never cached
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin, cdn = url.hostname === 'cdn.jsdelivr.net';
  if (!sameOrigin && !cdn) return;                        // never touch script.google.com
  var isPage = req.mode === 'navigate' || (sameOrigin && /\/(index\.html)?$/.test(url.pathname));
  if (isPage) {
    e.respondWith(fetch(req).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); return r; })
      .catch(function () { return caches.match(req).then(function (m) { return m || caches.match('index.html'); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (m) {
    return m || fetch(req).then(function (r) { if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return r; });
  }));
});


