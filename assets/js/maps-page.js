/* COFDE Maps - controller halaman. Peta butuh internet (tile OSM),
   tapi koordinat, DMS, dan tautan eksternal selalu bisa dipakai. */
(function () {
  'use strict';

  var M = COFDE.maps;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var map = null;
  var marker = null;
  var current = { lat: M.DEFAULT_CENTER.lat, lng: M.DEFAULT_CENTER.lng, zoom: M.DEFAULT_CENTER.zoom };
  var searchResults = [];

  function on(id, fn) {
    var el = $(id);
    if (el) el.addEventListener('click', fn);
  }

  function wireNet() {
    var badge = $('netBadge');
    if (badge && COFDE.net) COFDE.net.badge(badge);
    if (badge && COFDE.net) {
      COFDE.net.onChange(function (online) {
        if (!online && !window.L) {
          $('mapNote').textContent = 'Offline dan Leaflet belum pernah dimuat, jadi peta tidak bisa tampil. Muat sekali saat online; setelah itu peta tetap bisa dibuka offline, hanya kepingan petanya yang kosong.';
        } else if (!online) {
          $('mapNote').textContent = 'Offline: kepingan peta tidak dimuat, tetapi navigasi, koordinat, dan tautan tetap tersedia.';
        }
      });
    }
  }

  function initMap() {
    $('mapBox').innerHTML = '<div class="cx-note" style="padding:16px">Memuat peta...</div>';
    var first = true;
    M.loadLeaflet().then(function (L) {
      map = L.map('mapBox', {
        center: [M.DEFAULT_CENTER.lat, M.DEFAULT_CENTER.lng],
        zoom: M.DEFAULT_CENTER.zoom,
        zoomControl: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      marker = L.marker([current.lat, current.lng]).addTo(map);
      marker.bindPopup('<strong>Peta COFDE</strong><br>Klik titik lain untuk memindahkan penanda.');
      map.on('click', function (e) {
        var ll = e.latlng;
        placeMarker(ll.lat, ll.lng, map.getZoom(), null, true);
      });
      map.on('moveend', function () {
        var c = map.getCenter();
        current.lat = c.lat; current.lng = c.lng; current.zoom = map.getZoom();
      });
      map.on('zoomend', function () { current.zoom = map.getZoom(); });
      map.invalidateSize();
      $('mapNote').textContent = headingNote();
      if (first) { first = false; }
      COFDE.toast.success('Peta siap.');
    }, function (e) {
      $('mapBox').innerHTML = '<div class="cx-note" style="padding:16px">' + esc(e.message) + '</div>';
      $('mapNote').textContent = e.message;
      COFDE.toast.error(e.message);
    });
  }

  function headingNote() {
    return 'Klik peta untuk menandai titik. Pencarian memakai Nominatim (OpenStreetMap), maks 1 permintaan per detik.';
  }

  function placeMarker(lat, lng, zoom, label, geocodeReverse) {
    current.lat = lat; current.lng = lng; current.zoom = zoom || current.zoom;
    if (map) marker.setLatLng([lat, lng]);
    if (map) map.setView([lat, lng], current.zoom);
    renderStats(label);
    if (geocodeReverse) {
      M.reverse(lat, lng).then(function (r) {
        renderStats(r.label);
      }, function () { /* biarkan alamat kosong */ });
    }
  }

  function renderStats(label) {
    var f = M.formatCoord(current.lat, current.lng, 5);
    var stats = $('mapStats');
    if (!f) {
      stats.innerHTML = '<div class="cx-stat"><div class="cx-stat-label">Koordinat</div><div class="cx-stat-value">-</div></div>';
      return;
    }
    var cells = [
      ['Koordinat (DD)', f.dd],
      ['DMS', f.dms],
      ['Lokasi', label || '-'],
      ['Di Indonesia?', M.inIndonesia(current.lat, current.lng) ? 'Ya' : 'Tidak (luar bbox Indonesia)']
    ];
    stats.innerHTML = cells.map(function (c) {
      return '<div class="cx-stat"><div class="cx-stat-label">' + esc(c[0]) +
        '</div><div class="cx-stat-value" style="font-size:13px">' + esc(c[1]) + '</div></div>';
    }).join('');
  }

  function runSearch() {
    var q = $('mapSearch').value;
    if (!q.trim()) { COFDE.toast.info('Ketik kata kunci untuk mencari.'); return; }
    $('mapResult').textContent = 'Mencari...';
    M.geocode(q).then(function (list) {
      renderResults(list);
    }, function (e) {
      $('mapResult').innerHTML = '<p class="cx-note">' + esc(e.message) + '</p>';
    });
  }

  function renderResults(list) {
    searchResults = list;
    if (!list.length) {
      $('mapResult').innerHTML = '<p class="cx-note">Tidak ada hasil untuk pencarian itu.</p>';
      return;
    }
    $('mapResult').innerHTML = list.map(function (r, i) {
      return '<button type="button" class="cx-chip-btn" data-idx="' + i + '">' + esc(r.label) + '</button>';
    }).join('');
    Array.prototype.slice.call($('mapResult').querySelectorAll('[data-idx]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var r = list[Number(btn.dataset.idx)];
        placeMarker(r.lat, r.lng, 15, r.label, false);
      });
    });
    $('mapNote').textContent = list.length + ' hasil ditemukan. Klik salah satu untuk melompat.';
  }

  on('mapGo', runSearch);
  $('mapSearch').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
  });

  on('mapLocate', function () {
    if (!navigator.geolocation) {
      COFDE.toast.error('Geolocation tidak didukung browser ini.');
      return;
    }
    if (!COFDE.net.requireNet()) {
      return;
    }
    $('mapNote').textContent = 'Mencari lokasi...';
    navigator.geolocation.getCurrentPosition(function (pos) {
      placeMarker(pos.coords.latitude, pos.coords.longitude, 15, 'Lokasi kamu sekarang', false);
      $('mapNote').textContent = 'Lokasi ditemukan.';
    }, function (e) {
      $('mapNote').textContent = 'Lokasi tidak ditemukan: ' + e.message;
      COFDE.toast.error('Gagal mendapat lokasi.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });

  function copyCoord() {
    var f = M.formatCoord(current.lat, current.lng, 6);
    if (!f) { COFDE.toast.error('Koordinat belum ada.'); return; }
    var value = f.dd;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { COFDE.toast.success('Koordinat disalin.'); }, function () {
        COFDE.toast.info(value);
      });
    } else {
      COFDE.toast.info(value);
    }
  }
  on('mapCopy', copyCoord);

  on('mapExternGoogle', function () { openExternal('google'); });
  on('mapExternOsm', function () { openExternal('osm'); });
  on('mapExternHere', function () { openExternal('here'); });

  function openExternal(provider) {
    var ext = M.geoExternals(current.lat, current.lng, current.zoom);
    if (!ext[provider]) { COFDE.toast.error('Penyedia tidak dikenal.'); return; }
    window.open(ext[provider], '_blank', 'noopener');
  }

  function init() {
    wireNet();
    initMap();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* Ekspor untuk pengujian. */
  window.COFDE.mapsPage = window.__mapsPage = {
    placeMarker: placeMarker, runSearch: runSearch, renderResults: renderResults,
    renderStats: renderStats, current: function () { return current; },
    hasMap: function () { return !!map; }
  };
})();