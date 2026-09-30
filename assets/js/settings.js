/* ══════════════════════════════════════════════════════════
   COFDE Settings
   Preferensi ringan disimpan di localStorage (hanya scalar:
   tema, currency, format tanggal). Data transaksi TIDAK di sini.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'cofde_settings';
  var listeners = [];
  var current = null;

  function defaults() {
    var d = { appearance: 'system', currency: 'IDR', dateFormat: 'DD/MM/YYYY' };
    try {
      var f = window.COFDE && window.COFDE.fmt;
      if (f && f.DEFAULT_SETTINGS) {
        Object.keys(f.DEFAULT_SETTINGS).forEach(function (k) { d[k] = f.DEFAULT_SETTINGS[k]; });
      }
    } catch (e) { /* fmt belum termuat, pakai default di atas */ }
    return d;
  }

  function read() {
    var d = defaults();
    var parsed = null;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.keys(d).forEach(function (k) {
            if (parsed[k] !== undefined && parsed[k] !== null) d[k] = parsed[k];
          });
        }
      }
    } catch (e) {
      /* localStorage diblokir atau JSON rusak: pakai default, jangan crash. */
    }
    /* Tema lama 'fire-theme' dipakai agar migrasi dari versi
       sebelumnya tidak gelap/muda sendiri — TAPI hanya bila pengguna
       belum menyimpan pilihan appearance secara eksplisit. Kalau sudah
       memilih Light/Dark/System, pilihan itu tidak boleh ditimpa sisa
       tema lama. */
    try {
      var t = localStorage.getItem('fire-theme');
      var explicit = !!(parsed && parsed.appearance !== undefined && parsed.appearance !== null && parsed.appearance !== '');
      if (t && !current && !explicit && ['lightholy', 'darkside', 'abyss'].indexOf(t) >= 0) d.appearance = t;
    } catch (e2) { /* abaikan */ }
    return d;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
      return true;
    } catch (e) {
      if (window.COFDE && COFDE.toast) {
        COFDE.toast.error('Preferensi tidak bisa disimpan. Penyimpanan browser mungkin penuh atau diblokir.');
      }
      return false;
    }
  }

  function get() {
    if (!current) current = read();
    return current;
  }

  function set(patch) {
    current = get();
    Object.keys(patch).forEach(function (k) { current[k] = patch[k]; });
    var ok = save();
    listeners.forEach(function (fn) {
      try { fn(current, patch); } catch (e) { if (window.console) console.error(e); }
    });
    if (patch.appearance) applyAppearance();
    return ok;
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function prefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /* Sumber kebenaran tunggal tema adalah 'cofde_settings'.appearance:
     - 'lightholy'/'darkside'/'abyss' = tema tetap
     - 'system'                         = ikuti OS
     - 'light'/'dark'                   = nilai lama, dipetakan di sini
     'fire-theme' hanya cermin untuk halaman lama yang tidak memuat
     settings.js, jadi tema selalu sama di semua fitur. */
  function resolvedTheme() {
    var s = get();
    if (s.appearance === 'dark') return 'darkside';
    if (s.appearance === 'light') return 'lightholy';
    if (['lightholy', 'darkside', 'abyss'].indexOf(s.appearance) >= 0) return s.appearance;
    return prefersDark() ? 'abyss' : 'lightholy';
  }

  function applyAppearance() {
    var theme = resolvedTheme();
    document.documentElement.setAttribute('data-theme', theme);
    if (window.COFDE_THEME && typeof COFDE_THEME.set === 'function') {
      /* Selalu tulis cermin 'fire-theme' supaya halaman lama (reader,
         crop, gabung, merge, split, konversi, dashboard) memakai tema
         yang sama persis dengan halaman yang memuat settings.js. */
      try { COFDE_THEME.set(theme); } catch (e) { /* abaikan */ }
    }
    /* Sinkronkan kartu tema di Settings (class .cx-theme-card). */
    document.querySelectorAll('.cx-theme-card').forEach(function (b) {
      var on = b.dataset.theme === theme;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function init() {
    get();
    applyAppearance();
    /* Ikuti perubahan OS saat mode 'system'. */
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChangeMQ = function () { if (get().appearance === 'system') applyAppearance(); };
      if (mq.addEventListener) mq.addEventListener('change', onChangeMQ);
      else if (mq.addListener) mq.addListener(onChangeMQ);
    }
  }

  function reset() {
    current = defaults();
    save();
    applyAppearance();
    listeners.forEach(function (fn) { try { fn(current, {}); } catch (e) { /* abaikan */ } });
  }

  function exportAll() {
    var out = { version: 1, settings: get(), exportedAt: new Date().toISOString() };
    return out;
  }

  function importAll(obj) {
    if (!obj || typeof obj !== 'object' || !obj.settings) {
      throw new Error('Berkas tidak berisi bagian settings yang dikenali.');
    }
    var patch = {};
    ['appearance', 'currency', 'dateFormat', 'customCurrencyCode', 'customCurrencySymbol'].forEach(function (k) {
      if (obj.settings[k] !== undefined) patch[k] = obj.settings[k];
    });
    if (patch.appearance && ['light', 'dark', 'system', 'lightholy', 'darkside', 'abyss'].indexOf(patch.appearance) < 0) {
      throw new Error('Nilai appearance tidak valid: ' + patch.appearance);
    }
    set(patch);
    return patch;
  }

  var api = {
    get: get,
    set: set,
    onChange: onChange,
    init: init,
    reset: reset,
    resolvedTheme: resolvedTheme,
    applyAppearance: applyAppearance,
    exportAll: exportAll,
    importAll: importAll,
    KEY: KEY
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.settings = api;
})();
