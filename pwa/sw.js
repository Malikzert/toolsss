/* COFDE service worker — offline shell + CDN library cache.
   Strategy:
     - app shell (same origin): stale-while-revalidate
     - CDN libraries (cross origin): cache-first, they are version-pinned URLs
     - navigations: network first, fall back to cached index.html
*/
var VERSION = 'cofde-v9';
var SHELL_CACHE = VERSION + '-shell';
var CDN_CACHE = VERSION + '-cdn';

var SHELL = [
  './',
  '../index.html',
  '../pages/dashboard.html',
  '../pages/reader.html',
  '../pages/crop.html',
  '../pages/gabung.html',
  '../pages/merge.html',
  '../pages/split.html',
  '../pages/konversi.html',
  '../pages/devtools.html',
  '../pages/qr.html',
  '../pages/maps.html',
  '../pages/mlcsv.html',
  '../assets/css/style.css',
  '../assets/js/drawer.js',
  '../assets/js/particles.js',
  '../assets/js/sw-register.js',
  '../assets/js/shortcuts.js',
  '../assets/js/devtools-page.js',
  '../assets/js/qr-page.js',
  '../assets/js/maps-page.js',
  '../assets/js/mlcsv-page.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable.png'
];

var CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.worker/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE && k !== CDN_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isCdn(url) {
  return url.indexOf('cdnjs.cloudflare.com') !== -1 ||
         url.indexOf('cdn.jsdelivr.net') !== -1;
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    });
  });
}

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;

  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  if (isCdn(url.href)) {
    e.respondWith(cacheFirst(req, CDN_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          return cached || caches.match('../index.html');
        });
      })
    );
    return;
  }

  e.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
});
