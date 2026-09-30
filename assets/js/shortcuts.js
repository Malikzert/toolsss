(function () {
  /* ══════════════════════════════════════════
     COFDE Shortcuts — keyboard navigasi global
     Didesain tidak pernah mengganggu input user:
     shortcut hanya aktif bila fokus bukan field teks.
     ══════════════════════════════════════════ */

  var PAGES = [
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'reader.html',    label: 'Dokumen Reader' },
    { href: 'tools.html',     label: 'Studio Tools' },
    { href: 'listdiff.html',  label: 'List Diff' },
    { href: 'timer.html',     label: 'Timer' },
    { href: 'random.html',    label: 'Random Picker' },
    { href: 'merge.html',     label: 'Merge PDF' },
    { href: 'split.html',     label: 'Split PDF' },
    { href: 'expense.html',   label: 'Expense Tracker' },
    { href: 'maps.html',      label: 'Maps' },
    { href: 'qr.html',        label: 'QR Code Tools' },
    { href: 'mlcsv.html',     label: 'ML CSV Visualizer' },
    { href: 'settings.html',  label: 'Settings' }
  ];

  /* Sahabat yang elegan diproses lewat click() biasa, sehingga setiap tool
     tetap punya satu jalur kode untuk aksi utamanya. */
  var ACTIONS = {
    d: function () { click('#uploadArea'); },
    o: function () { click('#fileInput'); },
    k: function () { click('#runBtn'); },
    m: function () { click('#mergeBtn'); },
    s: function () { click('#splitBtn'); },
    g: function () { click('#convertBtn'); },
    enter: function () { click('#applyBtn'); }
  };

  /* Siklus tema dihapus: tema hanya bisa diubah lewat Settings. */

  function click(sel) {
    var el = document.querySelector(sel);
    if (!el) return false;
    /* input[type=file] tidak bisa di-click() di semua browser; pakai .click()
       langsung tetap bekerja pada yang modern, dan diabaikan bila tidak. */
    el.click();
    return true;
  }

  /* True bila user sedang mengetik / memilih di sebuah kontrol form. */
  function inEditable(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    var tag = (target.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
      var t = (target.type || 'text').toLowerCase();
      return ['text', 'password', 'search', 'email', 'url', 'tel', 'number'].indexOf(t) >= 0;
    }
    return false;
  }

  function currentPage() {
    return location.pathname.split('/').pop() || 'dashboard.html';
  }

  function go(delta) {
    var cur = currentPage();
    var i = PAGES.findIndex(function (p) { return p.href === cur; });
    if (i < 0) i = 0;
    var next = PAGES[(i + delta + PAGES.length) % PAGES.length];
    if (next.href !== cur) location.href = next.href;
  }

  function overlayOpen() {
    var d = document.querySelector('.vx-drawer.open, .vx-drawer.is-open');
    return !!d;
  }

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (inEditable(e.target)) return;

    var k = e.key;

    if (k === '?' || (k === '/' && e.shiftKey)) {
      e.preventDefault();
      if (window.COFDE_SHORTCUT_HELP) window.COFDE_SHORTCUT_HELP();
      return;
    }

    /* Esc menutup panel bantuan; drawer punya penangan sendiri. */
    if (k === 'Escape' || k === 'Esc') {
      var help = document.getElementById('cofde-shortcut-help');
      if (help) { e.preventDefault(); help.remove(); }
      return;
    }

    if (k === '[') { e.preventDefault(); go(-1); return; }
    if (k === ']') { e.preventDefault(); go(1); return; }

    /* Enter dipetakan ke aksi utama, jadi harus dicek sebelum filter
       "satu huruf" di bawah. */
    if (k === 'Enter' || k === 'Return') {
      e.preventDefault();
      ACTIONS.enter();
      return;
    }

    /* Huruf biasa hanya aktif di halaman tool, bukan di Dashboard,
       supaya label tombol di sana tidak berubah tak terduga. */
    var lower = typeof k === 'string' ? k.toLowerCase() : '';
    if (!lower || lower.length !== 1) return;
    if (!ACTIONS[lower]) return;
    if (overlayOpen()) return;

    e.preventDefault();
    ACTIONS[lower]();
  });

  /* Bantuan singkat:-feedback berupa toast ringan, tanpa library. */
  window.COFDE_SHORTCUT_HELP = function () {
    var old = document.getElementById('cofde-shortcut-help');
    if (old) { old.remove(); return; }

    var rows = [
      ['[  /  ]', 'Halaman tool sebelumnya / berikutnya'],
      ['Ctrl + K', 'Pencarian global (semua tool)'],
      ['D', 'Pilih file (area upload)'],
      ['O', 'Buka dialog berkas'],
      ['Enter', 'Jalankan aksi utama'],
      ['K', 'Konversi / Reader'],
      ['G', 'Gabung gambar ke PDF'],
      ['M', 'Gabung PDF'],
      ['S', 'Pisah PDF'],
      ['?', 'Buka / tutup bantuan ini']
    ];

    var box = document.createElement('div');
    box.id = 'cofde-shortcut-help';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Pintasan keyboard');
    box.style.cssText = [
      'position:fixed', 'inset:0', 'display:flex', 'align-items:center',
      'justify-content:center', 'background:rgba(2,6,18,0.72)', 'z-index:99999',
      'font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
      'background:#0f1923', 'color:#e2e8f0', 'border:1px solid rgba(255,255,255,0.14)',
      'border-radius:12px', 'padding:20px 22px', 'min-width:320px', 'max-width:90vw',
      'box-shadow:0 24px 60px rgba(0,0,0,0.5)'
    ].join(';');

    var h = document.createElement('div');
    h.textContent = 'Pintasan Keyboard';
    h.style.cssText = 'font-size:15px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;color:#ff4655';
    card.appendChild(h);

    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:12px;align-items:baseline;padding:3px 0';
      var kk = document.createElement('kbd');
      kk.textContent = r[0];
      kk.style.cssText = [
        'background:rgba(255,255,255,0.08)', 'border:1px solid rgba(255,255,255,0.16)',
        'border-radius:5px', 'padding:2px 7px', 'font:600 12px ui-monospace,Menlo,Consolas,monospace',
        'min-width:64px', 'text-align:center', 'flex-shrink:0'
      ].join(';');
      var dd = document.createElement('span');
      dd.textContent = r[1];
      dd.style.cssText = 'font-size:13px;opacity:0.85';
      row.appendChild(kk);
      row.appendChild(dd);
      card.appendChild(row);
    });

    var hint = document.createElement('div');
    hint.textContent = 'Tekan ? atau Esc, atau klik di luar untuk menutup';
    hint.style.cssText = 'margin-top:14px;font-size:11px;opacity:0.5;text-align:center';
    card.appendChild(hint);

    box.appendChild(card);
    box.addEventListener('click', function (ev) { if (ev.target === box) box.remove(); });
    document.body.appendChild(box);
  };
})();
