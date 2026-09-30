/* COFDE ML CSV Visualizer - parsing dan statistika CSV, murni, tanpa
   dependensi. Semua dihitung di browser; tidak ada data yang dikirim. */
(function () {
  'use strict';

  /* ═══ PARSING ═══ */
  function detectDelimiter(text, sampleLines) {
    var head = String(text || '').split(/\r?\n/).slice(0, sampleLines || 8).join('\n');
    var cands = [',', ';', '\t', '|'];
    var best = ',';
    var bestN = -1;
    cands.forEach(function (d) {
      var n = head.split(d).length - 1;
      if (n > bestN) { bestN = n; best = d; }
    });
    return { delimiter: best, char: best === '\t' ? '\\t' : best };
  }

  /* StringTokenizer unit: semua delimiter diproses dengan pendekatan
     yang sama (hormati kutip ganda). */
  function splitRow(line, delimiter) {
    var out = [];
    var buf = '';
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (inQ) {
        if (c === '"') { if (line[i + 1] === '"') { buf += '"'; i++; } else inQ = false; }
        else buf += c;
      } else if (c === '"') inQ = true;
      else if (c === delimiter) { out.push(buf); buf = ''; }
      else buf += c;
    }
    out.push(buf);
    return out;
  }

  function normalizeNewlines(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  function parseCSV(text, opts) {
    opts = opts || {};
    var raw = normalizeNewlines(text);
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    var delimiter = (typeof opts.delimiter === 'string' && opts.delimiter.length)
      ? opts.delimiter : detectDelimiter(raw).delimiter;
    var hasHeader = opts.header !== false;

    var rows = raw.split('\n').map(function (line) {
      if (line.trim() === '' && !/"/.test(line)) return null;
      return splitRow(line, delimiter).map(function (f) {
        return f.replace(/^"(.*)"$/, function (_, inner) { return inner.replace(/""/g, '"'); });
      });
    }).filter(Boolean);

    if (!rows.length) return { header: [], rows: [], delimiter: delimiter };

    var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var header = hasHeader ? rows[0].slice() : [];
    var dataStart = hasHeader ? 1 : 0;

    if (!hasHeader) {
      for (var c = 1; c <= width; c++) header.push('kolom' + c);
    }
    if (width > header.length) {
      for (var c2 = header.length; c2 < width; c2++) header.push('kolom' + (c2 + 1));
    }

    var data = [];
    for (var r = dataStart; r < rows.length; r++) {
      var row = rows[r].slice(0, width);
      if (width > row.length) { for (var p = row.length; p < width; p++) row.push(''); }
      data.push(row);
    }

    return { header: header, rows: data, delimiter: delimiter, hasHeader: hasHeader };
  }

  /* ═══ KOLOM & TIPE ═══ */
  var NUM_RE = /^[+-]?(\d+([.,]\d+)?|\.\d+)([eE][+-]?\d+)?$/;
  var BOOL_SET = { true: 1, false: 1, yes: 1, no: 1, 'y': 1, n: 1, ya: 1, tidak: 1 };
  var DATE_RE = /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?([ T]\d{1,2}:\d{1,2}(:\d{1,2})?)?$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;

  function columnValues(rows, ci) {
    return rows.map(function (r) { return String(r[ci] === null || r[ci] === undefined ? '' : r[ci]).trim(); });
  }

  function guessCell(s) {
    if (s === '') return { kind: 'missing' };
    if (NUM_RE.test(s)) return { kind: 'number', value: Number(s.replace(',', '.')) };
    if (BOOL_SET[s.toLowerCase()]) return { kind: 'boolean', value: s.toLowerCase() };
    var d = toDate(s);
    if (DATE_RE.test(s) && d) return { kind: 'date', value: d };
    return { kind: 'text' };
  }

  function toDate(s) {
    var v;
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s)) {
      var p = s.split(/[-/]/);
      v = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    } else {
      v = new Date(s);
    }
    return isNaN(v.getTime()) ? null : v;
  }

  function toNumber(s) {
    var g = guessCell(s);
    return g.kind === 'number' ? g.value : NaN;
  }

  function inferTypes(header, rows) {
    var out = [];
    for (var c = 0; c < header.length; c++) {
      var vals = columnValues(rows, c);
      var total = vals.length;
      var missing = vals.filter(function (v) { return v === ''; }).length;
      var valid = vals.filter(function (v) { return v !== ''; });
      var kinds = valid.map(guessCell);
      var uniq = {};
      vals.forEach(function (v) { if (v !== '') uniq[v] = (uniq[v] || 0) + 1; });
      var uniqueKeys = Object.keys(uniq);
      var numCount = kinds.filter(function (k) { return k.kind === 'number'; }).length;
      var boolCount = kinds.filter(function (k) { return k.kind === 'boolean'; }).length;
      var dateCount = kinds.filter(function (k) { return k.kind === 'date'; }).length;
      var textCount = kinds.filter(function (k) { return k.kind === 'text'; }).length;
      var pure = valid.length > 0;

      var type;
      if (pure && boolCount === valid.length) type = 'boolean';
      else if (pure && dateCount === valid.length) type = 'date';
      else if (pure && numCount === valid.length) type = 'numeric';
      else if (pure && numCount > valid.length * 0.6) type = 'numeric (campur)';
      else if (uniqueKeys.length <= Math.min(15, Math.max(3, Math.ceil(valid.length * 0.5)))) type = 'categorical';
      else type = 'text';

      out.push({
        index: c,
        name: header[c],
        type: type,
        count: total,
        missing: missing,
        fill: Math.round((valid.length / Math.max(1, total)) * 100) + '%',
        unique: uniqueKeys.length,
        samples: valid.slice(0, 3)
      });
    }
    return out;
  }

  /* ═══ STATISTIK ANGKA ═══ */
  function numericValues(rows, ci) {
    var v = [];
    rows.forEach(function (r) {
      var n = toNumber(r[ci]);
      if (isFinite(n)) v.push(n);
    });
    return v.sort(function (a, b) { return a - b; });
  }

  function percentile(sorted, p) {
    if (!sorted.length) return NaN;
    var idx = (sorted.length - 1) * p;
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[idx];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  function numericStats(rows, ci) {
    var vals = numericValues(rows, ci);
    var n = vals.length;
    if (!n) {
      return { n: 0, mean: NaN, median: NaN, min: NaN, max: NaN, std: NaN, variance: NaN, p25: NaN, p75: NaN, sum: 0 };
    }
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    var mean = sum / n;
    var variance = vals.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (n - 1 || 1);
    return {
      n: n,
      sum: sum,
      mean: mean,
      median: percentile(vals, 0.5),
      min: vals[0],
      max: vals[n - 1],
      variance: variance,
      std: Math.sqrt(variance),
      p25: percentile(vals, 0.25),
      p75: percentile(vals, 0.75),
      iqr: percentile(vals, 0.75) - percentile(vals, 0.25)
    };
  }

  function histogram(rows, ci, bins) {
    var vals = numericValues(rows, ci);
    var k = Math.max(1, Math.min(50, Math.floor(Number(bins) || 10)));
    if (!vals.length) return { labels: [], counts: [] };
    var min = vals[0], max = vals[vals.length - 1];
    var width = (max - min) / k || 1;
    var counts = new Array(k).fill(0);
    vals.forEach(function (v) {
      var b = Math.min(k - 1, Math.floor((v - min) / width));
      if (v === max) b = k - 1;
      counts[b]++;
    });
    var labels = counts.map(function (_, i) {
      var lo = min + i * width;
      var hi = (i === k - 1 ? max : min + (i + 1) * width);
      return lo.toFixed(2) + ' - ' + hi.toFixed(2);
    });
    return { labels: labels, counts: counts, min: min, max: max, k: k };
  }

  function outliers(rows, ci) {
    var st = numericStats(rows, ci);
    if (!st.n || st.n < 3) return { points: [], n: st.n, lower: NaN, upper: NaN };
    var lower = st.p25 - 1.5 * st.iqr;
    var upper = st.p75 + 1.5 * st.iqr;
    var points = [];
    rows.forEach(function (r) {
      var v = toNumber(r[ci]);
      if (isFinite(v) && (v < lower || v > upper)) points.push(v);
    });
    return { points: points, n: st.n, lower: lower, upper: upper, count: points.length };
  }

  function correlations(header, rows) {
    var idx = [];
    header.forEach(function (_, c) {
      if (numericValues(rows, c).length >= 2) idx.push(c);
    });
    var pairs = [];
    for (var i = 0; i < idx.length; i++) {
      for (var j = i + 1; j < idx.length; j++) {
        var r = pearson(rows, idx[i], idx[j]);
        if (isFinite(r.r)) pairs.push({ a: header[idx[i]], b: header[idx[j]], r: r.r, n: r.n });
      }
    }
    return pairs;
  }

  function pearson(rows, ca, cb) {
    var xs = [], ys = [];
    rows.forEach(function (r) {
      var x = toNumber(r[ca]), y = toNumber(r[cb]);
      if (isFinite(x) && isFinite(y)) { xs.push(x); ys.push(y); }
    });
    var n = xs.length;
    if (n < 2) return { r: NaN, n: n };
    var mx = xs.reduce(function (a, b) { return a + b; }, 0) / n;
    var my = ys.reduce(function (a, b) { return a + b; }, 0) / n;
    var num = 0, dx = 0, dy = 0;
    for (var i = 0; i < n; i++) {
      var a = xs[i] - mx, b = ys[i] - my;
      num += a * b; dx += a * a; dy += b * b;
    }
    var denom = Math.sqrt(dx * dy);
    var r = denom ? num / denom : NaN;
    var r2 = r * r;
    return { r: r, r2: r2, n: n };
  }

  function linearRegression(rows, cx, cy) {
    var p = pearson(rows, cx, cy);
    var xs = [], ys = [];
    rows.forEach(function (r) {
      var x = toNumber(r[cx]), y = toNumber(r[cy]);
      if (isFinite(x) && isFinite(y)) { xs.push(x); ys.push(y); }
    });
    var n = xs.length;
    if (n < 2 || !isFinite(p.r)) return { ok: false, n: n };
    var mx = xs.reduce(function (a, b) { return a + b; }, 0) / n;
    var my = ys.reduce(function (a, b) { return a + b; }, 0) / n;
    var sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sxx += (xs[i] - mx) * (xs[i] - mx);
      sxy += (xs[i] - mx) * (ys[i] - my);
    }
    var slope = sxx ? sxy / sxx : 0;
    var intercept = my - slope * mx;
    return {
      ok: true, n: n,
      slope: slope, intercept: intercept,
      r: p.r, r2: p.r2,
      mse: n ? xs.reduce(function (a, _, i) {
        var err = ys[i] - (slope * xs[i] + intercept);
        return a + err * err;
      }, 0) / n : NaN,
      equation: 'y = ' + round(slope, 6) + 'x ' + (intercept >= 0 ? '+ ' : '- ') + round(Math.abs(intercept), 6)
    };
  }

  function round(v, d) { return Math.round(v * Math.pow(10, d)) / Math.pow(10, d); }

  /* ═══ KATEGORI ═══ */
  function classBalance(rows, ci) {
    var count = {};
    var n = 0;
    rows.forEach(function (r) {
      var v = String(r[ci] === null || r[ci] === undefined ? '' : r[ci]).trim();
      if (v === '') return;
      count[v] = (count[v] || 0) + 1;
      n++;
    });
    var keys = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; });
    return keys.map(function (k) {
      return { value: k, count: count[k], share: n ? (count[k] / n) * 100 : 0 };
    });
  }

  /* ═══ TRAIN/TEST SPLIT (deterministik, seed) ═══ */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function trainTestSplit(header, rows, seed, ratio) {
    var r = Math.max(0, Math.min(1, Number(ratio) || 0.2));
    var n = rows.length;
    if (!n) return { train: [], test: [], n: n, ratio: r };
    var rand = mulberry32(Number(seed) || 1);
    var idx = rows.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    var cut = Math.max(1, Math.min(n - 1, Math.round(n * r)));
    if (n === 1) cut = 0;
    var test = idx.slice(0, cut).map(function (i) { return rows[i]; });
    var train = idx.slice(cut).map(function (i) { return rows[i]; });
    return { header: header, train: train, test: test, n: n, ratio: r, seed: Number(seed) || 1 };
  }

  /* ═══ LAPORAN ═══ */
  function report(header, rows) {
    var types = inferTypes(header, rows);
    var nums = [];
    types.forEach(function (t, c) {
      if (t.type === 'numeric' || t.type === 'numeric (campur)') nums.push(c);
    });
    var numericStatsMap = {};
    nums.forEach(function (c) { numericStatsMap[header[c]] = numericStats(rows, c); });
    var cats = [];
    types.forEach(function (t, c) {
      if (t.type === 'categorical') cats.push({ col: header[c], balance: classBalance(rows, c) });
    });
    return {
      rows: rows.length,
      columns: header.length,
      types: types,
      numeric: numericStatsMap,
      numericColumns: nums.map(function (c) { return header[c]; }),
      correlations: correlations(header, rows),
      categories: cats,
      totalCells: header.length * rows.length
    };
  }

  var api = {
    parseCSV: parseCSV,
    detectDelimiter: detectDelimiter,
    columnValues: columnValues,
    inferTypes: inferTypes,
    numericValues: numericValues,
    numericStats: numericStats,
    histogram: histogram,
    outliers: outliers,
    correlations: correlations,
    pearson: pearson,
    linearRegression: linearRegression,
    classBalance: classBalance,
    trainTestSplit: trainTestSplit,
    report: report,
    guessCell: guessCell
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.mlcsv = api;
})();