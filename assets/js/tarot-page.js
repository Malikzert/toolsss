/* Halaman Tarot Harian: dek yang diklik -> flip sekali per hari. */
(function () {
  'use strict';

  function boot() {
    var T = window.Tarot;
    var cardBtn = document.getElementById('ttCard');
    if (!T || !cardBtn) return;

    var back = document.getElementById('ttBack');
    var front = document.getElementById('ttFront');
    var hint = document.getElementById('ttHint');
    var panel = document.getElementById('ttPanel');
    var pTitle = document.getElementById('ttPanelTitle');
    var pText = document.getElementById('ttPanelText');
    var chips = document.getElementById('ttChips');
    var note = document.getElementById('ttNote');

    var deck = T.buildDeck();
    var today = T.todayKey();
    var card = T.dailyCard(deck, today);
    var typeClass = 't-' + (card.type === 'major' ? 'major' : card.suit);
    var revealed = false;

    back.innerHTML = T.backArt();
    cardBtn.classList.remove('is-loading');

    function typeLabel(c) {
      return c.type === 'major' ? 'Major Arcana' : c.suitName;
    }

    function dateLabel() {
      try {
        return new Date().toLocaleDateString('id-ID', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
      } catch (e) {
        return today;
      }
    }

    function renderFront(c) {
      front.innerHTML =
        '<span class="tt-artbox">' + T.cardArt(c) + '</span>' +
        '<span class="tt-caption">' +
          '<span class="tt-fnum">' + T.escapeHtml(c.num) + '</span>' +
          '<strong class="tt-fname">' + T.escapeHtml(c.name) + '</strong>' +
          '<span class="tt-fkw">' + T.escapeHtml(c.keyword) + '</span>' +
        '</span>';
    }

    function reveal(silent) {
      if (revealed) return;
      revealed = true;

      renderFront(card);
      cardBtn.classList.add(typeClass, 'is-open');
      panel.classList.add(typeClass);
      cardBtn.disabled = true;
      cardBtn.setAttribute('aria-label', 'Kartu hari ini sudah dibuka: ' + card.name);

      hint.textContent = 'Kartu baru muncul lagi besok';
      pTitle.textContent = card.name;
      pText.innerHTML = 'Kata kunci: <strong>' + T.escapeHtml(card.keyword) +
        '</strong>. Anggap ini bahan refleksi, bukan ramalan &mdash; ambil bagian yang terasa relevan untuk hari ini.';
      chips.hidden = false;
      chips.innerHTML =
        '<span class="tt-chip"><span class="tt-swatch"></span>' + T.escapeHtml(typeLabel(card)) + '</span>' +
        '<span class="tt-chip tt-chip--soft">' + T.escapeHtml(dateLabel()) + '</span>';
      note.textContent = 'Kartu ini tetap sama sampai hari berganti, dan sudah tersimpan lokal di browser ini.';

      if (!silent && window.COFDE && window.COFDE.toast) {
        window.COFDE.toast.info('Kartu hari ini: ' + card.name, 3000);
      }
    }

    var state = T.loadState(today);
    if (state.drawn) reveal(true);

    cardBtn.addEventListener('click', function () {
      if (revealed) return;
      T.saveState({ date: today, drawn: true });
      reveal(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
