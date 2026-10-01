(function () {
  /* ══════════════════════════════════════════
     VX Drawer — Valorant-style Glass Sidebar
     Glassmorphism + light blink on open
     Shatter fracture on close
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

  var COLS = 5;
  var ROWS = 4;
  var CRACK_MS = 260;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = location.pathname.split('/').pop() || 'dashboard.html';
  var isOpen = false;
  var isBusy = false;

  /* ── DOM Build ── */
  var links = PAGES.map(function (page, i) {
    var cls = 'vx-link' + (page.href === current ? ' active' : '');
    return '<li><a class="' + cls + '" href="' + page.href + '">' +
      '<span class="vx-num">' + (i + 1 < 10 ? '0' + (i + 1) : String(i + 1)) + '</span>' +
      '<span>' + page.label + '</span>' +
      '</a></li>';
  }).join('');

  /* Theme chips dihapus: tema hanya diatur lewat Settings. */

  var scrim = document.createElement('div');
  scrim.className = 'vx-scrim';

  var drawer = document.createElement('nav');
  drawer.className = 'vx-drawer';
  drawer.setAttribute('aria-label', 'Menu utama');
  drawer.innerHTML =
    '<div class="vx-blink"></div>' +
    '<div class="vx-crack"></div>' +
    '<ul class="vx-list">' + links + '</ul>' +
    '<div class="vx-foot">Klik di luar untuk menutup</div>';

  var corner = document.createElement('div');
  corner.className = 'vx-corner';
  corner.setAttribute('aria-hidden', 'true');
  corner.innerHTML =
    '<span class="vx-mark"></span>' +
    '<span class="vx-corner-text">' +
      '<span class="vx-corner-name">COFDE</span>' +
      '<span class="vx-corner-sub">Toolkit</span>' +
    '</span>';

  var toggle = document.createElement('button');
  toggle.className = 'vx-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'vx-drawer');
  toggle.setAttribute('aria-label', 'Buka menu');
  toggle.innerHTML =
    '<span class="vx-burger"><i></i><i></i><i></i></span>' +
    '<span class="vx-toggle-label">Menu</span>';

  var flash = document.createElement('div');
  flash.className = 'vx-flash';

  /* ── Refresh paksa: logo statis, meledak jadi kobaran api ── */
  var refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.className = 'vx-refresh';
  refresh.setAttribute('aria-label', 'Muat ulang paksa');
  refresh.title = 'Muat ulang paksa';
  refresh.innerHTML =
    '<span class="vx-blaze" aria-hidden="true"></span>' +
    '<span class="vx-can" aria-hidden="true"><i></i><b></b><s></s></span>';

  var refreshing = false;
  function forceReload() {
    if (refreshing) return;
    refreshing = true;
    refresh.classList.add('spinning');
    refresh.setAttribute('aria-busy', 'true');

    /* Buang cache app supaya berkas terunduh ulang, lalu muat halaman. */
    window.setTimeout(function () {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            regs.forEach(function (reg) { reg.unregister(); });
          }).catch(function () {});
        }
      } catch (e) { /* abaikan */ }
      try {
        if (window.caches && caches.keys) {
          caches.keys().then(function (keys) {
            keys.forEach(function (k) { caches.delete(k); });
          }).catch(function () {});
        }
      } catch (e2) { /* abaikan */ }
      location.reload();
    }, reduceMotion ? 60 : 520);
  }

  refresh.addEventListener('click', function (e) {
    e.stopPropagation();
    forceReload();
  });

  drawer.id = 'vx-drawer';
  document.body.appendChild(scrim);
  document.body.appendChild(corner);
  document.body.appendChild(drawer);
  document.body.appendChild(toggle);
  document.body.appendChild(refresh);
  document.body.appendChild(flash);

  /* Tombol refresh duduk tepat di kanan tombol Menu, mengikuti lebar
     tombolnya (label bisa berubah(font) atau layar mengecil). */
  function placeRefresh() {
    if (!toggle.parentNode) return;
    var r = toggle.getBoundingClientRect();
    refresh.style.left = Math.round(r.right + 8) + 'px';
    refresh.style.top = Math.round(r.top) + 'px';
  }
  placeRefresh();
  window.addEventListener('resize', placeRefresh);
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(placeRefresh).catch(function () {});
  }
  window.setTimeout(placeRefresh, 600);

  /* ── Retrigger Helper ── */
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function fireFlash() {
    replay(flash, 'go');
  }

  /* ── Shatter: split panel into triangles and scatter ── */
  function shatter() {
    if (reduceMotion) {
      hidePanel();
      return;
    }

    drawer.classList.add('cracking');

    window.setTimeout(function () {
      var w = drawer.offsetWidth;
      var h = drawer.offsetHeight;
      var cx = w / 2;
      var cy = h / 2;
      var nodes = [];
      var anims = [];

      for (var r = 0; r < ROWS; r++) {
        var y0 = (r / ROWS) * 100;
        var y1 = ((r + 1) / ROWS) * 100;

        for (var c = 0; c < COLS; c++) {
          var x0 = (c / COLS) * 100;
          var x1 = ((c + 1) / COLS) * 100;

          var tris = [
            [x0, y0, x1, y0, x1, y1],
            [x0, y0, x1, y1, x0, y1]
          ];

          for (var t = 0; t < tris.length; t++) {
            var p = tris[t];
            var shard = document.createElement('div');
            shard.className = 'vx-shard' + (Math.random() < 0.18 ? ' hot' : '');
            shard.style.cssText =
              'width:' + w + 'px;height:' + h + 'px;' +
              'clip-path:polygon(' +
                p[0] + '% ' + p[1] + '%, ' +
                p[2] + '% ' + p[3] + '%, ' +
                p[4] + '% ' + p[5] + '%);';
            document.body.appendChild(shard);
            nodes.push(shard);

            var mx = ((p[0] + p[2] + p[4]) / 3 / 100) * w;
            var my = ((p[1] + p[3] + p[5]) / 3 / 100) * h;
            var spread = 0.8 + Math.random() * 1.4;
            var tx = (mx - cx) * spread + (Math.random() - 0.5) * 70;
            var ty = (my - cy) * spread - 40 + Math.random() * 240;
            var spin = (Math.random() - 0.5) * 150;

            anims.push(shard.animate([
              {
                transform: 'translate3d(0,0,0) rotate(0deg) scale(1)',
                opacity: 1,
                offset: 0
              },
              {
                transform: 'translate3d(' + tx * 0.25 + 'px,' + (ty * 0.25 - 24) + 'px,0) rotate(' + spin * 0.3 + 'deg) scale(1)',
                opacity: 1,
                offset: 0.22
              },
              {
                transform: 'translate3d(' + tx + 'px,' + ty + 'px,0) rotate(' + spin + 'deg) scale(0.82)',
                opacity: 0
              }
            ], {
              duration: 460 + Math.random() * 300,
              delay: Math.random() * 90,
              easing: 'cubic-bezier(0.18, 0.72, 0.3, 1)',
              fill: 'both'
            }));
          }
        }
      }

      hidePanel();

      Promise.race([
        Promise.all(anims.map(function (a) {
          return a.finished.catch(function () {});
        })),
        new Promise(function (resolve) {
          window.setTimeout(resolve, 1100);
        })
      ]).then(function () {
        anims.forEach(function (a) { a.cancel(); });
        nodes.forEach(function (n) { n.remove(); });
      });
    }, CRACK_MS);
  }

  function hidePanel() {
    drawer.classList.remove('open', 'cracking', 'blink');
    drawer.classList.add('gone');
    isOpen = false;
    isBusy = false;
  }

  /* ── Open / Close ── */
  function open() {
    if (isOpen || isBusy) return;
    isOpen = true;

    scrim.classList.add('on');
    drawer.classList.remove('gone');
    drawer.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Tutup menu');

    fireFlash();
    replay(drawer, 'blink');

    var first = drawer.querySelector('.vx-link');
    if (first) first.focus();
  }

  function close() {
    if (!isOpen || isBusy) return;
    isBusy = true;

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Buka menu');
    scrim.classList.remove('on');

    shatter();
  }

  /* ── Events ── */
  toggle.addEventListener('click', function () {
    if (isOpen) close();
    else open();
  });

  scrim.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && isOpen) close();
  });
})();
