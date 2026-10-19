/* Tarot Harian — hiburan kecil di dashboard.
   Deck penuh 78 kartu (22 Major + 56 Minor). Setiap hari deck dikocok dari
   seed tanggal, jadi 5 kartu hari itu selalu sama walau halaman dimuat ulang.
   Kartu dibuka dengan klik, warna muka mengikuti jenis kartu. */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'cofde_tarot_v1';
  var DRAW_COUNT = 5;
  var DECK_SIZE = 78;

  var MAJORS = [
    ['Sang Bodoh', 'awal baru, lompatan iman'],
    ['Pesulap', 'kekuatan kreatif, manifestasi'],
    ['Pendeta Wanita', 'intuisi, rahasia'],
    ['Permaisuri', 'kelimpahan, pengasuhan'],
    ['Kaisar', 'struktur, otoritas'],
    ['Hierofan', 'tradisi, bimbingan'],
    ['Kekasih', 'pilihan, hubungan'],
    ['Kereta', 'kendali, kemenangan'],
    ['Kekuatan', 'keberanian yang lembut'],
    ['Pertapa', 'introspeksi, hikmat'],
    ['Roda Keberuntungan', 'siklus, takdir'],
    ['Keadilan', 'keseimbangan, kejujuran'],
    ['Orang Tergantung', 'jeda, perspektif baru'],
    ['Kematian', 'akhir bab, transformasi'],
    ['Kesederhanaan', 'keseimbangan, kesabaran'],
    ['Iblis', 'ikatan, godaan'],
    ['Menara', 'guncangan, pencerahan'],
    ['Bintang', 'harapan, penyembuhan'],
    ['Bulan', 'mimpi, kebingungan'],
    ['Matahari', 'sukacita, kejelasan'],
    ['Penghakiman', 'kebangkitan, panggilan'],
    ['Dunia', 'penyelesaian, keutuhan']
  ];

  var SUITS = [
    ['wands', 'Tongkat', 'energi & aksi'],
    ['cups', 'Piala', 'emosi & perasaan'],
    ['swords', 'Pedang', 'pikiran & konflik'],
    ['pentacles', 'Pentakel', 'materi & kerja']
  ];

  var RANKS = [
    'As', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh',
    'Delapan', 'Sembilan', 'Sepuluh', 'Pengikut', 'Ksatria', 'Ratu', 'Raja'
  ];

  var RANK_MEANING = [
    'awal & potensi', 'keseimbangan & pilihan', 'pertumbuhan', 'stabilitas',
    'tantangan', 'harmoni', 'evaluasi', 'kecepatan', 'hampir tuntas',
    'puncak', 'pembelajaran', 'gerak', 'perawatan', 'penguasaan'
  ];

  function buildDeck() {
    var deck = [];
    for (var i = 0; i < MAJORS.length; i++) {
      deck.push({
        id: 'major-' + i,
        name: MAJORS[i][0],
        type: 'major',
        num: roman(i),
        keyword: MAJORS[i][1]
      });
    }
    for (var s = 0; s < SUITS.length; s++) {
      var suit = SUITS[s];
      for (var r = 0; r < RANKS.length; r++) {
        deck.push({
          id: suit[0] + '-' + r,
          name: RANKS[r] + ' ' + suit[1],
          type: suit[0],
          num: RANKS[r],
          keyword: RANK_MEANING[r] + ' · ' + suit[2]
        });
      }
    }
    return deck;
  }

  /* angka kecil -> romawi buat Major Arcana (0 = Sang Bodoh) */
  function roman(n) {
    var table = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
      [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'],
      [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    if (n === 0) return '0';
    var out = '';
    for (var i = 0; i < table.length; i++) {
      while (n >= table[i][0]) { out += table[i][1]; n -= table[i][0]; }
    }
    return out;
  }

  /* hash string -> uint32, dipakai sebagai seed harian */
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* PRNG kecil dan deterministik */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Fisher-Yates, mengembalikan array baru */
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 5 kartu untuk tanggal tertentu; draw unik karena deck diacak dulu */
  function drawDaily(deck, dateStr, count) {
    count = count || DRAW_COUNT;
    var rng = mulberry32(hashSeed('cofde-tarot-' + dateStr));
    return shuffle(deck, rng).slice(0, count);
  }

  /* kunci tanggal lokal YYYY-MM-DD */
  function todayKey(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function loadState(key) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { date: key, flipped: [] };
      var s = JSON.parse(raw);
      if (!s || s.date !== key || !Array.isArray(s.flipped)) return { date: key, flipped: [] };
      return s;
    } catch (e) {
      return { date: key, flipped: [] };
    }
  }

  function saveState(state) {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage penuh / diblokir, abaikan */ }
  }

  function init() {
    var board = document.getElementById('tarotBoard');
    if (!board) return;

    var counter = document.getElementById('tarotCount');
    var dateStr = todayKey();
    var deck = buildDeck();
    var hand = drawDaily(deck, dateStr);
    var state = loadState(dateStr);

    board.innerHTML = '';

    hand.forEach(function (card, i) {
      var flipped = state.flipped.indexOf(i) !== -1;
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'tarot-card t-' + card.type + (flipped ? ' is-open' : '');
      el.setAttribute('aria-label', flipped ? card.name : 'Kartu tertutup ' + (i + 1));
      el.setAttribute('aria-pressed', flipped ? 'true' : 'false');
      el.dataset.index = String(i);

      el.innerHTML =
        '<span class="tarot-inner">' +
          '<span class="tarot-back"><span class="tarot-sigil">✦</span></span>' +
          '<span class="tarot-front">' +
            '<span class="tarot-num">' + escapeHtml(card.num) + '</span>' +
            '<span class="tarot-name">' + escapeHtml(card.name) + '</span>' +
            '<span class="tarot-kw">' + escapeHtml(card.keyword) + '</span>' +
          '</span>' +
        '</span>';

      el.addEventListener('click', function () {
        if (el.classList.contains('is-open')) return;
        el.classList.add('is-open');
        el.setAttribute('aria-pressed', 'true');
        el.setAttribute('aria-label', card.name);
        if (state.flipped.indexOf(i) === -1) state.flipped.push(i);
        saveState(state);
        updateCounter(counter, state, hand.length);
      });

      board.appendChild(el);
    });

    updateCounter(counter, state, hand.length);
  }

  function updateCounter(counter, state, total) {
    if (!counter) return;
    var n = state.flipped.length;
    counter.textContent = n >= total
      ? 'Semua kartu hari ini sudah dibuka — kembali besok'
      : 'Terbuka ' + n + ' / ' + total;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var api = {
    DECK_SIZE: DECK_SIZE,
    DRAW_COUNT: DRAW_COUNT,
    buildDeck: buildDeck,
    shuffle: shuffle,
    mulberry32: mulberry32,
    hashSeed: hashSeed,
    drawDaily: drawDaily,
    todayKey: todayKey,
    roman: roman,
    escapeHtml: escapeHtml
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Tarot = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);