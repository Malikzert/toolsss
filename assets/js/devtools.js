/* ══════════════════════════════════════════════════════════
   COFDE DevTools — kumpulan utilitas developer, 100% lokal.
   Tidak ada data yang dikirim ke server. Tidak ada eval.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── JSON ── */
  function jsonFormat(text, indent) {
    var n = indent === 'tab' ? '\t' : Number(indent) || 2;
    return JSON.stringify(JSON.parse(text), null, n);
  }

  function jsonMinify(text) {
    return JSON.stringify(JSON.parse(text));
  }

  function jsonValidate(text) {
    try {
      var v = JSON.parse(text);
      return { ok: true, type: typeOf(v), size: text.length, value: v };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  /* Objek -> CSV. Array di dalam sel diserialisasi sebagai JSON. */
  function jsonToCsv(text) {
    var data = JSON.parse(text);
    var rows = Array.isArray(data) ? data : [data];
    if (!rows.length) return '';
    var cols = [];
    rows.forEach(function (r) {
      Object.keys(r || {}).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); });
    });
    function cell(v) {
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') v = JSON.stringify(v);
      return COFDE.fmt.csvCell(String(v));
    }
    return [cols.map(cell).join(',')]
      .concat(rows.map(function (r) { return cols.map(function (c) { return cell(r[c]); });  return ''; }))
      .join('\n');
  }

  /* ── Base64 (UTF-8 aman) ── */
  function b64encode(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64decode(b64) {
    var clean = String(b64).replace(/\s+/g, '');
    var pad = clean.length % 4;
    if (pad) clean += new Array(5 - pad).join('=');
    var bin = atob(clean);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  /* ── URL ── */
  function urlEncode(text) { return encodeURIComponent(text); }
  function urlDecode(text) {
    try { return decodeURIComponent(text); } catch (e) { return null; }
  }

  function urlParse(text) {
    var u;
    try { u = new URL(text); } catch (e) { return { ok: false, error: 'URL tidak valid. Contoh: https://contoh.com/path?a=1' }; }
    var q = {};
    u.searchParams.forEach(function (v, k) { q[k] = v; });
    return {
      ok: true,
      protocol: u.protocol, host: u.host, hostname: u.hostname,
      port: u.port, pathname: u.pathname, hash: u.hash,
      origin: u.origin, query: q
    };
  }

  function urlBuild(parts) {
    try {
      var proto = parts.protocol || 'https:';
      if (proto.slice(-1) !== ':') proto += ':';
      var u = new URL(proto + '//' + (parts.host || 'example.com'));
      if (parts.pathname) u.pathname = parts.pathname;
      Object.keys(parts.query || {}).forEach(function (k) {
        if (parts.query[k] !== '' && parts.query[k] != null) u.searchParams.set(k, parts.query[k]);
      });
      if (parts.hash) u.hash = parts.hash;
      return u.toString();
    } catch (e) {
      return null;
    }
  }

  /* ── JWT ──
     Hanya MEMBACA isi token. Tanda tangan tidak diverifikasi,
     jadi hasil ini bukan bukti token valid. */
  function b64urlToText(seg) {
    var s = String(seg).replace(/-/g, '+').replace(/_/g, '/');
    var pad = s.length % 4;
    if (pad) s += new Array(5 - pad).join('=');
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function jwtDecode(token) {
    var parts = String(token).trim().split('.');
    if (parts.length !== 3) {
      return { ok: false, error: 'JWT harus punya tepat 3 bagian dipisah titik. Part yang ditemukan: ' + parts.length + '.' };
    }
    var out = { ok: true, header: null, payload: null, signature: parts[2], warnings: [
      'Tanda tangan TIDAK diverifikasi. Tool ini hanya membaca isi token.'
    ] };
    try { out.header = JSON.parse(b64urlToText(parts[0])); }
    catch (e) { return { ok: false, error: 'Header JWT bukan JSON yang valid: ' + e.message }; }
    try { out.payload = JSON.parse(b64urlToText(parts[1])); }
    catch (e) { return { ok: false, error: 'Payload JWT bukan JSON yang valid: ' + e.message }; }

    if (out.payload && typeof out.payload.exp === 'number') {
      out.exp = out.payload.exp;
      out.expired = out.payload.exp * 1000 < Date.now();
      out.expText = new Date(out.payload.exp * 1000).toLocaleString();
    }
    if (out.payload && typeof out.payload.iat === 'number') {
      out.iatText = new Date(out.payload.iat * 1000).toLocaleString();
    }
    if (out.payload && typeof out.payload.nbf === 'number') {
      out.notBefore = out.payload.nbf * 1000 > Date.now();
    }
    return out;
  }

  /* ── UUID v4 ── */
  function uuid() {
    if (window.crypto && crypto.getRandomValues) {
      var b = new Uint8Array(16);
      crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      var h = [];
      for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
      return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' + h.slice(6, 8).join('') +
             '-' + h.slice(8, 10).join('') + '-' + h.slice(10, 16).join('');
    }
    /* Fallback hanya untuk browser sangat tua; bukan sumber kriptografis. */
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function uuidBatch(n) {
    var out = [];
    for (var i = 0; i < (Number(n) || 1); i++) out.push(uuid());
    return out;
  }

  /* ── Regex ── */
  function regexRun(pattern, flags, text, replaceWith) {
    var re;
    try { re = new RegExp(pattern, flags); }
    catch (e) { return { ok: false, error: e.message }; }
    var matches = [];
    var m;
    var guard = 0;
    var reGlobal = new RegExp(pattern, flags.indexOf('g') < 0 ? flags + 'g' : flags);
    while ((m = reGlobal.exec(text)) !== null && guard++ < 5000) {
      matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
      if (m[0] === '') reGlobal.lastIndex++;
    }
    var out = { ok: true, count: matches.length, matches: matches };
    if (replaceWith !== undefined && replaceWith !== null) {
      try {
        out.replaced = text.replace(new RegExp(pattern, flags), replaceWith);
      } catch (e) { out.replaceError = e.message; }
    }
    return out;
  }

  var REGEX_PRESETS = [
    { label: 'Email', pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}' },
    { label: 'URL',    pattern: 'https?://[^\\s<>"]+' },
    { label: 'IPv4',   pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b' },
    { label: 'Tanggal ISO', pattern: '\\b\\d{4}-\\d{2}-\\d{2}\\b' },
    { label: 'Angka',  pattern: '\\d+' },
    { label: 'Warna hex',  pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b' },
    { label: 'Nomor HP ID', pattern: '(\\+62|62|0)8[1-9][0-9]{6,10}' }
  ];

  /* ── Hash (Web Crypto, butuh konteks aman: https atau localhost) ── */
  function hash(text, algo) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.reject(new Error('Web Crypto tidak tersedia. Buka lewat https:// atau localhost.'));
    }
    return crypto.subtle.digest(algo, new TextEncoder().encode(text)).then(function (buf) {
      var view = new Uint8Array(buf);
      var hex = '';
      for (var i = 0; i < view.length; i++) hex += ('0' + view[i].toString(16)).slice(-2);
      return { algo: algo, hex: hex, bits: view.length * 8 };
    });
  }

  function hashAll(text) {
    return Promise.all([
      hash(text, 'SHA-256').then(function (r) { return r.hex; }),
      hash(text, 'SHA-384').then(function (r) { return r.hex; }),
      hash(text, 'SHA-512').then(function (r) { return r.hex; })
    ]).then(function (a) { return { 'SHA-256': a[0], 'SHA-384': a[1], 'SHA-512': a[2] }; });
  }

  /* ── Waktu ── */
  function nowParts() {
    var d = new Date();
    return {
      iso: d.toISOString(),
      epochMs: d.getTime(),
      epochS: Math.floor(d.getTime() / 1000),
      local: d.toLocaleString(),
      utc: d.toUTCString()
    };
  }

  function epochToIso(v) {
    var s = String(v === null || v === undefined ? '' : v).replace(/[^\d.-]/g, '');
    if (!s || s === '-' || s === '.') return null;
    var n = Number(s);
    if (!isFinite(n)) return null;
    /* Deteksi detik vs milidetik lewat panjang digit. */
    if (String(Math.abs(Math.trunc(n))).length <= 11) n *= 1000;
    var d = new Date(n);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function isoToEpoch(v) {
    var d = new Date(String(v).trim());
    return isNaN(d.getTime()) ? null : { ms: d.getTime(), s: Math.floor(d.getTime() / 1000) };
  }

  var UNITS = [
    { label: 'detik', ms: 1000 },
    { label: 'menit', ms: 60000 },
    { label: 'jam', ms: 3600000 },
    { label: 'hari', ms: 86400000 },
    { label: 'minggu', ms: 604800000 }
  ];

  function duration(ms) {
    if (!isFinite(ms)) return null;
    var neg = ms < 0;
    var left = Math.abs(Math.round(ms));
    var parts = [];
    /* Dari satuan terbesar ke terkecil, supaya detik tidak menyerap semua. */
    for (var i = UNITS.length - 1; i >= 0; i--) {
      var u = UNITS[i];
      var v = Math.floor(left / u.ms);
      if (v > 0) { parts.push(v + ' ' + u.label); left -= v * u.ms; }
    }
    return (neg ? '-' : '') + (parts.length ? parts.join(' ') : '0 detik');
  }

  function relative(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    var diff = d.getTime() - Date.now();
    return { text: duration(Math.abs(diff)) + (diff < 0 ? ' lalu' : ' dari sekarang'), future: diff > 0 };
  }

  /* ── Warna ── */
  function parseColor(input) {
    var s = String(input || '').trim().toLowerCase();
    var m;
    if ((m = /^#([0-9a-f]{3})$/.exec(s))) {
      return { hex: '#' + m[1].split('').map(function (c) { return c + c; }).join('').toUpperCase() };
    }
    if ((m = /^#([0-9a-f]{6})$/.exec(s))) {
      return { hex: '#' + m[1].toUpperCase() };
    }
    if ((m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s))) {
      var r = Math.min(255, Number(m[1])), g = Math.min(255, Number(m[2])), b = Math.min(255, Number(m[3]));
      var a = m[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(m[4])));
      return { hex: rgbToHex(r, g, b), rgb: { r: r, g: g, b: b }, alpha: a };
    }
    if ((m = /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s))) {
      var c = hslToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
      var al = m[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(m[4])));
      return { hex: rgbToHex(c.r, c.g, c.b), rgb: c, alpha: al };
    }
    return null;
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      return ('0' + Math.round(v).toString(16)).slice(-2);
    }).join('').toUpperCase();
  }

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0;
    var l = (max + min) / 2;
    var d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return {
      r: Math.round((t[0] + m) * 255),
      g: Math.round((t[1] + m) * 255),
      b: Math.round((t[2] + m) * 255)
    };
  }

  function relLuminance(rgb) {
    var c = [rgb.r, rgb.g, rgb.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function contrast(hexA, hexB) {
    var a = hexToRgb(hexA), b = hexToRgb(hexB);
    if (!a || !b) return null;
    var l1 = relLuminance(a), l2 = relLuminance(b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    var ratio = (hi + 0.05) / (lo + 0.05);
    return {
      ratio: ratio,
      text: ratio.toFixed(2) + ':1',
      aa: ratio >= 4.5,
      aaLarge: ratio >= 3,
      aaa: ratio >= 7
    };
  }

  function colorInfo(input) {
    var c = parseColor(input);
    if (!c) return null;
    var rgb = c.rgb || hexToRgb(c.hex);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return {
      hex: c.hex,
      rgb: rgb,
      hsl: hsl,
      alpha: c.alpha === undefined ? 1 : c.alpha,
      css: c.alpha !== undefined && c.alpha < 1
        ? 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + c.alpha + ')'
        : c.hex,
      luminance: relLuminance(rgb),
      bestText: contrast(c.hex, '#000000').ratio >= contrast(c.hex, '#FFFFFF').ratio ? '#000000' : '#FFFFFF'
    };
  }

  /* ── Cron (5 field) ── */
  var CRON_FIELDS = [
    { key: 'minute', label: 'Menit', min: 0, max: 59 },
    { key: 'hour', label: 'Jam', min: 0, max: 23 },
    { key: 'dom', label: 'Tanggal', min: 1, max: 31 },
    { key: 'month', label: 'Bulan', min: 1, max: 12 },
    { key: 'dow', label: 'Hari', min: 0, max: 6 }
  ];
  var MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function cronParse(expr) {
    var parts = String(expr || '').trim().split(/\s+/);
    if (parts.length !== 5) {
      return { ok: false, error: 'Cron harus punya 5 field (menit jam tanggal bulan hari). Ditemukan: ' + parts.length + '.' };
    }
    var sets = [];
    for (var i = 0; i < 5; i++) {
      var f = CRON_FIELDS[i];
      var set = cronFieldToSet(parts[i], f);
      if (!set.ok) return { ok: false, error: 'Field ' + f.label + ' (' + parts[i] + '): ' + set.error };
      sets.push(set.values);
    }
    return { ok: true, sets: sets, expr: parts.join(' ') };
  }

  function cronFieldToSet(field, def) {
    var values = {};
    var chunks = String(field).split(',');
    for (var c = 0; c < chunks.length; c++) {
      var chunk = chunks[c];
      var step = 1;
      var m;
      if ((m = /^([\d*\-]+)\/(\d+)$/.exec(chunk))) {
        chunk = m[1];
        step = Number(m[2]);
        if (step < 1) return { ok: false, error: 'step harus minimal 1 pada "' + field + '"' };
      }
      var lo, hi;
      if (chunk === '*') { lo = def.min; hi = def.max; }
      else if ((m = /^(\d+)-(\d+)$/.exec(chunk))) { lo = Number(m[1]); hi = Number(m[2]); }
      else if (/^\d+$/.test(chunk)) { lo = Number(chunk); hi = step > 1 ? def.max : Number(chunk); }
      else return { ok: false, error: 'pola tidak dikenal "' + chunk + '"' };
      if (lo < def.min || hi > def.max || lo > hi) {
        return { ok: false, error: 'nilai di luar rentang ' + def.min + '-' + def.max + ' pada "' + chunk + '"' };
      }
      for (var v = lo; v <= hi; v += step) values[v] = true;
    }
    var keys = Object.keys(values);
    if (!keys.length) return { ok: false, error: 'tidak menghasilkan nilai yang valid' };
    var out = {};
    keys.forEach(function (k) { out[Number(k)] = true; });
    return { ok: true, values: out };
  }

  function cronDescribe(expr) {
    var p = cronParse(expr);
    if (!p.ok) return p;
    var texts = CRON_FIELDS.map(function (f, i) {
      var vals = Object.keys(p.sets[i]).map(Number).sort(function (a, b) { return a - b; });
      if (vals.length === f.max - f.min + 1) return 'setiap ' + f.label.toLowerCase();
      if (f.key === 'dow') {
        var days = vals.map(function (v) { return DAY_NAMES[v]; });
        return 'hari ' + days.join(', ');
      }
      if (f.key === 'month') {
        return 'bulan ' + vals.map(function (v) { return MONTH_NAMES[v - 1]; }).join(', ');
      }
      if (vals.length === 1) {
        return f.key === 'minute' ? 'menit ke-' + vals[0]
             : f.key === 'hour' ? 'jam ' + vals[0]
             : f.label.toLowerCase() + ' ' + vals[0];
      }
      return f.label.toLowerCase() + ' ' + vals.join(', ');
    });
    return { ok: true, description: 'Jalan ' + texts.join(' | ') + '.', fields: texts };
  }

  function cronNext(expr, count, from) {
    var p = cronParse(expr);
    if (!p.ok) return p;
    var n = Math.max(1, Math.min(20, Number(count) || 5));
    var start = from ? new Date(from) : new Date();
    if (isNaN(start.getTime())) return { ok: false, error: 'Tanggal awal tidak valid.' };
    start.setSeconds(0, 0);
    start = new Date(start.getTime() + 60000);
    var out = [];
    var limit = start.getTime() + 400 * 86400000;
    var cur = new Date(start);
    while (out.length < n && cur.getTime() < limit) {
      var mo = cur.getMonth() + 1;
      if (p.sets[3][mo] && p.sets[4][cur.getDay()] && p.sets[2][cur.getDate()] &&
          p.sets[1][cur.getHours()] && p.sets[0][cur.getMinutes()]) {
        out.push(new Date(cur.getTime()));
      }
      cur = new Date(cur.getTime() + 60000);
    }
    return { ok: true, runs: out };
  }

  var CRON_PRESETS = [
    { label: 'Setiap menit', expr: '* * * * *' },
    { label: 'Setiap jam', expr: '0 * * * *' },
    { label: 'Setiap hari jam 2 pagi', expr: '0 2 * * *' },
    { label: 'Senin-Sabtu jam 9', expr: '0 9 * * 1-6' },
    { label: 'Tanggal 1 tiap bulan', expr: '0 0 1 * *' },
    { label: 'Setiap 15 menit', expr: '*/15 * * * *' }
  ];

  /* ── Markdown ──
     HTML di-escape lebih dulu, jadi input pengguna tidak pernah
     menjadi markup aktif. */
  function mdEscape(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function markdown(src) {
    var code = [];
    var text = String(src || '').replace(/```([\s\S]*?)```/g, function (_, body) {
      code.push(body.replace(/^\w*\n/, ''));
      return '\u0000CODE' + (code.length - 1) + '\u0000';
    });

    var lines = text.split(/\r?\n/);
    var html = [];
    var inList = false;
    var inOl = false;

    function closeLists() {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inOl) { html.push('</ol>'); inOl = false; }
    }

    lines.forEach(function (line) {
      var m;
      var t = line.trim();
      if (!t) { closeLists(); return; }
      if ((m = /^\u0000CODE(\d+)\u0000$/.exec(t))) { closeLists(); html.push('<pre><code>' + mdEscape(code[Number(m[1])]) + '</code></pre>'); return; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { closeLists(); html.push('<hr>'); return; }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(t))) {
        closeLists();
        var lv = m[1].length;
        html.push('<h' + lv + '>' + mdInline(m[2]) + '</h' + lv + '>');
        return;
      }
      if ((m = /^>\s?(.*)$/.exec(t))) { closeLists(); html.push('<blockquote>' + mdInline(m[1]) + '</blockquote>'); return; }
      if ((m = /^[-*+]\s+(.*)$/.exec(t))) {
        if (inOl) { html.push('</ol>'); inOl = false; }
        if (!inList) { html.push('<ul>'); inList = true; }
        html.push('<li>' + mdInline(m[1]) + '</li>');
        return;
      }
      if ((m = /^(\d+)[.)]\s+(.*)$/.exec(t))) {
        if (inList) { html.push('</ul>'); inList = false; }
        if (!inOl) { html.push('<ol>'); inOl = true; }
        html.push('<li>' + mdInline(m[2]) + '</li>');
        return;
      }
      closeLists();
      html.push('<p>' + mdInline(t) + '</p>');
    });
    closeLists();
    return html.join('\n');
  }

  function mdInline(s) {
    return mdEscape(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');
  }

  function mdToText(src) {
    return String(src || '')
      .replace(/```([\s\S]*?)```/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .trim();
  }

  /* ── SQL ──
     Hanya format teks. Tidak pernah connects atau mengeksekusi. */
  var SQL_MAJOR = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
                   'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'INNER JOIN', 'LEFT JOIN',
                   'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN', 'UNION ALL', 'UNION', 'ON', 'AS', 'AND', 'OR', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL'];
  var SQL_KEYWORDS = ['select', 'from', 'where', 'group', 'by', 'having', 'order', 'limit', 'offset', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'alter', 'drop', 'index', 'view', 'join', 'inner', 'left', 'right', 'full', 'cross', 'outer', 'on', 'as', 'and', 'or', 'not', 'in', 'is', 'null', 'like', 'between', 'exists', 'case', 'when', 'then', 'else', 'end', 'distinct', 'count', 'sum', 'avg', 'min', 'max', 'union', 'all', 'with', 'primary', 'key', 'foreign', 'references', 'default', 'cascade', 'asc', 'desc'];

  function sqlFormat(sql) {
    var s = String(sql || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    var keywords = SQL_KEYWORDS.slice().sort(function (a, b) { return b.length - a.length; })
      .map(escapeRe).join('|');
    s = s.replace(new RegExp('\\b(' + keywords + ')\\b', 'gi'), function (m) { return m.toUpperCase(); });

    SQL_MAJOR.forEach(function (k) {
      k = escapeRe(k);
      s = s.replace(new RegExp('\\s+' + k + '\\b', 'gi'), '\n' + k);
    });
    s = s.replace(/\bAND\b/gi, '\n  AND');
    s = s.replace(/\bOR\b/gi, '\n  OR');
    s = s.replace(/\bON\b/gi, ' ON');
    s = s.replace(/\bAS\b/gi, ' AS');

    return s.split('\n').map(function (line) {
      return line.replace(/^\s+/, function (sp) { return '  '; });
    }).join('\n').replace(/^ {2}/, '').trim();
  }

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function sqlChecks(sql) {
    var out = [];
    var s = String(sql || '');
    var trimmed = s.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!trimmed) return [{ level: 'info', text: 'SQL kosong.' }];
    if (trimmed.endsWith(';')) out.push({ level: 'info', text: 'Ada titik koma di akhir, tidak masalah.' });
    if (/\bdrop\s+(table|database)\b/.test(trimmed)) {
      out.push({ level: 'warn', text: 'Pernyataan DROP terdeteksi. Pastikan benar-benar disengaja.' });
    }
    if (/\btruncate\b/.test(trimmed)) {
      out.push({ level: 'warn', text: 'TRUNCATE menghapus seluruh isi tabel.' });
    }
    if (/\bselect\s+\*/.test(trimmed)) {
      out.push({ level: 'info', text: 'SELECT * mengambil semua kolom; sebutkan kolom bila performanya penting.' });
    }
    if (/\bwhere\b/.test(trimmed) === false && /\bupdate\b|\bdelete\b/.test(trimmed)) {
      out.push({ level: 'warn', text: 'UPDATE atau DELETE tanpa WHERE akan mengubah seluruh tabel.' });
    }
    if (/\bunion\b/.test(trimmed)) {
      out.push({ level: 'info', text: 'UNION ada; pertimbangkan UNION ALL bila baris duplikat memang perlu ikut.' });
    }
    if (!out.length) out.push({ level: 'ok', text: 'Tidak ada pola berisiko yang umum terdeteksi.' });
    return out;
  }

  window.COFDE = window.COFDE || {};
  window.COFDE.devtools = {
    jsonFormat: jsonFormat, jsonMinify: jsonMinify, jsonValidate: jsonValidate,
    jsonToCsv: jsonToCsv, typeOf: typeOf,
    b64encode: b64encode, b64decode: b64decode,
    urlEncode: urlEncode, urlDecode: urlDecode, urlParse: urlParse, urlBuild: urlBuild,
    jwtDecode: jwtDecode, uuid: uuid, uuidBatch: uuidBatch,
    regexRun: regexRun, REGEX_PRESETS: REGEX_PRESETS,
    hash: hash, hashAll: hashAll,
    nowParts: nowParts, epochToIso: epochToIso, isoToEpoch: isoToEpoch, duration: duration, relative: relative,
    parseColor: parseColor, colorInfo: colorInfo, contrast: contrast, hexToRgb: hexToRgb,
    rgbToHsl: rgbToHsl, hslToRgb: hslToRgb,
    cronParse: cronParse, cronDescribe: cronDescribe, cronNext: cronNext,
    CRON_PRESETS: CRON_PRESETS, CRON_FIELDS: CRON_FIELDS, MONTH_NAMES: MONTH_NAMES, DAY_NAMES: DAY_NAMES,
    markdown: markdown, mdToText: mdToText,
    sqlFormat: sqlFormat, sqlChecks: sqlChecks
  };
})();
