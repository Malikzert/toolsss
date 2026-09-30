/* ══════════════════════════════════════════════════════════
   COFDE Command Palette — global search
   Shortcut: Ctrl + K  (juga Cmd + K di Mac)
   Mencari halaman/tool, dan aksi yang diekspos tool saat ini.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PAGES = [
    { name: 'Dashboard',        href: 'dashboard.html', keywords: 'ringkasan overview home statistik' },
    { name: 'Dokumen Reader',   href: 'reader.html',    keywords: 'pdf docx baca preview search' },
    { name: 'Potong Gambar',    href: 'crop.html',      keywords: 'crop potong gambar screenshot rotasi flip' },
    { name: 'Gabung ke PDF',    href: 'gabung.html',    keywords: 'gabung gambar pdf watermark' },
    { name: 'Konversi',         href: 'konversi.html',  keywords: 'convert markdown teks word pdf batch' },
    { name: 'Gabung PDF',      href: 'merge.html',     keywords: 'merge gabung pdf combine' },
    { name: 'Pisah PDF',        href: 'split.html',     keywords: 'split pisah pdf extract' },
    { name: 'Expense Tracker',  href: 'expense.html',   keywords: 'expense pengeluaran budget keuangan income catatan' },
    { name: 'Maps',             href: 'maps.html',      keywords: 'peta lokasi gps koordinat lat long search' },
    { name: 'QR Code Tools',    href: 'qr.html',        keywords: 'qr barcode generate scan wifi kontak' },
    { name: 'ML CSV Visualizer', href: 'mlcsv.html',    keywords: 'ml csv bleu loss experiment model training analyzer' },
    { name: 'Developer Tools',  href: 'devtools.html',  keywords: 'json base64 jwt uuid regex hash color cron markdown sql dev' },
    { name: 'Settings',         href: 'settings.html',  keywords: 'pengaturan tema currency mata uang tanggal data export import' }
  ];

  var box = null, input = null, list = null, cursor = 0, results = [];

  function build() {
    box = document.createElement('div');
    box.id = 'cofde-cmd';
    box.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:100001', 'display:none',
      'align-items:flex-start', 'justify-content:center', 'padding-top:12vh',
      'background:rgba(2,6,18,0.6)', 'backdrop-filter:blur(6px)'
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
      'width:min(34rem,92vw)', 'background:var(--card-bg)',
      'border:1px solid var(--card-border)', 'border-radius:14px',
      'box-shadow:var(--card-shadow)', 'overflow:hidden'
    ].join(';');

    input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Cari tool atau aksi...  (Ctrl+K)';
    input.setAttribute('aria-label', 'Pencarian global');
    input.style.cssText = [
      'width:100%', 'box-sizing:border-box', 'padding:0.9rem 1rem',
      'font:inherit', 'font-size:1rem', 'color:var(--text)',
      'background:transparent', 'border:0', 'outline:none', 'border-bottom:1px solid var(--card-border)'
    ].join(';');

    list = document.createElement('div');
    list.style.cssText = 'max-height:52vh;overflow:auto;padding:0.35rem';

    card.appendChild(input);
    card.appendChild(list);
    box.appendChild(card);
    document.body.appendChild(box);

    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (results[cursor]) location.href = results[cursor].href; }
    });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
  }

  function score(p, q) {
    var hay = (p.name + ' ' + (p.keywords || '')).toLowerCase();
    if (hay.indexOf(q) === 0) return 100;
    if (p.name.toLowerCase().indexOf(q) === 0) return 80;
    if (hay.indexOf(' ' + q) > -1) return 60;
    if (hay.indexOf(q) > -1) return 40;
    return 0;
  }

  function render() {
    var q = input.value.trim().toLowerCase();
    results = (q ? PAGES : PAGES.slice()).map(function (p) { return { p: p, s: score(p, q) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (r) { return r.p; });
    cursor = 0;
    paint();
  }

  function paint() {
    list.innerHTML = '';
    if (!results.length) {
      var empty = document.createElement('div');
      empty.className = 'cx-empty';
      empty.textContent = 'Tidak ada tool yang cocok.';
      list.appendChild(empty);
      return;
    }
    results.forEach(function (p, i) {
      var row = document.createElement('a');
      row.href = p.href;
      row.className = 'cmd-row' + (i === cursor ? ' active' : '');
      row.style.cssText = [
        'display:flex', 'align-items:center', 'gap:0.6rem', 'padding:0.55rem 0.7rem',
        'border-radius:9px', 'text-decoration:none', 'color:var(--text)',
        'font-size:0.9rem', i === cursor ? 'background:var(--vx-chip,rgba(127,127,127,0.1))' : ''
      ].join(';');
      var n = document.createElement('span');
      n.textContent = String(i + 1).padStart(2, '0');
      n.style.cssText = 'font-size:0.65rem;color:var(--text-muted);font-weight:700';
      var label = document.createElement('span');
      label.textContent = p.name;
      row.appendChild(n);
      row.appendChild(label);
      list.appendChild(row);
    });
  }

  function move(d) {
    if (!results.length) return;
    cursor = (cursor + d + results.length) % results.length;
    paint();
    var active = list.querySelector('.cmd-row.active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (!box) build();
    box.style.display = 'flex';
    input.value = '';
    render();
    setTimeout(function () { input.focus(); }, 20);
  }

  function close() { if (box) box.style.display = 'none'; }

  function toggle() { if (box && box.style.display === 'flex') close(); else open(); }

  function init() {
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape') {
        if (box && box.style.display === 'flex') close();
      }
    });
  }

  window.COFDE = window.COFDE || {};
  window.COFDE.cmdpal = { init: init, open: open, close: close, pages: PAGES };
})();
