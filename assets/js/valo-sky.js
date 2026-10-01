/* ══════════════════════════════════════════════════════════
   COFDE — valo-sky.js
   Latar belakang atmosfer untuk tema Abyss (gelap):
     • hujan deras miring dari kanan atas ke kiri bawah
     • kilat menyambar sesekali, ikut menerangi halaman
     • genangan air / riak hujan di bawah

   Tema Lightholy (terang) tidak memakai modul ini sama sekali;
   motifnya pecahan kaca yang ditangani particles.js + valo.css.

   Parents:
     - valo-sky.js  (modul ini)
     Particles.js tetap hidup dan menggambar kaca/bokeh.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.COFDE_SKY) return;

  var DARK = 'abyss';

  var canvas = document.createElement('canvas');
  canvas.className = 'valo-sky';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;z-index:0;' +
    'pointer-events:none;display:none;';
  document.body.prepend(canvas);

  var ctx = canvas.getContext('2d');

  /* Lapisan obor: di atas konten supaya ekor api kursor terlihat jelas. */
  var torchCanvas = document.createElement('canvas');
  torchCanvas.className = 'valo-torch';
  torchCanvas.setAttribute('aria-hidden', 'true');
  torchCanvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;z-index:5;' +
    'pointer-events:none;display:none;';
  document.body.appendChild(torchCanvas);
  var tctx = torchCanvas.getContext('2d');

  var W = 0;
  var H = 0;
  var dpr = 1;

  var drops = [];
  var ripples = [];
  var bolts = [];

  /* Obor kursor: kobaran api + ekor yang mengikuti gerak. */
  var EMBER_COLORS = ['#ffe3b3', '#ffd166', '#ff8a3c', '#ff5a3c', '#ff4655'];
  var embers = [];
  var MAX_EMBERS = 170;
  var torch = { x: 0, y: 0, px: 0, py: 0, has: false, active: false };

  /* Hujan deras: banyak tetes, jatuh cepat, arah miring. */
  var DROP_COUNT = 460;
  var RAIN_TILT = 0.42;          /* radians; positivo = ke kanan bawah, minus = ke kiri bawah */
  var RAIN_SPEED_MIN = 900;
  var RAIN_SPEED_MAX = 1900;

  /* Kilat: jarang tapi terang. */
  var BOLT_MIN_GAP = 5200;
  var BOLT_MAX_GAP = 13000;
  var FLASH_MS = 260;

  var reduceMotion = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var active = false;
  var running = false;
  var rafId = 0;
  var lastFrame = 0;
  var nextBoltAt = 0;
  var flashUntil = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    torchCanvas.width = Math.max(1, Math.round(W * dpr));
    torchCanvas.height = Math.max(1, Math.round(H * dpr));
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedDrops();
  }

  /* Tetes dimulai di garis tepi kanan atas lalu menyebar ke seluruh
     layar, supaya yang pertama terlihat benar-benar dari arah itu. */
  function seedDrops() {
    drops.length = 0;
    ripples.length = 0;
    var count = reduceMotion ? Math.round(DROP_COUNT * 0.3) : DROP_COUNT;
    for (var i = 0; i < count; i++) {
      var bias = Math.random() < 0.65;
      drops.push({
        x: bias ? rand(W * 0.55, W * 1.25) : rand(-W * 0.15, W * 1.25),
        y: bias ? rand(-H * 0.35, H) : rand(-H, H),
        v: rand(RAIN_SPEED_MIN, RAIN_SPEED_MAX),
        len: rand(14, 34),
        w: rand(0.8, 1.9),
        a: rand(0.16, 0.5),
        depth: rand(0.35, 1)
      });
    }
  }

  /* Vekor gerak: dari kanan atas ke kiri bawah. */
  function stepDrop(d, dt) {
    var dx = Math.sin(RAIN_TILT) * d.v * dt;
    var dy = Math.cos(RAIN_TILT) * d.v * dt;
    d.x -= dx;
    d.y += dy;

    if (d.y > H + 40 || d.x < -60) {
      /* daur ulang dari kanan atas */
      d.x = rand(W * 0.7, W * 1.3);
      d.y = rand(-H * 0.5, -20);
      d.v = rand(RAIN_SPEED_MIN, RAIN_SPEED_MAX);
      d.len = rand(14, 34);
      d.w = rand(0.8, 1.9);
      d.a = rand(0.16, 0.5);
      d.depth = rand(0.35, 1);
    }
  }

  function drawRain(alpha) {
    ctx.lineCap = 'round';
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      var dx = Math.sin(RAIN_TILT);
      var dy = Math.cos(RAIN_TILT);
      ctx.strokeStyle = 'rgba(150, 220, 255, ' + (d.a * alpha).toFixed(3) + ')';
      ctx.lineWidth = d.w * d.depth;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - dx * d.len * d.depth, d.y - dy * d.len * d.depth);
      ctx.stroke();
    }
  }

  function spawnRipple(x, y) {
    if (ripples.length > 46) return;
    ripples.push({ x: x, y: y, r: 2, life: 1 });
  }

  function drawRipples() {
    for (var i = 0; i < ripples.length; i++) {
      var p = ripples[i];
      p.r += 34 * (1 / 60);
      p.life -= 0.026;
      if (p.life <= 0) {
        ripples.splice(i, 1);
        i--;
        continue;
      }
      ctx.strokeStyle = 'rgba(120, 214, 230, ' + (0.3 * p.life).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* Kilat: zigzag dari atas ke bawah, lalu memudar. */
  function spawnBolt() {
    var startX = rand(W * 0.35, W * 0.98);
    var points = [{ x: startX, y: -20 }];
    var y = -20;
    var x = startX;
    var segs = 7 + Math.floor(Math.random() * 5);
    for (var i = 0; i < segs; i++) {
      y += H / (segs + 1);
      x += rand(-70, 70);
      points.push({ x: x, y: y });
    }
    bolts.push({ points: points, life: 1 });
    flashUntil = performance.now() + FLASH_MS;
  }

  function drawBolts() {
    for (var i = 0; i < bolts.length; i++) {
      var b = bolts[i];
      b.life -= 0.018;
      if (b.life <= 0) {
        bolts.splice(i, 1);
        i--;
        continue;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      /* Halo lebar redup */
      ctx.strokeStyle = 'rgba(120, 214, 255, ' + (0.22 * b.life).toFixed(3) + ')';
      ctx.lineWidth = 7;
      strokePath(b.points);

      /* Inti terang */
      ctx.strokeStyle = 'rgba(235, 250, 255, ' + (0.9 * b.life).toFixed(3) + ')';
      ctx.lineWidth = 1.8;
      strokePath(b.points);

      ctx.restore();
    }
  }

  function strokePath(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  function drawFlash() {
    if (performance.now() > flashUntil) return;
    /* Turunkan halaman sedikit saat menyambar. */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(W, 0, 0, H);
    g.addColorStop(0, 'rgba(160, 230, 255, 0.20)');
    g.addColorStop(0.45, 'rgba(90, 160, 255, 0.10)');
    g.addColorStop(1, 'rgba(160, 230, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ── Obor kursor ── */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function spawnEmber(x, y, dx, dy) {
    var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
    var sp = 0.5 + Math.random() * 1.7;
    return {
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(ang) * sp + dx * 0.08,
      vy: Math.sin(ang) * sp + dy * 0.08,
      r: 1.6 + Math.random() * 3.6,
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      tint: pick(EMBER_COLORS)
    };
  }

  function trail(x, y) {
    if (torch.has) {
      var dx = x - torch.px;
      var dy = y - torch.py;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.min(9, Math.max(1, Math.round(dist / 7)));
      for (var i = 1; i <= steps; i++) {
        var t = i / steps;
        embers.push(spawnEmber(torch.px + dx * t, torch.py + dy * t, dx, dy));
      }
    } else {
      embers.push(spawnEmber(x, y, 0, 0));
    }
    torch.px = x;
    torch.py = y;
    torch.has = true;
    if (embers.length > MAX_EMBERS) embers.splice(0, embers.length - MAX_EMBERS);
  }

  function onPointerMove(e) {
    if (reduceMotion || !active) return;
    torch.active = true;
    torch.x = e.clientX;
    torch.y = e.clientY;
    trail(e.clientX, e.clientY);
  }

  function onPointerGone() {
    torch.active = false;
    torch.has = false;
  }

  function drawTorch() {
    tctx.clearRect(0, 0, W, H);
    if (!active) return;

    tctx.save();
    tctx.globalCompositeOperation = 'lighter';

    /* Ekor api: titik-titik api yang naik lalu memudar. */
    for (var i = embers.length - 1; i >= 0; i--) {
      var em = embers[i];
      em.vy -= 0.014;
      em.vx *= 0.972;
      em.x += em.vx;
      em.y += em.vy;
      em.r *= 0.986;
      em.life -= em.decay;
      if (em.life <= 0) { embers.splice(i, 1); continue; }
      var R = Math.max(0.5, em.r * 3.4);
      var g = tctx.createRadialGradient(em.x, em.y, 0, em.x, em.y, R);
      g.addColorStop(0, 'rgba(255, 246, 214, ' + (0.85 * em.life).toFixed(3) + ')');
      g.addColorStop(0.35, 'rgba(255, 180, 90, ' + (0.5 * em.life).toFixed(3) + ')');
      g.addColorStop(0.72, 'rgba(255, 86, 52, ' + (0.2 * em.life).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255, 60, 60, 0)');
      tctx.fillStyle = g;
      tctx.beginPath();
      tctx.arc(em.x, em.y, R, 0, Math.PI * 2);
      tctx.fill();
    }

    /* Kepala obor: lidah api yang berkedip di ujung kursor. */
    if (torch.active) {
      var f = 0.9 + Math.sin(performance.now() * 0.02) * 0.1 + Math.random() * 0.08;
      var R2 = 24 * f;
      var g2 = tctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, R2);
      g2.addColorStop(0, 'rgba(255, 252, 235, 0.95)');
      g2.addColorStop(0.3, 'rgba(255, 206, 120, 0.72)');
      g2.addColorStop(0.62, 'rgba(255, 116, 52, 0.32)');
      g2.addColorStop(1, 'rgba(255, 60, 60, 0)');
      tctx.fillStyle = g2;
      tctx.beginPath();
      tctx.ellipse(torch.x, torch.y, R2 * 0.82, R2 * 1.22, 0, 0, Math.PI * 2);
      tctx.fill();
    }
    tctx.restore();
  }

  function frame(ts) {
    if (!running) return;
    var dt = lastFrame ? Math.min((ts - lastFrame) / 1000, 0.05) : 0.016;
    lastFrame = ts;

    /* Majukan setiap tetes dulu; tanpa ini hujan hanya tergambar diam. */
    for (var di = 0; di < drops.length; di++) stepDrop(drops[di], dt);

    ctx.clearRect(0, 0, W, H);
    drawRain(1);
    drawRipples();
    drawBolts();
    drawFlash();
    drawTorch();

    /* Sesekali tetes mengenai "lantai" dan menghasilkan riak. */
    if (!reduceMotion && Math.random() < 0.35) {
      spawnRipple(rand(0, W), H - rand(0, 60));
    }

    if (!reduceMotion && ts > nextBoltAt) {
      spawnBolt();
      nextBoltAt = ts + rand(BOLT_MIN_GAP, BOLT_MAX_GAP);
    }

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastFrame = 0;
    nextBoltAt = performance.now() + rand(BOLT_MIN_GAP, BOLT_MAX_GAP);
    canvas.style.display = 'block';
    torchCanvas.style.display = 'block';
    document.documentElement.classList.add('valo-dark-sky');
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (!running) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    ctx.clearRect(0, 0, W, H);
    tctx.clearRect(0, 0, W, H);
    embers.length = 0;
    torch.active = false;
    torch.has = false;
    canvas.style.display = 'none';
    torchCanvas.style.display = 'none';
    document.documentElement.classList.remove('valo-dark-sky');
  }

  function sync() {
    var t = document.documentElement.getAttribute('data-theme');
    active = t === DARK;
    if (active) start();
    else stop();
  }

  window.addEventListener('resize', function () {
    if (active) resize();
  });

  /* Obor kursor (tema gelap). */
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerout', onPointerGone);
  window.addEventListener('blur', onPointerGone);

  /* Ikuti pergantian tema dari settings.js / particles.js. */
  if (window.COFDE && window.COFDE.settings && window.COFDE.settings.onChange) {
    window.COFDE.settings.onChange(function (_s, patch) {
      if (patch && patch.appearance) sync();
    });
  }
  if (window.COFDE_THEME && typeof window.COFDE_THEME.set === 'function') {
    var origSet = window.COFDE_THEME.set;
    window.COFDE_THEME.set = function (theme) {
      var out = origSet(theme);
      sync();
      return out;
    };
  }

  /* Beri tahu kalau tema berubah lewat atribut langsung. */
  new MutationObserver(sync).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  resize();
  sync();

  window.COFDE_SKY = {
    start: start,
    stop: stop,
    sync: sync
  };
})();
