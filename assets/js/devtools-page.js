/* COFDE DevTools - controller UI. Semua operasi lokal di browser. */
(function () {
  'use strict';

  var D = COFDE.devtools;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  function copy(text, label) {
    var value = String(text === undefined || text === null ? '' : text);
    if (!value) { COFDE.toast.info('Tidak ada isi untuk disalin.'); return; }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) COFDE.toast.success((label || 'Hasil') + ' disalin.');
      else COFDE.toast.error('Gagal menyalin. Salin manual dari kolom hasil.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        COFDE.toast.success((label || 'Hasil') + ' disalin.');
      }, fallback);
    } else {
      fallback();
    }
  }

  function on(id, fn) {
    var el = $(id);
    if (el) el.addEventListener('click', fn);
  }

  function wireNet() {
    var badge = $('netBadge');
    if (badge && COFDE.net) COFDE.net.badge(badge);
  }

  /* ── JSON ── */
  function runJson(fn, label) {
    var input = $('jsonIn').value.trim();
    var out = $('jsonOut');
    var status = $('jsonStatus');
    if (!input) {
      out.value = '';
      status.textContent = 'Isi dulu kolom input JSON.';
      COFDE.toast.info('Input JSON masih kosong.');
      return;
    }
    try {
      out.value = fn(input);
      var v = D.jsonValidate(input);
      status.textContent = v.ok
        ? 'JSON valid. Tipe: ' + v.type + '. Panjang input: ' + v.size + ' karakter.'
        : 'JSON tidak valid.';
      COFDE.toast.success(label + ' berhasil.');
    } catch (e) {
      out.value = '';
      status.textContent = 'Error: ' + e.message;
      COFDE.toast.error('Gagal: ' + e.message);
    }
  }

  on('jsonFormat', function () { runJson(function (s) { return D.jsonFormat(s, $('jsonIndent').value); }, 'Format JSON'); });
  on('jsonMinify', function () { runJson(D.jsonMinify, 'Minify JSON'); });
  on('jsonToCsv', function () { runJson(D.jsonToCsv, 'Konversi ke CSV'); });
  on('jsonCopy', function () { copy($('jsonOut').value, 'JSON'); });

  /* ── Base64 ── */
  on('b64Encode', function () {
    $('b64Out').value = D.b64encode($('b64In').value);
  });
  on('b64Decode', function () {
    try {
      $('b64Out').value = D.b64decode($('b64In').value);
    } catch (e) {
      $('b64Out').value = '';
      COFDE.toast.error('Base64 tidak valid: ' + e.message);
    }
  });
  on('b64Copy', function () { copy($('b64Out').value, 'Base64'); });

  /* ── URL ── */
  on('urlEncode', function () { $('urlOut').value = D.urlEncode($('urlIn').value); });
  on('urlDecode', function () {
    var r = D.urlDecode($('urlIn').value);
    if (r === null) {
      $('urlOut').value = '';
      COFDE.toast.error('Persentase tidak valid, tidak bisa di-decode.');
      return;
    }
    $('urlOut').value = r;
  });
  on('urlParse', function () {
    var p = D.urlParse($('urlIn').value);
    if (!p.ok) {
      $('urlOut').value = '';
      COFDE.toast.error(p.error);
      return;
    }
    var lines = [
      'protocol  : ' + p.protocol,
      'host      : ' + p.host,
      'hostname  : ' + p.hostname,
      'port      : ' + (p.port || '(default)'),
      'pathname  : ' + p.pathname,
      'origin    : ' + p.origin,
      'hash      : ' + (p.hash || '(kosong)'),
      'query     : ' + (Object.keys(p.query).length ? '' : '(kosong)')
    ];
    Object.keys(p.query).forEach(function (k) {
      lines.push('  ' + k + ' = ' + p.query[k]);
    });
    $('urlOut').value = lines.join('\n');
  });
  on('urlCopy', function () { copy($('urlOut').value, 'URL'); });

  /* ── JWT ── */
  var JWT_SAMPLE_B64 = function (obj) {
    return D.b64encode(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  on('jwtPaste', function () {
    var header = JWT_SAMPLE_B64({ alg: 'HS256', typ: 'JWT' });
    var now = Math.floor(Date.now() / 1000);
    var payload = JWT_SAMPLE_B64({
      sub: '1234567890', name: 'Budi Santoso', iat: now - 60,
      exp: now + 3600, role: 'admin'
    });
    $('jwtIn').value = header + '.' + payload + '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    $('jwtIn').focus();
  });

  on('jwtRun', function () {
    var box = $('jwtOut');
    var r = D.jwtDecode($('jwtIn').value);
    if (!r.ok) {
      box.classList.remove('cx-hidden');
      box.innerHTML = '<p class="cx-note">' + esc(r.error) + '</p>';
      COFDE.toast.error('Token gagal dibaca.');
      return;
    }
    var rows = [];
    rows.push('<h3 class="cx-card-title">Header</h3><pre class="cx-mono">' + esc(JSON.stringify(r.header, null, 2)) + '</pre>');
    rows.push('<h3 class="cx-card-title">Payload</h3><pre class="cx-mono">' + esc(JSON.stringify(r.payload, null, 2)) + '</pre>');
    if (r.exp !== undefined) {
      rows.push('<p class="cx-note">Kedaluwarsa: <strong>' + esc(r.expired ? 'ya' : 'belum') + '</strong> (' + esc(r.expText) + ')</p>');
    }
    if (r.iatText) rows.push('<p class="cx-note">Diterbitkan: ' + esc(r.iatText) + '</p>');
    if (r.notBefore) rows.push('<p class="cx-note">Belum berlaku sebelum: ' + esc(new Date(r.payload.nbf * 1000).toLocaleString()) + '</p>');
    r.warnings.forEach(function (w) {
      rows.push('<p class="cx-note">' + esc(w) + '</p>');
    });
    box.classList.remove('cx-hidden');
    box.innerHTML = rows.join('');
    COFDE.toast.success('Token dibaca.');
  });

  /* ── UUID ── */
  on('uuidRun', function () {
    $('uuidOut').value = D.uuidBatch($('uuidCount').value).join('\n');
  });
  on('uuidCopy', function () { copy($('uuidOut').value, 'UUID'); });

  /* ── Regex ── */
  (function buildRegexPresets() {
    var host = $('rePresets');
    if (!host) return;
    D.REGEX_PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'cx-chip-btn';
      b.type = 'button';
      b.textContent = p.label;
      b.addEventListener('click', function () {
        $('rePattern').value = p.pattern;
        $('reFlags').value = 'g';
        runRegex();
      });
      host.appendChild(b);
    });
  })();

  function runRegex() {
    var status = $('reStatus');
    var wrap = $('reTableWrap');
    var outWrap = $('reOutWrap');
    var pattern = $('rePattern').value;
    var flags = $('reFlags').value.replace(/[^gimsuy]/g, '');
    var text = $('reText').value;
    var replaceWith = $('reReplace').value;
    if (!pattern) {
      status.textContent = 'Isi dulu kolom pola.';
      wrap.classList.add('cx-hidden');
      outWrap.classList.add('cx-hidden');
      return;
    }
    var useReplace = replaceWith !== '';
    var r = D.regexRun(pattern, flags, text, useReplace ? replaceWith : null);
    if (!r.ok) {
      status.textContent = 'Pola tidak valid: ' + r.error;
      wrap.classList.add('cx-hidden');
      outWrap.classList.add('cx-hidden');
      COFDE.toast.error('Regex tidak valid.');
      return;
    }
    status.textContent = r.count + ' kecocokan ditemukan.';
    var tbody = $('reTable');
    tbody.innerHTML = r.matches.slice(0, 300).map(function (m, i) {
      return '<tr><td class="num">' + (i + 1) + '</td><td class="num">' + m.index +
        '</td><td class="cx-mono">' + esc(m.match) + '</td><td class="cx-mono">' +
        esc(m.groups.length ? m.groups.join(' | ') : '-') + '</td></tr>';
    }).join('');
    if (r.count > 300) {
      tbody.insertAdjacentHTML('beforeend', '<tr><td colspan="4">Menampilkan 300 dari ' + r.count + ' kecocokan.</td></tr>');
    }
    wrap.classList.toggle('cx-hidden', r.count === 0);
    if (r.replaceError) {
      outWrap.classList.remove('cx-hidden');
      $('reOut').value = '';
      status.textContent += ' Gagal mengganti: ' + r.replaceError;
    } else if (r.replaced !== undefined) {
      outWrap.classList.remove('cx-hidden');
      $('reOut').value = r.replaced;
    } else {
      outWrap.classList.add('cx-hidden');
    }
  }

  on('reRun', runRegex);
  on('reCopy', function () { copy($('reOut').value || $('reStatus').textContent, 'Regex'); });

  /* ── Hash ── */
  on('hashRun', function () {
    var out = $('hashOut');
    var text = $('hashIn').value;
    out.textContent = 'Menghitung...';
    D.hashAll(text).then(function (res) {
      out.innerHTML = ['SHA-256', 'SHA-384', 'SHA-512'].map(function (k) {
        return '<div style="margin-bottom:10px"><strong>' + k + '</strong><br>' + esc(res[k]) + '</div>';
      }).join('');
      COFDE.toast.success('Hash dihitung.');
    }, function (e) {
      out.textContent = e.message;
      COFDE.toast.error(e.message);
    });
  });
  on('hashCopy', function () {
    var text = $('hashIn').value;
    D.hashAll(text).then(function (res) {
      copy(['SHA-256  ' + res['SHA-256'], 'SHA-384  ' + res['SHA-384'], 'SHA-512  ' + res['SHA-512']].join('\n'), 'Hash');
    }, function (e) { COFDE.toast.error(e.message); });
  });

  /* ── Timestamp ── */
  function renderTimeStats(p) {
    $('timeStats').innerHTML = [
      ['ISO 8601', p.iso], ['Epoch milidetik', String(p.epochMs)],
      ['Epoch detik', String(p.epochS)], ['Waktu lokal', p.local], ['Waktu UTC', p.utc]
    ].map(function (pair) {
      return '<div class="cx-stat"><div class="cx-stat-label">' + esc(pair[0]) +
        '</div><div class="cx-stat-value cx-mono" style="font-size:14px">' + esc(pair[1]) + '</div></div>';
    }).join('');
  }

  on('timeNow', function () {
    var p = D.nowParts();
    $('timeIn').value = String(p.epochS);
    renderTimeStats(p);
    $('timeNote').textContent = 'Epoch detik otomatis diisi. Uji "Epoch ke ISO" atau "ISO ke Epoch" di bawah.';
  });

  on('timeToIso', function () {
    var raw = $('timeIn').value;
    var iso = D.epochToIso(raw);
    if (!iso) {
      $('timeNote').textContent = 'Nilai epoch tidak valid.';
      COFDE.toast.error('Nilai epoch tidak valid.');
      return;
    }
    var digits = String(Math.abs(Math.trunc(Number(String(raw).replace(/[^\d.-]/g, '')) || 0)));
    var e = D.isoToEpoch(iso);
    renderTimeStats({ iso: iso, epochMs: e.ms, epochS: e.s, local: new Date(e.ms).toLocaleString(), utc: new Date(e.ms).toUTCString() });
    $('timeNote').textContent = 'Nilai dibaca sebagai epoch ' + (digits.length <= 11 ? 'detik' : 'milidetik') + '.';
  });

  on('timeToEpoch', function () {
    var e = D.isoToEpoch($('timeIn').value);
    if (!e) {
      $('timeNote').textContent = 'Tanggal ISO tidak valid.';
      COFDE.toast.error('Tanggal ISO tidak valid.');
      return;
    }
    renderTimeStats({ iso: new Date(e.ms).toISOString(), epochMs: e.ms, epochS: e.s, local: new Date(e.ms).toLocaleString(), utc: new Date(e.ms).toUTCString() });
    $('timeNote').textContent = 'Tanggal dibaca dengan timezone browser.';
  });

  on('timeCopy', function () { copy($('timeStats').textContent.replace(/\s+/g, ' ').trim(), 'Timestamp'); });

  (function wireMsDuration() {
    var field = $('timeMs');
    if (!field) return;
    field.addEventListener('input', function () {
      var ms = Number(String(field.value).replace(/[^\d.-]/g, ''));
      $('timeNote').textContent = isFinite(ms) ? 'Durasi: ' + D.duration(ms) : 'Masukkan nilai milidetik.';
    });
  })();

  /* ── Color ── */
  function renderColor() {
    var info = D.colorInfo($('colorIn').value);
    var box = $('colorOut');
    if (!info) {
      box.innerHTML = '<p class="cx-note">Format warna tidak dikenali. Gunakan hex, rgb(), rgba(), hsl(), atau hsla().</p>';
      COFDE.toast.error('Format warna tidak valid.');
      return;
    }
    var c2 = D.colorInfo($('colorIn2').value) || { hex: '#000000' };
    var con = D.contrast(info.hex, c2.hex);
    var levels = [
      ['AA teks normal', con.aa, con.ratio >= 4.5],
      ['AA teks besar', con.aaLarge, con.ratio >= 3],
      ['AAA teks normal', con.aaa, con.ratio >= 7]
    ];
    box.innerHTML =
      '<div class="cx-stats">' +
      '<div class="cx-stat"><div class="cx-stat-label">HEX</div><div class="cx-stat-value cx-mono">' + esc(info.hex) + '</div></div>' +
      '<div class="cx-stat"><div class="cx-stat-label">RGB</div><div class="cx-stat-value cx-mono" style="font-size:14px">' + esc('rgb(' + info.rgb.r + ', ' + info.rgb.g + ', ' + info.rgb.b + ')') + '</div></div>' +
      '<div class="cx-stat"><div class="cx-stat-label">HSL</div><div class="cx-stat-value cx-mono" style="font-size:14px">' + esc('hsl(' + info.hsl.h + ', ' + info.hsl.s + '%, ' + info.hsl.l + '%)') + '</div></div>' +
      '<div class="cx-stat"><div class="cx-stat-label">Alpha</div><div class="cx-stat-value cx-mono" style="font-size:14px">' + esc(String(info.alpha)) + '</div></div>' +
      '<div class="cx-stat"><div class="cx-stat-label">Luminance</div><div class="cx-stat-value cx-mono" style="font-size:14px">' + esc(info.luminance.toFixed(4)) + '</div></div>' +
      '<div class="cx-stat"><div class="cx-stat-label">Teks terbaik</div><div class="cx-stat-value cx-mono" style="font-size:14px">' + esc(info.bestText) + '</div></div>' +
      '</div>' +
      '<div class="cx-journal" style="background:' + esc(info.css) + ';color:' + esc(info.bestText) + ';padding:16px;border-radius:10px;margin:10px 0">Pratinjau teks di atas warna ini.</div>' +
      (con ?
        '<p class="cx-note">Kontras terhadap ' + esc(c2.hex) + ': <strong>' + esc(con.text) + '</strong> - ' +
        levels.map(function (l) { return esc(l[0]) + ' ' + (l[2] ? 'lulus' : 'gagal'); }).join(', ') + '.</p>'
        : '<p class="cx-note">Warna pembanding tidak valid, kontras tidak dihitung.</p>');
  }

  on('colorRun', renderColor);
  on('colorCopy', function () { copy($('colorOut').textContent.replace(/\s+/g, ' ').trim(), 'Warna'); });
  (function wirePicker() {
    var picker = $('colorPicker');
    if (!picker) return;
    picker.addEventListener('input', function () {
      $('colorIn').value = picker.value;
      renderColor();
    });
  })();

  /* ── Cron ── */
  (function buildCronPresets() {
    var host = $('cronPresets');
    if (!host) return;
    D.CRON_PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'cx-chip-btn';
      b.type = 'button';
      b.textContent = p.label;
      b.addEventListener('click', function () {
        $('cronIn').value = p.expr;
        runCron();
      });
      host.appendChild(b);
    });
  })();

  function runCron() {
    var status = $('cronStatus');
    var wrap = $('cronTableWrap');
    var expr = $('cronIn').value;
    var p = D.cronParse(expr);
    if (!p.ok) {
      status.textContent = 'Ekspresi tidak valid: ' + p.error;
      wrap.classList.add('cx-hidden');
      COFDE.toast.error('Ekspresi cron tidak valid.');
      return;
    }
    var d = D.cronDescribe(expr);
    var next = D.cronNext(expr, 5);
    status.textContent = d.ok ? d.description : '';
    if (next.ok && next.runs.length) {
      $('cronTable').innerHTML = next.runs.map(function (r, i) {
        return '<tr><td class="num">' + (i + 1) + '</td><td class="cx-mono">' + esc(r.toLocaleString()) + '</td></tr>';
      }).join('');
      wrap.classList.remove('cx-hidden');
    } else {
      $('cronTable').innerHTML = '';
      wrap.classList.add('cx-hidden');
      status.textContent += ' Tidak ada jadwal dalam 400 hari ke depan.';
    }
  }

  on('cronRun', runCron);
  $('cronIn').addEventListener('input', runCron);

  /* ── Markdown ── */
  var mdMode = 'preview';
  function mdShow(mode) {
    mdMode = mode;
    var box = $('mdOut');
    var src = $('mdIn').value;
    if (mode === 'preview') {
      box.classList.remove('cx-mono');
      box.innerHTML = D.markdown(src) || '<p class="cx-note">Belum ada markdown.</p>';
    } else if (mode === 'html') {
      box.classList.add('cx-mono');
      box.textContent = D.markdown(src);
    } else {
      box.classList.add('cx-mono');
      box.textContent = D.mdToText(src);
    }
  }
  on('mdRun', function () { mdShow('preview'); });
  on('mdHtml', function () { mdShow('html'); });
  on('mdText', function () { mdShow('text'); });

  /* ── SQL ── */
  function renderSqlChecks(sql) {
    $('sqlChecks').innerHTML = D.sqlChecks(sql).map(function (c) {
      var prefix = c.level === 'warn' ? 'Perhatian: ' : c.level === 'ok' ? 'OK: ' : 'Info: ';
      return '<p class="cx-note">' + esc(prefix + c.text) + '</p>';
    }).join('');
  }

  on('sqlRun', function () {
    var sql = $('sqlIn').value;
    $('sqlOut').value = D.sqlFormat(sql);
    renderSqlChecks(sql);
  });
  on('sqlCopy', function () { copy($('sqlOut').value, 'SQL'); });

  /* ── Init ── */
  function init() {
    wireNet();
    $('jsonIn').value = '{"nama":"Budi","umur":30,"kota":"Jakarta","aktif":true}';
    runJson(function (s) { return D.jsonFormat(s, $('jsonIndent').value); }, 'Format JSON');
    $('b64In').value = 'Halo dunia';
    $('b64Out').value = D.b64encode($('b64In').value);
    $('urlIn').value = 'https://contoh.com/path?a=1&b=dua#bagian';
    runRegex();
    $('uuidOut').value = D.uuidBatch(5).join('\n');
    renderTimeStats(D.nowParts());
    renderColor();
    runCron();
    $('mdIn').value = '# Judul\n\nTeks biasa dengan **tebal** dan *miring*.\n\n- daftar satu\n- daftar dua\n\n1. langkah pertama\n2. langkah kedua\n\n> kutipan\n\n```\nkode\n```';
    $('mdOut').innerHTML = D.markdown($('mdIn').value);
    $('sqlIn').value = "select u.id,u.nama,count(o.id) as jumlah from users u left join orders o on o.user_id=u.id where u.aktif=1 and o.total>100 group by u.id,u.nama order by jumlah desc";
    $('sqlOut').value = D.sqlFormat($('sqlIn').value);
    renderSqlChecks($('sqlIn').value);
    COFDE.toast.success('Dev Tools siap dipakai. Tekan Ctrl+K untuk pindah tool.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* Ekspor untuk pengujian. */
  window.COFDE.devtoolsPage = window.__devtoolsPage = { copy: copy, esc: esc, runRegex: runRegex, runCron: runCron, renderColor: renderColor, mdMode: function () { return mdMode; } };
})();
