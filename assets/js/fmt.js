/* ══════════════════════════════════════════════════════════
   COFDE Format — currency, date, dan angka
   Currency: IDR, USD, EUR, GBP, JPY, atau custom (kode + simbol)
   Date: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* JPY tidak punya desimal; IDR umumnya tanpa desimal juga.
     `group` dan `dec` ditulis eksplisit (bukan mengandalkan
     toLocaleString) supaya output identik di semua browser dan
     tidak berubah karena data locale perangkat. */
  var CURRENCIES = {
    IDR: { code: 'IDR', symbol: 'Rp',      group: '.', dec: ',', decimals: 0 },
    USD: { code: 'USD', symbol: '$',       group: ',', dec: '.', decimals: 2 },
    EUR: { code: 'EUR', symbol: '\u20AC',  group: '.', dec: ',', decimals: 2 },
    GBP: { code: 'GBP', symbol: '\u00A3',  group: ',', dec: '.', decimals: 2 },
    JPY: { code: 'JPY', symbol: '\u00A5',  group: ',', dec: '.', decimals: 0 }
  };

  var DEFAULT_SETTINGS = {
    appearance: 'system',
    currency: 'IDR',
    customCurrencyCode: '',
    customCurrencySymbol: '',
    dateFormat: 'DD/MM/YYYY'
  };

  function currencyInfo(settings) {
    var s = settings || {};
    if (s.currency === 'CUSTOM') {
      var code = (s.customCurrencyCode || 'XXX').toUpperCase().slice(0, 4);
      var sym = s.customCurrencySymbol || code;
      return {
        code: code,
        symbol: sym,
        group: ',',
        dec: '.',
        /* IDR dan JPY tidak memakai desimal; sisanya 2 desimal. */
        decimals: (code === 'IDR' || code === 'JPY') ? 0 : 2,
        custom: true
      };
    }
    return CURRENCIES[s.currency] || CURRENCIES.IDR;
  }

  function toNumber(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined || v === '') return 0;
    /* Terima "150000", "150.000", "1,500.50", "Rp150.000", "1.250.000,75".
       Buang simbol dan spasi, lalu normalkan pemisah ribuan. */
    var s = String(v).replace(/[^\d,.-]/g, '');
    if (!s) return 0;
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
      /* Yang belakangan adalah desimal */
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(/,/g, '.');
      else s = s.replace(/,/g, '');
    } else if (s.indexOf(',') > -1) {
      /* Hanya koma: bisa ribuan atau desimal. Koma diikuti tepat tiga
         digit dan bagian kiri tidak kosong berarti pemisah ribuan. */
      var pc = s.split(',');
      if (pc.length === 2 && pc[1].length === 3 && pc[0].length > 0) s = s.replace(/,/g, '');
      else s = s.replace(',', '.');
    } else if (s.indexOf('.') > -1) {
      /* Hanya titik: "150.000" = seratus lima puluh ribu (Indonesia),
         "12.5" = dua belas koma lima. Aturan yang sama seperti koma. */
      var pd = s.split('.');
      if (pd.length === 2 && pd[1].length === 3 && pd[0].length > 0) s = s.replace('.', '');
      else if (pd.length > 2) s = s.replace(/\./g, '');
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  /* Poin bulat untuk uang: hindari 0.1+0.2 = 0.30000000000000004. */
  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  /* Sisipkan pemisah ribuan tanpa bergantung pada toLocaleString. */
  function groupDigits(intPart, sep) {
    var neg = intPart.charAt(0) === '-';
    if (neg) intPart = intPart.slice(1);
    var out = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return (neg ? '-' : '') + out;
  }

  /* Angka dengan jumlah desimal tetap dan pemisah eksplisit. */
  function fixed(n, d, group, dec) {
    var parts = Math.abs(n).toFixed(d).split('.');
    var body = group ? groupDigits(parts[0], group) : parts[0];
    if (d > 0 && parts[1]) body += dec + parts[1];
    return (n < 0 ? '-' : '') + body;
  }

  function money(amount, settings) {
    var info = currencyInfo(settings);
    var n = toNumber(amount);
    /* Gaya akuntansi: tanda minus di depan simbol, -Rp50.000 */
    return (n < 0 ? '-' : '') + info.symbol + fixed(Math.abs(n), info.decimals, info.group, info.dec);
  }

  /* Versi ringkas untuk chart/axis: Rp1,2jt. */
  function moneyShort(amount, settings) {
    var info = currencyInfo(settings);
    var n = toNumber(amount);
    var neg = n < 0;
    var abs = Math.abs(n);
    var d = info.dec;
    var out;
    if (abs >= 1e9) out = (abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace('.', d) + 'M';
    else if (abs >= 1e6) out = (abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace('.', d) + 'jt';
    /* Tier "rb" tanpa desimal supaya label sumbu chart tetap ringkas. */
    else if (abs >= 1e3) out = (abs / 1e3).toFixed(0) + 'rb';
    else out = String(round2(abs)).replace('.', d);
    return (neg ? '-' : '') + info.symbol + out;
  }

  function num(n, decimals, settings) {
    var d = typeof decimals === 'number' ? decimals : 0;
    var info = currencyInfo(settings);
    return fixed(toNumber(n), d, info.group, info.dec);
  }

  /* ── Tanggal ──
     Semua fungsi menerima Date atau string ISO 'YYYY-MM-DD'.
     Tanggal disimpan sebagai 'YYYY-MM-DD' agar tidak bergeser
     akibat zona waktu. */
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function toDate(v) {
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      var d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  function ymd(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  var MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function formatDate(v, fmt) {
    var d = toDate(v);
    if (!d) return '-';
    var f = fmt || 'DD/MM/YYYY';
    var DD = pad(d.getDate());
    var MM = pad(d.getMonth() + 1);
    var YYYY = String(d.getFullYear());
    if (f === 'MM/DD/YYYY') return MM + '/' + DD + '/' + YYYY;
    if (f === 'YYYY-MM-DD') return YYYY + '-' + MM + '-' + DD;
    return DD + '/' + MM + '/' + YYYY;
  }

  /* "Monday, 30 September 2026" */
  function longDate(v, locale) {
    var d = toDate(v);
    if (!d) return '-';
    var mi = d.getMonth();
    var di = d.getDate();
    var yi = d.getFullYear();
    if (locale === 'en') {
      var M = ['January','February','March','April','May','June','July',
               'August','September','October','November','December'];
      var D = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      return D[d.getDay()] + ', ' + di + ' ' + M[mi] + ' ' + yi;
    }
    return DAYS_ID[d.getDay()] + ', ' + di + ' ' + MONTHS_ID[mi] + ' ' + yi;
  }

  function monthKey(v) {
    var d = toDate(v);
    if (!d) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  function monthLabel(key, locale) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    if (!m) return String(key || '-');
    var idx = Number(m[2]) - 1;
    if (locale === 'en') {
      return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx] + ' ' + m[1];
    }
    return MONTHS_ID[idx] + ' ' + m[1];
  }

  function todayKey() { return ymd(new Date()); }

  function addDays(v, days) {
    var d = toDate(v);
    if (!d) return null;
    var c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    c.setDate(c.getDate() + days);
    return c;
  }

  /* Awal & akhir bulan untuk satu key bulan 'YYYY-MM'. */
  function monthRange(key) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]) - 1;
    return {
      start: new Date(y, mo, 1),
      end: new Date(y, mo + 1, 0)
    };
  }

  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    /* Beri waktu browser memulai unduhan sebelum blob dicabut. */
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  }

  var api = {
    CURRENCIES: CURRENCIES,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    currencyInfo: currencyInfo,
    toNumber: toNumber,
    round2: round2,
    money: money,
    moneyShort: moneyShort,
    num: num,
    pad: pad,
    ymd: ymd,
    toDate: toDate,
    formatDate: formatDate,
    longDate: longDate,
    monthKey: monthKey,
    monthLabel: monthLabel,
    todayKey: todayKey,
    addDays: addDays,
    monthRange: monthRange,
    csvCell: csvCell,
    download: download,
    stamp: stamp,
    MONTHS_ID: MONTHS_ID,
    DAYS_ID: DAYS_ID
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.fmt = api;
})();
