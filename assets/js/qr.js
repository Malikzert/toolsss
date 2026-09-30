/* COFDE QR Tools - pembuat dan pembaca kode QR.
   Generator memakai pustaka qrcode-generator (MIT) yang dimuat dari CDN.
   Saat pertama kali berhasil dimuat, pustaka diingat untuk sesi ini dan
   akan ikut dicache oleh service worker. Kalau CDN tak pernah tersedia
   (mis. pertama kali akses dalam keadaan offline), tool ini menolak
   dengan jelas daripada menghasilkan QR yang salah diam-diam.

   Pembaca: memakai BarcodeDetector bawaan jika ada, atau jsQR dari CDN.
   Semua pemrosesan terjadi di browser, gambar tidak dikirim ke server. */
(function () {
  'use strict';

  var encoderLib = null;
  var jsQrLib = null;
  var lastSource = null;

  var CDN_QR = [
    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
    'https://unpkg.com/qrcode-generator@1.4.4/qrcode.min.js',
    'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js'
  ];

  var CDN_JSQR = [
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
    'https://unpkg.com/jsqr@1.4.0/dist/jsQR.min.js'
  ];

  function injectScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(src); };
      s.onerror = function () { reject(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* Coba satu per satu; berhenti saat variabel global yang diinginkan ada. */
  function loadUntil(candidates, check, what) {
    if (!navigator.onLine) {
      return Promise.reject(new Error('Kamu sedang offline dan ' + what + ' belum pernah dimuat. Muat sekali saat online agar bisa dipakai offline.'));
    }
    var i = 0;
    function next() {
      if (i >= candidates.length) {
        return Promise.reject(new Error(what + ' tidak bisa dimuat dari CDN. Cek koneksi atau coba lagi.'));
      }
      var url = candidates[i++];
      return injectScript(url).then(function (src) {
        if (check()) { lastSource = src; return true; }
        return next();
      }, next);
    }
    return next();
  }

  function utf8Bytes(s) {
    var bytes = new TextEncoder().encode(String(s == null ? '' : s));
    var arr = new Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) arr[i] = bytes[i];
    return arr;
  }

  function ensureEncoder() {
    if (encoderLib) return Promise.resolve(encoderLib);
    return loadUntil(CDN_QR, function () { return typeof window.qrcode === 'function'; }, 'Pustaka QR generator').then(function () {
      encoderLib = window.qrcode;
      encoderLib.stringToBytes = utf8Bytes;
      return encoderLib;
    });
  }

  function ensureJsQr() {
    if (jsQrLib) return Promise.resolve(jsQrLib);
    return loadUntil(CDN_JSQR, function () { return typeof window.jsQR === 'function'; }, 'Pustaka pembaca QR (jsQR)').then(function () {
      jsQrLib = window.jsQR;
      return jsQrLib;
    });
  }

  function eccValid(ecc) {
    return ecc === 'L' || ecc === 'M' || ecc === 'Q' || ecc === 'H';
  }

  /* Matriks bool [row][col]; tanpa quiet zone (khas qrcode-generator). */
  function createMatrix(text, ecc) {
    var eccUp = String(ecc || 'M').toUpperCase();
    if (!eccValid(eccUp)) return Promise.reject(new Error('Tingkat ECC harus L, M, Q, atau H.'));
    return ensureEncoder().then(function (lib) {
      if (typeof text !== 'string' || text === '') throw new Error('Teks masih kosong.');
      var qr = lib(0, eccUp);
      qr.addData(text, 'Byte');
      qr.make();
      var n = qr.getModuleCount();
      var bits = [];
      for (var r = 0; r < n; r++) {
        var row = [];
        for (var c = 0; c < n; c++) row.push(qr.isDark(r, c));
        bits.push(row);
      }
      return { size: n, bits: bits, ecc: eccUp, text: text };
    });
  }

  function draw(matrix, opts) {
    opts = opts || {};
    var scaleN = Number(opts.scale);
    var scale = isFinite(scaleN) && scaleN > 0 ? Math.max(1, Math.min(24, scaleN)) : 4;
    var margN = Number(opts.margin);
    var margin = isFinite(margN) ? Math.max(0, Math.min(16, margN)) : 4;
    var fg = opts.fg || '#000000';
    var bg = opts.bg || '#ffffff';
    var n = matrix.size;
    var canvas = document.createElement('canvas');
    canvas.width = (n + margin * 2) * scale;
    canvas.height = (n + margin * 2) * scale;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fg;
    var off = margin * scale;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (matrix.bits[r][c]) ctx.fillRect(off + c * scale, off + r * scale, scale, scale);
      }
    }
    return canvas;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('Konversi ke PNG gagal.'));
      }, type || 'image/png', quality);
    });
  }

  function toDataURL(canvas) {
    try { return canvas.toDataURL('image/png'); }
    catch (e) { return null; }
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'cofde-qr.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  /* info dasar: panjang, perkiraan mode, dan ukuran hasil tanpa membuat. */
  function describe(text, ecc) {
    var s = String(text || '');
    var mode = 'Byte (UTF-8)';
    if (s && /^[0-9]+$/.test(s)) mode = 'Numeric';
    else if (s && /^[0-9A-Z $%*+\-./:]*$/.test(s)) mode = 'Alphanumeric';
    return {
      length: s.length,
      mode: mode,
      bytes: utf8Bytes(s).length,
      ecc: String(ecc || 'M').toUpperCase()
    };
  }

  /* Pindai: BarcodeDetector bila ada, lalu jsQR. Terima canvas, img,
     video, atau ImageData. Semua lokal. */
  function scan(target) {
    var data = null;
    var cropEl = null;
    if (target && typeof ImageData !== 'undefined' && target instanceof ImageData) {
      data = target;
      cropEl = null;
    } else {
      cropEl = target;
      var w = (target && (target.naturalWidth || target.videoWidth || target.width)) || 0;
      var h = (target && (target.naturalHeight || target.videoHeight || target.height)) || 0;
      if (!w || !h) return Promise.reject(new Error('Gambar kosong atau gagal dibaca.'));
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      var ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(target, 0, 0, w, h);
      data = ctx.getImageData(0, 0, w, h);
      cropEl = c;
    }

    if (window.BarcodeDetector) {
      try {
        var detector = new BarcodeDetector({ formats: ['qr_code'] });
        return detector.detect(cropEl || makeCanvasFromImageData(data)).then(function (res) {
          if (res && res.length && res[0].rawValue) {
            return { source: 'BarcodeDetector', text: res[0].rawValue, points: res[0].cornerPoints };
          }
          return scanWithJsQr(data);
        }, function () { return scanWithJsQr(data); });
      } catch (e) { /* fall through */ }
    }
    return scanWithJsQr(data);
  }

  function makeCanvasFromImageData(data) {
    var c = document.createElement('canvas');
    c.width = data.width;
    c.height = data.height;
    c.getContext('2d').putImageData(data, 0, 0);
    return c;
  }

  function scanWithJsQr(data) {
    return ensureJsQr().then(function (decoder) {
      var r = decoder(data.data, data.width, data.height);
      if (r && r.data) {
        return { source: 'jsQR', text: r.data, points: r.location };
      }
      return null;
    });
  }

  var api = {
    ensureEncoder: ensureEncoder,
    ensureScanner: ensureJsQr,
    createMatrix: createMatrix,
    draw: draw,
    canvasToBlob: canvasToBlob,
    toDataURL: toDataURL,
    downloadBlob: downloadBlob,
    describe: describe,
    scan: scan,
    lastSource: function () { return lastSource; }
  };

  window.COFDE = window.COFDE || {};
  window.COFDE.qr = api;
})();