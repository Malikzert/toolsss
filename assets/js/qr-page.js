/* COFDE QR Tools - controller halaman. Semua pemrosesan lokal di browser. */
(function () {
  'use strict';

  var Q = COFDE.qr;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var currentMatrix = null;
  var currentText = '';
  var camStream = null;
  var camLoopId = 0;

  function on(id, fn) {
    var el = $(id);
    if (el) el.addEventListener('click', fn);
  }

  function wireNet() {
    var badge = $('netBadge');
    if (badge && COFDE.net) COFDE.net.badge(badge);
  }

  function copy(text, label) {
    var value = String(text || '');
    if (!value) { COFDE.toast.info('Tidak ada isi untuk disalin.'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        COFDE.toast.success((label || 'Hasil') + ' disalin.');
      }, fallbackCopy);
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); COFDE.toast.success((label || 'Hasil') + ' disalin.'); }
      catch (e) { COFDE.toast.error('Gagal menyalin, salin manual.'); }
      document.body.removeChild(ta);
    }
  }

  function describeInfo() {
    var info = Q.describe($('qrText').value, $('qrEcc').value);
    $('qrInfo').textContent = 'Mode: ' + info.mode + ' | Panjang: ' + info.length +
      ' karakter | Byte UTF-8: ' + info.bytes + ' | ECC: ' + info.ecc +
      (info.mode === 'Byte (UTF-8)' && info.length > 0 ? ' (non-ASCII menggunakan byte UTF-8)' : '');
  }

  function createQr() {
    var text = $('qrText').value;
    if (!text.trim()) {
      $('qrStatus').textContent = 'Teks QR masih kosong.';
      COFDE.toast.info('Teks QR masih kosong.');
      return;
    }
    $('qrStatus').textContent = 'Membuat QR...';
    Q.createMatrix(text, $('qrEcc').value).then(function (matrix) {
      currentMatrix = matrix;
      currentText = text;
      var canvas = Q.draw(matrix, {
        scale: Number($('qrScale').value) || 5,
        margin: Number($('qrMargin').value)
      });
      $('qrCanvasWrap').innerHTML = '';
      $('qrCanvasWrap').appendChild(canvas);
      $('qrStatus').textContent = 'Ukuran ' + matrix.size + ' x ' + matrix.size +
        ' modul, ECC ' + matrix.ecc + '. QR sudah siap dipindai.';
      return canvas;
    }, function (e) {
      $('qrStatus').textContent = e.message;
      COFDE.toast.error(e.message);
    });
  }

  on('qrCreate', createQr);

  on('qrDownload', function () {
    if (!currentMatrix || !$('qrCanvasWrap').firstChild) {
      COFDE.toast.info('Buat QR dulu sebelum mengunduh.');
      return;
    }
    Q.canvasToBlob($('qrCanvasWrap').firstChild, 'image/png').then(function (blob) {
      Q.downloadBlob(blob, 'cofde-qr-' + currentMatrix.size + '-' + currentMatrix.ecc + '.png');
      COFDE.toast.success('QR diunduh.');
    }, function (e) { COFDE.toast.error(e.message); });
  });

  on('qrCopy', function () {
    copy(currentText || $('qrText').value, 'Isi QR');
  });

  $('qrText').addEventListener('input', describeInfo);
  $('qrEcc').addEventListener('change', describeInfo);

  /* ── Tabs ── */
  (function wireTabs() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.cx-tab'));
    var panels = { create: $('tab-create'), scan: $('tab-scan') };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.classList.toggle('cx-tab', true); x.classList.toggle('active', x === b); });
        Object.keys(panels).forEach(function (k) {
          panels[k].classList.toggle('cx-hidden', k !== b.dataset.tab);
        });
      });
    });
  })();

  /* ── Pindai dari file ── */
  $('qrFile').addEventListener('change', function () {
    var file = this.files && this.files[0];
    var img = $('qrImg');
    if (!file) { img.classList.add('cx-hidden'); return; }
    var url = URL.createObjectURL(file);
    img.onload = function () {
      $('qrScanResult').textContent = '';
      URL.revokeObjectURL(url);
    };
    img.src = url;
    img.classList.remove('cx-hidden');
  });

  on('qrScanFile', function () {
    var img = $('qrImg');
    if (!img.src) {
      COFDE.toast.info('Pilih gambar QR dulu.');
      return;
    }
    if (!COFDE.net.requireNet && navigator.onLine === false && !window.BarcodeDetector) {
      $('qrScanResult').textContent = 'Butuh koneksi untuk memuat pembaca QR cadangan.';
      return;
    }
    $('qrScanResult').textContent = 'Memindai...';
    Q.scan(img).then(function (r) {
      renderScanResult(r);
    }, function (e) {
      $('qrScanResult').innerHTML = '<p class="cx-note">Gagal memindai: ' + esc(e.message) + '</p>';
    });
  });

  function renderScanResult(r) {
    if (!r) {
      $('qrScanResult').innerHTML = '<p class="cx-note">Tidak ada kode QR yang terbaca. Coba gambar yang lebih jelas.</p>';
      return;
    }
    $('qrScanResult').innerHTML =
      '<div class="cx-journal"><div class="cx-stat-label">Pembaca: ' + esc(r.source) + '</div>' +
      '<div class="cx-mono" id="scanText">' + esc(r.text) + '</div></div>';
  }

  on('qrCopyResult', function () {
    var el = $('scanText');
    copy(el && el.textContent, 'Hasil QR');
  });

  /* ── Kamera (BarcodeDetector wajib; gagal = saran pakai file) ── */
  on('qrCamStart', function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      COFDE.toast.error('Kamera tidak didukung di browser ini. Gunakan scan file.');
      return;
    }
    if (!window.BarcodeDetector) {
      COFDE.toast.warning('Browser ini tidak punya BarcodeDetector, jadi kamera tidak bisa memindai. Gunakan scan file.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (stream) {
      camStream = stream;
      $('qrVideo').srcObject = stream;
      $('qrCamWrap').style.display = 'block';
      $('qrCamStart').disabled = true;
      $('qrCamStop').disabled = false;
      camLoopId += 1;
      runCameraLoop(camLoopId);
    }, function (e) {
      COFDE.toast.error('Kamera tidak bisa diakses: ' + e.message);
    });
  });

  function runCameraLoop(id) {
    var detector;
    try { detector = new BarcodeDetector({ formats: ['qr_code'] }); }
    catch (e) { detector = null; }
    (function tick() {
      if (id !== camLoopId || !camStream) return;
      var video = $('qrVideo');
      if (detector && video.readyState >= 2 && !video.paused) {
        detector.detect(video).then(function (res) {
          if (res && res.length && res[0].rawValue) {
            renderScanResult({ source: 'BarcodeDetector (kamera)', text: res[0].rawValue });
            stopCamera();
            return;
          }
          setTimeout(tick, 400);
        }, function () { setTimeout(tick, 600); });
      } else {
        setTimeout(tick, 500);
      }
    })();
  }

  function stopCamera() {
    camLoopId += 1;
    if (camStream) {
      camStream.getTracks().forEach(function (t) { t.stop(); });
      camStream = null;
    }
    $('qrVideo').srcObject = null;
    $('qrCamWrap').style.display = 'none';
    $('qrCamStart').disabled = false;
    $('qrCamStop').disabled = true;
  }

  on('qrCamStop', stopCamera);

  /* ── Init ── */
  function init() {
    wireNet();
    $('qrText').value = 'https://malikzert.github.io/toolsss/';
    describeInfo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* Ekspor untuk pengujian. */
  window.COFDE.qrPage = window.__qrPage = {
    describeInfo: describeInfo, createQr: createQr, renderScanResult: renderScanResult,
    currentText: function () { return currentText; },
    hasMatrix: function () { return !!currentMatrix; }
  };
})();