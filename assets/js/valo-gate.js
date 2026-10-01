/* ══════════════════════════════════════════════════════════
   COFDE — valo-gate.js
   Percakapan client'server saat pertama kali membuka situs.

   Alur:
     1. Server menyapa dan bertanya "ada perlu apa Anda masuk
        ke sini?".
     2. Tiga pilihan jawaban (pilih satu lewat keyboard/mouse).
     3. Server memberi kode akses.
     4. Pengunjung wajib mengetik kode itu manual: cofde
        (paste dari JS dicegah supaya benar-benar diketik tangan).

   Status disimpan di localStorage, jadi hanya muncul sekali
   per browser.Ada tombol "Mulai ulang gate" di Settings untuk
   mengulanginya.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.COFDE_GATE) return;

  var KEY = 'cofde_gate';
  var CODE = 'cofde';

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
      return localStorage.getItem(KEY) === 'ok';
    } catch (e) {
      return false;
    }
  }

  function markDone() {
    try { localStorage.setItem(KEY, 'ok'); } catch (e) { /* abaikan */ }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* abaikan */ }
  }

  /* ── Gaya: sebagian besar ikut style.css + valo.css, bagian
        khusus gate ditulis inline-ish di sini agar tidak
        bergantung urutan muat stylesheet. ── */
  var CSS = [
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

  function ensureStyle() {
    if (document.getElementById('vg-style')) return;
    var s = document.createElement('style');
    s.id = 'vg-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── Builder ── */
  function build() {
    ensureStyle();

    var backdrop = el('div', 'vg-backdrop');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'vg-title');

    var box = el('div', 'vg-box');

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

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    /* State. */
    var picked = null;

    /* Teks ordinary selalu lewat textContent. Inner HTML hanya
       dipakai untuk satu fragmen <code> yang dirakit di sini, bukan
       dari input pengguna. */
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

    /* Sapaan + pertanyaan. */
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
      setTimeout(function () { input.focus(); }, reduceMotion ? 0 : 120);
      if (line && line.scrollIntoView) {
        line.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }

    function submit() {
      /* Normalisasi: lowercase + buang spasi, supaya "cofde" dan
         "C O F D E" sama-sama diterima. */
      var v = input.value.trim().toLowerCase().replace(/\s+/g, '');
      if (v !== CODE) {
        input.classList.remove('bad');
        /* reflow supaya animasi bisa diputar ulang */
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
      setTimeout(close, reduceMotion ? 0 : 300);
    }

    function close() {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (document.body) document.body.style.removeProperty('overflow');
      document.removeEventListener('keydown', onKey, true);
      if (window.COFDE && COFDE.gate && typeof COFDE.gate.onEnter === 'function') {
        try { COFDE.gate.onEnter(); } catch (e) { /* abaikan */ }
      }
    }

    function onKey(e) {
      var t = e.target;

      if (e.key === 'Escape') {
        e.preventDefault();
        skipGate();
        return;
      }

      /* Biarkan tombol pilihan menangani Enter/Spasi sendiri, supaya
         fokus keyboard di tombol tidak malah mengirim kode. */
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

      /* Shortcut angka 1-3 untuk memilih jawaban dengan cepat. */
      if (!picked && !field.classList.contains('on') &&
          (e.key === '1' || e.key === '2' || e.key === '3')) {
        var i = Number(e.key) - 1;
        if (CHOICES[i]) {
          e.preventDefault();
          choose(CHOICES[i]);
        }
        return;
      }

      /* Cegah paste supaya kode benar-benar diketik manual. */
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        hint.textContent = 'Paste ditolak. Ketik sendiri ya.';
      }
    }

    function skipGate() {
      markDone();
      close();
    }

    /* Kunci scroll halaman di belakang dialog. */
    if (document.body) document.body.style.overflow = 'hidden';

    go.addEventListener('click', submit);
    input.addEventListener('input', function () {
      input.classList.remove('bad');
      if (hint.textContent.indexOf('belum tepat') >= 0 || hint.textContent.indexOf('ditolak') >= 0) {
        hint.textContent = 'Lima huruf: c-o-f-d-e. Paste otomatis ditolak.';
      }
    });
    skip.addEventListener('click', skipGate);
    document.addEventListener('keydown', onKey, true);

    /* Fokus pertama ke pilihan pertama supaya keyboard langsung jalan. */
    var first = opts.querySelector('.vg-opt');
    if (first && !reduceMotion) setTimeout(function () { first.focus(); }, 60);
  }

  /* Public API. */
  window.COFDE = window.COFDE || {};
  window.COFDE_GATE = {
    show: function (force) {
      if (force) reset();
      if (isDone()) return false;
      if (!document.body) return false;
      build();
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
    if (document.body) build();
    else document.addEventListener('DOMContentLoaded', build, { once: true });
  }

  boot();
})();
