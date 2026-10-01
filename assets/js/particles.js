(function () {
  /* ══════════════════════════════════════════
     Glass Particles Canvas + Theme System
     Small drifting glass shards + soft bokeh
     ══════════════════════════════════════════ */

  /* ── Theme Registry ── */
  /* Dua tema saja:
     lightholy = terang, pecahan kaca
     abyss     = gelap, kilat + hujan deras diagonal kanan ke kiri */
  var THEMES = {
    lightholy: {
      label: 'Lightholy',
      tint: ['#ffd9a0', '#ffc46b', '#f0b45c', '#fff0cd', '#ffe3b3']
    },
    abyss: {
      label: 'Abyss',
      tint: ['#2ee6d6', '#3fd0f0', '#5aa9ff', '#9df5ea', '#1fb6c9']
    }
  };

  var DEFAULT_THEME = 'abyss';
  var STORAGE_KEY = 'fire-theme';
  /* Nilai lama dipetakan ke dua tema yang sah supaya tidak blank. */
  var LEGACY = {
    light: 'lightholy', lightholy: 'lightholy', green: 'lightholy',
    dark: 'abyss', darkside: 'abyss', abyss: 'abyss', purple: 'abyss', system: 'abyss'
  };

  function readStored() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (!raw) return DEFAULT_THEME;
    if (THEMES[raw]) return raw;
    if (LEGACY[raw]) return LEGACY[raw];
    return DEFAULT_THEME;
  }

  var currentTheme = readStored();

  /* Kaca hanya untuk tema terang. Tema gelap (abyss) hanya kilat +
     hujan deras, jadi shard/mote/fleck tidak digambar sama sekali. */
  function glassOn() { return currentTheme !== 'abyss'; }

  /* ── Canvas Setup ── */
  var canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');
  var W, H;

  var shards = [];
  var motes = [];
  var flecks = [];
  var embers = [];
  var MAX_SHARDS = 80;
  var MAX_MOTES = 9;
  var MAX_FLECKS = 44;
  var MAX_EMBERS = 170;
  var torch = { x: 0, y: 0, px: 0, py: 0, has: false, on: false };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Resize ── */
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* ── Factories ── */
  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function spawnShard() {
    var size = 3 + Math.random() * 8;
    return {
      x: Math.random() * W,
      y: H + Math.random() * 30,
      w: size,
      h: size * (0.5 + Math.random() * 0.55),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.007,
      vy: -(0.1 + Math.random() * 0.42),
      vx: (Math.random() - 0.5) * 0.16,
      alpha: 0.12 + Math.random() * 0.34,
      tint: pick(THEMES[currentTheme].tint),
      wob: Math.random() * Math.PI * 2,
      wobSpeed: 0.008 + Math.random() * 0.02,
      wobAmp: 0.14 + Math.random() * 0.34
    };
  }

  function spawnMote() {
    return {
      x: Math.random() * W,
      y: H + Math.random() * 60,
      r: 26 + Math.random() * 62,
      vx: (Math.random() - 0.5) * 0.09,
      vy: -(0.05 + Math.random() * 0.16),
      alpha: 0.05 + Math.random() * 0.1,
      tint: pick(THEMES[currentTheme].tint)
    };
  }

  /* ── Cursor flecks: glass shards shed by the pointer ── */
  function spawnFleck(x, y) {
    var size = 3 + Math.random() * 9;
    var ang = Math.random() * Math.PI * 2;
    var push = 0.5 + Math.random() * 2.4;
    return {
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      w: size,
      h: size * (0.42 + Math.random() * 0.62),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.06,
      vx: Math.cos(ang) * push,
      vy: Math.sin(ang) * push - 0.5,
      gravity: 0.055 + Math.random() * 0.05,
      life: 1,
      decay: 0.014 + Math.random() * 0.02,
      tint: pick(THEMES[currentTheme].tint)
    };
  }

  function trackPointer(e) {
    if (reduceMotion) return;

    var x = e.clientX;
    var y = e.clientY;
    if (x < -20 || y < -20 || x > W + 20 || y > H + 20) return;

    /* Tema gelap: obor api (kobaran di kursor + ekor ember). */
    if (!glassOn()) {
      torchTrail(x, y);
      return;
    }

    /* Tema terang: serpihan kaca yang tertinggal dari kursor. */
    if (flecks.length >= MAX_FLECKS) return;

    flecks.push(spawnFleck(x, y));

    if (flecks.length < MAX_FLECKS && Math.random() < 0.4) {
      flecks.push(spawnFleck(x, y));
    }
  }

  /* ── Draw: soft bokeh underlay ── */
  function drawMotes() {
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      ctx.save();
      ctx.globalAlpha = m.alpha;
      ctx.shadowBlur = 46;
      ctx.shadowColor = m.tint;
      ctx.fillStyle = m.tint;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ── Paint one glass shard ── */
  function paintShard(p, alpha) {
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = p.tint;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

    ctx.globalAlpha = Math.min(1, alpha + 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);

    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(-p.w / 2, -p.h / 2);
    ctx.lineTo(-p.w / 2 + p.w * 0.55, -p.h / 2);
    ctx.lineTo(-p.w / 2, -p.h / 2 + p.h * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /* ── Percikan api (ember) ──
     Dipakai saat tombol refresh paksa ditekan. */
  var EMBER = ['#ff8a3d', '#ffc46b', '#ff4655', '#ffe3b3', '#ff7a2f'];
  var sparks = [];
  var MAX_SPARKS = 180;

  function spawnSpark(x, y) {
    var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    var sp = 1.4 + Math.random() * 3.6;
    return {
      x: x + (Math.random() - 0.5) * 18,
      y: y + (Math.random() - 0.5) * 18,
      w: 1.4 + Math.random() * 2.6,
      h: 2 + Math.random() * 4.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.22,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      gravity: 0.1 + Math.random() * 0.09,
      life: 1,
      decay: 0.012 + Math.random() * 0.014,
      tint: pick(EMBER)
    };
  }

  function spark(x, y, count) {
    if (reduceMotion) return;
    var n = Math.min(count || 42, MAX_SPARKS);
    for (var i = 0; i < n; i++) {
      if (sparks.length >= MAX_SPARKS) sparks.shift();
      sparks.push(spawnSpark(x, y));
    }
  }

  function drawSparks() {
    for (var i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      if (s.life <= 0.01) continue;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = s.life;
      ctx.shadowBlur = 16;
      ctx.shadowColor = s.tint;
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.moveTo(0, -s.h / 2);
      ctx.lineTo(s.w / 2, s.h / 2);
      ctx.lineTo(-s.w / 2, s.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /* ── Draw: ambient glass shards ── */
  function drawShards() {
    for (var i = 0; i < shards.length; i++) paintShard(shards[i], shards[i].alpha);
  }

  /* ── Draw: cursor flecks ── */
  function drawFlecks() {
    for (var i = 0; i < flecks.length; i++) {
      var f = flecks[i];
      paintShard(f, f.life * 0.85);
    }
  }

  /* ── Obor kursor (tema gelap): kobaran api + ekor ember ── */
  function spawnEmber(x, y, dx, dy) {
    var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    var sp = 0.5 + Math.random() * 1.8;
    return {
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(ang) * sp + dx * 0.08,
      vy: Math.sin(ang) * sp + dy * 0.08,
      r: 1.6 + Math.random() * 3.4,
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      tint: pick(EMBER)
    };
  }

  function torchTrail(x, y) {
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
    if (embers.length > MAX_EMBERS) embers.splice(0, embers.length - MAX_EMBERS);
    torch.px = x;
    torch.py = y;
    torch.has = true;
    torch.on = true;
  }

  function drawEmbers() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    /* Ekor api: ember yang naik lalu memudar. */
    for (var i = 0; i < embers.length; i++) {
      var em = embers[i];
      if (em.life <= 0.01) continue;
      var R = Math.max(0.5, em.r * 3.4);
      var g = ctx.createRadialGradient(em.x, em.y, 0, em.x, em.y, R);
      g.addColorStop(0, 'rgba(255,246,214,' + (0.85 * em.life).toFixed(3) + ')');
      g.addColorStop(0.35, 'rgba(255,180,90,' + (0.5 * em.life).toFixed(3) + ')');
      g.addColorStop(0.72, 'rgba(255,86,52,' + (0.2 * em.life).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(em.x, em.y, R, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Kobaran api di ujung kursor. */
    if (torch.on) {
      var f = 0.9 + Math.sin(performance.now() * 0.02) * 0.1;
      var Rh = 22 * f;
      var gh = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, Rh);
      gh.addColorStop(0, 'rgba(255,252,235,0.92)');
      gh.addColorStop(0.32, 'rgba(255,206,120,0.66)');
      gh.addColorStop(0.64, 'rgba(255,116,52,0.28)');
      gh.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = gh;
      ctx.beginPath();
      ctx.arc(torch.x, torch.y, Rh, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── Animation Loop ── */
  function loop() {
    ctx.clearRect(0, 0, W, H);

    if (glassOn()) {
      while (shards.length < MAX_SHARDS) shards.push(spawnShard());
      while (motes.length < MAX_MOTES) motes.push(spawnMote());

      for (var i = shards.length - 1; i >= 0; i--) {
        var p = shards[i];
        p.wob += p.wobSpeed;
        p.rot += p.vr;
        p.x += p.vx + Math.sin(p.wob) * p.wobAmp;
        p.y += p.vy;
        if (p.y < -30) shards.splice(i, 1);
      }

      for (var j = motes.length - 1; j >= 0; j--) {
        var m = motes[j];
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -m.r * 2) motes.splice(j, 1);
      }

      for (var k = flecks.length - 1; k >= 0; k--) {
        var f = flecks[k];
        f.vy += f.gravity;
        f.vx *= 0.985;
        f.rot += f.vr;
        f.x += f.vx;
        f.y += f.vy;
        f.life -= f.decay;
        if (f.life <= 0 || f.y > H + 40) flecks.splice(k, 1);
      }
    } else if (shards.length || motes.length || flecks.length) {
      /* Tema gelap: buang sisa pecahan kaca seketika. */
      shards.length = 0;
      motes.length = 0;
      flecks.length = 0;
    }

    for (var eI = embers.length - 1; eI >= 0; eI--) {
      var em = embers[eI];
      em.vy -= 0.012;          /* api selalu naik */
      em.vx *= 0.975;
      em.x += em.vx;
      em.y += em.vy;
      em.r *= 0.986;
      em.life -= em.decay;
      if (em.life <= 0) embers.splice(eI, 1);
    }

    for (var s2 = sparks.length - 1; s2 >= 0; s2--) {
      var sp = sparks[s2];
      sp.vy += sp.gravity;
      sp.vx *= 0.975;
      sp.rot += sp.vr;
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= sp.decay;
      if (sp.life <= 0 || sp.y > H + 40) sparks.splice(s2, 1);
    }

    if (glassOn()) {
      drawMotes();
      drawShards();
      drawFlecks();
    } else {
      drawEmbers();
    }
    drawSparks();

    requestAnimationFrame(loop);
  }

  /* ── Theme Control ── */
  function paint(theme) {
    if (!THEMES[theme]) return;
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    /* Respawn with new tints immediately */
    shards.length = 0;
    motes.length = 0;
    flecks.length = 0;
    embers.length = 0;
    torch.has = false;
    torch.on = false;
  }

  function setTheme(theme) {
    if (!THEMES[theme]) return;
    paint(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
  }

  /* ── Init ── */
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', trackPointer, { passive: true });

  /* Putuskan ekor obor saat kursor keluar jendela. */
  document.addEventListener('mouseleave', function () {
    torch.has = false;
    torch.on = false;
  });
  window.addEventListener('blur', function () {
    torch.has = false;
    torch.on = false;
  });
  document.documentElement.setAttribute('data-theme', currentTheme);
  loop();

  /* ── Public API (consumed by drawer.js) ── */
  window.COFDE_THEME = {
    themes: THEMES,
    get: function () { return currentTheme; },
    set: setTheme,
    paint: paint
  };

  /* Percikan api untuk efek tombol refresh. */
  window.COFDE_FX = {
    spark: spark
  };
})();
