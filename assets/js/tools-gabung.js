/* Gabung ke PDF — diekstrak dari pages/gabung.html untuk Studio Tools.
   Semua id berawalan "gb-" agar tidak bentrok dengan fitur lain. */
(function () {
  'use strict';
const uploadArea = document.getElementById('gb-uploadArea');
    const fileInput = document.getElementById('gb-fileInput');
    const mainLayout = document.getElementById('gb-mainLayout');
    const imageList = document.getElementById('gb-imageList');
    const imageCount = document.getElementById('gb-imageCount');
    const totalSize = document.getElementById('gb-totalSize');
    const convertBtn = document.getElementById('gb-convertBtn');
    const downloadPdfBtn = document.getElementById('gb-downloadPdfBtn');
    const addMoreBtn = document.getElementById('gb-addMoreBtn');
    const progressContainer = document.getElementById('gb-progressContainer');
    const progressBar = document.getElementById('gb-progressBar');
    const progressFill = document.getElementById('gb-progressFill');
    const progressText = document.getElementById('gb-progressText');

    const pageSize = document.getElementById('gb-pageSize');
    const orientation = document.getElementById('gb-orientation');
    const margin = document.getElementById('gb-margin');
    const fitMode = document.getElementById('gb-fitMode');
    const wmText = document.getElementById('gb-wmText');
    const wmOpacity = document.getElementById('gb-wmOpacity');
    const wmOpacityVal = document.getElementById('gb-wmOpacityVal');
    const jpegQuality = document.getElementById('gb-jpegQuality');
    const jpegQualityVal = document.getElementById('gb-jpegQualityVal');

    wmOpacity.addEventListener('input', () => { wmOpacityVal.textContent = wmOpacity.value; });
    jpegQuality.addEventListener('input', () => { jpegQualityVal.textContent = jpegQuality.value; });

    let images = [];

    /* ───── Upload ───── */
    function handleFiles(files) {
      let added = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const reader = new FileReader();
        reader.fileName = file.name;
        reader.fileSize = file.size;
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            images.push({
              name: e.target.fileName,
              size: e.target.fileSize,
              width: img.naturalWidth,
              height: img.naturalHeight,
              dataUrl: img.src,
              img: img,
            });
            added++;
            if (added === files.length) {
              renderList();
            }
          };
          img.src = e.target.result;
        };
        reader.fileName = file.name;
        reader.fileSize = file.size;
        reader.readAsDataURL(file);
      }
    }

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#6366f1'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#cbd5e1'; });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#cbd5e1';
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) { alert('Hanya file gambar yang didukung.'); return; }
      uploadArea.style.display = 'none';
      mainLayout.style.display = 'flex';
      handleFiles(files);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        uploadArea.style.display = 'none';
        mainLayout.style.display = 'flex';
        handleFiles(Array.from(fileInput.files));
        fileInput.value = '';
      }
    });

    /* ───── Add More ───── */
    addMoreBtn.addEventListener('click', () => addMoreBtn.querySelector('input').click());
    addMoreBtn.querySelector('input').addEventListener('change', () => {
      if (addMoreBtn.querySelector('input').files.length > 0) {
        handleFiles(Array.from(addMoreBtn.querySelector('input').files));
        addMoreBtn.querySelector('input').value = '';
      }
    });

    /* ───── Render List ───── */
    function renderList() {
      if (images.length === 0) {
        imageList.innerHTML = `<div class="empty-state">&#128444;<p>Upload gambar untuk memulai</p></div>`;
        imageCount.textContent = '0 gambar';
        totalSize.textContent = '0 KB';
        convertBtn.disabled = true;
        addMoreBtn.style.display = 'none';
        downloadPdfBtn.style.display = 'none';
        return;
      }

      let html = '';
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const sizeKB = (img.size / 1024).toFixed(1);
        html += `
          <div class="image-card" data-index="${i}">
            <div class="thumb">
              <img src="${img.dataUrl}" alt="${img.name}">
            </div>
            <div class="info">
              <div class="name">${img.name}</div>
              <div class="detail">${img.width} x ${img.height} px &middot; ${sizeKB} KB</div>
            </div>
            <div class="actions">
              <button class="btn-move" data-action="move-up" ${i === 0 ? 'disabled' : ''} title="Naik">&uarr;</button>
              <button class="btn-move" data-action="move-down" ${i === images.length - 1 ? 'disabled' : ''} title="Turun">&darr;</button>
              <button class="btn-remove" data-action="remove" title="Hapus">&times;</button>
            </div>
          </div>
        `;
      }
      imageList.innerHTML = html;

      const totalKB = images.reduce((sum, img) => sum + img.size, 0) / 1024;
      imageCount.textContent = `${images.length} gambar`;
      totalSize.textContent = `${totalKB.toFixed(1)} KB`;
      convertBtn.disabled = false;
      downloadPdfBtn.style.display = 'none';
      addMoreBtn.style.display = '';

      /* attach events */
      imageList.querySelectorAll('.image-card').forEach(card => {
        const idx = parseInt(card.dataset.index);
        card.querySelector('[data-action="move-up"]').addEventListener('click', () => moveImage(idx, -1));
        card.querySelector('[data-action="move-down"]').addEventListener('click', () => moveImage(idx, 1));
        card.querySelector('[data-action="remove"]').addEventListener('click', () => removeImage(idx));
      });
    }

    /* ───── Move / Remove ───── */
    function moveImage(idx, dir) {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= images.length) return;
      [images[idx], images[newIdx]] = [images[newIdx], images[idx]];
      renderList();
    }

    function removeImage(idx) {
      images.splice(idx, 1);
      renderList();
    }

    /* ───── Page size helpers ───── */
    function getPageDimensions() {
      const sizes = {
        a4: [210, 297],
        letter: [216, 279],
        legal: [216, 356],
        a3: [297, 420],
      };
      let [w, h] = sizes[pageSize.value] || sizes.a4;
      if (orientation.value === 'landscape') [w, h] = [h, w];
      return { w, h };
    }

    /* -- Watermark: rotated text across the page centre -- */
    function applyWatermark(doc, pageW, pageH) {
      const text = wmText.value.trim();
      if (!text) return;
      const alpha = Math.max(0.03, Math.min(0.8, (parseInt(wmOpacity.value, 10) || 15) / 100));
      const fontSize = Math.max(18, Math.min(pageW, pageH) * 0.14);
      doc.setFontSize(fontSize);
      try {
        doc.setTextColor(120, 120, 128);
        doc.text(text, pageW / 2, pageH / 2, {
          align: 'center',
          angle: 45,
          opacity: alpha,
        });
      } catch (e) {
        doc.setTextColor(195, 195, 200);
        doc.text(text, pageW / 2, pageH / 2, { align: 'center', angle: 45 });
      }
    }

    /* -- Compression: re-encode via canvas at the chosen JPEG quality -- */
    function compressImage(img, qualityPct) {
      const q = Math.max(0.4, Math.min(1, (parseInt(qualityPct, 10) || 85) / 100));
      if (q >= 0.999) return Promise.resolve(null);
      return new Promise(function (resolve) {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const cx = c.getContext('2d');
          cx.fillStyle = '#ffffff';
          cx.fillRect(0, 0, c.width, c.height);
          cx.drawImage(img, 0, 0);
          resolve(c.toDataURL('image/jpeg', q));
        } catch (e) {
          resolve(null);
        }
      });
    }

    /* ───── Convert to PDF ───── */
    convertBtn.addEventListener('click', async () => {
      if (images.length === 0) return;

      convertBtn.disabled = true;
      convertBtn.textContent = 'Membuat PDF...';
      progressContainer.style.display = '';
      progressBar.style.display = '';
      progressFill.style.width = '0%';
      progressText.textContent = 'Mempersiapkan...';

      await new Promise(r => setTimeout(r, 50));

      try {
        const { w, h } = getPageDimensions();
        const m = parseInt(margin.value) || 20;
        const fit = fitMode.value;

        const doc = new jspdf.jsPDF({
          orientation: orientation.value === 'landscape' ? 'l' : 'p',
          unit: 'mm',
          format: pageSize.value,
        });

        const pageW = w - m * 2;
        const pageH = h - m * 2;

        for (let i = 0; i < images.length; i++) {
          const img = images[i];

          progressFill.style.width = `${((i) / images.length) * 100}%`;
          progressText.textContent = `Memproses gambar ${i + 1} dari ${images.length}: ${img.name}`;

          if (i > 0) doc.addPage();

          let imgW, imgH;
          const origW = img.width;
          const origH = img.height;

          if (fit === 'original') {
            const dpi = 72;
            const mmPerPx = 25.4 / dpi;
            imgW = origW * mmPerPx;
            imgH = origH * mmPerPx;
          } else if (fit === 'width') {
            imgW = pageW;
            imgH = (origH / origW) * imgW;
          } else {
            const scale = Math.min(pageW / origW, pageH / origH);
            imgW = origW * scale;
            imgH = origH * scale;
          }

          const x = m + (pageW - imgW) / 2;
          const y = m + (pageH - imgH) / 2;

          const compressed = await compressImage(img.img, jpegQuality.value);
          const src = compressed || img.dataUrl;
          const fmt = src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(src, fmt, x, y, imgW, imgH, undefined, 'FAST');

          applyWatermark(doc, w, h);
        }

        progressFill.style.width = '100%';
        progressText.textContent = 'PDF siap diunduh!';

        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        downloadPdfBtn.style.display = '';
        downloadPdfBtn.onclick = () => {
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `gabungan-${Date.now()}.pdf`;
          link.click();
        };

        convertBtn.textContent = 'Buat PDF';
        convertBtn.disabled = false;
      } catch (err) {
        alert('Gagal membuat PDF: ' + err.message);
        convertBtn.textContent = 'Buat PDF';
        convertBtn.disabled = false;
        progressContainer.style.display = 'none';
      }
    });
})();
