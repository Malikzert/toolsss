/* ══════════════════════════════════════════════════════════
   COFDE Guard — global error handling
   Tujuan: aplikasi tidak pernah crash diam-diam. Semua error
   (sync throw, unhandled rejection, API/network) akan
   ditampilkan sebagai toast yang jelas.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function toast() {
    return window.COFDE && window.COFDE.toast;
  }

  /* ── Pesan error yang bisa dimengerti manusia ──
     Nama error browser sering tidak menjelaskan apa yang
     sebenarnya salah, jadi petakan ke kalimat actionable. */
  function explain(err, fallback) {
    var msg = (err && (err.message || err.name)) || String(err || '');
    var lower = msg.toLowerCase();

    if (/indexeddb|indexed db|database|db_|objectstore/.test(lower)) {
      return 'Penyimpanan database browser gagal dibuka. Coba jalankan mode privat, atau pastikan storage tidak diblokir.';
    }
    if (/quota|storage.*full|no space/.test(lower)) {
      return 'Penyimpanan browser penuh. Hapus data lama lewat Settings, atau free up ruang.';
    }
    if (/network|failed to fetch|load failed|err_internet|offline/.test(lower)) {
      return 'Tidak ada koneksi ke server. Fitur yang butuh internet tidak bisa diperbarui, data sebelumnya masih tersedia.';
    }
    if (/permission|denied|notallowed|geolocation/.test(lower)) {
      return 'Izin browser ditolak. Aktifkan izin pada pengaturan situs, atau gunakan pencarian manual.';
    }
    if (/camer|notfound|notallowed/.test(lower)) {
      return 'Kamera tidak tersedia atau akses ditolak. Pastikan izin kamera aktif dan perangkat punya kamera depan.';
    }
    if (/cors/.test(lower)) {
      return 'Permintaan ditolak server (CORS). Coba muat ulang halaman.';
    }
    if (msg) return msg;
    return fallback || 'Terjadi kesalahan yang tidak diketahui.';
  }

  function report(err, fallback) {
    var t = toast();
    var text = explain(err, fallback);
    if (t) t.error(text);
    else if (window.console && console.error) console.error('[COFDE]', err);
    return text;
  }

  /* ── Wrapper untuk promise/async ──
     guard(fn) untuk fungsi async: mencegah unhandled rejection
     dan menjaga UI tetap hidup meski satu aksi gagal. */
  function guard(fn, fallback) {
    return function () {
      var args = arguments;
      var self = this;
      var out;
      try {
        out = fn.apply(self, args);
      } catch (e) {
        report(e, fallback);
        return undefined;
      }
      if (out && typeof out.then === 'function') {
        return out.then(
          function (v) { return v; },
          function (e) { report(e, fallback); return undefined; }
        );
      }
      return out;
    };
  }

  /* Jaring pengaman terakhir: hal yang tidak tertangani. */
  function install() {
    if (window.__cofdeGuardInstalled) return;
    window.__cofdeGuardInstalled = true;

    window.addEventListener('error', function (e) {
      /* Error dari resource (gambar/CDN) tidak fatal, jangan toast. */
      if (e && e.target && e.target !== window) return;
      if (e && e.message === 'ResizeObserver loop limit exceeded') return;
      report(e.error || (e && e.message), 'Terjadi kesalahan di halaman ini.');
    });

    window.addEventListener('unhandledrejection', function (e) {
      var reason = e && e.reason;
      /* Dibatalkan oleh user (mis. prompt permission) bukan error. */
      if (reason && (reason.name === 'AbortError' || reason.name === 'NotAllowedError')) return;
      report(reason, 'Ada operasi yang gagal diselesaikan.');
    });
  }

  var api = {
    install: install,
    guard: guard,
    report: report,
    explain: explain
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.guard = api;
  window.COFDE.report = report;
})();
