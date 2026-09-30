/* COFDE Maps - logika peta + geocoding.
   Basemap memakai OpenStreetMap via Leaflet (CDN), jadi butuh internet
   untuk menampilkan peta. Pencarian memakai Nominatim (OpenStreetMap).
   Semua permintaan pergi langsung dari browser ke layanan tersebut;
   tidak ada server perantara beserta log-nya di sisi COFDE.

   Kebijakan Nominatim: maks 1 permintaan/detik. Tool ini memberlakukan
   jeda minimal 1,1 detik antar permintaan geocoding. */
(function () {
  'use strict';

  var INDO_BOUNDS = [
    [-11.0, 95.01],
    [6.08, 141.02]
  ];
  var DEFAULT_CENTER = { lat: -6.2, lng: 106.816666, zoom: 12 };

  var leafletPromise = null;
  var lastGeocodeAt = 0;

  var CDN_LEAFLET_JS = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
  ];
  var CDN_LEAFLET_CSS = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
  ];

  function loadCss(href) {
    return new Promise(function (resolve, reject) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = function () { resolve(href); };
      l.onerror = function () { reject(new Error('CSS Leaflet gagal dimuat.')); };
      document.head.appendChild(l);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(src); };
      s.onerror = function () { reject(new Error('JS Leaflet gagal dimuat.')); };
      document.head.appendChild(s);
    });
  }

  function loadSequential(list, loader) {
    var i = 0;
    function next() {
      if (i >= list.length) return Promise.reject(new Error('Semua kandidat CDN gagal. Cek koneksi.'));
      var url = list[i++];
      return loader(url).catch(next);
    }
    return next();
  }

  /* Memuat Leaflet sekali; dipakai ulang di sesi yang sama.
     Menolak jelas saat offline dan belum pernah termuat. */
  function loadLeaflet() {
    if (leafletPromise) return leafletPromise;
    if (!(navigator.onLine || (window.navigator && window.navigator.onLine))) {
      leafletPromise = Promise.reject(new Error('Kamu offline dan Leaflet belum pernah dimuat. Muat sekali saat online untuk bisa membuka halaman peta lagi secara offline (tanpa tile peta).'));
      return leafletPromise;
    }
    leafletPromise = loadSequential(CDN_LEAFLET_CSS, loadCss)
      .then(function () {
        return loadSequential(CDN_LEAFLET_JS, loadScript);
      })
      .then(function () {
        if (!window.L) return Promise.reject(new Error('Global Leaflet (L) tidak ditemukan setelah dimuat.'));
        return window.L;
      });
    return leafletPromise;
  }

  /* ── Koordinat ── */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function validCoord(lat, lng) {
    return isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function formatCoord(lat, lng, decimals) {
    if (!validCoord(lat, lng)) return null;
    var d = Math.max(0, Math.min(6, Number(decimals) || 5));
    function dmsPart(v, hemiP, hemiN) {
      var neg = v < 0;
      var a = Math.abs(v);
      var deg = Math.floor(a);
      var mi = (a - deg) * 60;
      var min = Math.floor(mi);
      var sec = (mi - min) * 60;
      return (neg ? hemiP : hemiN) + ' ' + deg + '°' + (min < 10 ? '0' : '') + min + "'" +
        (sec < 10 ? '0' : '') + sec.toFixed(d > 5 ? 5 : d) + '"';
    }
    return {
      dd: lat.toFixed(d) + ', ' + lng.toFixed(d),
      lat: lat.toFixed(d), lng: lng.toFixed(d),
      dms: dmsPart(lat, 'S', 'N') + ' ' + dmsPart(lng, 'B', 'T')
    };
  }

  function inIndonesia(lat, lng) {
    if (!validCoord(lat, lng)) return false;
    return lat >= INDO_BOUNDS[0][0] && lat <= INDO_BOUNDS[1][0] &&
      lng >= INDO_BOUNDS[0][1] && lng <= INDO_BOUNDS[1][1];
  }

  function geoExternals(lat, lng, zoom, q) {
    var ll = (isFinite(lat) ? lat : DEFAULT_CENTER.lat).toFixed(6) + ',' + (isFinite(lng) ? lng : DEFAULT_CENTER.lng).toFixed(6);
    var z = Math.max(3, Math.min(19, Number(zoom) || 12));
    return {
      google: 'https://www.google.com/maps?q=' + encodeURIComponent(q || ll),
      osm: 'https://www.openstreetmap.org/?mlat=' + lat.toFixed(6) + '&mlon=' + lng.toFixed(6) + '&zoom=' + z,
      bing: 'https://www.bing.com/maps/?v=2&cp=' + lat.toFixed(6) + '~' + lng.toFixed(6) + '&lvl=' + z,
      here: 'https://share.here.com/m?cp=' + lat.toFixed(6) + ';' + lng.toFixed(6) + '&z=' + z
    };
  }

  /* ── Geocoding (Nominatim) ── */
  function throttleGeocode() {
    var wait = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
    if (!wait) return Promise.resolve();
    return new Promise(function (r) { setTimeout(r, wait); });
  }

  function geocode(query) {
    var q = String(query || '').trim();
    if (!q) return Promise.reject(new Error('Kata kunci pencarian masih kosong.'));
    return throttleGeocode().then(function () {
      lastGeocodeAt = Date.now();
      var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=id&countrycodes=id&q=' +
        encodeURIComponent(q);
      if (window.COFDE && COFDE.net && COFDE.net.requireNet) COFDE.net.requireNet('Pencarian peta');
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error('Pencarian gagal (HTTP ' + r.status + ').');
        return r.json();
      }).then(function (list) {
        return list.map(function (it) {
          return {
            label: it.display_name, name: it.name,
            lat: parseFloat(it.lat), lng: parseFloat(it.lon),
            type: it.type, importance: it.importance,
            id: it.place_id
          };
        });
      });
    });
  }

  function reverse(lat, lng) {
    if (!validCoord(lat, lng)) return Promise.reject(new Error('Koordinat tidak valid untuk reverse geocoding.'));
    return throttleGeocode().then(function () {
      lastGeocodeAt = Date.now();
      var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=id&lat=' +
        lat + '&lon=' + lng;
      if (window.COFDE && COFDE.net && COFDE.net.requireNet) COFDE.net.requireNet('Reverse geocoding');
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error('Reverse geocoding gagal (HTTP ' + r.status + ').');
        return r.json();
      }).then(function (j) {
        return { label: j.display_name || '', latitude: parseFloat(j.lat), longitude: parseFloat(j.lon) };
      });
    });
  }

  var api = {
    loadLeaflet: loadLeaflet,
    validCoord: validCoord,
    formatCoord: formatCoord,
    inIndonesia: inIndonesia,
    geoExternals: geoExternals,
    geocode: geocode,
    reverse: reverse,
    DEFAULT_CENTER: DEFAULT_CENTER,
    INDO_BOUNDS: INDO_BOUNDS,
    _clamp: clamp
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.maps = api;
})();