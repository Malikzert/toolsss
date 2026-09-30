/* ══════════════════════════════════════════════════════════
   COFDE Random Picker
     - names : acak nama dari daftar, dengan bobot & persentase
     - coin  : lempar koin 50:50
     - yesno : jawaban ya/tidak
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /*_randInt memakai rejection sampling supaya tidak ada bias modulo
     seperti pada Math.floor(Math.random() * n) untuk n besar. */
  function randInt(n) {
    if (n <= 0) return 0;
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      var lim = Math.floor(4294967296 / n) * n;
      var r;
      do {
        window.crypto.getRandomValues(buf);
        r = buf[0];
      } while (r >= lim);
      return r % n;
    }
    return Math.floor(Math.random() * n);
  }

  function clampInt(v, lo, hi, fallback) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return fallback;
    if (n < lo) return lo;
    if (n > hi) return hi;
    return n;
  }

  /* ══════════════ 1. Daftar nama ══════════════ */
  var items = [];          /* { name, weight } */
  var spinning = false;
  var lastWinner = -1;
  var reelTimers = [];
  var shown = -1;

  function totalWeight() {
    var t = 0;
    for (var i = 0; i < items.length; i++) t += items[i].weight;
    return t;
  }

  function fmtPct(p) {
    var s = p.toFixed(2);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s + '%';
  }

  function renderList() {
    var total = totalWeight();
    $('itemCount').textContent = items.length;
    $('spin').disabled = spinning || items.length === 0;
    $('removePicked').disabled = lastWinner < 0 || spinning;
    /* Kunci tombol yang mengubah daftar supaya tidak menabrak animasi. */
    $('clearAll').disabled = spinning;
    $('loadSample').disabled = spinning;
    $('itemInput').disabled = spinning;
    $('itemWeight').disabled = spinning;

    if (!items.length) {
      $('itemList').innerHTML = '<p class="lf-empty">Belum ada item. Tambahkan nama di atas.</p>';
      return;
    }

    $('itemList').innerHTML = items.map(function (it, i) {
      var p = total ? (it.weight / total) * 100 : 0;
      return '<div class="rk-item' + (i === lastWinner ? ' is-won' : '') + '">' +
        '<span class="rk-item-n">' + (i + 1) + '</span>' +
        '<span class="rk-item-name">' + esc(it.name) + '</span>' +
        '<span class="rk-item-w">&times;' + it.weight + '</span>' +
        '<span class="rk-item-pct">' + fmtPct(p) + '</span>' +
        '<span class="rk-item-bar"><i style="width:' + p.toFixed(3) + '%"></i></span>' +
        '<button class="rk-del" type="button" data-i="' + i + '" ' +
        'aria-label="hapus ' + esc(it.name) + '">&times;</button>' +
      '</div>';
    }).join('');
  }

  function addItem(name, weight) {
    var nm = String(name).trim().slice(0, 60);
    if (!nm) return false;
    for (var i = 0; i < items.length; i++) {
      if (items[i].name.toLowerCase() === nm.toLowerCase()) {
        if (COFDE.toast) COFDE.toast('"' + nm + '" sudah ada di daftar.', 'warn');
        return false;
      }
    }
    items.push({ name: nm, weight: clampInt(weight, 1, 999, 1) });
    renderList();
    return true;
  }

  function removeAt(i) {
    if (i < 0 || i >= items.length) return;
    items.splice(i, 1);
    if (lastWinner === i) lastWinner = -1;
    else if (lastWinner > i) lastWinner--;
    renderList();
  }

  /* Undian berbobot: jumlah bobot menentukan peluang. */
  function pickIndex() {
    var total = totalWeight();
    if (total <= 0) return -1;
    var r = randInt(total);
    for (var i = 0; i < items.length; i++) {
      r -= items[i].weight;
      if (r < 0) return i;
    }
    return items.length - 1;
  }

  function clearReel() {
    reelTimers.forEach(function (t) { clearTimeout(t); });
    reelTimers = [];
  }

  /* Animasi ala valo: nama berputar cepat, lalu melambat, lalu terkunci
     di pemenang. Jeda naik monoton supaya gerakannya terasa seperti
     mesin yang sedang berhenti, bukan sekadar timer biasa. */
  function spin() {
    if (spinning) return;
    if (!items.length) {
      if (COFDE.toast) COFDE.toast('Tambah minimal satu item dulu.', 'warn');
      return;
    }

    var win = pickIndex();
    if (win < 0) return;

    spinning = true;
    shown = -1;
    renderList();
    $('reel').classList.add('is-spinning');

    var winnerName = items[win].name;
    var total = items.length;
    var ticks = 24 + randInt(10);
    var lockFrom = ticks - 5;
    var i = 0;

    clearReel();

    function step() {
      i++;
      if (i <= lockFrom) {
        var idx = randInt(total);
        if (total > 1 && idx === shown) idx = (idx + 1) % total;
        shown = idx;
        $('reelLabel').textContent = items[idx].name;
        reelTimers.push(setTimeout(step, 30 + Math.pow(i / ticks, 3.4) * 290));
        return;
      }
      $('reelLabel').textContent = winnerName;
      if (i < ticks) {
        reelTimers.push(setTimeout(step, 80 + Math.pow((i - lockFrom) / 5, 2) * 140));
        return;
      }
      finishSpin(win);
    }

    step();
  }

  function finishSpin(win) {
    spinning = false;
    lastWinner = win;
    $('reel').classList.remove('is-spinning');
    $('reelLabel').textContent = items[win].name;

    var item = items[win];
    var p = totalWeight() ? (item.weight / totalWeight()) * 100 : 0;
    $('winner').textContent = item.name;
    $('winnerPct').textContent = fmtPct(p) + ' peluang dari ' + items.length + ' item';
    pop($('resultBox'));

    $('flash').classList.remove('is-on');
    void $('flash').offsetWidth;
    $('flash').classList.add('is-on');
    setTimeout(function () { $('flash').classList.remove('is-on'); }, 460);

    if (COFDE.toast) COFDE.toast(item.name + ' (' + fmtPct(p) + ')', 'ok');
    renderList();
  }

  function pop(el) {
    el.classList.remove('is-pop');
    void el.offsetWidth;
    el.classList.add('is-pop');
  }

  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (addItem($('itemInput').value, $('itemWeight').value)) {
      $('itemInput').value = '';
      $('itemInput').focus();
    }
  });

  $('itemList').addEventListener('click', function (e) {
    var b = e.target.closest('.rk-del');
    if (b) removeAt(parseInt(b.dataset.i, 10));
  });

  $('spin').addEventListener('click', spin);

  function clearWinnerText() {
    $('winner').textContent = '—';
    $('winnerPct').textContent = '';
    $('reelLabel').textContent = 'siap?';
  }

  $('clearAll').addEventListener('click', function () {
    if (spinning) return;
    items = [];
    lastWinner = -1;
    clearWinnerText();
    renderList();
  });

  $('removePicked').addEventListener('click', function () {
    if (lastWinner < 0) return;
    removeAt(lastWinner);
    lastWinner = -1;
    clearWinnerText();
    renderList();
  });

  $('loadSample').addEventListener('click', function () {
    if (spinning) return;
    items = [
      { name: 'Andi', weight: 1 },
      { name: 'Budi', weight: 3 },
      { name: 'Citra', weight: 1 },
      { name: 'Dewi', weight: 2 },
      { name: 'Eko', weight: 1 }
    ];
    lastWinner = -1;
    clearWinnerText();
    renderList();
  });

  $('optNoRepeat').addEventListener('change', function () {
    /* Tanpa pengembalian: nama yang sudah pernah keluar dibuang dari daftar. */
    if (!$('optNoRepeat').checked || lastWinner < 0) return;
    removeAt(lastWinner);
    lastWinner = -1;
    clearWinnerText();
  });

  /* ══════════════ 2. Coin flip ══════════════ */
  var coin = { heads: 0, tails: 0, busy: false };

  function paintCoin() {
    $('headCount').textContent = coin.heads;
    $('tailCount').textContent = coin.tails;
    var total = coin.heads + coin.tails;
    $('coinPct').textContent = total
      ? coin.heads + ' dari ' + total + ' lemparan keping (' + Math.round((coin.heads / total) * 100) + '%)'
      : '0 lemparan';
    $('coinBar').style.width = (total ? (coin.heads / total) * 100 : 50) + '%';
  }

  function flip() {
    if (coin.busy) return;
    coin.busy = true;
    $('flip').disabled = true;

    var el = $('coin');
    el.classList.remove('is-heads', 'is-tails', 'is-spin');
    void el.offsetWidth;
    el.classList.add('is-spin');
    $('coinResult').textContent = '...';

    var heads = randInt(2) === 0;
    setTimeout(function () {
      el.classList.remove('is-spin');
      el.classList.add(heads ? 'is-heads' : 'is-tails');
      if (heads) coin.heads++; else coin.tails++;
      $('coinResult').textContent = heads ? 'Keping' : 'Ekors';
      paintCoin();
      pop($('coinResult').parentNode);
      coin.busy = false;
      $('flip').disabled = false;
    }, 900);
  }

  $('flip').addEventListener('click', flip);
  $('coinReset').addEventListener('click', function () {
    coin.heads = 0; coin.tails = 0;
    $('coinResult').textContent = '—';
    $('coin').classList.remove('is-heads', 'is-tails');
    paintCoin();
  });

  /* ══════════════ 3. Ya / Tidak ══════════════ */
  var yn = { yes: 0, no: 0, busy: false };

  function paintYn() {
    $('yesCount').textContent = yn.yes;
    $('noCount').textContent = yn.no;
    var total = yn.yes + yn.no;
    $('ynPct').textContent = total
      ? yn.yes + ' ya dari ' + total + ' pertanyaan (' + Math.round((yn.yes / total) * 100) + '%)'
      : '0 pertanyaan';
    $('ynBar').style.width = (total ? (yn.yes / total) * 100 : 50) + '%';
  }

  function ask() {
    if (yn.busy) return;
    yn.busy = true;
    $('ask').disabled = true;

    var box = $('ynBox');
    var yes = randInt(2) === 0;
    box.classList.remove('is-yes', 'is-no');
    void box.offsetWidth;
    box.classList.add('is-asking');
    $('ynBox').dataset.v = '?';

    var ticks = 0;
    var iv = setInterval(function () {
      ticks++;
      $('ynBox').textContent = randInt(2) === 0 ? 'YA' : 'TIDAK';
      if (ticks >= 9) {
        clearInterval(iv);
        box.classList.remove('is-asking');
        box.classList.add(yes ? 'is-yes' : 'is-no');
        $('ynBox').textContent = yes ? 'YA' : 'TIDAK';
        $('ynBox').dataset.v = yes ? 'yes' : 'no';
        if (yes) yn.yes++; else yn.no++;
        paintYn();
        yn.busy = false;
        $('ask').disabled = false;
      }
    }, 70);
  }

  $('ask').addEventListener('click', ask);
  $('ynReset').addEventListener('click', function () {
    yn.yes = 0; yn.no = 0;
    $('ynBox').textContent = '—';
    $('ynBox').dataset.v = '';
    $('ynBox').classList.remove('is-yes', 'is-no');
    paintYn();
  });

  /* ══════════════ Mode switch ══════════════ */
  var mode = 'names';
  var cards = [].slice.call(document.querySelectorAll('.rk-card'));
  function setMode(m) {
    mode = m;
    cards.forEach(function (c) {
      var on = c.dataset.mode === m;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', String(on));
      c.tabIndex = on ? 0 : -1;
    });
    $('mode-names').hidden = m !== 'names';
    $('mode-coin').hidden = m !== 'coin';
    $('mode-yesno').hidden = m !== 'yesno';
  }
  cards.forEach(function (c) {
    c.addEventListener('click', function () { setMode(c.dataset.mode); });
  });

  /* Spasi untuk memicu aksi utama mode yang sedang terbuka. */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key !== ' ') return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test((t.tagName || '').toUpperCase()))) return;
    e.preventDefault();
    if (mode === 'names') spin();
    else if (mode === 'coin') flip();
    else ask();
  });

  function init() {
    $('winner').textContent = '—';
    $('reelLabel').textContent = 'siap?';
    $('coinResult').textContent = '—';
    $('ynBox').textContent = '—';
    renderList();
    paintCoin();
    paintYn();
    setMode('names');
    if (COFDE.net && COFDE.net.badge) COFDE.net.badge($('netBadge'));
    if (COFDE.cmdpal && COFDE.cmdpal.init) COFDE.cmdpal.init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
