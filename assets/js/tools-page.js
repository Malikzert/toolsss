/* ══════════════════════════════════════════════════════════
   COFDE Studio Tools — pemilih fitur (tab) untuk tools.html
   Empat tool (02-05) berbagi satu halaman. Memilih card akan
   menampilkan panel fiturnya tepat di bawah baris card.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

    var TOOLS = ['crop', 'gabung', 'konversi', 'devtools', 'scan'];
    var cards = Array.prototype.slice.call(document.querySelectorAll('.tl-card'));
    var panels = TOOLS.map(function (k) { return document.getElementById('panel-' + k); });
  var current = null;

  function show(key, focusPanel) {
    if (TOOLS.indexOf(key) < 0) return;
    current = key;

    cards.forEach(function (c) {
      var on = c.dataset.tool === key;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
      c.tabIndex = on ? 0 : -1;
    });

    panels.forEach(function (p, i) {
      if (!p) return;
      var on = TOOLS[i] === key;
      p.hidden = !on;
      p.classList.toggle('is-active', on);
    });

    /* Hash bikin URL lama bisa langsung membuka fitur yang tepat,
       dan tombol back/forward tetap bekerja. */
    var hash = '#' + key;
    if (location.hash !== hash) {
      history.replaceState(null, '', hash);
    }

    /* Panel yang baru tampil perlu diposisikan ulang dropdown-nya
       karena diukur saat panel masih tersembunyi. */
    if (window.COFDE && COFDE.dropdown && typeof COFDE.dropdown.init === 'function') {
      try { COFDE.dropdown.init(panels[TOOLS.indexOf(key)]); } catch (e) { /* abaikan */ }
    }

    if (focusPanel) {
      var p = panels[TOOLS.indexOf(key)];
      if (p) p.focus({ preventScroll: true });
    }
  }

  cards.forEach(function (c) {
    c.addEventListener('click', function () { show(c.dataset.tool, false); });
  });

  /* Keyboard_arrow kiri/kanan memindah pilihan, Home/End ke ujung,
     sesuai pola tablist ARIA. */
  var picker = document.querySelector('.tl-picker');
  if (picker) {
    picker.addEventListener('keydown', function (e) {
      var i = TOOLS.indexOf(current);
      if (i < 0) return;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % TOOLS.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + TOOLS.length) % TOOLS.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = TOOLS.length - 1;
      if (next === null) return;
      e.preventDefault();
      show(TOOLS[next], false);
      var card = document.getElementById('tab-' + TOOLS[next]);
      if (card) card.focus();
    });
  }

  /* Pilih fitur dari hash awal: tools.html#konversi, dan redirect
     dari halaman lama seperti konversi.html -> tools.html#konversi. */
  function fromHash() {
    var k = (location.hash || '').replace(/^#/, '');
    return TOOLS.indexOf(k) >= 0 ? k : 'crop';
  }

  window.addEventListener('hashchange', function () {
    show(fromHash(), false);
  });

  /* Drag pada panel crop memakai pointer capture yang berlangsung
     lama; tutup dropdown yang kebuka supaya tidak menggantung di atas
     garis potong. */
  window.addEventListener('pointerdown', function (e) {
    var d = document.querySelector('.cx-drop.is-open');
    if (d && !d.contains(e.target)) d.classList.remove('is-open');
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { show(fromHash(), false); });
  } else {
    show(fromHash(), false);
  }
})();
