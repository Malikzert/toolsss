/* ══════════════════════════════════════════════════════════
   COFDE — valo-gate.js
   Gerbang masuk bergaya VALO saat pertama kali membuka situs.

   Alur:
     1. GERBANG  : makhluk penjaga + marbel cahaya interaktif,
                   teks puitis "Join to Clarity", satu tombol.
     2. RASI     : saat tombol ditekan, marbel menyatu jadi rasi
                   bintang dan bilah cahaya turun menunjuk ke
                   pertanyaan.
     3. TANYA    : percakapan client/server "ada perlu apa Anda
                   masuk ke sini?" dengan tiga pilihan.
     4. KODE     : pengunjung wajib mengetik kode akses manual:
                   cofde (paste dicegah supaya benar-benar diketik).
     5. MASUK    : gerbang menutup, dashboard utama tersingkap.

   Status disimpan di localStorage, jadi hanya muncul sekali per
   browser. Tombol "Mulai ulang gate" di Settings mengulanginya.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.COFDE_GATE) return;

  var KEY = 'cofde_gate';
  var CODE = 'cofde';
  /* Penanda versi gerbang: naikkan nilai ini supaya pengunjung lama
     sekali lagi melihat gerbang baru, lalu tersimpan lagi. */
  var DONE = 'ok:v2';

  /* Tiga jawaban; server merespons berbeda untuk tiap pilihan. */
  var CHOICES = [
    {
      id: 'pokok',
      label: 'Pokok, buat kerjaan',
      reply: 'Dicatat. COFDE siap dipakai buat olah data, crop, gabung, dan konversi.'
    },
    {
      id: 'belajar',
      label: 'Main iseng, lagi belajar',
      reply: 'Oke. Biaayaklik dulu; semua fiturnya aman dicoba, data disimpan lokal di perangkatmu.'
    },
    {
      id: 'menolong',
      label: 'Tolong seseorang',
      reply: 'Baik. Kalau butuh bantu proses data orang lain, data tetap di perangkat ini dan tidak dikirim ke mana pun.'
    }
  ];

  var reduceMotion = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── Status ── */
  function isDone() {
    try {
      return localStorage.getItem(KEY) === DONE;
    } catch (e) {
      return false;
    }
  }

  function markDone() {
    try { localStorage.setItem(KEY, DONE); } catch (e) { /* abaikan */ }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* abaikan */ }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function ensureStyle(id, css) {
    if (document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ── Gaya percakapan (client/server) ── */
  var CSS_CONV = [
    '.vg-backdrop{position:fixed;inset:0;z-index:9999;display:flex;',
    'align-items:center;justify-content:center;padding:1.25rem;',
    'background:color-mix(in srgb, var(--vx-scrim) 92%, transparent);',
    'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}',
    '.vg-box{position:relative;width:min(38rem,100%);max-height:92vh;',
    'overflow-y:auto;background:var(--vx-bg);border:1px solid',
    'color-mix(in srgb,var(--accent) 50%,transparent);',
    'clip-path:polygon(0 0,100% 0,100% calc(100% - 18px),',
    'calc(100% - 18px) 100%,0 100%);padding:1.5rem;',
    'box-shadow:0 24px 60px rgba(0,0,0,.55);}',
    '.vg-box::after{content:"";position:absolute;top:0;left:0;right:0;',
    'height:2px;background:linear-gradient(90deg,var(--accent),',
    'color-mix(in srgb,var(--accent) 25%,transparent));}',
    '.vg-log{display:flex;flex-direction:column;gap:.7rem;',
    'margin:0 0 1.1rem;padding:0;list-style:none;}',
    '.vg-line{display:flex;gap:.6rem;align-items:flex-start;',
    'font-size:.86rem;line-height:1.5;}',
    '.vg-who{flex:0 0 auto;font-size:.6rem;letter-spacing:.12em;',
    'text-transform:uppercase;padding:.18rem .4rem;white-space:nowrap;',
    'clip-path:polygon(0 0,100% 0,100% calc(100% - 4px),',
    'calc(100% - 4px) 100%,0 100%);}',
    '.vg-who.srv{background:var(--accent);color:var(--vx-on-accent);}',
    '.vg-who.cli{background:color-mix(in srgb,var(--accent) 22%,transparent);',
    'color:var(--vx-fg);}',
    '.vg-txt{color:var(--vx-fg);opacity:0;transform:translateY(6px);',
    'animation:vg-in .32s ease forwards;}',
    '.vg-txt code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;',
    'background:color-mix(in srgb,var(--accent) 18%,transparent);',
    'padding:.05rem .3rem;letter-spacing:.1em;}',
    '@keyframes vg-in{to{opacity:1;transform:translateY(0);}}',
    '.vg-q{font-size:.95rem;font-weight:700;color:var(--vx-fg);',
    'margin:0 0 .7rem;}',
    '.vg-opts{display:flex;flex-direction:column;gap:.5rem;',
    'margin:0 0 1.1rem;}',
    '.vg-opt{position:relative;overflow:hidden;text-align:left;',
    'font:inherit;font-size:.85rem;color:var(--vx-fg);padding:.6rem .75rem;',
    'cursor:pointer;background:color-mix(in srgb,var(--accent) 8%,transparent);',
    'border:1px solid color-mix(in srgb,var(--accent) 34%,transparent);',
    'clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),',
    'calc(100% - 8px) 100%,0 100%);',
    'transition:transform .18s ease,background .18s ease,',
    'box-shadow .18s ease;}',
    '.vg-opt:hover,.vg-opt:focus-visible{transform:translateX(3px);',
    'outline:none;border-color:var(--accent);',
    'background:color-mix(in srgb,var(--accent) 20%,transparent);}',
    '[data-theme="abyss"] .vg-opt:hover,[data-theme="abyss"] .vg-opt:focus-visible{',
    'box-shadow:0 0 20px rgba(255,138,60,.35);}',
    '.vg-opt[aria-pressed="true"]{border-color:var(--accent);',
    'background:color-mix(in srgb,var(--accent) 30%,transparent);',
    'box-shadow:0 0 0 1px var(--accent);}',
    '.vg-opt .vg-key{display:inline-block;min-width:1.15rem;',
    'margin-right:.5rem;font-size:.66rem;padding:.1rem .28rem;',
    'background:var(--accent);color:var(--vx-on-accent);',
    'clip-path:polygon(0 0,100% 0,100% calc(100% - 4px),',
    'calc(100% - 4px) 100%,0 100%);}',
    '.vg-field{display:none;flex-wrap:wrap;gap:.6rem;align-items:center;',
    'margin-bottom:.9rem;}',
    '.vg-field.on{display:flex;}',
    '.vg-field label{font-size:.8rem;color:var(--vx-dim);width:100%;}',
    '.vg-input{flex:1 1 11rem;font:inherit;font-size:.9rem;',
    'letter-spacing:.22em;text-transform:lowercase;color:var(--vx-fg);',
    'background:color-mix(in srgb,var(--accent) 10%,transparent);',
    'border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);',
    'clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),',
    'calc(100% - 8px) 100%,0 100%);padding:.55rem .7rem;',
    'transition:border-color .18s ease,box-shadow .18s ease;}',
    '.vg-input:focus{outline:none;border-color:var(--accent);',
    'box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent);}',
    '.vg-input.bad{border-color:#ff4655;animation:vg-shake .32s ease;}',
    '.vg-go{font:inherit;font-size:.8rem;font-weight:700;letter-spacing:.06em;',
    'text-transform:uppercase;color:var(--vx-on-accent);background:var(--accent);',
    'border:1px solid var(--accent);cursor:pointer;padding:.6rem 1.1rem;',
    'clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),',
    'calc(100% - 8px) 100%,0 100%);',
    'transition:transform .16s ease,box-shadow .2s ease;}',
    '.vg-go:hover{transform:translateY(-1px);',
    'box-shadow:0 0 22px color-mix(in srgb,var(--accent) 50%,transparent);}',
    '.vg-go:active{transform:translateY(1px);}',
    '@keyframes vg-shake{0%,100%{transform:translateX(0);}',
    '25%{transform:translateX(-5px);}75%{transform:translateX(5px);}}',
    '.vg-hint{font-size:.72rem;color:var(--vx-dim);margin:.6rem 0 0;}',
    '.vg-foot{display:flex;justify-content:space-between;gap:.75rem;',
    'align-items:center;flex-wrap:wrap;margin-top:.4rem;}',
    '.vg-skip{font:inherit;font-size:.72rem;color:var(--vx-dim);',
    'background:none;border:0;cursor:pointer;text-decoration:underline;',
    'padding:.3rem;}',
    '.vg-skip:hover{color:var(--accent);}',
    '@media (prefers-reduced-motion:reduce){.vg-txt{animation:none;opacity:1;',
    'transform:none;}.vg-input.bad{animation:none;}}'
  ].join('');

  /* ── Gaya gerbang / landing ── */
  var CSS_LAND = [
    '.vg-backdrop.vl-gate{padding:0;}',
    '.vl-stage{position:relative;width:100%;height:100%;display:flex;',
    'flex-direction:column;align-items:center;justify-content:center;',
    'text-align:center;gap:.35rem;padding:2rem 1.25rem;}',
    '.vl-marbles{position:absolute;inset:0;width:100%;height:100%;z-index:1;}',
    '.vl-content{position:relative;z-index:2;display:flex;flex-direction:column;',
    'align-items:center;}',
    '.vl-creature{width:7rem;height:7rem;color:var(--accent);',
    'filter:drop-shadow(0 0 20px color-mix(in srgb,var(--accent) 55%,transparent));',
    'animation:vl-breathe 5s ease-in-out infinite;}',
    '.vl-creature svg{width:100%;height:100%;display:block;overflow:visible;}',
    '.vl-c-body{fill:color-mix(in srgb,var(--accent) 16%,transparent);',
    'stroke:var(--accent);stroke-width:2.4;}',
    '.vl-c-horn{fill:color-mix(in srgb,var(--accent) 42%,transparent);}',
    '.vl-c-wing{fill:color-mix(in srgb,var(--accent) 24%,transparent);',
    'stroke:var(--accent);stroke-width:2;}',
    '.vl-c-eye{fill:#ffffff;filter:drop-shadow(0 0 6px var(--accent));',
    'animation:vl-blink 6s steps(1,end) infinite;}',
    '.vl-c-mouth{fill:none;stroke:var(--accent);stroke-width:2.4;',
    'stroke-linecap:round;}',
    '@keyframes vl-breathe{0%,100%{transform:translateY(0) scale(1);}',
    '50%{transform:translateY(-7px) scale(1.04);}}',
    '@keyframes vl-blink{0%,92%,100%{opacity:1;}94%,97%{opacity:0;}}',
    '.vl-kicker{margin:.9rem 0 0;font-size:.62rem;letter-spacing:.34em;',
    'text-transform:uppercase;color:var(--vx-dim);}',
    '.vl-title{margin:.2rem 0 .1rem;font-size:clamp(1.9rem,6vw,3.3rem);',
    'letter-spacing:.05em;font-weight:800;color:var(--vx-fg);}',
    '.vl-sub{margin:0 0 1.4rem;max-width:33rem;font-size:.92rem;',
    'line-height:1.65;color:var(--vx-dim);}',
    '.vl-enter{font:inherit;font-size:.78rem;font-weight:800;',
    'letter-spacing:.18em;text-transform:uppercase;color:var(--vx-on-accent);',
    'background:var(--accent);border:0;cursor:pointer;padding:.85rem 2rem;',
    'clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),',
    'calc(100% - 10px) 100%,0 100%);',
    'box-shadow:0 0 26px color-mix(in srgb,var(--accent) 45%,transparent);',
    'transition:transform .18s ease,box-shadow .2s ease;}',
    '.vl-enter:hover{transform:translateY(-2px);',
    'box-shadow:0 0 42px color-mix(in srgb,var(--accent) 65%,transparent);}',
    '.vl-enter:focus-visible{outline:2px solid var(--vx-fg);outline-offset:3px;}',
    '.vl-enter[disabled]{opacity:.6;cursor:default;}',
    '.vl-stage.vl-const .vl-content{animation:vl-rise .7s ease forwards;}',
    '@keyframes vl-rise{to{transform:translateY(-6px);opacity:.9;}}',
    '.vl-stage::after{content:"";position:absolute;inset:0;z-index:3;',
    'pointer-events:none;opacity:0;background:radial-gradient(60% 60% at 50% 45%,',
    'rgba(255,255,255,.95) 0%,rgba(255,255,255,.18) 42%,transparent 72%);}',
    '.vl-stage.vl-const::after{animation:vl-flash 1s ease forwards;}',
    '@keyframes vl-flash{0%{opacity:0;}16%{opacity:.92;}100%{opacity:0;}}',
    '.vl-stage.vl-leaving{transition:opacity .5s ease;opacity:0;}',
    '@media (prefers-reduced-motion:reduce){.vl-creature{animation:none;}',
    '.vl-c-eye{animation:none;}.vl-stage.vl-const::after{animation:none;}}'
  ].join('');

  /* Makhluk penjaga: orb bermata dua dengan sayap dan tanduk. */
  var SVG_CREATURE =
    '<svg viewBox="0 0 140 140" focusable="false">' +
    '<path class="vl-c-wing" d="M34 62C20 56 12 64 10 76c10-2 18 2 24 10z"/>' +
    '<path class="vl-c-wing" d="M106 62c14-6 22 2 24 14-10-2-18 2-24 10z"/>' +
    '<path class="vl-c-horn" d="M56 30C50 20 41 15 31 14c5 9 6 16 4 25z"/>' +
    '<path class="vl-c-horn" d="M84 30c6-10 15-15 25-16-5 9-6 16-4 25z"/>' +
    '<path class="vl-c-body" d="M70 24c-16 0-27 12-27 28v30c0 16 12 29 27 29s27-13 27-29V52c0-16-11-28-27-28z"/>' +
    '<circle class="vl-c-eye" cx="60" cy="60" r="5"/>' +
    '<circle class="vl-c-eye" cx="80" cy="60" r="5"/>' +
    '<path class="vl-c-mouth" d="M62 80c5 5 11 5 16 0"/>' +
    '</svg>';

  /* ── State modul ── */
  var backdrop = null;
  var activeKey = null;

  /* ══════════════════════════════ MARBEL ══════════════════════════════
     Titik cahaya interaktif yang menyatu jadi rasi bintang saat gerbang
     dibuka. Digambar di canvas sendiri supaya bisa menarik garis antar
     titik dan terasa "hidup". */
  function initMarbles(canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, raf = 0, alive = true;
    var pointer = { x: -9999, y: -9999, on: false };

    /* Posisi rasi: batang panah turun ke tengah + sebaran bintang. */
    var targets = [
      [0.50, 0.10], [0.50, 0.24], [0.50, 0.38], [0.50, 0.52], [0.50, 0.66],
      [0.38, 0.52], [0.62, 0.52],
      [0.30, 0.20], [0.70, 0.20], [0.22, 0.34], [0.78, 0.34],
      [0.28, 0.66], [0.72, 0.66], [0.42, 0.78], [0.58, 0.78], [0.50, 0.86]
    ];
    /* Garis yang menyala: batang + tulang panah, lalu bintang ke hub. */
    var links = [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6]
    ];
    for (var t = 7; t < targets.length; t++) links.push([t, 3]);

    var pts = targets.map(function (tg, i) {
      var a = (i / targets.length) * Math.PI * 2;
      return {
        nx: tg[0], ny: tg[1],
        x: 0, y: 0, sx: 0, sy: 0,
        vx: Math.cos(a) * 0.15, vy: Math.sin(a) * 0.15,
        r: 2 + (i % 3) * 0.7,
        ph: Math.random() * Math.PI * 2
      };
    });

    var gather = 0, gatherAt = 0, gatherDur = 0, done = null, gathered = false;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function idlePos(p, time) {
      var fx = Math.sin(time * 0.0006 + p.ph) * 14;
      var fy = Math.cos(time * 0.0008 + p.ph) * 14;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -40 || p.x > W + 40) p.vx *= -1;
      if (p.y < -40 || p.y > H + 40) p.vy *= -1;
      p.x += fx * 0.0005;
      p.y += fy * 0.0005;
    }

    function seed() {
      for (var i = 0; i < pts.length; i++) {
        pts[i].x = pts[i].nx * W;
        pts[i].y = pts[i].ny * H;
        pts[i].sx = pts[i].x;
        pts[i].sy = pts[i].y;
      }
    }

    function accent() {
      var s = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent');
      return (s && s.trim()) || '#2ee6d6';
    }

    function frame(time) {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      var col = accent();
      var t = gatherDur ? Math.min((time - gatherAt) / gatherDur, 1) : 1;
      var ease = 1 - Math.pow(1 - t, 3);

      if (gather) {
        for (var g = 0; g < pts.length; g++) {
          var tp = pts[g];
          tp.x = tp.sx + (tp.nx * W - tp.sx) * ease;
          tp.y = tp.sy + (tp.ny * H - tp.sy) * ease;
        }
      } else {
        for (var i = 0; i < pts.length; i++) {
          var p = pts[i];
          idlePos(p, time);
          if (pointer.on) {
            var dx = pointer.x - p.x, dy = pointer.y - p.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < 170 && d > 0.1) {
              p.x += (dx / d) * (1 - d / 170) * 1.6;
              p.y += (dy / d) * (1 - d / 170) * 1.6;
            }
          }
        }
      }

      /* Garis redup antar-titik saat santai. */
      if (!gather) {
        ctx.lineWidth = 1;
        for (var a = 0; a < pts.length; a++) {
          for (var b = a + 1; b < pts.length; b++) {
            var ddx = pts[a].x - pts[b].x, ddy = pts[a].y - pts[b].y;
            var dd = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dd < 135) {
              var al = (1 - dd / 135) * 0.22;
              ctx.strokeStyle = hexA(col, al);
              ctx.beginPath();
              ctx.moveTo(pts[a].x, pts[a].y);
              ctx.lineTo(pts[b].x, pts[b].y);
              ctx.stroke();
            }
          }
        }
      }

      /* Garis rasi menyala + hub ke pertanyaan. */
      ctx.lineCap = 'round';
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      for (var l = 0; l < links.length; l++) {
        var A = pts[links[l][0]], B = pts[links[l][1]];
        ctx.strokeStyle = hexA(col, gather ? 0.9 * ease : 0.28);
        ctx.lineWidth = gather ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }

      /* Titik cahaya. */
      for (var k = 0; k < pts.length; k++) {
        var q = pts[k];
        ctx.beginPath();
        ctx.fillStyle = gather ? '#ffffff' : col;
        ctx.arc(q.x, q.y, q.r + (gather ? 1.4 * ease : 0), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (gather && t >= 1 && !gathered) {
        gathered = true;
        if (done) done();
      }
      raf = requestAnimationFrame(frame);
    }

    /* #rrggbb / rgb() -> rgba dengan alpha. */
    function hexA(c, a) {
      c = (c || '').trim();
      if (c.charAt(0) === '#') {
        if (c.length === 4) {
          c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
        }
        var n = parseInt(c.slice(1), 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) +
          ',' + (n & 255) + ',' + a + ')';
      }
      return 'rgba(46,230,214,' + a + ')';
    }

    function onMove(e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.on = true;
    }
    function onLeave() { pointer.on = false; }

    resize();
    seed();
    window.addEventListener('resize', function () { resize(); seed(); });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerout', onLeave);
    raf = requestAnimationFrame(frame);

    return {
      constellate: function (dur, cb) {
        gather = 1;
        gatherDur = dur || 0;
        gatherAt = performance.now();
        done = cb;
        if (!dur) {
          gathered = true;
          if (cb) window.setTimeout(cb, 0);
        }
      },
      destroy: function () {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerout', onLeave);
      }
    };
  }

  /* ══════════════════════════════ LANDING ══════════════════════════════ */
  function renderLanding(host) {
    var stage = el('div', 'vl-stage');
    var canvas = document.createElement('canvas');
    canvas.className = 'vl-marbles';
    canvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas);

    var content = el('div', 'vl-content');
    var creature = el('div', 'vl-creature');
    creature.setAttribute('aria-hidden', 'true');
    creature.innerHTML = SVG_CREATURE;
    content.appendChild(creature);
    content.appendChild(el('p', 'vl-kicker', 'Local Server // Gerbang'));
    content.appendChild(el('h1', 'vl-title', 'Join to Clarity'));
    content.appendChild(el('p', 'vl-sub',
      'Sebuah ruang sunyi tempat berkas berserakan menjadi terang. ' +
      'Sentuh cahaya yang berhamburan, lalu buka gerbangnya.'));
    var enter = el('button', 'vl-enter', 'Buka Gerbang');
    enter.type = 'button';
    enter.id = 'vl-enter';
    content.appendChild(enter);
    stage.appendChild(content);
    host.appendChild(stage);

    var marbles = initMarbles(canvas);

    function go() {
      if (stage.dataset.phase === 'go') return;
      stage.dataset.phase = 'go';
      enter.disabled = true;
      stage.classList.add('vl-const');
      marbles.constellate(reduceMotion ? 0 : 950, function () {
        stage.classList.add('vl-leaving');
        window.setTimeout(function () {
          marbles.destroy();
          if (stage.parentNode) stage.parentNode.removeChild(stage);
          renderConversation(host);
        }, reduceMotion ? 0 : 520);
      });
    }

    enter.addEventListener('click', go);
    if (!reduceMotion) window.setTimeout(function () { enter.focus(); }, 100);
  }

  /* ══════════════════════════════ PERCAKAPAN ══════════════════════════════ */
  function renderConversation(host) {
    var box = el('div', 'vg-box');
    box.setAttribute('role', 'document');

    var title = el('h2', 'vg-q', 'COFDE');
    title.id = 'vg-title';
    box.appendChild(title);

    var log = el('ul', 'vg-log');
    log.setAttribute('aria-live', 'polite');
    box.appendChild(log);

    /* Pertanyaan + tiga pilihan. */
    var askWrap = el('div');
    askWrap.appendChild(el('p', 'vg-q', 'Ada perlu apa Anda masuk ke sini?'));
    var opts = el('div', 'vg-opts');
    askWrap.appendChild(opts);
    box.appendChild(askWrap);

    /* Kolom kode. */
    var field = el('div', 'vg-field');
    var flabel = el('label', null, 'Ketik kode akses di bawah dengan tangan sendiri:');
    flabel.setAttribute('for', 'vg-code');
    var input = el('input', 'vg-input');
    input.id = 'vg-code';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-describedby', 'vg-hint');
    input.placeholder = CODE;
    var go = el('button', 'vg-go', 'Masuk');
    go.type = 'button';
    field.appendChild(flabel);
    field.appendChild(input);
    field.appendChild(go);
    box.appendChild(field);

    var hint = el('p', 'vg-hint', 'Lima huruf: c-o-f-d-e. Paste otomatis ditolak.');
    hint.id = 'vg-hint';
    box.appendChild(hint);

    var foot = el('div', 'vg-foot');
    var skip = el('button', 'vg-skip', 'Lewati, buka langsung');
    skip.type = 'button';
    foot.appendChild(skip);
    box.appendChild(foot);

    host.appendChild(box);

    var picked = null;

    function say(who, text) {
      var li = el('li', 'vg-line');
      li.appendChild(el('span', 'vg-who ' + who, who === 'srv' ? 'Server' : 'Anda'));
      var t = el('span', 'vg-txt');
      t.textContent = text;
      li.appendChild(t);
      log.appendChild(li);
      return li;
    }

    function sayCode(who, before, code) {
      var li = el('li', 'vg-line');
      li.appendChild(el('span', 'vg-who ' + who, who === 'srv' ? 'Server' : 'Anda'));
      var t = el('span', 'vg-txt');
      t.appendChild(document.createTextNode(before));
      t.appendChild(el('code', null, code));
      li.appendChild(t);
      log.appendChild(li);
      return li;
    }

    say('srv', 'Halo. Ini COFDE, ruang kerja lokal untuk data dan berkas.');
    say('srv', 'Sebelum masuk: ada perlu apa Anda masuk ke sini?');

    CHOICES.forEach(function (c, i) {
      var b = el('button', 'vg-opt');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.dataset.id = c.id;
      b.appendChild(el('span', 'vg-key', String(i + 1)));
      b.appendChild(el('span', 'vg-label', c.label));
      b.addEventListener('click', function () { choose(c); });
      opts.appendChild(b);
    });

    function choose(c) {
      if (picked) return;
      picked = c;
      opts.querySelectorAll('.vg-opt').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.id === c.id));
      });
      say('cli', c.label);
      say('srv', c.reply);
      var line = sayCode('srv', 'Kode akses untuk masuk: ', CODE);
      field.classList.add('on');
      if (!reduceMotion && typeof input.animate === 'function') {
        input.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }],
          { duration: 260 }
        );
      }
      window.setTimeout(function () { input.focus(); }, reduceMotion ? 0 : 120);
      if (line && line.scrollIntoView) {
        line.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }

    function submit() {
      var v = input.value.trim().toLowerCase().replace(/\s+/g, '');
      if (v !== CODE) {
        input.classList.remove('bad');
        void input.offsetWidth;
        input.classList.add('bad');
        input.select();
        hint.textContent = 'Kode belum tepat. Coba lagi: c-o-f-d-e.';
        return;
      }
      markDone();
      say('srv', 'Kode diterima. Silakan masuk.');
      backdrop.style.transition = 'opacity .3s ease';
      backdrop.style.opacity = '0';
      window.setTimeout(close, reduceMotion ? 0 : 300);
    }

    function onKey(e) {
      var t = e.target;

      if (e.key === 'Escape') {
        e.preventDefault();
        skipGate();
        return;
      }
      if (t && t.classList && t.classList.contains('vg-opt') &&
          (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) {
        return;
      }
      if (e.key === 'Enter') {
        if (field.classList.contains('on')) {
          e.preventDefault();
          submit();
        }
        return;
      }
      if (!picked && !field.classList.contains('on') &&
          (e.key === '1' || e.key === '2' || e.key === '3')) {
        var i = Number(e.key) - 1;
        if (CHOICES[i]) {
          e.preventDefault();
          choose(CHOICES[i]);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        hint.textContent = 'Paste ditolak. Ketik sendiri ya.';
      }
    }
    activeKey = onKey;

    function skipGate() {
      markDone();
      close();
    }

    go.addEventListener('click', submit);
    input.addEventListener('input', function () {
      input.classList.remove('bad');
      if (hint.textContent.indexOf('belum tepat') >= 0 ||
          hint.textContent.indexOf('ditolak') >= 0) {
        hint.textContent = 'Lima huruf: c-o-f-d-e. Paste otomatis ditolak.';
      }
    });
    skip.addEventListener('click', skipGate);
    document.addEventListener('keydown', onKey, true);

    var first = opts.querySelector('.vg-opt');
    if (first && !reduceMotion) window.setTimeout(function () { first.focus(); }, 60);
  }

  /* ══════════════════════════════ BUKA / TUTUP ══════════════════════════════ */
  function open() {
    if (!document.body) return;
    ensureStyle('vg-style', CSS_CONV);
    ensureStyle('vl-style', CSS_LAND);

    backdrop = el('div', 'vg-backdrop vl-gate');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Gerbang masuk COFDE');
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    renderLanding(backdrop);
  }

  function close() {
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    backdrop = null;
    if (document.body) document.body.style.removeProperty('overflow');
    if (activeKey) {
      document.removeEventListener('keydown', activeKey, true);
      activeKey = null;
    }
    if (window.COFDE && COFDE.gate && typeof COFDE.gate.onEnter === 'function') {
      try { COFDE.gate.onEnter(); } catch (e) { /* abaikan */ }
    }
  }

  /* ── Public API ── */
  window.COFDE = window.COFDE || {};
  window.COFDE_GATE = {
    show: function (force) {
      if (force) reset();
      if (isDone()) return false;
      if (!document.body) return false;
      if (backdrop) return true;
      open();
      return true;
    },
    reset: reset,
    isDone: isDone,
    CODE: CODE
  };
  window.COFDE.gate = window.COFDE_GATE;

  /* ── Auto tampil saat halaman dibuka ── */
  function boot() {
    /* Halaman stub yang redirect ke tools.html tidak perlu gate. */
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon && /tools\.html/i.test(canon.getAttribute('href') || '')) return;
    if (isDone()) return;
    if (document.body) open();
    else document.addEventListener('DOMContentLoaded', open, { once: true });
  }

  boot();
})();
