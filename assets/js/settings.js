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
    var d = { appearance: 'abyss', currency: 'IDR', dateFormat: 'DD/MM/YYYY' };
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
    var stored = null;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        stored = JSON.parse(raw);
        if (stored && typeof stored === 'object') {
          Object.keys(d).forEach(function (k) {
            if (stored[k] !== undefined && stored[k] !== null) d[k] = stored[k];
          });
        }
      }
    } catch (e) {
      /* localStorage diblokir atau JSON rusak: pakai default, jangan crash. */
    }

    /* Hanya dua tema yang sah: 'lightholy' (terang, pecahan kaca) dan
       'abyss' (gelap, kilat + hujan). Pilihan tersimpan yang lama
       (darkside/system/light/dark) dinormalkan di sini supaya tidak
       pernah muncul sebagai tema tak dikenal. */
    var ap = (stored && stored.appearance) ? stored.appearance : null;
    if (ap === 'lightholy' || ap === 'light') {
      d.appearance = 'lightholy';
    } else if (ap) {
      d.appearance = 'abyss';
    } else {
      /* Belum pernah memilih: hormati cermin lama kalau ada. */
      try {
        d.appearance = localStorage.getItem('fire-theme') === 'lightholy'
          ? 'lightholy' : 'abyss';
      } catch (e2) { d.appearance = 'abyss'; }
    }
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

  function resolvedTheme() {
    return get().appearance === 'lightholy' ? 'lightholy' : 'abyss';
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
    if (patch.appearance && ['lightholy', 'abyss'].indexOf(patch.appearance) < 0) {
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
