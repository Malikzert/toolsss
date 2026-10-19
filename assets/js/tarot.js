/* Tarot Harian — deck 78 kartu (22 Major + 56 Minor).
   Satu kartu per hari, dikocok deterministik dari seed tanggal supaya kartu
   hari itu sama walau halaman dimuat ulang. Setiap kartu punya artwork SVG
   yang digambar dari kode (tanpa berkas gambar), memakai currentColor supaya
   warnanya mengikuti jenis kartu lewat CSS. */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'cofde_tarot_v1';
  var CARD_PER_DAY = 1;
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

  /* ── data ─────────────────────────────────────────────── */

  function buildDeck() {
    var deck = [];
    for (var i = 0; i < MAJORS.length; i++) {
      deck.push({
        id: 'major-' + i,
        name: MAJORS[i][0],
        type: 'major',
        index: i,
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
          suit: suit[0],
          suitName: suit[1],
          rank: r,
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

  /* n kartu untuk tanggal tertentu (dipakai kartu harian & cadangan) */
  function drawDaily(deck, dateStr, count) {
    count = count || CARD_PER_DAY;
    var rng = mulberry32(hashSeed('cofde-tarot-' + dateStr));
    return shuffle(deck, rng).slice(0, count);
  }

  function dailyCard(deck, dateStr) {
    return drawDaily(deck, dateStr, CARD_PER_DAY)[0];
  }

  /* kunci tanggal lokal YYYY-MM-DD */
  function todayKey(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  /* ── state harian ─────────────────────────────────────── */

  function loadState(key) {
    var fresh = { date: key, drawn: false };
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return fresh;
      var s = JSON.parse(raw);
      if (!s || s.date !== key) return fresh;
      if (typeof s.drawn === 'boolean') return { date: key, drawn: s.drawn };
      /* format lama (5 kartu per hari) -> dianggap sudah ambil kartu */
      if (Array.isArray(s.flipped)) return { date: key, drawn: s.flipped.length > 0 };
      return fresh;
    } catch (e) {
      return fresh;
    }
  }

  function saveState(state) {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage penuh / diblokir, abaikan */ }
  }

  /* ── primitif gambar ─────────────────────────────────── */

  function ln(x1, y1, x2, y2, w, o) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" opacity="' +
      (o == null ? 1 : o) + '"/>';
  }

  function rg(cx, cy, r, w, o) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
      '" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" opacity="' +
      (o == null ? 1 : o) + '"/>';
  }

  function dc(cx, cy, r, o) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="currentColor" opacity="' +
      (o == null ? 1 : o) + '"/>';
  }

  function pa(d, o, filled) {
    return '<path d="' + d + '" fill="' + (filled ? 'currentColor' : 'none') +
      '" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="' +
      (o == null ? 1 : o) + '"/>';
  }

  function poly(points, o, filled) {
    return '<polygon points="' + points + '" fill="' + (filled ? 'currentColor' : 'none') +
      '" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="' +
      (o == null ? 1 : o) + '"/>';
  }

  function rc(x, y, w, h, o, filled) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" rx="1.5" fill="' + (filled ? 'currentColor' : 'none') +
      '" stroke="currentColor" stroke-width="2" opacity="' + (o == null ? 1 : o) + '"/>';
  }

  function starPts(n, cx, cy, R, r, phase) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var rad = i % 2 ? r : R;
      var a = (Math.PI / n) * i - Math.PI / 2 + (phase || 0);
      pts.push((cx + rad * Math.cos(a)).toFixed(2) + ',' + (cy + rad * Math.sin(a)).toFixed(2));
    }
    return pts.join(' ');
  }

  function sunArt(cx, cy, r) {
    var s = dc(cx, cy, r);
    for (var i = 0; i < 12; i++) {
      var a = (Math.PI / 6) * i;
      s += ln(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3),
        cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10), 2);
    }
    return s;
  }

  /* emblem per jenis kartu, digambar di (cx,cy) dengan skala s */
  function glyph(suit, cx, cy, s, o) {
    s = s || 1;
    o = o == null ? 1 : o;
    var g = '<g opacity="' + o + '">';
    if (suit === 'wands') {
      g += ln(cx, cy + 11 * s, cx, cy - 10 * s, 2.6 * s);
      g += pa('M' + cx + ' ' + (cy - 10 * s) +
        ' C ' + (cx - 5 * s) + ' ' + (cy - 12 * s) + ', ' + (cx - 5 * s) + ' ' + (cy - 19 * s) +
        ', ' + cx + ' ' + (cy - 19 * s) +
        ' C ' + (cx + 5 * s) + ' ' + (cy - 19 * s) + ', ' + (cx + 5 * s) + ' ' + (cy - 12 * s) +
        ', ' + cx + ' ' + (cy - 10 * s), o, true);
    } else if (suit === 'cups') {
      g += pa('M' + (cx - 8 * s) + ' ' + (cy - 9 * s) + ' L' + (cx + 8 * s) + ' ' + (cy - 9 * s) +
        ' L' + (cx + 5 * s) + ' ' + (cy + 1 * s) +
        ' A ' + (5 * s) + ' ' + (5 * s) + ' 0 0 1 ' + (cx - 5 * s) + ' ' + (cy + 1 * s) + ' Z', o, true);
      g += ln(cx, cy + 6 * s, cx, cy + 12 * s, 2 * s);
      g += ln(cx - 5 * s, cy + 12 * s, cx + 5 * s, cy + 12 * s, 2 * s);
    } else if (suit === 'swords') {
      g += poly(cx + ',' + (cy - 13 * s) + ' ' + (cx + 3 * s) + ',' + (cy - 6 * s) + ' ' +
        (cx + 3 * s) + ',' + (cy + 3 * s) + ' ' + cx + ',' + (cy + 7 * s) + ' ' +
        (cx - 3 * s) + ',' + (cy + 3 * s) + ' ' + (cx - 3 * s) + ',' + (cy - 6 * s), o, true);
      g += ln(cx - 7 * s, cy + 6 * s, cx + 7 * s, cy + 6 * s, 1.8 * s);
      g += ln(cx, cy + 8 * s, cx, cy + 12 * s, 1.8 * s);
    } else {
      g += rg(cx, cy, 10 * s, 1.8 * s, o);
      g += poly(starPts(5, cx, cy, 9 * s, 3.44 * s), o, false);
    }
    return g + '</g>';
  }

  var PIPS = [
    [[0, 2]],
    [[0, 0], [0, 4]],
    [[0, 0], [0, 2], [0, 4]],
    [[-1, 0], [1, 0], [-1, 4], [1, 4]],
    [[-1, 0], [1, 0], [0, 2], [-1, 4], [1, 4]],
    [[-1, 0], [1, 0], [-1, 2], [1, 2], [-1, 4], [1, 4]],
    [[-1, 0], [1, 0], [0, 1], [-1, 2], [1, 2], [-1, 4], [1, 4]],
    [[-1, 0], [1, 0], [-1, 1], [1, 1], [-1, 3], [1, 3], [-1, 4], [1, 4]],
    [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 2], [-1, 3], [1, 3], [-1, 4], [1, 4]],
    [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 1], [0, 3], [-1, 3], [1, 3], [-1, 4], [1, 4]]
  ];

  function pipArt(suit, count) {
    var spots = PIPS[count - 1];
    var out = '';
    for (var i = 0; i < spots.length; i++) {
      out += glyph(suit, 50 + spots[i][0] * 15, 34 + spots[i][1] * 21, 0.72);
    }
    return out;
  }

  /* kartu istana: Pengikut (10), Ksatria (11), Ratu (12), Raja (13) */
  function courtArt(suit, rank) {
    var g = rg(50, 78, 34, 1.2, 0.25);
    g += glyph(suit, 50, 38, 0.8, 0.95);
    g += dc(50, 74, 8);
    g += pa('M34 122 Q50 88 66 122 Z', 1, true);
    g += ln(38, 80, 50, 92, 2);
    g += ln(62, 80, 50, 92, 2);
    if (rank === 13) {
      g += poly('38,66 44,52 50,64 56,52 62,66', 1, true);
      g += ln(28, 124, 72, 124, 2, 0.6);
    } else if (rank === 12) {
      g += poly('40,66 45,54 50,63 55,54 60,66', 1, true);
      g += dc(50, 51, 2.2);
    } else if (rank === 11) {
      g += pa('M40 68 Q50 59 60 68', 1, false);
      g += ln(28, 118, 74, 62, 2, 0.7);
    } else {
      g += pa('M37 68 Q50 57 63 68 Z', 1, false);
      g += glyph(suit, 68, 104, 0.42);
    }
    return g;
  }

  /* 22 ikon Major Arcana */
  var MAJOR_ART = [
    function () { /* 0 Sang Bodoh */
      return sunArt(28, 30, 7) + pa('M10 128 L32 128', 1, false) +
        dc(56, 74, 7) + ln(56, 81, 56, 106, 2) +
        ln(56, 88, 44, 84, 2) + ln(44, 92, 44, 70, 2) + rg(44, 66, 6, 2) +
        ln(56, 106, 46, 124, 2) + ln(56, 106, 68, 124, 2);
    },
    function () { /* I Pesulap */
      return rg(42, 34, 6, 1.8) + rg(58, 34, 6, 1.8) +
        dc(50, 56, 7) + ln(50, 63, 50, 96, 2) +
        ln(50, 70, 64, 52, 2) + ln(64, 52, 64, 34, 2) +
        ln(50, 70, 38, 80, 2) +
        glyph('wands', 34, 112, 0.42) + glyph('cups', 50, 114, 0.42) +
        glyph('swords', 66, 112, 0.42) + glyph('pentacles', 80, 114, 0.42) +
        ln(24, 124, 82, 124, 2, 0.5);
    },
    function () { /* II Pendeta Wanita */
      return rc(18, 52, 9, 74, 1, true) + rc(73, 52, 9, 74, 1, true) +
        pa('M64 30 A 18 18 0 1 0 64 68 A 14 14 0 1 1 64 30', 1, false) +
        pa('M30 88 Q50 78 70 88', 1, false) +
        ln(30, 96, 70, 96, 1.5, 0.5);
    },
    function () { /* III Permaisuri */
      var s = rg(50, 80, 13, 2) + ln(50, 93, 50, 114, 2) + ln(40, 104, 60, 104, 2);
      for (var i = 0; i < 12; i++) {
        var a = (Math.PI / 6) * i;
        s += poly(starPts(5, 50 + Math.cos(a) * 26, 74 + Math.sin(a) * 26, 3, 1.2), 0.9, true);
      }
      return s;
    },
    function () { /* IV Kaisar */
      return rc(30, 88, 40, 36, 0.7) +
        rg(22, 82, 7, 2) + rg(22, 82, 3, 1.6) + rg(78, 82, 7, 2) + rg(78, 82, 3, 1.6) +
        dc(50, 68, 8) + poly('38,60 44,46 50,58 56,46 62,60', 1, true) +
        ln(50, 76, 50, 92, 2) + ln(50, 80, 40, 74, 2) + ln(50, 80, 60, 74, 2);
    },
    function () { /* V Hierofan */
      return ln(50, 42, 50, 112, 3) + ln(38, 54, 62, 54, 2, 0.9) +
        ln(34, 68, 66, 68, 2, 0.9) + ln(30, 82, 70, 82, 2, 0.9) +
        rg(40, 118, 5, 2) + ln(40, 123, 40, 132, 2) +
        rg(60, 118, 5, 2) + ln(60, 123, 60, 132, 2);
    },
    function () { /* VI Kekasih */
      var h = 'M50 72 C 44 64, 33 68, 33 77 C 33 86, 44 92, 50 99 ' +
        'C 56 92, 67 86, 67 77 C 67 68, 56 64, 50 72 Z';
      return sunArt(50, 28, 6) +
        dc(30, 108, 6) + pa('M20 128 Q30 112 40 128 Z', 1, true) +
        dc(70, 108, 6) + pa('M60 128 Q70 112 80 128 Z', 1, true) +
        pa(h, 1, true);
    },
    function () { /* VII Kereta */
      return rc(28, 48, 44, 18, 0.8) + ln(28, 66, 72, 66, 2) +
        poly(starPts(5, 38, 57, 4, 1.6), 0.9, true) +
        poly(starPts(5, 50, 57, 4, 1.6), 0.9, true) +
        poly(starPts(5, 62, 57, 4, 1.6), 0.9, true) +
        ln(30, 48, 30, 38, 2) + ln(70, 48, 70, 38, 2) + ln(30, 38, 70, 38, 2) +
        rc(34, 66, 32, 32, 0.8) + dc(50, 58, 5) +
        rg(38, 104, 9, 2) + rg(38, 104, 2.4, 1.6) +
        rg(62, 104, 9, 2) + rg(62, 104, 2.4, 1.6);
    },
    function () { /* VIII Kekuatan */
      var s = rg(42, 32, 6, 1.8) + rg(58, 32, 6, 1.8) + dc(50, 74, 14);
      for (var i = 0; i < 16; i++) {
        var a = (Math.PI / 8) * i;
        s += ln(50 + Math.cos(a) * 15, 74 + Math.sin(a) * 15,
          50 + Math.cos(a) * 23, 74 + Math.sin(a) * 23, 1.8, 0.85);
      }
      s += rg(44, 71, 2.2, 1.5) + rg(56, 71, 2.2, 1.5) + pa('M43 82 Q50 89 57 82', 1, false);
      return s;
    },
    function () { /* IX Pertapa */
      return dc(44, 56, 7) + pa('M28 116 Q44 66 60 116 Z', 1, true) +
        ln(58, 62, 76, 26, 2) +
        rc(58, 70, 18, 20, 0.9) +
        poly(starPts(6, 67, 80, 7, 3), 1, true) + ln(67, 73, 67, 87, 1.5);
    },
    function () { /* X Roda Keberuntungan */
      var s = rg(50, 78, 32, 2.5) + rg(50, 78, 21, 1.2, 0.55) + rg(50, 78, 9, 2);
      for (var i = 0; i < 8; i++) {
        var a = (Math.PI / 4) * i;
        s += ln(50 + Math.cos(a) * 9, 78 + Math.sin(a) * 9,
          50 + Math.cos(a) * 32, 78 + Math.sin(a) * 32, 1.8, 0.8);
      }
      return s;
    },
    function () { /* XI Keadilan */
      return ln(50, 28, 50, 72, 2.5) + ln(40, 50, 60, 50, 2) +
        poly('50,26 54,40 50,48 46,40', 1, true) +
        ln(50, 72, 50, 86, 2) + ln(26, 86, 74, 86, 2) +
        pa('M18 98 Q26 106 34 98', 1, false) + ln(26, 86, 26, 98, 1.5) + ln(26, 98, 18, 98, 1.5) + ln(26, 98, 34, 98, 1.5) +
        pa('M66 98 Q74 106 82 98', 1, false) + ln(74, 86, 74, 98, 1.5) + ln(74, 98, 66, 98, 1.5) + ln(74, 98, 82, 98, 1.5);
    },
    function () { /* XII Orang Tergantung */
      return ln(22, 36, 78, 36, 2.5) + ln(50, 36, 50, 54, 2) +
        ln(50, 54, 50, 78, 2) + dc(50, 86, 6) + rg(50, 86, 11, 1.4, 0.7) +
        ln(50, 54, 38, 62, 2) + ln(50, 54, 62, 62, 2) +
        ln(50, 78, 42, 66, 2) + ln(50, 78, 58, 66, 2) +
        ln(28, 118, 72, 118, 1.5, 0.35);
    },
    function () { /* XIII Kematian */
      return ln(26, 126, 62, 44, 2.5) +
        pa('M60 38 Q84 44 86 62 Q70 52 58 56 Z', 1, true) +
        dc(68, 100, 10) + rg(63, 98, 2.4, 1.6) + rg(73, 98, 2.4, 1.6) +
        ln(68, 108, 68, 114, 1.6, 0.7) +
        rg(30, 96, 5, 1.6) + ln(30, 101, 30, 108, 1.6);
    },
    function () { /* XIV Kesederhanaan */
      return poly('50,30 74,70 26,70', 1, false) +
        glyph('cups', 36, 84, 0.62) + glyph('cups', 64, 104, 0.62) +
        pa('M36 76 Q46 94 64 96', 1, false) + ln(20, 122, 80, 122, 1.5, 0.35);
    },
    function () { /* XV Iblis */
      var s = poly(starPts(5, 50, 78, 30, 11.5, Math.PI), 1, false) +
        pa('M32 38 Q42 22 52 38', 1, false) + pa('M48 38 Q58 22 68 38', 1, false) +
        dc(50, 62, 5) + ln(50, 67, 50, 92, 2);
      for (var i = 0; i < 4; i++) s += rg(32 + i * 12, 112, 4.5, 1.6);
      return s;
    },
    function () { /* XVI Menara */
      return rc(38, 62, 24, 58, 1, false) +
        poly('34,62 40,48 46,60 50,44 54,60 60,48 66,62', 1, true) +
        poly('60,34 48,66 56,66 42,104 50,72 42,72', 0.85, true) +
        dc(28, 80, 3) + dc(72, 70, 3) + dc(74, 92, 2.4) +
        ln(20, 124, 80, 124, 1.5, 0.35);
    },
    function () { /* XVII Bintang */
      var s = poly(starPts(8, 50, 70, 30, 15), 1, false) + dc(50, 70, 4);
      var small = [[22, 40], [78, 40], [18, 66], [82, 66], [30, 24], [70, 24], [50, 22]];
      for (var i = 0; i < small.length; i++) {
        s += poly(starPts(5, small[i][0], small[i][1], 4, 1.7), 0.9, true);
      }
      return s + pa('M18 118 Q34 108 50 118 Q66 128 82 118', 1, false) +
        rg(50, 132, 2.2, 1.2, 0.5);
    },
    function () { /* XVIII Bulan */
      return pa('M62 32 A 26 26 0 1 0 62 100 A 20 20 0 1 1 62 32', 1, false) +
        rc(72, 62, 10, 26, 0.9) + poly('70,62 77,54 84,62', 0.9, true) + rg(77, 74, 2.6, 1.4) +
        rc(20, 70, 10, 26, 0.9) + poly('18,70 25,62 32,70', 0.9, true) + rg(25, 82, 2.6, 1.4) +
        pa('M16 118 Q33 108 50 118 Q67 128 84 118', 1, false);
    },
    function () { /* XIX Matahari */
      return sunArt(50, 66, 20) +
        rg(43, 62, 2.4, 1.6) + rg(57, 62, 2.4, 1.6) +
        pa('M42 74 Q50 84 58 74', 1, false) +
        ln(18, 124, 82, 124, 1.5, 0.35);
    },
    function () { /* XX Penghakiman */
      return ln(34, 98, 70, 54, 3) +
        pa('M70 54 L86 38 L74 36 L64 48 Z', 1, true) +
        pa('M40 86 Q20 74 14 94 Q30 96 40 86', 1, false) +
        pa('M44 78 Q28 64 22 82 Q34 84 44 78', 1, false) +
        dc(36, 116, 5) + pa('M28 134 Q36 118 44 134 Z', 1, true) +
        dc(64, 116, 5) + pa('M56 134 Q64 118 72 134 Z', 1, true);
    },
    function () { /* XXI Dunia */
      return rg(50, 78, 30, 2.5) + rg(50, 78, 34, 1, 0.45) +
        dc(50, 66, 6) + ln(50, 72, 50, 92, 2) +
        ln(50, 78, 40, 86, 2) + ln(50, 78, 60, 86, 2) +
        ln(50, 92, 42, 102, 2) + ln(50, 92, 58, 102, 2) +
        glyph('wands', 22, 26, 0.34) + glyph('cups', 78, 26, 0.34) +
        glyph('swords', 22, 130, 0.34) + glyph('pentacles', 78, 130, 0.34);
    }
  ];

  function frameMarkup() {
    return '<rect x="3" y="3" width="94" height="144" rx="6" fill="none" stroke="currentColor" stroke-width="2" opacity="0.55"/>' +
      '<rect x="8" y="8" width="84" height="134" rx="4" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>' +
      pa('M8 24 Q8 8 24 8', 0.6, false) + pa('M92 24 Q92 8 76 8', 0.6, false) +
      pa('M8 126 Q8 142 24 142', 0.6, false) + pa('M92 126 Q92 142 76 142', 0.6, false);
  }

  /* muka kartu: SVG siap tempel, warna ikut currentColor */
  function cardArt(card) {
    var inner;
    if (card.type === 'major') {
      inner = (MAJOR_ART[card.index] || MAJOR_ART[0])();
    } else if (typeof card.rank === 'number' && card.rank <= 9) {
      inner = pipArt(card.suit, card.rank + 1);
    } else {
      inner = courtArt(card.suit, card.rank);
    }
    return '<svg class="tt-art" viewBox="0 0 100 150" role="img" aria-label="' +
      escapeHtml(card.name) + '">' + frameMarkup() + inner + '</svg>';
  }

  /* punggung kartu untuk tumpukan deck */
  function backArt() {
    var s = frameMarkup() +
      rg(50, 75, 26, 2, 0.85) + rg(50, 75, 18, 1.2, 0.45) +
      poly(starPts(8, 50, 75, 15, 7.5), 1, false) + dc(50, 75, 3.5);
    var corners = [[22, 24], [78, 24], [22, 126], [78, 126]];
    for (var i = 0; i < corners.length; i++) {
      s += poly(corners[i][0] + ',' + (corners[i][1] - 6) + ' ' +
        (corners[i][0] + 6) + ',' + corners[i][1] + ' ' +
        corners[i][0] + ',' + (corners[i][1] + 6) + ' ' +
        (corners[i][0] - 6) + ',' + corners[i][1], 0.75, false);
    }
    return '<svg class="tt-art tt-art-back" viewBox="0 0 100 150" aria-hidden="true">' + s + '</svg>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    DECK_SIZE: DECK_SIZE,
    CARD_PER_DAY: CARD_PER_DAY,
    buildDeck: buildDeck,
    shuffle: shuffle,
    mulberry32: mulberry32,
    hashSeed: hashSeed,
    drawDaily: drawDaily,
    dailyCard: dailyCard,
    todayKey: todayKey,
    roman: roman,
    cardArt: cardArt,
    backArt: backArt,
    loadState: loadState,
    saveState: saveState,
    escapeHtml: escapeHtml
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Tarot = api;
})(typeof window !== 'undefined' ? window : globalThis);
