/* COFDE ML CSV Visualizer - controller halaman. Semua kalkulasi lokal. */
(function () {
  'use strict';

  var ML = COFDE.mlcsv;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var pct = function (x) {
    return Math.round(Number(x) * 1000) / 10 + '%';
  };
  var num = function (v) {
    if (v === undefined || v === null || (typeof v === 'number' && isNaN(v))) return '-';
    if (typeof v === 'number') {
      var d = Math.abs(v) >= 100 ? 2 : 4;
      return v.toLocaleString('id-ID', { maximumFractionDigits: d });
    }
    return esc(v);
  };

  var state = { header: [], rows: [], last: null, saved: null };
  var running = false;

  function on(id, fn) {
    var el = $(id);
    if (el) el.addEventListener('click', fn);
  }

  function delimValue() {
    var v = $('mlDelim').value;
    return v === '\\t' ? '\t' : (v || '');
  }

  function setDelimSelect(d) {
    var m = { ',': ',', ';': ';', '\t': '\\t' };
    $('mlDelim').value = m[d] || '';
  }

  function runInput(text, fileName) {
    if (!text || !text.trim()) { COFDE.toast.info('Tidak ada data untuk dianalisis.'); return; }
    if (running) return;
    running = true;
    var t0 = Date.now();
    try {
      var p = ML.parseCSV(text, { delimiter: delimValue(), header: $('mlHeader').checked });
      if (!p.rows.length) { COFDE.toast.error('Tidak ada baris data yang valid.'); running = false; return; }
      if (p.rows.length > 100000) {
        COFDE.toast.warning('Data sangat besar (' + p.rows.length.toLocaleString('id-ID') + ' baris); bisa memperlambat browser.');
      }
      state.header = p.header; state.rows = p.rows; state.last = (fileName || 'data') + ' (delimiter ' + esc(p.delimiter === '\t' ? '\\t' : p.delimiter) + ')';
      renderAnalyze();
      COFDE.toast.success('Analisis selesai dalam ' + (Date.now() - t0) + ' ms.');
    } catch (e) {
      COFDE.toast.error('Gagal menganalisis: ' + (e && e.message || e));
    }
    running = false;
  }

  /* ═══ RENDER ═══ */
  function renderAnalyze() {
    var rep = ML.report(state.header, state.rows);
    state.saved = rep;

    $('mlSummary').innerHTML = [
      ['Baris', state.rows.length],
      ['Kolom', state.header.length],
      ['Sel', rep.totalCells],
      ['Kosong', rep.cellsMissingText ? '' : '-'],
      ['Sumber', state.last]
    ].map(function (c) {
      return '<div class="cx-stat"><div class="cx-stat-label">' + esc(c[0]) +
        '</div><div class="cx-stat-value">' + num(c[1]) + '</div></div>';
    }).join('');

    // perhitungkan total sel kosong
    var missingTotal = rep.types.reduce(function (a, t) { return a + t.missing; }, 0);
    var sumEl = $('mlSummary');
    sumEl.innerHTML = sumEl.innerHTML.replace('<div class="cx-stat-value">-</div>', '<div class="cx-stat-value">' + num(missingTotal) + '</div>');

    $('mlTable').innerHTML = rep.types.map(function (t) {
      return '<tr><td>' + esc(t.name) + '</td><td>' + esc(t.type) + '</td>' +
        '<td>' + num(t.count) + '</td><td>' + num(t.missing) + '</td>' +
        '<td style="min-width:110px"><div class="cx-bar"><div class="cx-bar-fill" style="width:' + esc(t.fill) + '"></div></div></td>' +
        '<td>' + num(t.unique) + '</td><td>' + esc(t.samples.join(', ')) + '</td></tr>';
    }).join('');

    renderHistogram(rep);
    renderCats(rep);
    renderCorr(rep);
    renderRegress(rep);

    var hasNum = rep.numericColumns.length >= 2;
    $('mlRegress').style.display = hasNum ? '' : 'none';
    $('mlCorrTitle').style.display = hasNum && rep.correlations.length ? '' : 'none';
    $('mlCorrWrap').style.display = hasNum && rep.correlations.length ? '' : 'none';
  }

  function renderHistogram(rep) {
    var box = $('mlBars');
    var c = rep.numericColumns[0];
    if (!c) { box.innerHTML = ''; return; }
    var ci = state.header.indexOf(c);
    var h = ML.histogram(state.rows, ci, 10);
    var width = Math.max.apply(null, h.counts);
    box.innerHTML = '<h3 class="cx-card-title">Distribusi: ' + esc(c) + '</h3>' +
      h.labels.map(function (l, i) {
        var fillH = width ? Math.max(2, Math.round(h.counts[i] / width * 100)) : 0;
        return '<div class="cx-bar-row"><span class="cx-bar-label">' + esc(l) + '</span>' +
          '<div class="cx-bar"><div class="cx-bar-fill" style="height:' + fillH + '%;width:100%"></div></div>' +
          '<span class="cx-bar-n">' + h.counts[i] + '</span></div>';
      }).join('');
  }

  function renderCats(rep) {
    var box = $('mlCats');
    if (!rep.categories.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<h3 class="cx-card-title">Distribusi Kategori</h3>' + rep.categories.map(function (cat) {
      var head = '<h4 class="cx-sub" style="margin:10px 0 4px">' + esc(cat.col) + '</h4>';
      var rows = cat.balance.map(function (b) {
        return '<div class="cx-bar-row"><span class="cx-bar-label">' + esc(b.value) + '</span>' +
          '<div class="cx-bar"><div class="cx-bar-fill" style="width:' + esc(b.share.toFixed(1)) + '%;height:100%"></div></div>' +
          '<span class="cx-bar-n">' + b.count + ' (' + esc(b.share.toFixed(1)) + '%)</span></div>';
      }).join('');
      return head + rows;
    }).join('');
  }

  function renderCorr(rep) {
    $('mlCorrTable').innerHTML = rep.correlations.map(function (c) {
      return '<tr><td>' + esc(c.a) + '</td><td>' + esc(c.b) + '</td>' +
        '<td class="' + (Math.abs(c.r) > 0.7 ? 'cx-bad' : Math.abs(c.r) > 0.4 ? '' : 'cx-note') + '">' + num(c.r) + '</td></tr>';
    }).join('');
  }

  function renderRegress(rep) {
    var xs = $('mlRegX'), ys = $('mlRegY');
    if (rep.numericColumns.length < 2) { xs.innerHTML = ''; ys.innerHTML = ''; $('mlRegResult').textContent = 'Butuh minimal dua kolom numerik.'.replace(/&/g, '&amp;'); return; }
    xs.innerHTML = rep.numericColumns.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    ys.innerHTML = rep.numericColumns.map(function (c, i) {
      return '<option' + (i === 1 ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    computeRegression();
  }

  function computeRegression() {
    var x = $('mlRegX').value, y = $('mlRegY').value;
    if (!x || !y || x === y) { $('mlRegResult').textContent = 'Pilih dua kolom numerik berbeda.'; return; }
    var r = ML.linearRegression(state.rows, state.header.indexOf(x), state.header.indexOf(y));
    if (!r.ok) { $('mlRegResult').textContent = 'Kurang data valid untuk regresi.'; return; }
    $('mlRegResult').textContent = r.equation + ' - r = ' + num(r.r) + ', r\u00b2 = ' + num(r.r2) +
      ', n = ' + r.n + ', MSE = ' + num(r.mse);
  }
  $('mlRegX').addEventListener('change', computeRegression);
  $('mlRegY').addEventListener('change', computeRegression);

  /* ═══ SPLIT ═══ */
  function renderSplit() {
    if (!state.rows.length) { COFDE.toast.info('Analisis data dulu sebelum split.'); return; }
    var seed = Number($('mlSeed').value) || 1;
    var ratio = Number($('mlRatio').value);
    if (!(ratio >= 0 && ratio <= 1)) { COFDE.toast.error('Porsi test harus antara 0 dan 1.'); return; }
    var r = ML.trainTestSplit(state.header, state.rows, seed, ratio);
    $('mlSplitStats').innerHTML = [
      ['Total baris', r.n],
      ['Train', r.train.length],
      ['Test', r.test.length],
      ['Porsi test', pct(r.train.length ? r.test.length / r.n : 0)],
      ['Seed', seed]
    ].map(function (c) {
      return '<div class="cx-stat"><div class="cx-stat-label">' + esc(c[0]) +
        '</div><div class="cx-stat-value">' + num(c[1]) + '</div></div>';
    }).join('');
    var preview = function (title, rows) {
      var headRow = '<tr><th></th>' + state.header.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
      var body = rows.slice(0, 5).map(function (row, i) {
        return '<tr><td>' + (i + 1) + '</td>' + row.map(function (v) { return '<td>' + num(v) + '</td>'; }).join('') + '</tr>';
      }).join('');
      return '<h4 class="cx-sub" style="margin:12px 0 4px">' + esc(title) + ' (' + rows.length + ' baris)</h4>' +
        '<table class="cx-table"><thead>' + headRow + '</thead><tbody>' + body + '</tbody></table>';
    };
    $('mlSplitTable').innerHTML = preview('Train', r.train) + preview('Test', r.test);
  }
  on('mlSplit', renderSplit);

  /* ═══ INPUT ═══ */
  function readText() {
    return $('mlText').value;
  }

  function setText(t) { $('mlText').value = t; }

  on('mlRun', function () { runInput(readText(), 'teks tempelan'); });

  on('mlFile', function () {
    var f = $('mlFile').files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { COFDE.toast.error('File terlalu besar (maks 10 MB).'); return; }
    var rd = new FileReader();
    rd.onload = function () { runInput(String(rd.result), f.name); };
    rd.onerror = function () { COFDE.toast.error('Gagal membaca file.'); };
    rd.readAsText(f, 'UTF-8');
  });

  on('mlClear', function () {
    $('mlText').value = '';
    $('mlFile').value = '';
    ['mlTable', 'mlCorrTable', 'mlSplitTable'].forEach(function (id) { $(id).innerHTML = ''; });
    $('mlSummary').innerHTML = ''; $('mlBars').innerHTML = ''; $('mlCats').innerHTML = '';
    $('mlRegResult').textContent = ''; $('mlSplitStats').innerHTML = '';
    $('mlRegress').style.display = 'none'; $('mlCorrTitle').style.display = 'none'; $('mlCorrWrap').style.display = 'none';
    state = { header: [], rows: [], last: null, saved: null };
    COFDE.toast.info('Hasil dibersihkan.');
  });

  on('mlExample', function () {
    setText([
      'id,nama,umur,gaji,tinggi,aktif,kelas,tanggal',
      '1,Budi,30,7000000,170,true,A,2024-01-05',
      '2,Siti,24,4500000,160,false,B,2024-02-15',
      '3,Agus,40,9000000,175,true,A,2023-11-20',
      '4,Dewi,33,6000000,165,yes,B,2024-03-10',
      '5,Rudi,29,5500000,172,true,A,2024-04-22'
    ].join('\n'));
    runInput(readText(), 'contoh');
  });

  /* tab */
  Array.prototype.slice.call(document.querySelectorAll('.cx-tab')).forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.ttab;
      ['ana', 'split'].forEach(function (t) {
        var p = $('ttab-' + t);
        if (p) p.classList.toggle('cx-hidden', t !== id);
      });
      Array.prototype.slice.call(document.querySelectorAll('.cx-tab')).forEach(function (x) {
        x.classList.toggle('active', x === b);
      });
    });
  });

  /* Badge jaringan. */
  function wireNet() {
    var badge = $('netBadge');
    if (badge && COFDE.net) COFDE.net.badge(badge);
  }
  wireNet();

  /* Ekspor untuk pengujian. */
  window.COFDE.mlcsvPage = window.__mlcsvPage = {
    run: runInput, renderAnalyze: renderAnalyze, renderSplit: renderSplit,
    computeRegression: computeRegression, readText: readText, setText: setText,
    state: function () { return state; }
  };
})();