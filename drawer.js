(function () {
  /* ══════════════════════════════════════════
     VX Drawer — Valorant-style Glass Sidebar
     Glassmorphism + light blink on open
     Shatter fracture on close
     ══════════════════════════════════════════ */

  var PAGES = [
    { href: 'index.html',    label: 'Dokumen Reader' },
    { href: 'crop.html',     label: 'Potong Gambar' },
    { href: 'gabung.html',   label: 'Gabung ke PDF' },
    { href: 'konversi.html', label: 'Konversi' }
  ];

  var COLS = 5;
  var ROWS = 4;
  var CRACK_MS = 260;

  var api = window.COFDE_THEME;
  var THEME_SWATCH = {
    lightholy: 'linear-gradient(90deg, #fff6e2, #ffc46b)',
    darkside: 'linear-gradient(90deg, #0f1923, #ff4655)',
    abyss: 'linear-gradient(90deg, #04070f, #2ee6d6)'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = location.pathname.split('/').pop() || 'index.html';
  var isOpen = false;
  var isBusy = false;

  /* ── DOM Build ── */
  var links = PAGES.map(function (page, i) {
    var cls = 'vx-link' + (page.href === current ? ' active' : '');
    return '<li><a class="' + cls + '" href="' + page.href + '">' +
      '<span class="vx-num">0' + (i + 1) + '</span>' +
      '<span>' + page.label + '</span>' +
      '</a></li>';
  }).join('');

  /* ── Theme Chips ── */
  var activeTheme = api ? api.get() : 'lightholy';
  var themeButtons = '';

  if (api) {
    Object.keys(api.themes).forEach(function (key) {
      var info = api.themes[key];
      var cls = 'vx-theme' + (key === activeTheme ? ' active' : '');
      themeButtons +=
        '<button type="button" class="' + cls + '" data-theme="' + key + '" ' +
        'aria-pressed="' + (key === activeTheme) + '">' +
          '<span class="vx-swatch" style="background:' + (THEME_SWATCH[key] || '#888') + '"></span>' +
          '<span class="vx-theme-name">' + info.label + '</span>' +
        '</button>';
    });
  }

  var scrim = document.createElement('div');
  scrim.className = 'vx-scrim';

  var drawer = document.createElement('nav');
  drawer.className = 'vx-drawer';
  drawer.setAttribute('aria-label', 'Menu utama');
  drawer.innerHTML =
    '<div class="vx-blink"></div>' +
    '<div class="vx-crack"></div>' +
    '<ul class="vx-list">' + links + '</ul>' +
    '<div class="vx-themes">' +
      '<div class="vx-sec-label">Theme</div>' +
      '<div class="vx-theme-row" role="group" aria-label="Pilih tema">' + themeButtons + '</div>' +
    '</div>' +
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

  drawer.id = 'vx-drawer';
  document.body.appendChild(scrim);
  document.body.appendChild(corner);
  document.body.appendChild(drawer);
  document.body.appendChild(toggle);
  document.body.appendChild(flash);

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

  drawer.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.vx-theme') : null;
    if (!btn || !api) return;

    var key = btn.dataset.theme;
    if (!key || key === api.get()) return;

    api.set(key);

    drawer.querySelectorAll('.vx-theme').forEach(function (b) {
      var on = b.dataset.theme === key;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && isOpen) close();
  });
})();
