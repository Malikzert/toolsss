/* ══════════════════════════════════════════════════════════
   COFDE — valo-ui.js
   Menyuntik overlay visual ke setiap kartu supaya efek hover
   VALO bekerja tanpa bentrok dengan ::before/::after yang sudah
   dipakai kartu:

     lightholy → pecahan kaca (kilau menyapu)
     abyss     → percikan api (ember + bunga api)

   Kartu yang dipantau: .cx-card .vx-card .tl-card .lf-card
                        .rk-card .tm-card
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.COFDE_UI) return;

  var SELECTOR = '.cx-card, .vx-card, .tl-card, .lf-card, .rk-card, ' +
    '.tm-card, .dash-card, .mini-card, .file-card, .card';
  var SPARKS = 4;

  function enhance(card) {
    if (!card || card.nodeType !== 1) return;
    if (card.classList.contains('valo-surface')) return;
    /* Jangan hiasi kartu yang sudah punya overlay dari tag lain. */
    if (card.querySelector(':scope > .val-peel')) return;

    card.classList.add('valo-surface');

    var topline = document.createElement('span');
    topline.className = 'valo-topline';
    topline.setAttribute('aria-hidden', 'true');
    card.appendChild(topline);

    var peel = document.createElement('span');
    peel.className = 'val-peel';
    peel.setAttribute('aria-hidden', 'true');
    card.appendChild(peel);

    for (var i = 0; i < SPARKS; i++) {
      var s = document.createElement('span');
      s.className = 'val-spark';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', String(i));
      card.appendChild(s);
    }
  }

  function scan(root) {
    var scope = (root && root.querySelectorAll) ? root : document;
    var list = scope.querySelectorAll(SELECTOR);
    for (var i = 0; i < list.length; i++) enhance(list[i]);
  }

  function boot() {
    scan(document);

    /* Kartu yang muncul belakangan (mis. setelah render daftar) ikut
       dihias tanpa mengganggu performa: hanya subtree yang berubah. */
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches(SELECTOR)) enhance(n);
          if (n.querySelectorAll) scan(n);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.COFDE_UI = {
    refresh: function () { scan(document); }
  };
})();
