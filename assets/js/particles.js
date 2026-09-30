(function () {
  /* ══════════════════════════════════════════
     Glass Particles Canvas + Theme System
     Small drifting glass shards + soft bokeh
     ══════════════════════════════════════════ */

  /* ── Theme Registry ── */
  var THEMES = {
    lightholy: {
      label: 'Lightholy',
      tint: ['#ffd9a0', '#ffc46b', '#f0b45c', '#fff0cd', '#ffe3b3']
    },
    darkside: {
      label: 'Darkside',
      tint: ['#ff4655', '#ff7a86', '#e63946', '#ff9aa4', '#c92a3a']
    },
    abyss: {
      label: 'Abyss',
      tint: ['#2ee6d6', '#3fd0f0', '#5aa9ff', '#9df5ea', '#1fb6c9']
    }
  };

  var DEFAULT_THEME = 'lightholy';
  var STORAGE_KEY = 'fire-theme';
  var LEGACY = { light: 'lightholy', dark: 'darkside', green: 'lightholy', purple: 'abyss' };

  function readStored() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (!raw) return DEFAULT_THEME;
    if (THEMES[raw]) return raw;
    if (LEGACY[raw]) return LEGACY[raw];
    return DEFAULT_THEME;
  }

  var currentTheme = readStored();

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
  var MAX_SHARDS = 80;
  var MAX_MOTES = 9;
  var MAX_FLECKS = 44;
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
    if (flecks.length >= MAX_FLECKS) return;

    var x = e.clientX;
    var y = e.clientY;
    if (x < -20 || y < -20 || x > W + 20 || y > H + 20) return;

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

  /* ── Animation Loop ── */
  function loop() {
    ctx.clearRect(0, 0, W, H);

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

    drawMotes();
    drawShards();
    drawFlecks();
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
