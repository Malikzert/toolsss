(function () {
  /* ══════════════════════════════════════════
     Fire Particles Canvas + Theme System
     ══════════════════════════════════════════ */

  /* ── Canvas Setup ── */
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let W, H;

  /* ── Theme Particle Colors ── */
  const THEMES = {
    light:  { particles: ['#ff2020', '#ff4411', '#ff6622', '#ff8800', '#ffaa00'] },
    dark:   { particles: ['#1e6fff', '#3b9aff', '#5eb8ff', '#80c4ff', '#2563eb'] },
    green:  { particles: ['#0f8a3f', '#16a34a', '#22c55e', '#4ade80', '#15803d'] },
    purple: { particles: ['#7c3aed', '#8b5cf6', '#a855f7', '#c084fc', '#9333ea'] }
  };

  let currentTheme = localStorage.getItem('fire-theme') || 'light';
  const particles = [];
  const MAX = 65;

  /* ── Resize ── */
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* ── Particle Factory ── */
  function spawn() {
    var colors = THEMES[currentTheme].particles;
    return {
      x: Math.random() * W,
      y: H + Math.random() * 40,
      r: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(Math.random() * 1.6 + 0.4),
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.85 + Math.random() * 0.15,
      decay: 0.003 + Math.random() * 0.005,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.015 + Math.random() * 0.03,
      wobbleAmp: 0.3 + Math.random() * 0.4
    };
  }

  /* ── Animation Loop ── */
  function loop() {
    ctx.clearRect(0, 0, W, H);

    while (particles.length < MAX) particles.push(spawn());

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * p.wobbleAmp;
      p.y += p.vy;
      p.alpha -= p.decay;
      p.r *= 0.9997;

      if (p.alpha <= 0 || p.y < -20) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(loop);
  }

  /* ── Theme Toggle UI ── */
  function createToggle() {
    var panel = document.createElement('div');
    panel.className = 'theme-toggle';

    var info = [
      { key: 'light',  cls: 't-light',  label: 'Terang (Api Merah)' },
      { key: 'dark',   cls: 't-dark',   label: 'Gelap (Api Biru)' },
      { key: 'green',  cls: 't-green',  label: 'Hijau' },
      { key: 'purple', cls: 't-purple', label: 'Ungu' }
    ];

    info.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = item.cls;
      btn.title = item.label;
      btn.dataset.theme = item.key;
      if (item.key === currentTheme) btn.classList.add('active');
      btn.addEventListener('click', function () {
        setTheme(item.key);
      });
      panel.appendChild(btn);
    });

    document.body.appendChild(panel);
  }

  function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fire-theme', theme);

    var btns = document.querySelectorAll('.theme-toggle button');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.theme === theme);
    });

    /* Reset particles so they spawn with new colors immediately */
    particles.length = 0;
  }

  /* ── Init ── */
  resize();
  window.addEventListener('resize', resize);
  document.documentElement.setAttribute('data-theme', currentTheme);
  createToggle();
  loop();
})();
