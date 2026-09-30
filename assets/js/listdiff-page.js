/* ══════════════════════════════════════════════════════════
   COFDE List Diff
   Dua mode:
     - lines : membandingkan daftar teks per baris
     - cells : memecah baris jadi kolom lalu menghitung sel beda
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function linesOf(text) {
    return String(text).split(/\r?\n/);
  }

  function keyOf(v, trim, cased) {
    var s = String(v);
    if (trim) s = s.trim();
    if (!cased) s = s.toLowerCase();
    return s;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(n) { return new Intl.NumberFormat('id-ID').format(n); }

  /* ── Mode 1: beda baris ── */
  function runLines() {
    var trim = $('optTrim').checked;
    var cased = $('optCase').checked;

    var aRaw = linesOf($('aLines').value);
    var bRaw = linesOf($('bLines').value);

    /* Buang baris kosong di ujung, tapi hitung ulang penomorannya
       supaya indeks masih cocok dengan teks aslinya. */
    var a = [], b = [], i;
    for (i = 0; i < aRaw.length; i++) {
      if (keyOf(aRaw[i], true, cased) !== '') a.push({ n: i + 1, v: aRaw[i] });
    }
    for (i = 0; i < bRaw.length; i++) {
      if (keyOf(bRaw[i], true, cased) !== '') b.push({ n: i + 1, v: bRaw[i] });
    }

    var seenB = Object.create(null), seenA = Object.create(null);
    var onlyA = [], onlyB = [], same = [];

    for (i = 0; i < a.length; i++) seenA[keyOf(a[i].v, trim, cased)] = true;
    for (i = 0; i < b.length; i++) seenB[keyOf(b[i].v, trim, cased)] = true;

    for (i = 0; i < a.length; i++) {
      if (seenB[keyOf(a[i].v, trim, cased)]) same.push(a[i]);
      else onlyA.push(a[i]);
    }
    for (i = 0; i < b.length; i++) {
      if (!seenA[keyOf(b[i].v, trim, cased)]) onlyB.push(b[i]);
    }

    $('onlyACount').textContent = onlyA.length;
    $('onlyBCount').textContent = onlyB.length;
    $('sameCount').textContent = same.length;

    function fill(el, arr, cls) {
      if (!arr.length) {
        el.innerHTML = '<p class="lf-empty">Tidak ada.</p>';
        return;
      }
      el.innerHTML = arr.map(function (r) {
        return '<div class="lf-item ' + cls + '"><span class="lf-n">' + r.n + '</span>' +
          '<span class="lf-t">' + esc(r.v.trim ? r.v.trim() : r.v) + '</span></div>';
      }).join('');
    }
    fill($('onlyA'), onlyA, 'is-a');
    fill($('onlyB'), onlyB, 'is-b');
    fill($('sameList'), same, 'is-same');

    var total = a.length + b.length;
    var diff = onlyA.length + onlyB.length;
    $('linesStats').innerHTML = statRow([
      ['Baris A', a.length],
      ['Baris B', b.length],
      ['Beda baris', diff],
      ['Sama', same.length],
      ['Persen beda', total ? Math.round((diff / total) * 100) + '%' : '0%']
    ]);
  }

  function statRow(pairs) {
    return '<div class="lf-stat-grid">' + pairs.map(function (p) {
      return '<div class="lf-stat"><span class="lf-stat-label">' + p[0] + '</span>' +
        '<span class="lf-stat-value">' + p[1] + '</span></div>';
    }).join('') + '</div>';
  }

  /* ── Mode 2: beda data per baris ── */
  function detectSep(text) {
    var cand = ['\t', ',', ';', '|', ' '];
    var best = ',', bestScore = 0;
    cand.forEach(function (s) {
      var rows = linesOf(text).filter(function (l) { return l.trim() !== ''; }).slice(0, 40);
      if (rows.length < 2) return;
      var first = rows[0].split(s).length;
      /* Pemisah yang benar harus memecah jadi >1 kolom. Tanpa syarat ini
         spasi selalu menang karena tiap baris konsisten 1 kolom. */
      if (first < 2) return;
      var consistent = 0;
      rows.forEach(function (l) { if (l.split(s).length === first) consistent++; });
      var score = consistent / rows.length;
      if (score > bestScore) { bestScore = score; best = s; }
    });
    return bestScore > 0.5 ? best : ',';
  }

  function splitRows(text, sepMode) {
    var sep = sepMode === 'auto' ? detectSep(text) : sepMode;
    return linesOf(text)
      .filter(function (l) { return l.trim() !== ''; })
      .map(function (l) { return l.split(sep).map(function (c) { return c.trim(); }); });
  }

  function runCells() {
    var sepMode = $('cellSep').value;
    var keyName = $('keyCol').value.trim();
    var a = splitRows($('aCells').value, sepMode);
    var b = splitRows($('bCells').value, sepMode);

    /* Kolom kunci boleh diisi nomor (1 = kolom pertama) atau nama header.
       Kalau namanya ketemu di baris pertama, baris itu dianggap header. */
    var hasKey = keyName !== '';
    var keyCol = -1, i;
    if (hasKey) {
      if (/^\d+$/.test(keyName)) {
        keyCol = Number(keyName) - 1;
      } else if (a.length) {
        for (i = 0; i < a[0].length; i++) {
          if (String(a[0][i]).toLowerCase() === keyName.toLowerCase()) { keyCol = i; break; }
        }
        if (keyCol >= 0) { a = a.slice(1); b = b.slice(1); }
      }
      if (keyCol < 0) {
        hasKey = false;
        if (COFDE.toast) COFDE.toast('Kolom kunci "' + keyName + '" tidak ada, memakai urutan baris.', 'warn');
      }
    }

    var rows = [], added = 0, removed = 0, changed = 0, cellsDiff = 0;

    if (!hasKey) {
      /* Cocokkan berdasarkan nomor urut. */
      var max = Math.max(a.length, b.length);
      for (i = 0; i < max; i++) {
        var ra = a[i], rb = b[i];
        if (!ra && rb) { removed++; cellsDiff++; rows.push({ t: 'removed', n: i + 1, cells: [{ c: 1, a: '', b: rb.join(', ') }] }); continue; }
        if (ra && !rb) { added++; cellsDiff++; rows.push({ t: 'added', n: i + 1, cells: [{ c: 1, a: ra.join(', '), b: '' }] }); continue; }
        var w = Math.max(ra.length, rb.length), diffs = [];
        for (var j = 0; j < w; j++) {
          var va = ra[j] || '', vb = rb[j] || '';
          if (va !== vb) diffs.push({ c: j + 1, a: va, b: vb });
        }
        if (diffs.length) {
          changed++; cellsDiff += diffs.length;
          rows.push({ t: 'changed', n: i + 1, cells: diffs });
        }
      }
    } else {
      /* Cocokkan berdasarkan nilai kunci, bukan urutan. */
      var mapA = Object.create(null), mapB = Object.create(null);
      a.forEach(function (r, idx) {
        var k = (r[keyCol] || '').toLowerCase();
        if (!mapA[k]) mapA[k] = [];
        mapA[k].push({ n: idx + 1, r: r });
      });
      b.forEach(function (r, idx) {
        var k = (r[keyCol] || '').toLowerCase();
        if (!mapB[k]) mapB[k] = [];
        mapB[k].push({ n: idx + 1, r: r });
      });

      var keys = Object.keys(mapA);
      keys.forEach(function (k) {
        if (!mapB[k]) {
          mapA[k].forEach(function (e) {
            added++; cellsDiff++;
            rows.push({ t: 'added', n: e.n, key: k, cells: [{ c: 1, a: e.r.join(', '), b: '' }] });
          });
        }
      });
      keys = Object.keys(mapB);
      keys.forEach(function (k) {
        if (!mapA[k]) {
          mapB[k].forEach(function (e) {
            removed++; cellsDiff++;
            rows.push({ t: 'removed', n: e.n, key: k, cells: [{ c: 1, a: '', b: e.r.join(', ') }] });
          });
        }
      });

      Object.keys(mapA).forEach(function (k) {
        if (!mapB[k]) return;
        var n = Math.max(mapA[k].length, mapB[k].length);
        for (var q = 0; q < n; q++) {
          var ea = mapA[k][q], eb = mapB[k][q];
          if (!ea && eb) { removed++; cellsDiff++; rows.push({ t: 'removed', n: eb.n, key: k, cells: [{ c: 1, a: '', b: eb.r.join(', ') }] }); continue; }
          if (ea && !eb) { added++; cellsDiff++; rows.push({ t: 'added', n: ea.n, key: k, cells: [{ c: 1, a: ea.r.join(', '), b: '' }] }); continue; }
          var wid = Math.max(ea.r.length, eb.r.length), dd = [];
          for (var z = 0; z < wid; z++) {
            var xa = ea.r[z] || '', xb = eb.r[z] || '';
            if (xa !== xb) dd.push({ c: z + 1, a: xa, b: xb });
          }
          if (dd.length) {
            changed++; cellsDiff += dd.length;
            rows.push({ t: 'changed', n: ea.n, key: k, cells: dd });
          }
        }
      });
    }

    var totalRows = a.length + b.length;
    $('cellsStats').innerHTML = statRow([
      ['Baris A', a.length],
      ['Baris B', b.length],
      ['Baris beda', changed + added + removed],
      ['Baris berubah', changed],
      ['Hanya di A', added],
      ['Hanya di B', removed],
      ['Total data beda', cellsDiff],
      ['Persen data beda', totalRows ? Math.round((cellsDiff / totalRows) * 100) + '%' : '0%']
    ]);

    if (!rows.length) {
      $('cellsTable').innerHTML = '<tr><td colspan="4" class="lf-empty">Tidak ada perbedaan.</td></tr>';
      return;
    }

    var out = [];
    rows.forEach(function (r) {
      var badge = r.t === 'added' ? 'Hanya di A' : r.t === 'removed' ? 'Hanya di B' : 'Berbeda';
      r.cells.forEach(function (c, idx) {
        out.push('<tr class="lf-row-' + r.t + '">' +
          (idx === 0 ? '<td rowspan="' + r.cells.length + '"><span class="lf-tag lf-tag-' + r.t + '">' + badge + '</span>' +
            '<span class="lf-rownum">baris ' + r.n + (r.key ? ' · ' + esc(r.key) : '') + '</span></td>' : '') +
          '<td>' + c.c + '</td>' +
          '<td class="lf-ca">' + (c.a === '' ? '<em>kosong</em>' : esc(c.a)) + '</td>' +
          '<td class="lf-cb">' + (c.b === '' ? '<em>kosong</em>' : esc(c.b)) + '</td>' +
        '</tr>');
      });
    });
    $('cellsTable').innerHTML = out.join('');
  }

  /* ── Tab switch ── */
  var cards = [].slice.call(document.querySelectorAll('.lf-card'));
  function setMode(mode) {
    cards.forEach(function (c) {
      var on = c.dataset.mode === mode;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
      c.tabIndex = on ? 0 : -1;
    });
    $('mode-lines').hidden = mode !== 'lines';
    $('mode-items').hidden = mode !== 'items';
    if (mode === 'lines') runLines(); else runCells();
  }
  cards.forEach(function (c) {
    c.addEventListener('click', function () { setMode(c.dataset.mode); });
  });

  /* ── Wiring ── */
  $('runLines').addEventListener('click', runLines);
  $('swapLines').addEventListener('click', function () {
    var a = $('aLines').value; $('aLines').value = $('bLines').value; $('bLines').value = a;
    runLines();
  });
  $('clearLines').addEventListener('click', function () {
    $('aLines').value = ''; $('bLines').value = ''; runLines();
  });
  ['aLines', 'bLines'].forEach(function (id) {
    $(id).addEventListener('input', runLines);
  });
  ['optTrim', 'optCase'].forEach(function (id) {
    $(id).addEventListener('change', runLines);
  });

  $('runCells').addEventListener('click', runCells);
  $('swapCells').addEventListener('click', function () {
    var a = $('aCells').value; $('aCells').value = $('bCells').value; $('bCells').value = a;
    runCells();
  });
  $('clearCells').addEventListener('click', function () {
    $('aCells').value = ''; $('bCells').value = ''; $('keyCol').value = ''; runCells();
  });
  ['aCells', 'bCells'].forEach(function (id) {
    $(id).addEventListener('input', runCells);
  });
  $('cellSep').addEventListener('change', runCells);
  $('keyCol').addEventListener('input', runCells);

  function init() {
    setMode('lines');
    runCells();
    if (COFDE.net && COFDE.net.badge) COFDE.net.badge($('netBadge'));
    if (COFDE.cmdpal && COFDE.cmdpal.init) COFDE.cmdpal.init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
