/* Potong Gambar — diekstrak dari pages/crop.html untuk Studio Tools.
   Semua id berawalan "cr-" agar tidak bentrok dengan fitur lain. */
(function () {
  'use strict';
const uploadArea = document.getElementById('cr-uploadArea');
    const fileInput = document.getElementById('cr-fileInput');
    const mainLayout = document.getElementById('cr-mainLayout');
    const previewContainer = document.getElementById('cr-previewContainer');
    const imageInfo = document.getElementById('cr-imageInfo');
    const splitInfo = document.getElementById('cr-splitInfo');
    const applyBtn = document.getElementById('cr-applyBtn');
    const downloadAllBtn = document.getElementById('cr-downloadAllBtn');
    const resultsSection = document.getElementById('cr-resultsSection');
    const resultsGrid = document.getElementById('cr-resultsGrid');
    const resetLinesBtn = document.getElementById('cr-resetLinesBtn');
    const hintBar = document.getElementById('cr-hintBar');

    const partsCount = document.getElementById('cr-partsCount');
    const partHeight = document.getElementById('cr-partHeight');
    const overlap = document.getElementById('cr-overlap');
    const keepOriginalSize = document.getElementById('cr-keepOriginalSize');
    const format = document.getElementById('cr-format');

    let originalImage = null;
    let cutPoints = [];          // Y positions of cut lines (between 0 and imgH)

    /* ───── Transform state ───── */
    const transform = { rot: 0, flipH: false, flipV: false };

    function isQuarterTurn() { return transform.rot === 90 || transform.rot === 270; }

    /* Dimensions of the image AFTER transform */
    function transformedSize() {
      const w = originalImage ? originalImage.naturalWidth : 0;
      const h = originalImage ? originalImage.naturalHeight : 0;
      return isQuarterTurn() ? { w: h, h: w } : { w: w, h: h };
    }

    function transformLabel() {
      const bits = [];
      if (transform.rot) bits.push(transform.rot + '\u00B0');
      if (transform.flipH) bits.push('balik H');
      if (transform.flipV) bits.push('balik V');
      return bits.length ? bits.join(' + ') : 'Normal';
    }

    /* CSS transform string for the preview <img> */
    function previewTransformCss() {
      const parts = [];
      if (transform.flipH || transform.flipV) {
        parts.push('scale(' + (transform.flipH ? -1 : 1) + ',' + (transform.flipV ? -1 : 1) + ')');
      }
      if (transform.rot) parts.push('rotate(' + transform.rot + 'deg)');
      return parts.length ? parts.join(' ') : '';
    }

    /* ───── Draw the source image with transform applied into a target ctx ───── */
    function drawTransformed(ctx, srcW, srcH, targetW, targetH) {
      ctx.save();
      // translate to target centre, then apply flip/rotate in transformed space
      ctx.translate(targetW / 2, targetH / 2);
      if (transform.flipH) ctx.scale(-1, 1);
      if (transform.flipV) ctx.scale(1, -1);
      if (transform.rot) ctx.rotate(transform.rot * Math.PI / 180);

      const dw = isQuarterTurn() ? targetH : targetW;
      const dh = isQuarterTurn() ? targetW : targetH;
      ctx.drawImage(originalImage, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }
    let currentParts = [];
    let mode = 'parts';          // 'parts' | 'height' | 'custom'

    /* global drag state */
    const dragState = { active: false, lineEl: null, startY: 0, cutIdx: -1, origCutY: 0, imgH: 0, scale: 1 };

    /* ───── Upload ───── */
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#6366f1'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#cbd5e1'; });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#cbd5e1';
      if (e.dataTransfer.files[0]?.type.startsWith('image/')) loadImage(e.dataTransfer.files[0]);
      else alert('Hanya file gambar yang didukung.');
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadImage(fileInput.files[0]); });

    /* ───── Mode toggle ───── */
    document.getElementById('cr-modeToggle').querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#modeToggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mode = btn.dataset.mode;
        document.getElementById('cr-partsMode').style.display = mode === 'parts' ? '' : 'none';
        document.getElementById('cr-heightMode').style.display = mode === 'height' ? '' : 'none';
        document.getElementById('cr-customMode').style.display = mode === 'custom' ? '' : 'none';
        resetLinesBtn.style.display = mode === 'custom' ? '' : 'none';
        if (originalImage) generateCutPointsFromMode();
      });
    });

    /* ───── Generate cut points from mode ───── */
    function generateCutPointsFromMode() {
      if (!originalImage) return;
      /* Panjang yang dipotong mengikuti sumbu vertikal SETELAH transform:
         rotasi 90/270 menukar lebar dan tinggi, sehingga memakai
         naturalHeight akan menghasilkan garis potong di tempat yang salah. */
      const imgH = transformedSize().h;
      cutPoints = [];

      if (mode === 'parts') {
        const count = Math.max(2, parseInt(partsCount.value) || 2);
        const partH = imgH / count;
        for (let i = 1; i < count; i++) {
          cutPoints.push(Math.round(i * partH));
        }
      } else if (mode === 'height') {
        const ph = parseInt(partHeight.value) || 800;
        let y = ph;
        while (y < imgH) {
          cutPoints.push(Math.round(y));
          y += ph;
        }
      }

      updatePreview();
    }

    /* ───── Load image ───── */
    function loadImage(file) {
      uploadArea.classList.add('has-file');
      document.querySelector('#cr-uploadArea p').innerHTML = `<strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          originalImage = img;
          transform.rot = 0;
          transform.flipH = false;
          transform.flipV = false;
          syncTransformUI();
          mainLayout.style.display = 'flex';
          applyBtn.disabled = false;
          resultsSection.style.display = 'none';
          resultsGrid.innerHTML = '';
          downloadAllBtn.disabled = true;
          generateCutPointsFromMode();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    /* ───── Compute parts from cutPoints ───── */
    function getParts() {
      if (!originalImage) return [];
      const imgH = transformedSize().h;   // Y axis is measured on the transformed image
      const ov = parseInt(overlap.value) || 0;
      const sorted = [...cutPoints].filter(p => p > 0 && p < imgH).sort((a, b) => a - b);
      const parts = [];
      let prev = 0;
      for (const cp of sorted) {
        const y = prev > 0 ? Math.max(0, prev - ov) : prev;
        const h = cp - prev + (prev > 0 ? ov : 0);
        parts.push({ y, h: Math.min(h, imgH - y) });
        prev = cp;
      }
      if (prev < imgH) {
        const y = prev > 0 ? Math.max(0, prev - ov) : prev;
        const h = imgH - prev + (prev > 0 ? ov : 0);
        parts.push({ y, h: Math.min(h, imgH - y) });
      }
      return parts.filter(p => p.h > 0);
    }

    /* ───── Update preview ───── */
    function updatePreview() {
      if (!originalImage) return;
      const size = transformedSize();
      const imgW = size.w;
      const imgH = size.h;
      const origW = originalImage.naturalWidth;
      const origH = originalImage.naturalHeight;
      imageInfo.textContent = `${origW} x ${origH} px${imgW !== origW || imgH !== origH ? ' \u2192 ' + imgW + ' x ' + imgH + ' px' : ''}`;

      const parts = getParts();
      const ov = parseInt(overlap.value) || 0;
      splitInfo.textContent = `${parts.length} bagian, ${cutPoints.length} garis potong, overlap ${ov}px`;

      const scale = keepOriginalSize.checked ? 1 : Math.min(1, 800 / imgW);
      const displayW = imgW * scale;
      const displayH = imgH * scale;

      const wrapper = document.createElement('div');
      wrapper.className = 'split-wrapper';
      wrapper.style.width = displayW + 'px';
      wrapper.style.height = displayH + 'px';

      /* Render the transformed image into a canvas so coordinates stay 1:1 */
      const cvs = document.createElement('canvas');
      cvs.width = Math.max(1, Math.round(imgW));
      cvs.height = Math.max(1, Math.round(imgH));
      const cctx = cvs.getContext('2d');
      drawTransformed(cctx, origW, origH, cvs.width, cvs.height);
      cvs.style.cssText = `display:block;width:${displayW}px;height:${displayH}px;`;
      cvs.draggable = false;
      wrapper.appendChild(cvs);

      /* click to add cut point (custom mode only) */
      if (mode === 'custom') {
        wrapper.style.cursor = 'crosshair';
        wrapper.addEventListener('click', (e) => {
          if (e.target !== cvs) return;
          const rect = cvs.getBoundingClientRect();
          const yPx = (e.clientY - rect.top) / scale;
          const y = Math.round(yPx);
          if (y > 5 && y < imgH - 5 && !cutPoints.some(cp => Math.abs(cp - y) < 10)) {
            cutPoints.push(y);
            cutPoints.sort((a, b) => a - b);
            updatePreview();
          }
        });
      } else {
        wrapper.style.cursor = '';
      }

      /* render cut lines */
      for (const cp of cutPoints) {
        const lineY = (cp / imgH) * displayH;
        const idx = cutPoints.indexOf(cp) + 1;

        const line = document.createElement('div');
        line.className = 'split-line';
        line.style.top = `${lineY}px`;
        line.dataset.label = `#${idx}`;

        const handle = document.createElement('div');
        handle.className = 'handle';
        handle.textContent = '⋮⋮';
        line.appendChild(handle);

        if (mode === 'custom') {
          const rmBtn = document.createElement('button');
          rmBtn.className = 'remove-btn';
          rmBtn.textContent = '×';
          rmBtn.title = 'Hapus garis';
          rmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cutPoints = cutPoints.filter(p => p !== cp);
            updatePreview();
          });
          line.appendChild(rmBtn);
        }

        line.addEventListener('mousedown', (ev) => {
          dragState.active = true;
          dragState.lineEl = line;
          dragState.startY = ev.clientY;
          dragState.cutIdx = cutPoints.indexOf(cp);
          dragState.origCutY = cp;
          dragState.imgH = imgH;
          dragState.scale = scale;
          line.classList.add('dragging');
          ev.preventDefault();
        });

        line.addEventListener('touchstart', (ev) => {
          dragState.active = true;
          dragState.lineEl = line;
          dragState.startY = ev.touches[0].clientY;
          dragState.cutIdx = cutPoints.indexOf(cp);
          dragState.origCutY = cp;
          dragState.imgH = imgH;
          dragState.scale = scale;
          line.classList.add('dragging');
          ev.preventDefault();
        }, { passive: false });

        wrapper.appendChild(line);
      }

      previewContainer.innerHTML = '';
      previewContainer.appendChild(wrapper);

      /* stats */
      const list = document.createElement('div');
      list.style.cssText = 'margin-top:0.75rem;font-size:0.8rem;color:#64748b;display:flex;flex-wrap:wrap;gap:0.25rem 1rem;';
      parts.forEach((p, i) => {
        const pos = document.createElement('span');
        pos.textContent = `#${i + 1}: y=${p.y}–${p.y + p.h}px (${p.h}px)`;
        list.appendChild(pos);
      });
      previewContainer.appendChild(list);
    }

    /* ───── Apply / Crop ───── */
    applyBtn.addEventListener('click', () => {
      if (!originalImage) return;
      applyBtn.textContent = 'Memotong...';
      applyBtn.disabled = true;

      setTimeout(() => {
        const parts = getParts();
        currentParts = [];
        resultsGrid.innerHTML = '';
        let completed = 0;

        parts.forEach((p, idx) => {
          const cvs = document.createElement('canvas');
          const size = transformedSize();
          const imgW = size.w;
          cvs.width = imgW;
          cvs.height = p.h;
          const ctx = cvs.getContext('2d');

          // Build the full transformed image once per part, then take the slice.
          // Cheaper alternative: draw whole transformed image, then crop via drawImage of itself.
          const full = document.createElement('canvas');
          full.width = imgW;
          full.height = size.h;
          const fctx = full.getContext('2d');
          drawTransformed(fctx, originalImage.naturalWidth, originalImage.naturalHeight, imgW, size.h);
          ctx.drawImage(full, 0, p.y, imgW, p.h, 0, 0, imgW, p.h);

          const fmt = format.value === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = fmt === 'image/jpeg' ? 0.92 : undefined;
          const dataUrl = cvs.toDataURL(fmt, quality);

          currentParts.push({ dataUrl, index: idx, y: p.y, h: p.h });

          const card = document.createElement('div');
          card.className = 'result-card';
          card.innerHTML = `
            <img src="${dataUrl}" alt="Bagian ${idx + 1}">
            <div class="label">
              <span>Bagian #${idx + 1} &middot; ${p.h}px</span>
              <a href="${dataUrl}" download="bagian-${idx + 1}.${format.value}">Download</a>
            </div>
          `;
          resultsGrid.appendChild(card);
          completed++;
          if (completed === parts.length) {
            resultsSection.style.display = '';
            downloadAllBtn.disabled = false;
            applyBtn.textContent = 'Potong & Tampilkan';
            applyBtn.disabled = false;
            resultsSection.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }, 100);
    });

    /* ───── Transform controls ───── */
    const rotLeftBtn = document.getElementById('cr-rotLeftBtn');
    const rotRightBtn = document.getElementById('cr-rotRightBtn');
    const flipHBtn = document.getElementById('cr-flipHBtn');
    const flipVBtn = document.getElementById('cr-flipVBtn');
    const resetTransformBtn = document.getElementById('cr-resetTransformBtn');
    const transformNote = document.getElementById('cr-transformNote');

    function syncTransformUI() {
      transformNote.textContent = 'Orientasi: ' + transformLabel();
      rotLeftBtn.classList.toggle('on', transform.rot === 270);
      rotRightBtn.classList.toggle('on', transform.rot === 90);
      flipHBtn.classList.toggle('on', transform.flipH);
      flipVBtn.classList.toggle('on', transform.flipV);
      const identity = transform.rot === 0 && !transform.flipH && !transform.flipV;
      resetTransformBtn.classList.toggle('on', !identity);
    }

    function applyTransformChange() {
      syncTransformUI();
      /* Cut point dihitung dari sumbu vertikal gambar yang sudah ditransform,
         jadi mode 'parts' dan 'height' harus dihitung ulang dari nol. */
      cutPoints = [];
      resultsSection.style.display = 'none';
      downloadAllBtn.disabled = true;
      resultsGrid.innerHTML = '';
      if (mode === 'parts' || mode === 'height') {
        generateCutPointsFromMode();
      } else {
        updatePreview();
      }
    }

    rotLeftBtn.addEventListener('click', () => {
      transform.rot = (transform.rot + 270) % 360;
      applyTransformChange();
    });
    rotRightBtn.addEventListener('click', () => {
      transform.rot = (transform.rot + 90) % 360;
      applyTransformChange();
    });
    flipHBtn.addEventListener('click', () => {
      transform.flipH = !transform.flipH;
      applyTransformChange();
    });
    flipVBtn.addEventListener('click', () => {
      transform.flipV = !transform.flipV;
      applyTransformChange();
    });
    resetTransformBtn.addEventListener('click', () => {
      transform.rot = 0;
      transform.flipH = false;
      transform.flipV = false;
      applyTransformChange();
    });

    syncTransformUI();

    /* ───── Download All ZIP ───── */

    downloadAllBtn.addEventListener('click', async () => {
      downloadAllBtn.disabled = true;
      downloadAllBtn.textContent = 'Membuat ZIP...';
      try {
        const zip = new JSZip();
        const ext = format.value === 'jpeg' ? 'jpg' : 'png';
        for (const part of currentParts) {
          zip.file(`bagian-${part.index + 1}.${ext}`, part.dataUrl.split(',')[1], { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `potongan-gambar.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (err) {
        alert('Gagal membuat ZIP: ' + err.message);
      }
      downloadAllBtn.disabled = false;
      downloadAllBtn.textContent = 'Download Semua (ZIP)';
    });

    /* ───── Reset ───── */
    resetLinesBtn.addEventListener('click', () => {
      cutPoints = [];
      updatePreview();
    });

    /* ───── Global drag handlers ───── */
    document.addEventListener('mousemove', (ev) => {
      if (!dragState.active || dragState.cutIdx < 0) return;
      const delta = (ev.clientY - dragState.startY);
      const newY = Math.round(dragState.origCutY + delta / dragState.scale);
      const clampedY = Math.max(5, Math.min(dragState.imgH - 5, newY));
      cutPoints[dragState.cutIdx] = clampedY;
      cutPoints.sort((a, b) => a - b);
      dragState.origCutY = clampedY;
      dragState.cutIdx = cutPoints.indexOf(clampedY);
      updatePreview();
    });

    document.addEventListener('mouseup', () => {
      if (!dragState.active) return;
      dragState.active = false;
      dragState.lineEl = null;
      dragState.cutIdx = -1;
    });

    document.addEventListener('touchmove', (ev) => {
      if (!dragState.active || dragState.cutIdx < 0) return;
      const delta = (ev.touches[0].clientY - dragState.startY);
      const newY = Math.round(dragState.origCutY + delta / dragState.scale);
      const clampedY = Math.max(5, Math.min(dragState.imgH - 5, newY));
      cutPoints[dragState.cutIdx] = clampedY;
      cutPoints.sort((a, b) => a - b);
      dragState.origCutY = clampedY;
      dragState.cutIdx = cutPoints.indexOf(clampedY);
      updatePreview();
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!dragState.active) return;
      dragState.active = false;
      dragState.lineEl = null;
      dragState.cutIdx = -1;
    });

    /* ───── Input events ───── */
    partsCount.addEventListener('input', () => { if (originalImage && mode === 'parts') generateCutPointsFromMode(); });
    partHeight.addEventListener('input', () => { if (originalImage && mode === 'height') generateCutPointsFromMode(); });
    overlap.addEventListener('input', () => { if (originalImage) updatePreview(); });
    keepOriginalSize.addEventListener('change', () => { if (originalImage) updatePreview(); });
})();
