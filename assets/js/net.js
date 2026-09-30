/* ══════════════════════════════════════════════════════════
   COFDE Net — status online/offline
   Fitur yang butuh internet menampilkan status jelas; fitur
   lokal (Expense, Dev Tools) tetap jalan saat offline.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var listeners = [];
  var isOnline = (navigator.onLine !== false);

  function emit() {
    listeners.forEach(function (fn) { try { fn(isOnline); } catch (e) { /* abaikan */ } });
  }

  function set(next) {
    if (isOnline === next) return;
    isOnline = next;
    emit();
  }

  function init() {
    window.addEventListener('online', function () {
      set(true);
      if (COFDE.toast) COFDE.toast.success('Koneksi kembali tersedia.');
    });
    window.addEventListener('offline', function () {
      set(false);
      if (COFDE.toast) COFDE.toast.warning('Anda sedang offline. Fitur lokal tetap bisa dipakai.');
    });
  }

  /* Pasang badge status ke dalam sebuah elemen. */
  function badge(el) {
    if (!el) return;
    function paint() {
      el.classList.toggle('offline', !isOnline);
      el.textContent = isOnline ? 'Online' : 'Offline';
      el.title = isOnline
        ? 'Terhubung. Semua fitur aktif.'
        : 'Offline. Fitur yang butuh internet tidak bisa diperbarui; data sebelumnya masih tersedia.';
    }
    el.classList.add('cx-net');
    paint();
    listeners.push(paint);
  }

  var api = {
    init: init,
    online: function () { return isOnline; },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    badge: badge,
    /* Helper untuk fitur yang butuh internet. */
    requireNet: function (what) {
      if (isOnline) return true;
      var msg = (what || 'Fitur ini') +
        ' membutuhkan internet. Data yang sudah dimuat sebelumnya masih tersedia.';
      if (COFDE.toast) COFDE.toast.warning(msg);
      return false;
    }
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.net = api;
})();
