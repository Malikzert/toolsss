/* ══════════════════════════════════════════════════════════
   COFDE Timer — hitung mundur + stopwatch dalam satu halaman.

   Semua waktu dihitung dari timestamp (Date.now), bukan dari
   akumulasi tick. Jadi kalau tab tidak aktif awhile lalu dibuka
   lagi, angka yang tampil tetap benar.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* Panjang lingkaran untuk r=98, dipakai sebagai dasbor stroke-dasharray. */
  var R = 98;
  var arcLen = 2 * Math.PI * R;

  function clampInt(v, lo, hi, fallback) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return fallback;
    if (n < lo) return lo;
    if (n > hi) return hi;
    return n;
  }

  /* mm:ss.cc, atau h:mm:ss.cc kalau lewat 1 jam. */
  function fmt(ms) {
    if (ms < 0) ms = 0;
    var cs = Math.floor(ms / 10) % 100;
    var totalSec = Math.floor(ms / 1000);
    var s = totalSec % 60;
    var m = Math.floor(totalSec / 60) % 60;
    var h = Math.floor(totalSec / 3600);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return (h > 0 ? h + ':' + pad(m) : pad(m)) + ':' + pad(s) + '.' + pad(cs);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ══════════════ Countdown ══════════════ */
  var cd = {
    running: false,
    started: false,  /* pernah dijalankan, biar status "dijeda" tidak muncul
                        tepat setelah memilih preset */
    endAt: 0,      /* timestamp_ms saat hitungan sampai nol */
    remain: 0,     /* sisa ms saat dijeda */
    total: 0,      /* durasi awal, untuk progress ring */
    done: false
  };

  function cdTotal() {
    return (clampInt($('cdMin').value, 0, 999, 0) * 60 +
            clampInt($('cdSec').value, 0, 59, 0)) * 1000;
  }

  function cdRemain() {
    if (!cd.running) return cd.remain;
    return Math.max(0, cd.endAt - Date.now());
  }

  function paintCd() {
    var rem = cdRemain();
    $('cdTime').textContent = fmt(rem);
    $('cdNote').textContent = cd.done ? 'selesai'
      : cd.running ? 'berjalan'
      : cd.started ? 'dijeda'
      : 'siap';

    var frac = cd.total > 0 ? rem / cd.total : 0;
    if (frac < 0) frac = 0;
    if (frac > 1) frac = 1;
    var el = $('cdArc');
    if (el) {
      el.style.strokeDasharray = arcLen.toFixed(2);
      el.style.strokeDashoffset = (arcLen * (1 - frac)).toFixed(2);
    }

    $('cdPause').disabled = !cd.running;
    $('cdStart').disabled = cd.running;
    $('cdStart').textContent = cd.running ? 'Berjalan'
      : (cd.started && cd.remain > 0 ? 'Lanjut' : 'Mulai');

    document.title = (cd.running && rem > 0 ? fmt(rem) + ' — ' : '') + 'Timer';
  }

  function cdStart() {
    if (cd.running) return;
    if (cd.done || cd.remain <= 0) {
      cd.total = cdTotal();
      if (cd.total <= 0) {
        if (COFDE.toast) COFDE.toast('Isi menit atau detik dulu.', 'warn');
        return;
      }
      cd.remain = cd.total;
      cd.done = false;
    }
    cd.endAt = Date.now() + cd.remain;
    cd.running = true;
    cd.started = true;
    paintCd();
  }

  function cdPause() {
    if (!cd.running) return;
    cd.remain = cdRemain();
    cd.running = false;
    paintCd();
  }

  function cdReset() {
    cd.running = false;
    cd.done = false;
    cd.started = false;
    cd.remain = 0;
    cd.total = 0;
    $('cdMin').value = '5';
    $('cdSec').value = '0';
    paintCd();
  }

  function cdFinish() {
    cd.running = false;
    cd.done = true;
    cd.remain = 0;
    paintCd();

    var label = $('cdLabel').value.trim();
    var text = label ? label + ' selesai' : 'Waktu habis';
    if (COFDE.toast) COFDE.toast(text, 'ok');
    if ($('cdBeep').checked) beep();
    if ($('cdNotify').checked) notify('COFDE Timer', text);

    /* Catat riwayat sesi selesai. */
    var box = $('cdLaps');
    var item = document.createElement('div');
    item.className = 'tm-lap';
    item.innerHTML = '<span class="tm-lap-n">' + esc(label || 'Sesi') + '</span>' +
      '<span class="tm-lap-t">' + esc(fmt(cd.total)) + '</span>' +
      '<span class="tm-lap-d">baru saja</span>';
    var empty = box.querySelector('.lf-empty');
    if (empty) empty.remove();
    box.insertBefore(item, box.firstChild);
  }

  /* ══════════════ Stopwatch ══════════════ */
  var sw = {
    running: false,
    startedAt: 0,   /* timestamp saat mulai/resume */
    accum: 0,       /* ms yang sudah terakumulasi sebelum start terakhir */
    laps: []
  };

  function swElapsed() {
    return sw.accum + (sw.running ? Date.now() - sw.startedAt : 0);
  }

  function paintSw() {
    var e = swElapsed();
    $('swTime').textContent = fmt(e);
    $('swNote').textContent = sw.running ? 'berjalan' : (e > 0 ? 'dijeda' : 'belum mulai');
    $('swLap').disabled = !sw.running;
    $('swLapCount').textContent = sw.laps.length;
    $('swClearLaps').hidden = sw.laps.length === 0;
    document.title = (sw.running ? fmt(e) + ' — ' : '') + 'Timer';
  }

  function swStart() {
    if (sw.running) return;
    sw.startedAt = Date.now();
    sw.running = true;
    $('swStart').textContent = 'Jeda';
    paintSw();
  }

  function swPause() {
    if (!sw.running) return;
    sw.accum = swElapsed();
    sw.running = false;
    $('swStart').textContent = 'Lanjut';
    paintSw();
  }

  function swReset() {
    sw.running = false;
    sw.accum = 0;
    sw.laps = [];
    $('swStart').textContent = 'Mulai';
    renderLaps();
    paintSw();
  }

  function swLap() {
    if (!sw.running) return;
    var total = swElapsed();
    var prev = sw.laps.length ? sw.laps[sw.laps.length - 1].total : 0;
    sw.laps.push({ total: total, split: total - prev });
    renderLaps();
    paintSw();
  }

  function renderLaps() {
    var box = $('swLaps');
    if (!sw.laps.length) {
      box.innerHTML = '<p class="lf-empty">Belum ada lap.</p>';
      return;
    }
    box.innerHTML = sw.laps.map(function (l, i) {
      return '<div class="tm-lap">' +
        '<span class="tm-lap-n">Lap ' + (i + 1) + '</span>' +
        '<span class="tm-lap-t">' + fmt(l.split) + '</span>' +
        '<span class="tm-lap-d">total ' + fmt(l.total) + '</span>' +
      '</div>';
    }).join('');
  }

  /* ══════════════ Bunyi & notifikasi ══════════════ */
  var actx = null;
  function beep() {
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
      }
      if (actx.state === 'suspended') actx.resume();
      var now = actx.currentTime;
      /* Tiga nada pendek dengan jeda, agar terdengar jelas. */
      [0, 0.18, 0.36].forEach(function (t, i) {
        var o = actx.createOscillator();
        var g = actx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(880 - i * 120, now + t);
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.15);
        o.connect(g); g.connect(actx.destination);
        o.start(now + t); o.stop(now + t + 0.17);
      });
    } catch (e) { /* audio ditolak — abaikan */ }
  }

  function notify(title, body) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      var n = new Notification(title, { body: body, tag: 'cofde-timer' });
      n.onclick = function () { window.focus(); n.close(); };
    } catch (e) { /* abaikan */ }
  }

  /* ══════════════ Tab switch ══════════════ */
  var mode = 'countdown';
  var cards = [].slice.call(document.querySelectorAll('.tm-card'));
  function setMode(m) {
    mode = m;
    cards.forEach(function (c) {
      var on = c.dataset.mode === m;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
      c.tabIndex = on ? 0 : -1;
    });
    $('mode-countdown').hidden = m !== 'countdown';
    $('mode-stopwatch').hidden = m !== 'stopwatch';
    if (m === 'countdown') paintCd(); else paintSw();
  }
  cards.forEach(function (c) {
    c.addEventListener('click', function () { setMode(c.dataset.mode); });
  });

  /* ══════════════ Wiring ══════════════ */
  $('cdStart').addEventListener('click', function () { unlockAudio(); cdStart(); });
  $('cdPause').addEventListener('click', function () { unlockAudio(); cdPause(); });
  $('cdReset').addEventListener('click', cdReset);
  ['cdMin', 'cdSec'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      if (cd.running) return;
      cd.done = false;
      cd.started = false;
      cd.remain = cdTotal();
      cd.total = cd.remain;
      paintCd();
    });
  });
  $('cdPresets').addEventListener('click', function (e) {
    var b = e.target.closest('.tm-chip');
    if (!b) return;
    cd.running = false; cd.done = false; cd.started = false;
    $('cdMin').value = b.dataset.min;
    $('cdSec').value = '0';
    cd.remain = cdTotal();
    cd.total = cd.remain;
    paintCd();
  });
  $('cdNotify').addEventListener('change', function () {
    if (!$('cdNotify').checked) return;
    if (!('Notification' in window)) {
      $('cdNotify').checked = false;
      if (COFDE.toast) COFDE.toast('Browser ini tidak mendukung notifikasi.', 'warn');
      return;
    }
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') {
        $('cdNotify').checked = false;
        if (COFDE.toast) COFDE.toast('Izin notifikasi ditolak.', 'warn');
      }
    });
  });

  $('swStart').addEventListener('click', function () { unlockAudio(); if (sw.running) swPause(); else swStart(); });
  $('swLap').addEventListener('click', swLap);
  $('swReset').addEventListener('click', swReset);
  $('swClearLaps').addEventListener('click', function () { sw.laps = []; renderLaps(); paintSw(); });

  function unlockAudio() {
    if (!actx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) actx = new AC();
      } catch (e) { /* abaikan */ }
    }
    if (actx && actx.state === 'suspended') actx.resume();
  }

  /* ══════════════ Tick bersama ══════════════ */
  var lastCd = -1;
  function tick() {
    if (mode === 'countdown') {
      if (cd.running) {
        var rem = cdRemain();
        /* Hanya tulis DOM kalau digit berubah, supaya tidak boros. */
        var cs = Math.floor(rem / 10);
        if (cs !== lastCd) { lastCd = cs; paintCd(); }
        if (rem <= 0) cdFinish();
      }
    } else if (sw.running) {
      var e = swElapsed();
      var cs2 = Math.floor(e / 10);
      if (cs2 !== lastCd) { lastCd = cs2; paintSw(); }
    }
    requestAnimationFrame(tick);
  }

  /* Pintasan lokal: Spasi mulai/jeda, L catat lap, R reset.
     Shortcut global tidak memakai tombol ini, jadi tidak bentrok. */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test((t.tagName || '').toUpperCase()))) return;
    if (e.key === ' ') {
      e.preventDefault();
      unlockAudio();
      if (mode === 'countdown') { if (cd.running) cdPause(); else cdStart(); }
      else { if (sw.running) swPause(); else swStart(); }
    } else if (e.key === 'l' || e.key === 'L') {
      if (mode !== 'stopwatch') return;
      e.preventDefault(); swLap();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (mode === 'countdown') cdReset(); else swReset();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      if (mode === 'countdown') paintCd(); else paintSw();
    }
  });

  function init() {
    cd.remain = 0; cd.total = 0;
    paintCd();
    renderLaps();
    paintSw();
    setMode('countdown');
    if (COFDE.net && COFDE.net.badge) COFDE.net.badge($('netBadge'));
    if (COFDE.cmdpal && COFDE.cmdpal.init) COFDE.cmdpal.init();
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
