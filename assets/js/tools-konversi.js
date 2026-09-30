/* Konversi — diekstrak dari pages/konversi.html untuk Studio Tools.
   Semua id berawalan "kv-" agar tidak bentrok dengan fitur lain. */
(function () {
  'use strict';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const MODES = [
      { id: 'pdf2md',   from: 'PDF',    name: 'PDF &rarr; Markdown',   ext: 'md',  accept: '.pdf',              note: 'Ekstrak teks, deteksi heading' },
      { id: 'pdf2txt',  from: 'PDF',    name: 'PDF &rarr; Teks',       ext: 'txt', accept: '.pdf',              note: 'Teks polos per halaman' },
      { id: 'pdf2docx', from: 'PDF',    name: 'PDF &rarr; Word',       ext: 'docx',accept: '.pdf',              note: ' paragraf + judul' },
      { id: 'docx2pdf', from: 'DOCX',   name: 'Word &rarr; PDF',       ext: 'pdf', accept: '.docx',             note: 'Layout A4 dari isi dokumen' },
      { id: 'docx2md',  from: 'DOCX',   name: 'Word &rarr; Markdown',  ext: 'md',  accept: '.docx',             note: 'Judul, list, tabel, bold' },
      { id: 'docx2txt', from: 'DOCX',   name: 'Word &rarr; Teks',      ext: 'txt', accept: '.txt,.doc,.docx',   note: 'Teks polos saja' },
    ];

    const convGrid = document.getElementById('kv-convGrid');
    const uploadArea = document.getElementById('kv-uploadArea');
    const fileInput = document.getElementById('kv-fileInput');
    const uploadHint = document.getElementById('kv-uploadHint');
    const panel = document.getElementById('kv-panel');
    const panelName = document.getElementById('kv-panelName');
    const panelMeta = document.getElementById('kv-panelMeta');
    const output = document.getElementById('kv-output');
    const optRow = document.getElementById('kv-optRow');
    const previewArea = document.getElementById('kv-previewArea');
    const runBtn = document.getElementById('kv-runBtn');
    const downloadBtn = document.getElementById('kv-downloadBtn');
    const copyBtn = document.getElementById('kv-copyBtn');
    const resetBtn = document.getElementById('kv-resetBtn');

    let mode = null;
    let currentFile = null;
    let outputText = '';
    let outputBlob = null;
    let pdfSourceEl = null;
    const optState = { heading: true, pageBreak: true, keepTables: true };

    /* ───────── Batch mode ───────── */
    const batchToggleWrap = document.getElementById('kv-batchToggleWrap');
    const batchToggle = document.getElementById('kv-batchToggle');
    const batchPanel = document.getElementById('kv-batchPanel');
    const batchName = document.getElementById('kv-batchName');
    const batchList = document.getElementById('kv-batchList');
    const batchRunBtn = document.getElementById('kv-batchRunBtn');
    const batchDownloadBtn = document.getElementById('kv-batchDownloadBtn');
    const batchResetBtn = document.getElementById('kv-batchResetBtn');
    const batchProgressWrap = document.getElementById('kv-batchProgressWrap');
    const batchProgressFill = document.getElementById('kv-batchProgressFill');
    const batchProgressText = document.getElementById('kv-batchProgressText');
    const batchSummary = document.getElementById('kv-batchSummary');

    let batchFiles = [];
    let batchZipBlob = null;

    function isBatch() { return batchToggle.checked; }

    function renderBatchList() {
      batchList.innerHTML = '';
      batchFiles.forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'batch-item';
        const stat = f.status === 'done' ? 'ok' : f.status === 'error' ? 'err' : f.status === 'run' ? 'run' : 'wait';
        const statText = f.status === 'done' ? 'OK' : f.status === 'error' ? 'GAGAL' : f.status === 'run' ? '...' : 'menunggu';
        row.innerHTML =
          '<span class="bname" title="' + esc(f.name) + '">' + esc(f.name) + '</span>' +
          '<span class="bsize">' + (f.size / 1024).toFixed(1) + ' KB</span>' +
          '<span class="bstat ' + stat + '">' + statText + '</span>';
        batchList.appendChild(row);
      });
    }

    function resetBatch() {
      batchFiles = [];
      batchZipBlob = null;
      batchList.innerHTML = '';
      batchSummary.textContent = '';
      batchProgressWrap.classList.add('hidden');
      batchProgressFill.style.width = '0%';
      batchProgressText.textContent = '';
      batchDownloadBtn.disabled = true;
      batchPanel.classList.add('hidden');
    }

    function onBatchFiles(fileListIn) {
      const arr = Array.from(fileListIn);
      if (!arr.length) return;
      if (!mode) { alert('Pilih mode konversi dulu di atas.'); return; }

      // filter by the mode's accepted extension
      const accepted = mode.accept.split(',').map(s => s.trim().toLowerCase());
      const picked = [], rejected = [];
      arr.forEach(f => {
        const dot = f.name.lastIndexOf('.');
        const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : '';
        if (accepted.includes(ext)) picked.push({ file: f, name: f.name, size: f.size, status: 'wait' });
        else rejected.push(f.name);
      });

      if (!picked.length) { alert('Tidak ada file yang cocok dengan format ' + mode.accept); return; }

      resetBatch();
      batchFiles = picked;
      batchName.innerHTML = esc(mode.from) + ' &rarr; ' + esc(mode.name.split('&rarr;')[1] || mode.name);
      batchPanel.classList.remove('hidden');
      uploadArea.style.display = 'none';
      renderBatchList();
      batchSummary.textContent = picked.length + ' file siap. Klik &quot;Konversi Semua&quot; untuk memproses.' +
        (rejected.length ? ' ' + rejected.length + ' file dilewati karena format tidak cocok.' : '');
    }

    batchToggle.addEventListener('change', () => {
      if (isBatch()) {
        panel.classList.add('hidden');
        previewArea.classList.add('hidden');
        resetPanel(true);
        fileInput.multiple = true;
        if (currentFile || batchFiles.length) uploadArea.style.display = 'none';
      } else {
        resetBatch();
        fileInput.multiple = false;
        fileInput.value = '';
        uploadArea.style.display = '';
        resetPanel();
      }
    });

    batchResetBtn.addEventListener('click', () => {
      resetBatch();
      fileInput.value = '';
      uploadArea.style.display = '';
      uploadArea.classList.remove('has-file');
      uploadArea.querySelector('p').innerHTML = '<strong>Klik untuk upload file</strong><br>atau drag & drop file ke sini';
    });

    batchDownloadBtn.addEventListener('click', () => {
      if (!batchZipBlob) return;
      const url = URL.createObjectURL(batchZipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName() + '-' + mode.id + '-batch.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    });

    /* Menghasilkan { blob, ext } untuk satu file pada mode aktif. */
    async function convertOne(file) {
      if (mode.id === 'docx2pdf') {
        return { blob: await convertFileToPdfBlob(file), ext: 'pdf' };
      }
      if (mode.id === 'pdf2docx') {
        const res = await buildDocxFromPdf(file);
        return { blob: res.blob, ext: 'docx' };
      }
      const text = await extractText(file);
      return { blob: new Blob([text], { type: 'text/plain;charset=utf-8' }), ext: mode.ext };
    }

    batchRunBtn.addEventListener('click', async () => {
      if (!batchFiles.length || !mode) return;
      batchRunBtn.disabled = true;
      batchDownloadBtn.disabled = true;
      batchProgressWrap.classList.remove('hidden');

      const zip = new JSZip();
      const used = new Set();
      let ok = 0, failed = 0;

      for (let i = 0; i < batchFiles.length; i++) {
        const rec = batchFiles[i];
        rec.status = 'run';
        renderBatchList();
        batchProgressFill.style.width = ((i) / batchFiles.length) * 100 + '%';
        batchProgressText.textContent = 'Memproses ' + (i + 1) + ' dari ' + batchFiles.length + ': ' + rec.name;

        try {
          const { blob, ext } = await convertOne(rec.file);
          let entry = rec.name.replace(/\.[^.]+$/, '') + '.' + ext;
          let n = 2;
          while (used.has(entry.toLowerCase())) {
            entry = rec.name.replace(/\.[^.]+$/, '') + '-' + n + '.' + ext;
            n++;
          }
          used.add(entry.toLowerCase());
          zip.file(entry, blob);
          rec.status = 'done';
          rec.out = entry;
          ok++;
        } catch (err) {
          rec.status = 'error';
          rec.err = err.message || String(err);
          failed++;
        }
        renderBatchList();
        // let the browser paint progress between files
        await new Promise(r => setTimeout(r, 30));
      }

      batchProgressFill.style.width = '100%';

      if (ok > 0) {
        batchZipBlob = await zip.generateAsync({ type: 'blob' });
        batchDownloadBtn.disabled = false;
        batchProgressText.textContent = 'Selesai. Klik &quot;Download ZIP&quot; untuk menyimpan.';
      } else {
        batchProgressText.textContent = 'Semua file gagal dikonversi.';
      }

      const failedNames = batchFiles.filter(f => f.status === 'error').map(f => f.name);
      batchSummary.textContent =
        ok + ' berhasil, ' + failed + ' gagal. ' +
        (failedNames.length ? 'Gagal: ' + failedNames.join(', ') : '') +
        (ok ? ' Ukuran ZIP: ' + (batchZipBlob.size / 1024).toFixed(1) + ' KB.' : '');

      batchRunBtn.disabled = false;
    });

    MODES.forEach(m => {
      const b = document.createElement('button');
      b.className = 'conv-card';
      b.dataset.mode = m.id;
      b.innerHTML = `<span class="from">${m.from}</span><span class="arrow">&rarr;</span><span class="name">${m.name}</span><span class="note">${m.note}</span>`;
      b.addEventListener('click', () => selectMode(m.id));
      convGrid.appendChild(b);
    });

    function selectMode(id) {
      mode = MODES.find(m => m.id === id);
      document.querySelectorAll('#kv-panel .conv-card').forEach(c => c.classList.toggle('active', c.dataset.mode === id));
      fileInput.accept = mode.accept;
      uploadHint.innerHTML = `Format: <strong>${mode.accept.replace(/,/g, ' &bull; ').replace(/\./g, '').toUpperCase()}</strong> &rarr; ${mode.name.replace(/&rarr;/g, '&rarr;')}`;
      batchToggleWrap.classList.remove('hidden');
      // changing mode invalidates any staged batch selection
      if (isBatch()) { resetBatch(); uploadArea.style.display = 'none'; }
      else { uploadArea.style.display = ''; }
      resetPanel();
    }

    function resetPanel(keepUploadHidden) {
      currentFile = null;
      outputText = '';
      outputBlob = null;
      pdfSourceEl = null;
      fileInput.value = '';
      uploadArea.classList.remove('has-file');
      uploadArea.querySelector('p').innerHTML = '<strong>Klik untuk upload file</strong><br>atau drag & drop file ke sini';
      panel.classList.add('hidden');
      previewArea.classList.add('hidden');
      downloadBtn.disabled = true;
      copyBtn.disabled = true;
      if (!keepUploadHidden) uploadArea.style.display = '';
      buildOptions();
    }

    function buildOptions() {
      optRow.classList.add('hidden');
      optRow.innerHTML = '';
      if (!mode) return;
      const opts = [];
      if (mode.id === 'pdf2md' || mode.id === 'pdf2docx') {
        opts.push(['heading', 'Deteksi judul / heading']);
      }
      if (mode.id === 'pdf2md' || mode.id === 'pdf2txt' || mode.id === 'pdf2docx') {
        opts.push(['pageBreak', 'Pisah tiap halaman']);
      }
      if (mode.id === 'docx2md') {
        opts.push(['keepTables', 'Jaga tabel markdown']);
      }
      if (opts.length) {
        optRow.innerHTML = opts.map(([k, label]) =>
          `<label><input type="checkbox" id="opt_${k}" ${optState[k] ? 'checked' : ''}> ${label}</label>`).join('');
        optRow.classList.remove('hidden');
        opts.forEach(([k]) => {
          document.getElementById('opt_' + k).addEventListener('change', e => { optState[k] = e.target.checked; });
        });
      }
    }

    uploadArea.addEventListener('click', () => { if (mode) fileInput.click(); });
    fileInput.addEventListener('change', () => {
      if (!fileInput.files.length) return;
      if (isBatch()) onBatchFiles(fileInput.files);
      else onFile(fileInput.files[0]);
    });
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = '#6366f1'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#cbd5e1'; });
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.style.borderColor = '#cbd5e1';
      if (!mode) { alert('Pilih mode konversi dulu di atas.'); return; }
      if (isBatch()) onBatchFiles(e.dataTransfer.files);
      else if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0]);
    });

    resetBtn.addEventListener('click', resetPanel);
    runBtn.addEventListener('click', run);
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(outputText); runBtn.textContent = 'Tersalin!'; setTimeout(() => { runBtn.textContent = 'Konversi'; }, 1200); }
      catch { alert('Gagal menyalin ke clipboard.'); }
    });
    downloadBtn.addEventListener('click', () => {
      if (!outputBlob) return;
      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName() + '.' + mode.ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });

    function baseName(file) {
      const f = file || currentFile;
      return (f ? f.name : 'dokumen').replace(/\.[^.]+$/, '');
    }

    function onFile(file) {
      currentFile = file;
      uploadArea.classList.add('has-file');
      uploadArea.querySelector('p').innerHTML = `<strong>${esc(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
      panel.classList.remove('hidden');
      panelName.textContent = `${mode.from} &rarr; ${mode.name.split('&rarr;')[1] || mode.name}`;
      panelName.innerHTML = `${mode.from} &rarr; ${mode.name.split('&rarr;')[1] || mode.name}`;
      output.innerHTML = '<div class="loading">Siap. Klik &quot;Konversi&quot; untuk memproses.</div>';
      panelMeta.textContent = `Sumber: ${file.name}`;
      downloadBtn.disabled = true;
      copyBtn.disabled = true;
      outputText = '';
      outputBlob = null;
      buildOptions();
      if (mode.id === 'docx2pdf') renderDocxPreview();
      else if (mode.from === 'PDF') renderPdfPreview();
    }

    async function renderPdfPreview() {
      previewArea.classList.remove('hidden');
      previewArea.innerHTML = '<div class="loading">Menyiapkan pratinjau...</div>';
      try {
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await currentFile.arrayBuffer()) }).promise;
        const pages = [];
        for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = 'width:100%;height:auto;border:1px solid #e2e8f0;border-radius:0.25rem;';
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          pages.push(canvas);
        }
        previewArea.innerHTML = '';
        pages.forEach((c, i) => {
          const wrap = document.createElement('div');
          wrap.className = 'pdf-page';
          const label = document.createElement('p');
          label.textContent = 'Halaman ' + (i + 1);
          label.style.cssText = 'font-weight:600;margin-bottom:0.25rem;color:#475569;';
          wrap.appendChild(label);
          wrap.appendChild(c);
          previewArea.appendChild(wrap);
        });
        if (pdf.numPages > pages.length) {
          const more = document.createElement('p');
          more.className = 'meta';
          more.textContent = `... dan ${pdf.numPages - pages.length} halaman lainnya`;
          previewArea.appendChild(more);
        }
      } catch (e) {
        previewArea.innerHTML = `<div class="error">Pratinjau gagal: ${esc(e.message)}</div>`;
      }
    }

    async function run() {
      if (!currentFile || !mode) return;
      runBtn.disabled = true;
      runBtn.textContent = 'Memproses...';
      output.innerHTML = '<div class="loading">Memproses dokumen...</div>';
      try {
        if (mode.id === 'docx2pdf') {
          const blob = await toPdf();
          outputBlob = blob;
          downloadBtn.disabled = false;

          const plain = (await mammoth.extractRawText({ arrayBuffer: await currentFile.arrayBuffer() })).value.trim();
          outputText = plain;
          output.textContent = plain;
          copyBtn.disabled = false;
          panelMeta.textContent = `PDF siap (${(blob.size / 1024).toFixed(1)} KB). Klik &quot;Download&quot; untuk menyimpan.`;
        } else if (mode.id === 'pdf2docx') {
          await toDocx();
        } else {
          const text = await extractText(currentFile);
          outputText = text;
          output.textContent = text;
          outputBlob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          downloadBtn.disabled = false;
          copyBtn.disabled = false;
        }
      } catch (err) {
        output.innerHTML = `<div class="error">Gagal: ${esc(err.message || String(err))}</div>`;
        downloadBtn.disabled = true;
        copyBtn.disabled = true;
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Konversi';
      }
    }

    /* ───────── Ekstraksi ───────── */
    async function extractText(file) {
      const f = file || currentFile;
      if (mode.from === 'DOCX') return fromDocx(f);
      return fromPdf(f);
    }

    async function fromPdf(file) {
      const f = file || currentFile;
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      const pages = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        pages.push(pdfPageToLines(content));
      }

      if (mode.id === 'pdf2txt') {
        return pages.map(lines => lines.map(l => l.text).join('\n')).join('\n\n');
      }

      if (mode.id === 'pdf2docx') {
        return pages.map((lines, i) => ({ page: i + 1, lines }));
      }

      const out = [];
      pages.forEach((lines, i) => {
        out.push(lines.map(l => (l.level ? '#'.repeat(l.level) + ' ' + l.text : l.text)).join('\n'));
        if (optState.pageBreak && i < pages.length - 1) out.push('\n---\n');
      });
      return out.join('\n');
    }

    function pdfPageToLines(content) {
      const items = content.items.filter(i => i.str && i.str.trim() !== '');
      if (!items.length) return [];
      const heights = items.map(i => Math.abs(i.transform[3]) || 0);
      const bodyH = median(heights);

      const out = [];
      for (const line of groupLines(items)) {
        const text = joinLine(line.items);
        if (!text) continue;
        let level = 0;
        if (optState.heading && bodyH > 0) {
          const ratio = line.h / bodyH;
          if (ratio > 2.0) level = 1;
          else if (ratio > 1.45) level = 2;
          else if (ratio > 1.25) level = 3;
        }
        out.push({ text, level });
      }
      return out;
    }

    function groupLines(items) {
      const sorted = items.slice().sort((a, b) => (b.transform[5] - a.transform[5]) || (a.transform[4] - b.transform[4]));
      const lines = [];
      let cur = null;
      for (const it of sorted) {
        const y = it.transform[5];
        const h = Math.abs(it.transform[3]) || 0;
        if (cur === null || Math.abs(y - cur.y) > Math.max(2, h * 0.5)) {
          cur = { y, h, items: [it] };
          lines.push(cur);
        } else {
          cur.items.push(it);
          cur.h = Math.max(cur.h, h);
        }
      }
      return lines;
    }

    function joinLine(items) {
      let s = '';
      let prevEnd = null;
      for (const it of items) {
        const x = it.transform[4];
        if (prevEnd !== null) {
          const gap = x - prevEnd;
          if (gap > Math.max(1.2, (it.width || 0) * 0.28)) s += '  ';
          else if (gap > 0.4) s += ' ';
        }
        s += it.str;
        prevEnd = x + (it.width || 0);
      }
      return s.replace(/\s+/g, ' ').trim();
    }

    function median(arr) {
      const a = arr.slice().sort((x, y) => x - y);
      return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    }

    async function fromDocx(file) {
      const f = file || currentFile;
      if (mode.id === 'docx2txt') {
        const r = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
        return r.value.trim();
      }
      const r = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
      return optState.keepTables ? htmlToMd(r.value) : htmlToMd(r.value, true);
    }

    /* ───────── DOCX &rarr; PDF ───────── */
    /* html2canvas (di dalam html2pdf) merender elemen tersembunyi sebagai 0 tinggi,
       jadi PDF jadi kosong. Sumber render WAJIB elemen yang terlihat di layout. */
    async function toPdf() {
      if (!pdfSourceEl) await renderDocxPreview();
      return html2pdf().set({
        margin: [12, 12, 14, 12],
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(pdfSourceEl).outputPdf('blob');
    }

    /* Konversi satu file ke PDF tanpa menyentuh UI panel (dipakai batch mode).
       Elemen dirender ke container off-screen yang tetap punya layout, karena
       html2canvas menghasilkan PDF kosong untuk display:none. */
    async function convertFileToPdfBlob(file) {
      const r = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const stage = document.getElementById('kv-batchStage');
      stage.innerHTML = '';
      const sheet = document.createElement('div');
      sheet.id = 'pdfSourceBatch';
      sheet.style.cssText = 'position:absolute;left:-10000px;top:0;width:794px;background:#fff;';
      sheet.innerHTML = r.value;
      stage.appendChild(sheet);

      window.scrollTo(0, 0);
      await new Promise(res => setTimeout(res, 120));

      try {
        return await html2pdf().set({
          margin: [12, 12, 14, 12],
          image: { type: 'jpeg', quality: 0.96 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        }).from(sheet).outputPdf('blob');
      } finally {
        stage.innerHTML = '';
      }
    }

    async function renderDocxPreview(file) {
      const f = file || currentFile;
      previewArea.classList.remove('hidden');
      previewArea.innerHTML = '<div class="loading">Menyiapkan pratinjau...</div>';
      const r = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
      previewArea.innerHTML = '';
      const sheet = document.createElement('div');
      sheet.id = 'pdfSource';
      sheet.innerHTML = r.value;
      previewArea.appendChild(sheet);
      pdfSourceEl = sheet;
    }

    /* ───────── PDF &rarr; DOCX ───────── */
    async function toDocx() {
      const pages = await fromPdf(currentFile);
      const children = [];
      let total = 0;

      pages.forEach((page, i) => {
        if (optState.pageBreak && i > 0) {
          children.push(new docx.PageBreak());
        }
        page.lines.forEach(l => {
          if (!l.text) return;
          total += l.text.split(/\s+/).filter(Boolean).length;
          if (l.heading) {
            children.push(new docx.Paragraph({
              heading: docx.HeadingLevel[l.heading === 1 ? 'HEADING_1' : l.heading === 2 ? 'HEADING_2' : 'HEADING_3'],
              spacing: { before: 240, after: 120 },
              children: [new docx.TextRun({ text: l.text, bold: true })],
            }));
          } else {
            children.push(new docx.Paragraph({
              spacing: { after: 120 },
              children: [new docx.TextRun(l.text)],
            }));
          }
        });
      });

      if (!children.length) throw new Error('Tidak ada teks yang bisa diekstrak dari PDF ini (kemungkinan hasil scan).');

      const doc = new docx.Document({
        creator: 'COFDE Konversi',
        title: baseName(),
        sections: [{
          properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
          children,
        }],
      });

      const blob = await docx.Packer.toBlob(doc);
      saveBlob(blob, baseName() + '.docx');
      downloadBtn.disabled = false;

      outputText = pages.map(p => p.lines.map(l => l.text).join('\n')).join('\n\n');
      output.textContent = outputText;
      copyBtn.disabled = false;
      panelMeta.textContent = `${pages.length} halaman, ${total} kata. File .docx langsung terunduh.`;
    }

    /* Versi tanpa efek UI: mengembalikan { blob, pages, words } untuk dipakai batch. */
    async function buildDocxFromPdf(file) {
      const pages = await fromPdf(file);
      const children = [];
      let total = 0;

      pages.forEach((page, i) => {
        if (optState.pageBreak && i > 0) children.push(new docx.PageBreak());
        page.lines.forEach(l => {
          if (!l.text) return;
          total += l.text.split(/\s+/).filter(Boolean).length;
          if (l.heading) {
            children.push(new docx.Paragraph({
              heading: docx.HeadingLevel[l.heading === 1 ? 'HEADING_1' : l.heading === 2 ? 'HEADING_2' : 'HEADING_3'],
              spacing: { before: 240, after: 120 },
              children: [new docx.TextRun({ text: l.text, bold: true })],
            }));
          } else {
            children.push(new docx.Paragraph({
              spacing: { after: 120 },
              children: [new docx.TextRun(l.text)],
            }));
          }
        });
      });

      if (!children.length) throw new Error('Tidak ada teks yang bisa diekstrak dari PDF ini (kemungkinan hasil scan).');

      const doc = new docx.Document({
        creator: 'COFDE Konversi',
        title: baseName(file),
        sections: [{
          properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
          children,
        }],
      });

      return { blob: await docx.Packer.toBlob(doc), pages: pages.length, words: total };
    }

    function saveBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    /* ───────── HTML &rarr; Markdown ───────── */
    function htmlToMd(html, dropTables) {
      const doc = new DOMParser().parseFromString(`<div id="kv-r">${html}</div>`, 'text/html');
      const root = doc.getElementById('kv-r');
      const walk = (node, listDepth) => {
        let out = '';
        node.childNodes.forEach(ch => {
          if (ch.nodeType === 3) { out += ch.textContent; return; }
          if (ch.nodeType !== 1) return;
          const tag = ch.tagName.toLowerCase();
          const inner = walk(ch, listDepth);
          switch (tag) {
            case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
              out += `\n\n${'#'.repeat(Number(tag[1]))} ${inner.trim()}\n\n`; break;
            case 'p': out += `\n\n${inner.trim()}\n\n`; break;
            case 'br': out += '\n'; break;
            case 'strong': case 'b': out += `**${inner.trim()}**`; break;
            case 'em': case 'i': out += `*${inner.trim()}*`; break;
            case 'u': out += `<u>${inner.trim()}</u>`; break;
            case 'code': out += `\`${inner.trim()}\``; break;
            case 'a': out += `[${inner.trim()}](${ch.getAttribute('href') || ''})`; break;
            case 'img': out += `![${ch.getAttribute('alt') || ''}](${ch.getAttribute('src') || ''})`; break;
            case 'ul': case 'ol': {
              const items = [...ch.children].filter(x => x.tagName.toLowerCase() === 'li');
              const lines = items.map((li, i) => {
                const t = walk(li, listDepth + 1).trim().replace(/\n+/g, ' ');
                const bullet = tag === 'ol' ? `${i + 1}.` : '-';
                const pad = '  '.repeat(listDepth);
                return `${pad}${bullet} ${t}`;
              });
              out += '\n\n' + lines.join('\n') + '\n\n';
              break;
            }
            case 'table': {
              if (dropTables) { out += `\n\n${inner.replace(/\n+/g, ' ').trim()}\n\n`; break; }
              out += '\n\n' + tableToMd(ch) + '\n\n';
              break;
            }
            case 'blockquote': out += `\n\n${inner.trim().split('\n').map(l => '> ' + l).join('\n')}\n\n`; break;
            default: out += inner;
          }
        });
        return out;
      };
      return walk(root, 0)
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .split('\n').map(l => l.trimEnd()).join('\n')
        .trim();
    }

    function tableToMd(tbl) {
      const rows = [...tbl.querySelectorAll('tr')].map(tr => [...tr.children].map(cellToText));
      if (!rows.length) return '';
      const width = Math.max(...rows.map(r => r.length));
      const pad = r => { const c = r.slice(); while (c.length < width) c.push(''); return c; };
      const esc = v => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const head = pad(rows[0]).map(esc);
      const out = ['| ' + head.join(' | ') + ' |', '| ' + head.map(() => '---').join(' | ') + ' |'];
      rows.slice(1).forEach(r => out.push('| ' + pad(r).map(esc).join(' | ') + ' |'));
      return out.join('\n');
    }

    function cellToText(cell) {
      const raw = cell.innerText != null ? cell.innerText : cell.textContent;
      return raw.replace(/\s+/g, ' ').trim();
    }

    function esc(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
})();
