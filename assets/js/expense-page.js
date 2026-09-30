/* ══════════════════════════════════════════════════════════
   COFDE Expense — controller halaman
   Menyatukan expense.js (data) dengan DOM, grafik, dan ekspor.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var E, F;
  var state = {
    days: [],
    categories: [],
    range: 'today',
    from: '',
    to: '',
    editId: null,
    sortKey: 'date',
    sortDir: 'desc',
    charts: {},
    budgetWarned: {}
  };

  var $ = function (id) { return document.getElementById(id); };
  function S() { return COFDE.settings.get(); }
  function money(n) { return F.money(n, S()); }
  function moneyShort(n) { return F.moneyShort(n, S()); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── Sumber data ── */
  function reload() {
    return Promise.all([E.loadDays(), COFDE.idb.all(E.openDB(), 'categories')])
      .then(function (r) {
        state.days = (r[0] || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        state.categories = (r[1] || []).slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        return state;
      });
  }

  function currentRange() {
    if (state.range === 'custom') {
      var from = $('rangeFrom').value || F.todayKey();
      var to = $('rangeTo').value || from;
      if (from > to) { var t = from; from = to; to = t; }
      return { from: from, to: to, label: F.formatDate(from, S().dateFormat) + ' - ' + F.formatDate(to, S().dateFormat) };
    }
    return E.range(state.range);
  }

  /* Transaksi dalam rentang aktif, setelah filter tabel. */
  function visibleTx() {
    var r = currentRange();
    var inRange = E.filterTx(E.flatten(state.days), { from: r.from, to: r.to });
    var filtered = E.filterTx(inRange, {
      q: $('fltQ').value,
      type: $('fltType').value,
      category: $('fltCategory').value
    });
    return { range: r, list: E.sortTx(filtered, state.sortKey, state.sortDir), inRange: inRange };
  }

  /* ── Kategori ── */
  function categoriesFor(kind) {
    return state.categories.filter(function (c) {
      return c.kind === 'both' || c.kind === kind;
    }).map(function (c) { return c.name; });
  }

  function fillCategorySelects() {
    var txSel = $('txCategory');
    var keep = txSel.value;
    var kind = $('txType').value;
    txSel.innerHTML = '';
    categoriesFor(kind).forEach(function (n) {
      var o = document.createElement('option');
      o.value = n; o.textContent = n;
      txSel.appendChild(o);
    });
    if (keep && categoriesFor(kind).indexOf(keep) > -1) txSel.value = keep;

    var flt = $('fltCategory');
    var keepFlt = flt.value;
    flt.innerHTML = '';
    var all = document.createElement('option');
    all.value = 'all'; all.textContent = 'Semua';
    flt.appendChild(all);
    state.categories.map(function (c) { return c.name; }).sort().forEach(function (n) {
      var o = document.createElement('option');
      o.value = n; o.textContent = n;
      flt.appendChild(o);
    });
    if (keepFlt) flt.value = keepFlt;
  }

  /* ── Metrik ── */
  function renderMetrics(v) {
    var r = v.range;
    var s = E.summary(v.inRange, r.from, r.to);
    $('rangeLabel').textContent = r.label + ' (' + s.days + ' hari, ' + s.count + ' transaksi)';
    $('mIncome').textContent = money(s.income);
    $('mExpense').textContent = money(s.expense);
    $('mNet').textContent = money(s.net);
    $('mNet').className = 'cx-stat-value ' + (s.net >= 0 ? 'income' : 'expense');
    $('mAvg').textContent = money(s.avgPerDay);
    $('mTopCat').textContent = s.topCategory
      ? s.topCategory.key + ' (' + money(s.topCategory.expense) + ')'
      : '-';
    $('mTopDay').textContent = s.highestDay
      ? F.formatDate(s.highestDay.key, S().dateFormat) + ' (' + money(s.highestDay.expense) + ')'
      : '-';
  }

  /* ── Budget ── */
  function renderBudget() {
    var month = $('budgetMonth').value || F.monthKey();
    var budget = E.budgetOf(month);
    var spent = E.sum(E.filterTx(E.flatten(state.days), { from: month + '-01', to: month + '-31' }), 'expense');
    var bar = $('budgetBar');
    var note = $('budgetNote');
    if (!budget) {
      bar.hidden = true;
      note.textContent = 'Belum ada limit untuk ' + F.monthLabel(month) + '. Total pengeluaran bulan ini ' + money(spent) + '.';
      return;
    }
    var pct = Math.round((spent / budget) * 100);
    bar.hidden = false;
    var fill = $('budgetFill');
    fill.style.width = Math.min(100, pct) + '%';
    fill.className = 'cx-bar-fill' + (pct >= 100 ? ' over' : (pct >= 80 ? ' warn' : ''));
    note.textContent = F.monthLabel(month) + ': terpakai ' + money(spent) + ' dari ' + money(budget) + ' (' + pct + '%).';
    if (pct >= 100 && !state.budgetWarned[month]) {
      state.budgetWarned[month] = true;
      COFDE.toast.warning('Budget ' + F.monthLabel(month) + ' sudah terlampaui (' + pct + '%). Transaksi tetap bisa dicatat.');
    }
  }

  /* ── Grafik ── */
  function chartAvailable() { return typeof window.Chart !== 'undefined'; }

  function baseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#c9c9c9' } },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var v = ctx.parsed && ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
              return ctx.dataset.label + ': ' + money(v);
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#9a9a9a' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: {
          ticks: { color: '#9a9a9a', callback: function (v) { return moneyShort(v); } },
          grid: { color: 'rgba(255,255,255,0.06)' },
          beginAtZero: true
        }
      }
    };
  }

  function makeChart(key, canvasId, type, opts) {
    var el = $(canvasId);
    if (!el || !chartAvailable()) return null;
    if (state.charts[key]) { state.charts[key].destroy(); }
    state.charts[key] = new window.Chart(el.getContext('2d'),
      Object.assign({ type: type }, opts));
    return state.charts[key];
  }

  /* Terlalu banyak titik membuat chart tak terbaca:=rangkum per bulan. */
  function seriesForChart(list, r) {
    var daily = E.dailySeries(list, r.from, r.to);
    if (daily.length <= 90) {
      return { labels: daily.map(function (d) { return F.formatDate(d.key, S().dateFormat); }), expense: daily.map(function (d) { return d.expense; }), income: daily.map(function (d) { return d.income; }) };
    }
    var byMonth = {};
    daily.forEach(function (d) {
      var m = F.monthKey(d.key);
      if (!byMonth[m]) byMonth[m] = { key: m, expense: 0, income: 0 };
      byMonth[m].expense += d.expense;
      byMonth[m].income += d.income;
    });
    var keys = Object.keys(byMonth).sort();
    return {
      labels: keys.map(function (k) { return F.monthLabel(k); }),
      expense: keys.map(function (k) { return byMonth[k].expense; }),
      income: keys.map(function (k) { return byMonth[k].income; })
    };
  }

  function renderCharts(v) {
    if (!chartAvailable()) { $('chartNote').hidden = false; return; }
    $('chartNote').hidden = true;
    var r = v.range;
    var ser = seriesForChart(v.inRange, r);

    makeChart('daily', 'chDaily', 'bar', {
      data: {
        labels: ser.labels,
        datasets: [{ label: 'Pengeluaran', data: ser.expense, backgroundColor: 'rgba(229,72,77,0.75)' }]
      },
      options: baseOptions()
    });

    var cats = E.byCategory(v.inRange).filter(function (c) { return c.expense > 0; }).slice(0, 8);
    makeChart('cat', 'chCategory', 'doughnut', {
      data: {
        labels: cats.map(function (c) { return c.key; }),
        datasets: [{
          label: 'Kategori',
          data: cats.map(function (c) { return c.expense; }),
          backgroundColor: ['#e5484d', '#ff4655', '#f5a524', '#12a885', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#c9c9c9' } } }
      }
    });

    makeChart('flow', 'chFlow', 'bar', {
      data: {
        labels: ser.labels,
        datasets: [
          { label: 'Pemasukan', data: ser.income, backgroundColor: 'rgba(18,168,133,0.75)' },
          { label: 'Pengeluaran', data: ser.expense, backgroundColor: 'rgba(229,72,77,0.75)' }
        ]
      },
      options: baseOptions()
    });
  }

  /* ── Tabel transaksi ── */
  function renderTable(v) {
    var body = $('txBody');
    body.innerHTML = '';
    $('txEmpty').hidden = v.list.length > 0;
    $('fltInfo').textContent = v.list.length + ' transaksi ditampilkan' +
      (v.list.length !== v.inRange.length ? ' dari ' + v.inRange.length + ' dalam rentang' : '');

    v.list.forEach(function (t) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + esc(F.formatDate(t.date, S().dateFormat)) + '</td>' +
        '<td>' + (t.type === 'income' ? 'Pemasukan' : 'Pengeluaran') + '</td>' +
        '<td>' + esc(t.category) + '</td>' +
        '<td class="cx-right cx-amount ' + t.type + '">' + esc(money(t.amount)) + '</td>' +
        '<td>' + esc(t.note) + '</td>' +
        '<td class="cx-right">' +
          '<button class="cx-btn cx-btn-sm" data-act="edit" data-date="' + esc(t.date) + '" data-id="' + esc(t.id) + '">Edit</button> ' +
          '<button class="cx-btn cx-btn-sm cx-btn-danger" data-act="del" data-date="' + esc(t.date) + '" data-id="' + esc(t.id) + '">Hapus</button>' +
        '</td>';
      body.appendChild(tr);
    });
  }

  /* ── Journal ── */
  function renderJournals() {
    var wrap = $('journalList');
    wrap.innerHTML = '';
    $('journalEmpty').hidden = state.days.length > 0;

    state.days.forEach(function (d) {
      var inc = E.sum(d.tx.filter(function (t) { return t.type === 'income'; }));
      var exp = E.sum(d.tx.filter(function (t) { return t.type === 'expense'; }));
      var box = document.createElement('div');
      box.className = 'cx-journal';
      var net = inc - exp;
      box.innerHTML =
        '<div class="cx-journal-head">' +
          '<span class="cx-journal-date">' + esc(F.longDate(d.date)) + '</span>' +
          '<input class="cx-input cx-journal-title" data-date="' + esc(d.date) + '" value="' + esc(d.title) + '" placeholder="Title jurnal" style="flex:1;min-width:8rem">' +
          '<input class="cx-input cx-journal-note" data-date="' + esc(d.date) + '" value="' + esc(d.note) + '" placeholder="Catatan jurnal" style="flex:1;min-width:8rem">' +
          '<span class="cx-journal-total ' + (net >= 0 ? 'income' : 'expense') + '">' + esc(money(net)) + '</span>' +
        '</div>' +
        '<ul class="cx-journal-list">' +
          d.tx.map(function (t) {
            return '<li>' + (t.type === 'income' ? '+' : '-') + ' ' + esc(money(t.amount)) +
              ' &middot; ' + esc(t.category) + (t.note ? ' &middot; ' + esc(t.note) : '') + '</li>';
          }).join('') +
        '</ul>' +
        '<div class="cx-actions">' +
          '<button class="cx-btn cx-btn-sm cx-btn-primary" data-act="jsave" data-date="' + esc(d.date) + '">Simpan jurnal</button>' +
          '<button class="cx-btn cx-btn-sm cx-btn-danger" data-act="jdel" data-date="' + esc(d.date) + '">Hapus jurnal</button>' +
        '</div>';
      wrap.appendChild(box);
    });
  }

  /* ── Kategori chips ── */
  function renderCategories() {
    var wrap = $('catList');
    wrap.innerHTML = '';
    state.categories.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cx-chip-btn';
      b.setAttribute('data-act', 'catdel');
      b.setAttribute('data-name', c.name);
      b.title = 'Hapus kategori ' + c.name;
      b.textContent = c.name + ' ';
      var x = document.createElement('span');
      x.className = 'x';
      x.textContent = '×';
      b.appendChild(x);
      wrap.appendChild(b);
    });
  }

  /* ── Render semua bagian ── */
  function renderAll() {
    fillCategorySelects();
    var v = visibleTx();
    renderMetrics(v);
    renderBudget();
    renderTable(v);
    renderJournals();
    renderCategories();
    renderCharts(v);
  }

  /* ── Aksi ── */
  function findDay(date) {
    return state.days.filter(function (d) { return d.date === date; })[0] || null;
  }

  function resetForm() {
    state.editId = null;
    $('txAmount').value = '';
    $('txNote').value = '';
    $('txDayTitle').value = '';
    $('txDayNote').value = '';
    $('txAdd').textContent = 'Tambah';
    $('txReset').hidden = true;
  }

  function onAdd() {
    var date = $('txDate').value || F.todayKey();
    var type = $('txType').value;
    var amount = Math.abs(F.toNumber($('txAmount').value));
    var category = $('txCategory').value || 'Lainnya';
    var note = $('txNote').value.trim();

    if (!amount) { COFDE.toast.warning('Jumlah transaksi tidak boleh nol.'); $('txAmount').focus(); return; }
    if (amount > 1e12) { COFDE.toast.warning('Jumlah terlalu besar, periksa kembali.'); return; }

    var day = findDay(date) || { date: date, title: '', note: '', tx: [] };
    if (state.editId) {
      var edited = false;
      day.tx = day.tx.map(function (t) {
        if (t.id !== state.editId) return t;
        edited = true;
        t.type = type; t.amount = amount; t.category = category; t.note = note;
        return t;
      });
      if (!edited) COFDE.toast.error('Transaksi yang diedit tidak ditemukan.');
    } else {
      var now = new Date();
      day.tx.push({
        id: Date.now() + '-' + Math.floor(Math.random() * 1e6),
        type: type, amount: amount, category: category, note: note,
        time: (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()
      });
    }
    if ($('txDayTitle').value.trim()) day.title = $('txDayTitle').value.trim();
    if ($('txDayNote').value.trim()) day.note = $('txDayNote').value.trim();

    E.saveDay(day).then(function () {
      COFDE.toast.success(state.editId ? 'Transaksi diperbarui.' : 'Transaksi ditambahkan.');
      resetForm();
      return reload();
    }).then(renderAll).catch(function (e) { COFDE.report(e, 'Gagal menyimpan transaksi.'); });
  }

  function onDelete(date, id) {
    var day = findDay(date);
    if (!day) return;
    day.tx = day.tx.filter(function (t) { return t.id !== id; });
    if (state.editId === id) resetForm();
    E.saveDay(day).then(function () {
      COFDE.toast.success('Transaksi dihapus.');
      return reload();
    }).then(renderAll).catch(function (e) { COFDE.report(e, 'Gagal menghapus transaksi.'); });
  }

  function onEdit(date, id) {
    var day = findDay(date);
    if (!day) return;
    var t = day.tx.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    /* Transaksi di dalam journal tidak menyimpan `date`; tanggalnya
       milik journal. Pakai `date` dari tombol, bukan t.date (undefined
       akan mengosongkan <input type="date">). */
    $('txDate').value = date;
    $('txType').value = t.type;
    fillCategorySelects();
    $('txCategory').value = t.category;
    $('txAmount').value = String(t.amount);
    $('txNote').value = t.note;
    $('txDayTitle').value = day.title;
    $('txDayNote').value = day.note;
    state.editId = id;
    $('txAdd').textContent = 'Simpan perubahan';
    $('txReset').hidden = false;
    $('txAmount').focus();
    $('txAmount').scrollIntoView({ block: 'center' });
  }

  function onJournalSave(date) {
    var day = findDay(date);
    if (!day) return;
    var box = document.querySelector('.cx-journal-title[data-date="' + date + '"]');
    var noteBox = document.querySelector('.cx-journal-note[data-date="' + date + '"]');
    if (box) day.title = box.value.trim();
    if (noteBox) day.note = noteBox.value.trim();
    E.saveDay(day).then(function () {
      COFDE.toast.success('Jurnal ' + F.formatDate(date, S().dateFormat) + ' disimpan.');
      return reload();
    }).then(renderAll).catch(function (e) { COFDE.report(e, 'Gagal menyimpan jurnal.'); });
  }

  function onJournalDelete(date) {
    if (!window.confirm('Hapus jurnal ' + F.formatDate(date, S().dateFormat) + ' beserta seluruh transaksinya?')) {
      COFDE.toast.info('Dibatalkan.');
      return;
    }
    E.deleteDay(date).then(function () {
      COFDE.toast.success('Jurnal dihapus.');
      return reload();
    }).then(renderAll).catch(function (e) { COFDE.report(e, 'Gagal menghapus jurnal.'); });
  }

  function onCategoryAdd() {
    var name = $('catName').value.trim();
    if (!name) { COFDE.toast.warning('Nama kategori wajib diisi.'); return; }
    if (state.categories.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) {
      COFDE.toast.warning('Kategori "' + name + '" sudah ada.');
      return;
    }
    E.saveCategory({ name: name, kind: $('catKind').value }).then(function () {
      $('catName').value = '';
      COFDE.toast.success('Kategori "' + name + '" ditambahkan.');
      return reload();
    }).then(renderAll).catch(function (e) { COFDE.report(e, 'Gagal menambah kategori.'); });
  }

  function onCategoryDelete(name) {
    var used = E.flatten(state.days).filter(function (t) { return t.category === name; }).length;
    var msg = 'Hapus kategori "' + name + '"?' + (used ? ' (' + used + ' transaksi memakai kategori ini dan tidak akan berubah)' : '');
    if (!window.confirm(msg)) { COFDE.toast.info('Dibatalkan.'); return; }
    E.deleteCategory(name).then(function () {
      COFDE.toast.success('Kategori dihapus.');
      return reload();
    }).then(renderAll).catch(function (e) { COFDE.report(e, 'Gagal menghapus kategori.'); });
  }

  function onBudgetSave() {
    var month = $('budgetMonth').value || F.monthKey();
    var amt = E.setBudget(month, $('budgetAmount').value);
    state.budgetWarned[month] = false;
    COFDE.toast.success(amt ? 'Budget ' + F.monthLabel(month) + ' disimpan: ' + money(amt) + '.' : 'Budget ' + F.monthLabel(month) + ' dihapus.');
    renderBudget();
  }

  function onExportCsv() {
    var v = visibleTx();
    if (!v.list.length) { COFDE.toast.warning('Tidak ada transaksi untuk diekspor.'); return; }
    F.download('expense-' + F.stamp() + '.csv', '\uFEFF' + E.exportCSV(v.list), 'text/csv;charset=utf-8');
    COFDE.toast.success(v.list.length + ' transaksi diekspor ke CSV.');
  }

  function onExportJson() {
    F.download('expense-backup-' + F.stamp() + '.json', E.exportJSON(state.days, state.categories), 'application/json');
    COFDE.toast.success('Backup JSON dibuat.');
  }

  function onImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      E.importJSON(String(reader.result)).then(function (n) {
        COFDE.toast.success(n + ' journal diimport.');
        return reload();
      }).then(renderAll).catch(function (e) {
        COFDE.report(e, 'Import gagal. Pastikan berkas adalah JSON backup COFDE Expense.');
      });
    };
    reader.onerror = function () { COFDE.report(reader.error, 'Gagal membaca berkas.'); };
    reader.readAsText(file);
  }

  /* ── Wiring ── */
  function init() {
    E = COFDE.expense;
    F = COFDE.fmt;

    COFDE.guard.install();
    COFDE.settings.init();
    COFDE.net.init();
    COFDE.cmdpal.init();
    COFDE.net.badge($('netBadge'));

    $('txDate').value = F.todayKey();
    $('txAmount').value = '';
    $('budgetMonth').value = F.monthKey();
    $('rangeFrom').value = F.todayKey();
    $('rangeTo').value = F.todayKey();
    $('txType').addEventListener('change', fillCategorySelects);
    $('txAdd').addEventListener('click', onAdd);
    $('txReset').addEventListener('click', function () { resetForm(); renderAll(); });
    $('txAmount').addEventListener('keydown', function (e) { if (e.key === 'Enter') onAdd(); });

    $('rangeTabs').addEventListener('click', function (e) {
      var btn = e.target.closest('.cx-tab');
      if (!btn) return;
      state.range = btn.getAttribute('data-range');
      Array.prototype.forEach.call(this.querySelectorAll('.cx-tab'), function (b) {
        b.classList.toggle('active', b === btn);
      });
      $('customRange').hidden = state.range !== 'custom';
      if (state.range === 'custom') {
        var r = E.range('month');
        $('rangeFrom').value = r.from;
        $('rangeTo').value = r.to;
      }
      renderAll();
    });

    ['rangeFrom', 'rangeTo'].forEach(function (id) {
      $(id).addEventListener('change', renderAll);
    });
    ['fltQ', 'fltType', 'fltCategory'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        renderMetrics(visibleTx());
        renderTable(visibleTx());
      });
    });
    $('fltSort').addEventListener('change', function () {
      var parts = this.value.split(':');
      state.sortKey = parts[0];
      state.sortDir = parts[1];
      renderTable(visibleTx());
    });

    $('txBody').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var date = btn.getAttribute('data-date');
      var id = btn.getAttribute('data-id');
      if (act === 'edit') onEdit(date, id);
      else if (act === 'del') onDelete(date, id);
    });

    $('journalList').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var date = btn.getAttribute('data-date');
      if (btn.getAttribute('data-act') === 'jsave') onJournalSave(date);
      else if (btn.getAttribute('data-act') === 'jdel') onJournalDelete(date);
    });
    $('journalList').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var box = e.target.closest('.cx-journal-title, .cx-journal-note');
      if (box) onJournalSave(box.getAttribute('data-date'));
    });

    $('catAdd').addEventListener('click', onCategoryAdd);
    $('catName').addEventListener('keydown', function (e) { if (e.key === 'Enter') onCategoryAdd(); });
    $('catList').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act="catdel"]');
      if (btn) onCategoryDelete(btn.getAttribute('data-name'));
    });

    $('budgetSave').addEventListener('click', onBudgetSave);
    $('budgetMonth').addEventListener('change', function () {
      $('budgetAmount').value = E.budgetOf(this.value) ? String(E.budgetOf(this.value)) : '';
      renderBudget();
    });
    $('budgetAmount').value = '';

    $('expCsv').addEventListener('click', onExportCsv);
    $('expJson').addEventListener('click', onExportJson);
    $('expPrint').addEventListener('click', function () { window.print(); });
    $('impFile').addEventListener('change', function () {
      if (this.files && this.files[0]) onImport(this.files[0]);
      this.value = '';
    });

    COFDE.settings.onChange(function () { renderAll(); });

    return E.ensureDefaults()
      .then(reload)
      .then(renderAll)
      .then(function () {
        $('budgetAmount').value = E.budgetOf(F.monthKey()) ? String(E.budgetOf(F.monthKey())) : '';
      })
      .catch(function (e) { COFDE.report(e, 'Expense Tracker gagal memuat data.'); });
  }

  window.COFDE = window.COFDE || {};
  window.COFDE.expensePage = { init: init, state: state };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
