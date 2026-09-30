/* ══════════════════════════════════════════════════════════
   COFDE Toast — reusable notification system
   Types: success, error, warning, info
   Usage: COFDE.toast('success', 'Expense added successfully')
          COFDE.toast.error('Something failed')
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MAX_VISIBLE = 4;
  var DEFAULT_MS = 4000;
  var ICONS = {
    success: '&#10003;',
    error: '&#10007;',
    warning: '&#9888;',
    info: '&#8505;'
  };
  var LABELS = {
    success: 'Berhasil',
    error: 'Gagal',
    warning: 'Perhatian',
    info: 'Info'
  };

  var host = null;
  var live = [];

  function ensureHost() {
    if (host && document.body.contains(host)) return host;
    host = document.createElement('div');
    host.id = 'cofde-toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'false');
    document.body.appendChild(host);
    return host;
  }

  function dismiss(el) {
    if (!el || el.dataset.closing === '1') return;
    el.dataset.closing = '1';
    /* Buang dari `live` SEKALI_SINKRON. Kalau menunggu `done()`,
       `live.length` tidak berkurang dan loop trim di show() tidak
       akan pernah selesai. */
    live = live.filter(function (t) { return t !== el; });
    el.classList.add('toast-out');
    var done = function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    if (typeof el.animate === 'function') {
      try {
        var a = el.animate(
          [{ opacity: 1, transform: 'translateX(0)' },
           { opacity: 0, transform: 'translateX(24px)' }],
          { duration: 180, easing: 'ease-out' }
        );
        a.onfinish = done;
        setTimeout(done, 400);
        return;
      } catch (e) { /* fall through to timeout */ }
    }
    setTimeout(done, 200);
  }

  function show(type, message, ms) {
    type = ICONS[type] ? type : 'info';
    var text = message === undefined || message === null ? '' : String(message);
    if (!text) return null;

    ensureHost();

    /* Jangan izinkan tumpukan tak terbatas memblokir layar. Notifikasi
       yang tergantikan langsung dicabut dari DOM (tanpa animasi) supaya
       jumlah elemen di layar tetap kecil. shift() juga menjamin loop
       selalu maju walau dismiss() gagal. */
    while (live.length >= MAX_VISIBLE) {
      var old = live.shift();
      if (old) {
        old.dataset.closing = '1';
        if (old.parentNode) old.parentNode.removeChild(old);
      }
    }

    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');

    var icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = ICONS[type];
    icon.setAttribute('aria-hidden', 'true');

    var body = document.createElement('div');
    body.className = 'toast-body';

    var label = document.createElement('strong');
    label.className = 'toast-label';
    label.textContent = LABELS[type];

    var msg = document.createElement('p');
    msg.className = 'toast-msg';
    /* textContent, bukan innerHTML: pesan error boleh berisi input user. */
    msg.textContent = text;

    body.appendChild(label);
    body.appendChild(msg);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Tutup notifikasi');
    close.innerHTML = '&times;';
    close.addEventListener('click', function () { dismiss(el); });

    el.appendChild(icon);
    el.appendChild(body);
    el.appendChild(close);
    host.appendChild(el);
    live.push(el);

    /* Pesan error tidak boleh hilang sendiri terlalu cepat. */
    var dur = ms || (type === 'error' ? Math.max(DEFAULT_MS, 7000) : DEFAULT_MS);
    var timer = setTimeout(function () { dismiss(el); }, dur);

    el.addEventListener('mouseenter', function () { clearTimeout(timer); });
    el.addEventListener('mouseleave', function () {
      setTimeout(function () { dismiss(el); }, 1500);
    });

    return el;
  }

  function clearAll() {
    live.slice().forEach(dismiss);
  }

  var api = {
    show: show,
    success: function (m, ms) { return show('success', m, ms); },
    error: function (m, ms) { return show('error', m, ms); },
    warning: function (m, ms) { return show('warning', m, ms); },
    info: function (m, ms) { return show('info', m, ms); },
    clearAll: clearAll
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.toast = api;
})();
