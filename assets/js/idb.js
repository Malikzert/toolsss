/* ══════════════════════════════════════════════════════════
   COFDE IDB — small promise wrapper around IndexedDB
   Sengaja TIDAK memakai localStorage untuk data transaksi:
   localStorage ikut clipboard sync, quit size, dan blocking.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var dbs = {};

  function unsupported() {
    return typeof indexedDB === 'undefined' || indexedDB === null;
  }

  function open(name, version, upgrade) {
    if (dbs[name]) return dbs[name];

    var p = new Promise(function (resolve, reject) {
      if (unsupported()) {
        reject(new Error('IndexedDB tidak didukung browser ini. Gunakan Chrome, Firefox, atau Edge terbaru.'));
        return;
      }
      var req;
      try {
        req = indexedDB.open(name, version);
      } catch (e) {
        reject(e);
        return;
      }
      req.onupgradeneeded = function (e) {
        if (upgrade) {
          try { upgrade(req.result, e.oldVersion, req.transaction); }
          catch (err) { /* biarkan, akan ketahuan saat request berikutnya */ }
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () {
        reject(req.error || new Error('Gagal membuka database "' + name + '".'));
      };
      req.onblocked = function () {
        reject(new Error('Database "' + name + '" terkunci oleh tab lain. Tutup tab COFDE lainnya lalu coba lagi.'));
      };
    });

    /* Jangan cache promise yang gagal, supaya retry diizinkan. */
    dbs[name] = p.catch(function (err) {
      delete dbs[name];
      throw err;
    });
    return dbs[name];
  }

  function tx(db, store, mode) {
    return db.transaction(store, mode).objectStore(store);
  }

  function wrap(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Permintaan database gagal.')); };
    });
  }

  var api = {
    open: open,
    supported: function () { return !unsupported(); },

    get: function (db, store, key) {
      return db.then(function (d) { return wrap(tx(d, store, 'readonly').get(key)); });
    },

    all: function (db, store) {
      return db.then(function (d) { return wrap(tx(d, store, 'readonly').getAll()); });
    },

    count: function (db, store) {
      return db.then(function (d) { return wrap(tx(d, store, 'readonly').count()); });
    },

    put: function (db, store, value, key) {
      return db.then(function (d) { return wrap(tx(d, store, 'readwrite').put(value, key)); });
    },

    add: function (db, store, value) {
      return db.then(function (d) { return wrap(tx(d, store, 'readwrite').add(value)); });
    },

    del: function (db, store, key) {
      return db.then(function (d) { return wrap(tx(d, store, 'readwrite').delete(key)); });
    },

    clear: function (db, store) {
      return db.then(function (d) { return wrap(tx(d, store, 'readwrite').clear()); });
    },

    /* Bulk delete dalam satu transaksi: jauh lebih cepat daripada
       await del() satu per satu untuk data yang banyak. */
    delMany: function (db, store, keys) {
      return db.then(function (d) {
        return new Promise(function (resolve, reject) {
          var t = d.transaction(store, 'readwrite');
          var s = t.objectStore(store);
          keys.forEach(function (k) { s.delete(k); });
          t.oncomplete = function () { resolve(keys.length); };
          t.onerror = function () { reject(t.error || new Error('Penghapusan massal gagal.')); };
          t.onabort = function () { reject(t.error || new Error('Penghapusan massal dibatalkan.')); };
        });
      });
    },

    putMany: function (db, store, values) {
      return db.then(function (d) {
        return new Promise(function (resolve, reject) {
          var t = d.transaction(store, 'readwrite');
          var s = t.objectStore(store);
          values.forEach(function (v) { s.put(v); });
          t.oncomplete = function () { resolve(values.length); };
          t.onerror = function () { reject(t.error || new Error('Penyimpanan massal gagal.')); };
          t.onabort = function () { reject(t.error || new Error('Penyimpanan massal dibatalkan.')); };
        });
      });
    },

    /* Dipakai Settings untuk "clear all local data". */
    deleteDatabase: function (name) {
      return new Promise(function (resolve, reject) {
        if (unsupported()) { reject(new Error('IndexedDB tidak didukung.')); return; }
        delete dbs[name];
        var req = indexedDB.deleteDatabase(name);
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { reject(req.error || new Error('Gagal menghapus database.')); };
        req.onblocked = function () { reject(new Error('Database masih dipakai tab lain. Tutup tab COFDE lainnya lalu coba lagi.')); };
      });
    },

    /* Estimasi pemakaian storage, kalau browser mendukung. */
    usage: function () {
      return new Promise(function (resolve) {
        if (!navigator.storage || !navigator.storage.estimate) { resolve(null); return; }
        navigator.storage.estimate().then(function (e) {
          resolve({ used: e.usage || 0, quota: e.quota || 0 });
        }).catch(function () { resolve(null); });
      });
    }
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.idb = api;

  /* Nama database dipakai bersama oleh Expense Tracker dan Settings,
     supaya "clear all data" benar-benar menghapus semuanya. */
  window.COFDE.EXPENSE_DB = 'cofde_expense';
})();
