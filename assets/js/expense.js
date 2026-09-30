/* ══════════════════════════════════════════════════════════
   COFDE Expense — data layer + perhitungan
   Semua data transaksi disimpan di IndexedDB ('cofde_expense'),
   bukan localStorage. Budget bulanan disimpan sebagai satu angka
   per bulan di localStorage karena sifatnya preferensi scalar.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DB = (window.COFDE && COFDE.EXPENSE_DB) || 'cofde_expense';
  var DB_VERSION = 1;
  var BUDGET_KEY = 'cofde_budget_';

  var DEFAULT_CATEGORIES = [
    { name: 'Makanan',   kind: 'expense' },
    { name: 'Transport',  kind: 'expense' },
    { name: 'Tagihan',    kind: 'expense' },
    { name: 'Belanja',    kind: 'expense' },
    { name: 'Kesehatan',  kind: 'expense' },
    { name: 'Hiburan',    kind: 'expense' },
    { name: 'Lainnya',    kind: 'expense' },
    { name: 'Gaji',       kind: 'income' },
    { name: 'Freelance',  kind: 'income' },
    { name: 'Bonus',      kind: 'income' },
    { name: 'Lainnya',    kind: 'both' }
  ];

  var dbp = null;

  function openDB() {
    if (dbp) return dbp;
    dbp = COFDE.idb.open(DB, DB_VERSION, function (db) {
      if (!db.objectStoreNames.contains('days')) {
        db.createObjectStore('days', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'name' });
      }
    }).catch(function (e) { dbp = null; throw e; });
    return dbp;
  }

  /* ── Kategori ── */
  function ensureDefaults() {
    return COFDE.idb.all(openDB(), 'categories').then(function (list) {
      if (list && list.length) return list;
      /* "Lainnya" muncul dua kali (expense + income) dengan nama sama,
         jadi keyPath name tidak bisa menyimpan keduanya. Gabungkan. */
      var seen = {};
      var uniq = [];
      DEFAULT_CATEGORIES.forEach(function (c) {
        if (seen[c.name]) { uniq[seen[c.name]].kind = 'both'; return; }
        seen[c.name] = uniq.length;
        uniq.push({ name: c.name, kind: c.kind });
      });
      return COFDE.idb.putMany(openDB(), 'categories', uniq).then(function () { return uniq; });
    });
  }

  function saveCategory(cat) {
    if (!cat || !cat.name) return Promise.reject(new Error('Nama kategori wajib diisi.'));
    return COFDE.idb.put(openDB(), 'categories', {
      name: String(cat.name).trim(),
      kind: cat.kind === 'income' || cat.kind === 'expense' || cat.kind === 'both' ? cat.kind : 'both'
    });
  }

  function deleteCategory(name) {
    return COFDE.idb.del(openDB(), 'categories', name);
  }

  /* ── Journal per tanggal ── */
  function loadDays() {
    return COFDE.idb.all(openDB(), 'days');
  }

  function saveDay(day) {
    if (!day || !day.date) return Promise.reject(new Error('Tanggal journal wajib diisi.'));
    var copy = {
      date: day.date,
      title: day.title || '',
      note: day.note || '',
      tx: (day.tx || []).map(function (t) {
        return {
          id: t.id || (Date.now() + '-' + Math.floor(Math.random() * 1e6)),
          type: t.type === 'income' ? 'income' : 'expense',
          amount: Math.abs(COFDE.fmt.toNumber(t.amount)),
          category: t.category || 'Lainnya',
          note: t.note || '',
          time: t.time || ''
        };
      })
    };
    if (!copy.tx.length) return deleteDay(day.date);
    return COFDE.idb.put(openDB(), 'days', copy);
  }

  function deleteDay(date) {
    return COFDE.idb.del(openDB(), 'days', date);
  }

  /* ── Perhitungan (murni, tanpa akses database) ── */

  /* Ratakan journal menjadi daftar transaksi bertanggal. */
  function flatten(days) {
    var out = [];
    (days || []).forEach(function (d) {
      (d.tx || []).forEach(function (t) {
        out.push({
          id: t.id,
          date: d.date,
          dayTitle: d.title || '',
          type: t.type,
          amount: Math.abs(COFDE.fmt.toNumber(t.amount)),
          category: t.category || 'Lainnya',
          note: t.note || '',
          time: t.time || ''
        });
      });
    });
    return out;
  }

  function matchQuery(t, q) {
    if (!q) return true;
    var hay = (t.note + ' ' + t.category + ' ' + t.dayTitle).toLowerCase();
    return hay.indexOf(q) > -1;
  }

  function filterTx(list, opt) {
    var o = opt || {};
    var q = (o.q || '').trim().toLowerCase();
    return (list || []).filter(function (t) {
      if (o.type && o.type !== 'all' && t.type !== o.type) return false;
      if (o.category && o.category !== 'all' && t.category !== o.category) return false;
      if (o.from && t.date < o.from) return false;
      if (o.to && t.date > o.to) return false;
      return matchQuery(t, q);
    });
  }

  function sortTx(list, key, dir) {
    var mul = dir === 'desc' ? -1 : 1;
    var copy = (list || []).slice();
    copy.sort(function (a, b) {
      var x, y;
      if (key === 'amount') { x = a.amount; y = b.amount; }
      else if (key === 'category') { x = a.category; y = b.category; }
      else { x = a.date + (a.time || ''); y = b.date + (b.time || ''); }
      if (x === y) return a.id < b.id ? -1 : 1;
      return x < y ? -1 * mul : 1 * mul;
    });
    return copy;
  }

  function sum(list, type) {
    return (list || []).reduce(function (acc, t) {
      if (!type || t.type === type) acc += t.amount;
      return acc;
    }, 0);
  }

  function dayCount(from, to) {
    var a = COFDE.fmt.toDate(from);
    var b = COFDE.fmt.toDate(to);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  }

  /* Ringkasan untuk satu rentang tanggal. */
  function summary(list, from, to) {
    var income = sum(list, 'income');
    var expense = sum(list, 'expense');
    var days = dayCount(from, to) || 1;
    return {
      income: income,
      expense: expense,
      net: income - expense,
      count: (list || []).length,
      days: days,
      avgPerDay: expense / days,
      topCategory: topCategory(list),
      highestDay: highestDay(list)
    };
  }

  function groupBy(list, keyFn) {
    var map = {};
    (list || []).forEach(function (t) {
      var k = keyFn(t);
      if (!map[k]) map[k] = { key: k, expense: 0, income: 0, total: 0, count: 0 };
      map[k][t.type] += t.amount;
      map[k].total += t.amount;
      map[k].count++;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function byCategory(list) {
    return groupBy(list, function (t) { return t.category; })
      .sort(function (a, b) { return b.expense - a.expense; });
  }

  function byDay(list) {
    return groupBy(list, function (t) { return t.date; })
      .sort(function (a, b) { return a.key < b.key ? -1 : 1; });
  }

  function topCategory(list) {
    var g = byCategory(list);
    for (var i = 0; i < g.length; i++) { if (g[i].expense > 0) return g[i]; }
    return null;
  }

  function highestDay(list) {
    var g = byDay(list);
    var best = null;
    g.forEach(function (d) { if (!best || d.expense > best.expense) best = d; });
    return best && best.expense > 0 ? best : null;
  }

  /* Deret harian untuk chart, termasuk hari tanpa transaksi (0). */
  function dailySeries(list, from, to) {
    var map = {};
    byDay(list).forEach(function (d) { map[d.key] = d; });
    var out = [];
    var cur = COFDE.fmt.toDate(from);
    var end = COFDE.fmt.toDate(to);
    if (!cur || !end) return out;
    var guard = 0;
    while (cur <= end && guard++ < 4000) {
      var key = COFDE.fmt.ymd(cur);
      var d = map[key] || { key: key, expense: 0, income: 0, total: 0, count: 0 };
      out.push(d);
      cur = COFDE.fmt.addDays(key, 1);
    }
    return out;
  }

  /* ── Rentang tanggal preset ── */
  function range(kind, ref) {
    var today = ref || COFDE.fmt.todayKey();
    if (kind === 'today') return { from: today, to: today, label: 'Hari ini' };
    if (kind === 'yesterday') {
      var y = COFDE.fmt.ymd(COFDE.fmt.addDays(today, -1));
      return { from: y, to: y, label: 'Kemarin' };
    }
    if (kind === 'week') {
      var d = COFDE.fmt.toDate(today);
      var dow = d.getDay();                    /* 0=Minggu */
      var back = dow === 0 ? 6 : dow - 1;       /* Senin sebagai awal minggu */
      var start = COFDE.fmt.ymd(COFDE.fmt.addDays(today, -back));
      return { from: start, to: COFDE.fmt.ymd(COFDE.fmt.addDays(start, 6)), label: 'Minggu ini' };
    }
    if (kind === 'month') {
      var mr = COFDE.fmt.monthRange(COFDE.fmt.monthKey(today));
      return { from: COFDE.fmt.ymd(mr.start), to: COFDE.fmt.ymd(mr.end), label: 'Bulan ini' };
    }
    if (kind === 'all') return { from: '0000-01-01', to: '9999-12-31', label: 'Semua data' };
    return { from: today, to: today, label: 'Hari ini' };
  }

  /* ── Budget bulanan (scalar per bulan) ── */
  function budgetOf(month) {
    try {
      var v = localStorage.getItem(BUDGET_KEY + (month || COFDE.fmt.monthKey()));
      return v === null ? 0 : COFDE.fmt.toNumber(v);
    } catch (e) { return 0; }
  }

  function setBudget(month, amount) {
    try {
      var n = Math.max(0, COFDE.fmt.toNumber(amount));
      if (n === 0) localStorage.removeItem(BUDGET_KEY + month);
      else localStorage.setItem(BUDGET_KEY + month, String(n));
      return n;
    } catch (e) { return 0; }
  }

  function budgetPct(month, spent) {
    var b = budgetOf(month);
    if (!b) return null;
    return { budget: b, spent: spent, pct: Math.round((spent / b) * 100) };
  }

  /* ── Ekspor ── */
  var CSV_HEADER = ['date', 'type', 'category', 'amount', 'note', 'day_title'];

  function exportCSV(list) {
    var rows = [CSV_HEADER.join(',')];
    sortTx(list, 'date', 'asc').forEach(function (t) {
      rows.push([
        t.date,
        t.type,
        t.category,
        t.amount,
        t.note,
        t.dayTitle
      ].map(COFDE.fmt.csvCell).join(','));
    });
    return rows.join('\n');
  }

  function exportJSON(days, categories) {
    return JSON.stringify({
      app: 'COFDE Expense',
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: categories || [],
      days: days || []
    }, null, 2);
  }

  function importJSON(text) {
    var obj = JSON.parse(text);
    if (!obj || !Array.isArray(obj.days)) {
      throw new Error('Berkas tidak berisi data journal COFDE Expense.');
    }
    var clean = obj.days.map(function (d) {
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(String(d.date || ''))) return null;
      return {
        date: d.date,
        title: String(d.title || ''),
        note: String(d.note || ''),
        tx: (d.tx || []).filter(function (t) {
          return t && (t.type === 'income' || t.type === 'expense');
        }).map(function (t) {
          return {
            id: t.id || (d.date + '-' + Math.floor(Math.random() * 1e9)),
            type: t.type,
            amount: Math.abs(COFDE.fmt.toNumber(t.amount)),
            category: String(t.category || 'Lainnya'),
            note: String(t.note || ''),
            time: String(t.time || '')
          };
        })
      };
    }).filter(function (d) { return d && d.tx.length; });

    var cats = (Array.isArray(obj.categories) ? obj.categories : [])
      .filter(function (c) { return c && c.name; })
      .map(function (c) {
        return { name: String(c.name).trim(), kind: c.kind || 'both' };
      });

    return COFDE.idb.putMany(openDB(), 'days', clean)
      .then(function () { return cats.length ? COFDE.idb.putMany(openDB(), 'categories', cats) : 0; })
      .then(function () { return clean.length; });
  }

  window.COFDE = window.COFDE || {};
  window.COFDE.expense = {
    DB: DB,
    BUDGET_KEY: BUDGET_KEY,
    DEFAULT_CATEGORIES: DEFAULT_CATEGORIES,
    openDB: openDB,
    ensureDefaults: ensureDefaults,
    loadDays: loadDays,
    saveDay: saveDay,
    deleteDay: deleteDay,
    saveCategory: saveCategory,
    deleteCategory: deleteCategory,
    flatten: flatten,
    filterTx: filterTx,
    sortTx: sortTx,
    sum: sum,
    summary: summary,
    byCategory: byCategory,
    byDay: byDay,
    dailySeries: dailySeries,
    topCategory: topCategory,
    highestDay: highestDay,
    range: range,
    budgetOf: budgetOf,
    setBudget: setBudget,
    budgetPct: budgetPct,
    exportCSV: exportCSV,
    exportJSON: exportJSON,
    importJSON: importJSON,
    CSV_HEADER: CSV_HEADER
  };
})();
