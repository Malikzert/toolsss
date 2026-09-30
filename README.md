# COFDE Toolkit

Toolkit dokumen statis yang berjalan **sepenuhnya di browser**. Tidak ada server, tidak ada upload, tidak ada akun. File yang kamu proses tidak pernah meninggalkan perangkatmu.

**Live:** https://malikzert.github.io/toolsss/

---

## Daftar Isi

- [Kenapa COFDE](#kenapa-cofde)
- [Cara Cepat](#cara-cepat)
- [Fitur](#fitur)
  - [Dashboard](#01-dashboard)
  - [Dokumen Reader](#02-dokumen-reader)
  - [Potong Gambar](#03-potong-gambar)
  - [Gabung ke PDF](#04-gabung-ke-pdf)
  - [Konversi](#05-konversi)
  - [Gabung PDF](#06-gabung-pdf)
  - [Pisah PDF](#07-pisah-pdf)
  - [Dev Tools](#08-dev-tools)
  - [QR Tools](#09-qr-tools)
  - [Maps](#10-maps)
  - [ML CSV Visualizer](#11-ml-csv-visualizer)
- [Pintasan Keyboard](#pintasan-keyboard)
- [Pemasangan sebagai Aplikasi](#pemasangan-sebagai-aplikasi)
- [Tema](#tema)
- [Menjalankan Lokal](#menjalankan-lokal)
- [Struktur Project](#struktur-project)
- [Rekomendasi](#rekomendasi)
- [Privacy dan Keamanan](#privacy-dan-keamanan)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [Deployment](#deployment)

---

## Kenapa COFDE

Tool PDF online yang biasa kamu temui di internet umumnya berukuran **5 sampai 15 MB** per halaman, menyisipkan iklan, dan mewajibkan login sebelum hasil bisa diunduh.

COFDE sengaja dibalik:

- **Ringan** - seluruh repo hanya beberapa ratus KB
- **Tanpa akun** - tidak ada email, tidak ada password
- **Tanpa server** - 100% diproses di perangkatmu
- **Tanpa iklan** - UI bersih, fokus ke tugas
- **Bisa offline** - setelah library CDN ter-cache
- **Bisa dipasang** - Manifest PWA plus shortcut, jalan seperti aplikasi native

---

## Cara Cepat

Tidak perlu install apa pun.

1. Buka https://malikzert.github.io/toolsss/
2. Klik tombol menu di pojok kiri atas
3. Pilih fitur yang diperlukan

Ada 11 tool di dalam COFDE: Dashboard, Reader, Potong Gambar, Gabung ke PDF, Konversi, Gabung PDF, Pisah PDF, Dev Tools, QR, Maps, dan ML CSV Visualizer.

Kalau halaman masih menampilkan versi lama, paksa refresh dengan **Ctrl+Shift+R**.

> **Catatan internet:** library berat (pdf.js, pdf-lib, mammoth, jsPDF) dimuat dari CDN dan di-cache service worker. Koneksi pertama butuh beberapa detik. Setelah ter-cache, halaman berikutnya bisa dibuka lebih cepat dan sebagian besar tool tetap berfungsi tanpa internet. Reader dan Konversi **tidak dapat dipakai sepenuhnya tanpa internet** pada kunjungan pertama.

---

## Fitur

### 01 Dashboard

Ringkasan seluruh fitur dalam satu tampilan.

| Bagian | Isi |
|---|---|
| **Speedometer** | Gauge "Optimal Load" dengan jarum beranimasi, sudut 270 derajat |
| **Total Operations** | Counter operasi sesi, tersimpan di localStorage |
| **Available Tools** | Mini-card untuk Reader, Potong, Gabung, Konversi, Gabung PDF, Pisah PDF, dan 4 tool baru |
| **Resource Usage** | Bar Memory, Canvas, dan IO, ditambah estimasi FPS |

Semua angka pada Dashboard bersifat **simulasi visual** untuk memberi kesan hidup, bukan telemetry sungguhan. Yang benar-benar disimulasikan hanya `Total Operations`, yang naik setiap kamu menekan tool.

---

### 02 Dokumen Reader

Buka file **PDF** atau **Word (.docx)** dan baca langsung di browser.

**Cara pakai:**

1. Klik area upload, pilih file (atau drag and drop)
2. Tunggu proses render selesai
3. Navigasi memakai tombol **Sebelumnya / Targets** atau **Tampilkan Semua**
4. Ganti mode tampilan: **SS Bergulir** atau **Per Halaman**
5. Cari teks lewat kotak pencarian di dalam halaman

**Yang bisa dilakukan:**

- Text layer PDF, sehingga teks bisa diseleksi normal (bukan hasil gambar)
- Render halaman PDF di canvas dengan skala otomatis
- Ekstraksi teks DOCX melalui mammoth
- Ekspor halaman sebagai gambar melalui html2canvas
- Pencarian teks lintas halaman dengan navigasi hit berikutnya / sebelumnya

**Kontrol:**

| Tombol | Fungsi |
|---|---|
| `Sebelumnya` | Halaman mundur |
| `Selanjutnya` | Halaman maju |
| `Tampilkan Semua` | Render seluruh dokumen sekaligus |
| `SS Bergulir` | Mode scroll kontinu |
| `Per Halaman` | Mode satu halaman per layar |

**Pencarian:**

| Kontrol | Fungsi |
|---|---|
| Kotak pencarian | Cari kata atau frasa di seluruh dokumen |
| `Aa` | Aktifkan mode case-sensitive |
| `↑` / `↓` atau `Enter` / `Shift+Enter` | Lompat ke hit sebelumnya / berikutnya |
| `?` | Buka daftar pintasan keyboard |

Pencarian menyambung teks yang terpecah di beberapa text item, sehingga frasa seperti judul yang terpotong antarbaris tetap ditemukan. Highlight yang sedang aktif diberi warna berbeda.

> **Batasan:** file sangat besar (500 halaman atau lebih) akan berat. Gunakan mode **Per Halaman**. PDF hasil scan (gambar) tidak punya text layer, sehingga teksnya tidak dapat diseleksi.

---

### 03 Potong Gambar

Memotong gambar panjang seperti screenshot panjang, chat, atau web full-page menjadi beberapa file terpisah.

**Cara pakai:**

1. Upload gambar
2. Opsional: putar atau balik gambar memakai tombol **Rotasi & Balik**
3. Klik **pada gambar** untuk menambah titik potong, atau biarkan pengaturan otomatis yang bekerja
4. Pilih mode potong:

| Mode | Fungsi |
|---|---|
| **Per Bagian** | Bagi menjadi N bagian sama rata |
| **Per Tinggi** | Potong setiap N pixel |
| **Kustom** | Titik potong manual dari klik kamu |

5. Atur **Overlap (px)** bila perlu, supaya konten tidak terpotong di tengah
6. Klik **Potong dan Tampilkan** untuk melihat preview hasil
7. Klik **Download Semua (ZIP)** untuk mengunduh sekaligus

**Rotasi & Balik:**

| Tombol | Fungsi |
|---|---|
| `↺` | Putar 90 derajat ke kiri |
| `↻` | Putar 90 derajat ke kanan |
| `Balik H` | Balik secara horizontal |
| `Balik V` | Balik secara vertikal |
| `Reset` | Kembalikan gambar ke orientasi asli |

Transformasi diterapkan pada gambar **sebelum** dipotong, jadi hasil potongan ikut terputar. Saat rotasi 90 atau 270 derajat, sumbu potong otomatis menukar lebar dan tinggi, dan titik potong dihitung ulang agar selalu pas di dalam gambar.

**Pengaturan tambahan:**

- **Format** - PNG (kualitas tinggi, mendukung transparansi) atau JPEG (ukuran lebih kecil)
- **Pertahankan ukuran asli** - matikan supaya gambar tidak diperkecil, berguna kalau hasilnya akan dicetak

> **Rekomendasi:** aktifkan **Overlap 20 sampai 40 px** untuk screenshot yang memuat tabel atau baris teks panjang, agar tidak ada karakter yang terpotong antar bagian.

---

### 04 Gabung ke PDF

Menggabungkan banyak gambar menjadi satu file PDF, dengan urutan yang bisa diatur.

**Cara pakai:**

1. Upload beberapa gambar sekaligus
2. Susun urutan memakai tombol panah atas dan bawah untuk menggeser, dan `x` untuk menghapus
3. Atur **Pengaturan PDF**
4. Klik **Buat PDF**, lalu **Download PDF**

**Pengaturan PDF:**

| Pengaturan | Pilihan |
|---|---|
| **Ukuran Halaman** | A4, Letter, Legal, A3 |
| **Orientasi** | Potret, Landskap |
| **Skala Gambar** | Sesuai halaman, Sesuai lebar, Ukuran asli |
| **Margin** | dalam piksel |
| **Watermark** | teks opsional, dicetak miring 45 derajat di tengah halaman |
| **Opasitas Watermark** | 5 sampai 80 persen |
| **Kualitas JPEG** | 40 sampai 100, lebih rendah berarti berkas lebih kecil |

Watermark digambar setelah gambar placed, sehingga tidak pernah menutupi area gambar secara tidak sengaja, dan otomatis memakai koordinat serta ukuran huruf yang mengikuti ukuran halaman yang kamu pilih.

> **Tips:** untuk hasil paling rapi, pakai **Skala Gambar = Sesuai lebar**, orientasi **Lanskap**, ukuran **A4**. Untuk dokumen yang butuh presisi tinggi seperti scan arsip, pilih **Ukuran asli** dan tambahkan margin.

> **Catatan kualitas:** gambar dimasukkan sebagai JPEG kecuali kualitas disetel **100**. Pada nilai 100, gambar disisipkan sebagai PNG agar detail tetap utuh dan transparansi tidak hilang.

---

### 05 Konversi

Enam mode konversi dokumen, seluruhnya berjalan di sisi klien.

| Mode | Input | Output | Catatan |
|---|---|---|---|
| **PDF ke Markdown** | `.pdf` | `.md` | Ekstrak teks, deteksi heading |
| **PDF ke Teks** | `.pdf` | `.txt` | Teks polos per halaman |
| **PDF ke Word** | `.pdf` | `.docx` | Paragraf dan judul |
| **Word ke PDF** | `.docx` | `.pdf` | Layout A4 dari isi dokumen |
| **Word ke Markdown** | `.docx` | `.md` | Judul, list, tabel, bold |
| **Word ke Teks** | `.txt`, `.doc`, `.docx` | `.txt` | Teks polos saja |

**Cara pakai:**

1. Pilih mode konversi
2. Upload file sesuai format yang diminta
3. Klik **Konversi**
4. Klik **Download** untuk menyimpan, atau **Salin Teks** untuk langsung ke clipboard
5. **Ganti File** untuk memproses file berikutnya tanpa perlu reload

**Mode Batch:**

Aktifkan sakelar **Batch** untuk memproses banyak file sekaligus.

1. Pilih mode konversi seperti biasa
2. Nyalakan **Batch**, lalu pilih beberapa file sekaligus
3. Klik **Proses Batch**
4. Hasil semua file dibungkus satu berkas **ZIP** dengan nama file unik

Berkas dengan nama sama tidak saling menimpa. Contoh `laporan.docx` dua kali menghasilkan `laporan.md` dan `laporan-2.md`. File yang gagal dikonversi ditandai di daftar dan tidak menghentikan file lain.

> **Batasan penting:** konversi bersifat ekstrak konten (teks menjadi struktur), bukan rendering visual. PDF bergambar, tabel kompleks, multi-kolom, atau layout fancy akan menghasilkan markdown dan teks yang lebih sederhana. PDF ke Word sangat bergantung pada text layer. PDF hasil scan memerlukan OCR terlebih dahulu, yang berada di luar cakupan tool ini.

---

### 06 Gabung PDF

Menggabungkan beberapa berkas PDF menjadi satu dokumen, lengkap dengan bookmark per berkas.

**Cara pakai:**

1. Upload beberapa PDF sekaligus, atau drag and drop
2. Susun urutan memakai tombol panah atas dan bawah
3. Atur opsi penggabungan
4. Klik **Gabung PDF**

**Opsi:**

| Opsi | Fungsi |
|---|---|
| **Tambah bookmark** | Membuat bookmark per berkas, mengarah ke halaman pertama berkas tersebut |
| **Pertahankan metadata** | Memakai judul, penulis, subjek, dan kata kunci dari berkas pertama |

Urutan bookmark mengikuti urutan berkas di daftar, dan tiap bookmark melompat tepat ke halaman pertama berkas masing-masing. Metadata diambil dari berkas **pertama**, bukan terakhir, supaya konsisten dengan halaman pembuka hasil gabung.

---

### 07 Pisah PDF

Memecah satu PDF menjadi beberapa berkas.

**Cara pakai:**

1. Upload satu PDF
2. Pilih **Pisah per** rentang, jumlah bagian, atau extract halaman tertentu
3. Klik **Pisah PDF**
4. Hasil diunduh sebagai satu **ZIP** bila menghasilkan lebih dari satu berkas

Mode **Extract** berguna untuk mengambil halaman tertentu saja, misalnya lampiran pada halaman 10 sampai 12.

---

### 08 Dev Tools

Kumpulan utilitas developer dalam satu halaman, semuanya berjalan di browser tanpa mengirim data ke mana pun.

| Utilitas | Fungsi |
|---|---|
| **JSON** | Format, minify, validasi, dan konversi ke CSV |
| **Base64** | Encode/decode UTF-8 |
| **URL** | Encode, decode, parse, dan build URL |
| **JWT** | Decode payload read-only dengan peringatan "TIDAK diverifikasi" |
| **UUID** | Generate UUID v4, batch hingga beberapa sekaligus |
| **Regex** | Tester biasa + tester dengan preset pola umum |
| **Hash** | SHA-256, SHA-384, SHA-512 via Web Crypto |
| **Waktu** | Konversi epoch/timestamp, interval waktu, durasi |
| **Warna** | Konversi format dan cek kontras WCAG |
| **Cron** | Parse, deskripsi, next schedule, dan preset |
| **Markdown** | Pratinjau dengan sanitasi HTML (anti-XSS) |
| **SQL** | Format dan pemeriksaan ringan tanpa eksekusi |

---

### 09 QR Tools

Membuat kode QR dan memindainya, tanpa platform pihak ketiga.

**Buat QR:**

1. Ketik teks (dikodekan UTF-8) atau warnai QR
2. Pilih ukuran modul dan margin
3. **Unduh PNG** atau salin sebagai gambar
4. Mode **Deskripsi** menampilkan detail matrix (versi, mode byte, jumlah modul)

**Pindai QR:**

- **Kamera** memakai `BarcodeDetector` bawaan browser
- **File** memakai jsQR untuk memindai dari gambar/PNG yang diunggah
- Hasil ditampilkan dan bisa disalin

> **Offline:** generator butuh pustaka `qrcode-generator` dari CDN. Jika offline dan pustaka belum pernah dimuat, tool menolak **secara eksplisit** dan tidak pernah membuat QR yang salah diam-diam. Setelah pustaka pernah ter-cache, semua fitur berjalan offline.

---

### 10 Maps

Peta interaktif dengan penanda, koordinat, dan geocoding. Bagian peta butuh internet, tetapi navigasi, koordinat, DMS, dan tautan eksternal selalu tersedia.

- **Klik peta** untuk memindahkan penanda
- **Stats** menampilkan koordinat desimal (DD) dan DMS, kira-kira lokasi, dan status "Di Indonesia?"
- **Cari tempat** memakai Nominatim (OpenStreetMap), maksimal 1 permintaan per detik
- **Lokasi** memakai geolocation browser
- **Tautan eksternal** ke Google Maps, OpenStreetMap, Bing, dan HERE Places
- Peta memakai Leaflet 1.9.4 dari CDN; kepingan peta (tile) tidak di-cache

---

### 11 ML CSV Visualizer

Analisis ringkas dataset tabel dari file CSV/TSV atau teks tempelan, semua dihitung di browser.

| Fitur | Fungsi |
|---|---|
| **Tipe kolom** | Deteksi otomatis: numerik, boolean, tanggal, kategori, teks |
| **Statistik** | Count, kosong, terisi, unik, contoh per kolom |
| **Distribusi** | Histogram kolom numerik dan distribusi kategori |
| **Korelasi** | Matriks Pearson antar kolom numerik |
| **Regresi linear** | Slope, intercept, r/r², MSE, persamaan garis |
| **Outlier** | Deteksi IQR (bounds ±1.5×IQR) |
| **Split train/test** | Deterministik (seed), preview hasil bagi |

Generator angka acak memakai seed, jadi hasil split dapat direproduksi. Data di atas 100.000 baris memicu peringatan karena semua perhitungan berjalan di thread utama.

---

## Pintasan Keyboard

Shortcut aktif di semua halaman tool, dan otomatis dinonaktifkan saat kamu mengetik di kolom isian, textarea, atau elemen yang bisa diedit.

| Pintasan | Aksi |
|---|---|
| `D` | Pilih / ganti file |
| `O` | Buka pemilih file |
| `K` | Jalankan aksi utama pada Konversi atau Reader |
| `G` | Jalankan aksi utama pada Gabung gambar ke PDF |
| `M` | Jalankan aksi utama pada Gabung PDF |
| `S` | Jalankan aksi utama pada Pisah PDF |
| `Enter` | Konfirmasi aksi utama pada Potong Gambar |
| `T` / `Y` | Ganti tema maju / mundur |
| `[` / `]` | Pindah ke tool sebelumnya / berikutnya |
| `?` | Buka panel daftar pintasan |
| `Esc` | Tutup panel pintasan |

> Shortcut memakai huruf biasa, sehingga **tidak** aktif bila tombol ditekan bersama `Ctrl`, `Alt`, atau `Shift`, kecuali untuk navigasi halaman yang memang memakai `Shift`.

---

## Pemasangan sebagai Aplikasi

COFDE adalah PWA, jadi bisa dipasang ke layar utama dan dibuka dalam jendela sendiri tanpa address bar.

**Cara pasang:**

1. Buka situs memakai Chrome atau Edge di desktop, atau Safari di iOS
2. Klik ikon install di address bar, atau menu **Install app** / **Add to Home Screen**
3. Setelah terpasang, aplikasi punya ikon COFDE dan shortcut ke tiap tool

Service worker menyimpan shell aplikasi dan library CDN, sehingga pembukaan berikutnya tidak selalu butuh internet. Data dokumen kamu tidak pernah masuk ke cache tersebut, karena seluruh pemrosesan terjadi di memori tab.

---

## Tema

Tiga tema tersedia, dipilih dari dalam sidebar:

| Tema | Karakter | Accent |
|---|---|---|
| **Lightholy** | Terang dan bersih | Merah Valorant `#ff4655` |
| **Darkside** | Gelap dan fokus | Merah Valorant `#ff4655` |
| **Abyss** | Dingin dan futuristik | Cyan `#2ee6d6` |

Pilihan tema tersimpan di `localStorage` dengan key `fire-theme` dan otomatis berlaku di halaman berikutnya.

**Efek visual yang aktif di semua halaman:**

- Background glass shards (80 butir) dan bokeh mote (9 butir), mengikuti tema
- Serpihan kaca yang mengikuti kursor, maksimal 44 butir dengan cleanup otomatis
- Drawer kaca dengan light sweep saat dibuka dan efek pecah 40 shard saat ditutup
- Glassmorphism dengan angular Valorant clip-path
- Menghormati setelan `prefers-reduced-motion`, yaitu animasi dimatikan otomatis

---

## Menjalankan Lokal

Tidak ada prerequisite. Cukup Python atau Node yang sudah tersedia di sistem.

**Opsi 1 - Python** (paling umum)
```bash
python -m http.server 8000
```
Buka `http://localhost:8000`

**Opsi 2 - Node**
```bash
node server.js
```
Buka `http://localhost:3000`

> **Jangan** membuka file langsung lewat protokol `file://` jika ada fitur yang tidak berfungsi. Beberapa browser membatasi request pada `file://`, dan web worker ikut terganggu. Gunakan server lokal.

---

## Struktur Project

```
.
|-- index.html                       # Root entry, redirect ke dashboard
|-- pages/
|   |-- dashboard.html               # 01 Dashboard
|   |-- reader.html                  # 02 Dokumen Reader + pencarian
|   |-- crop.html                    # 03 Potong Gambar + rotasi/balik
|   |-- gabung.html                  # 04 Gabung Gambar ke PDF + watermark
|   |-- konversi.html                # 05 Konversi + mode batch
|   |-- merge.html                   # 06 Gabung PDF + bookmark
|   `-- split.html                   # 07 Pisah PDF
|   |-- devtools.html                # 08 Dev Tools
|   |-- qr.html                      # 09 QR Tools
|   |-- maps.html                    # 10 Maps
|   `-- mlcsv.html                   # 11 ML CSV Visualizer
|-- assets/
|   |-- css/style.css                # Tema, drawer, glassmorphism, Valorant
|   `-- js/
|       |-- drawer.js                # Sidebar, theme switcher, brand corner
|       |-- particles.js             # Glass shards, bokeh, mouse flecks
|       |-- shortcuts.js             # Pintasan keyboard global
|       |-- sw-register.js           # Registrasi service worker
|       |-- devtools.js / devtools-page.js     # 08 Logika + controller halaman
|       |-- qr.js / qr-page.js                 # 09 Logika + controller halaman
|       |-- maps.js / maps-page.js             # 10 Logika + controller halaman
|       `-- mlcsv.js / mlcsv-page.js           # 11 Logika + controller halaman
|-- pwa/
|   |-- manifest.webmanifest         # Manifest, icon, dan shortcut
|   `-- icons/                       # icon.svg + PNG 192/512 dan maskable
|-- server.js                        # Dev server lokal, tidak dipakai Pages
`-- README.md
```

**Aturan penting:** semua path ditulis relatif (`../assets/css/style.css`, bukan `/assets/css/style.css`) supaya situs tetap bisa di-host di sub-path GitHub Pages tanpa konfigurasi tambahan. Registrasi service worker juga menghitung root dari lokasi script-nya sendiri, sehingga tetap benar di sub-path mana pun.

---

## Rekomendasi

**Untuk hasil terbaik:**

| Kebutuhan | Tool | Setting |
|---|---|---|
| Baca dokumen panjang | Reader | Mode **Per Halaman** |
| Cari kutipan di dokumen | Reader | Kotak pencarian + `Enter` untuk hit berikutnya |
| Screenshot panjang | Potong | **Overlap 30 px**, PNG |
| Scan arsip ke PDF | Gabung | **Ukuran asli**, margin 0 |
| Presentasi atau slide | Gabung | **A4 Lanskap**, Sesuai lebar |
| Dokumen bertanda tangan | Gabung | Watermark teks, opasitas 15 sampai 30 |
| Arsip markdown | Konversi | **PDF ke Markdown** |
| Catatan cepat | Konversi | **Word ke Markdown** |
| Banyak file sekaligus | Konversi | Nyalakan **Batch**, lalu unduh ZIP |
| Arsip beberapa PDF | Gabung PDF | Bookmark aktif, metadata dari berkas pertama |
| Pisahkan lampiran | Pisah PDF | Mode **Extract** dengan nomor halaman |
| Debug JSON/URL/hash | Dev Tools | Panel JSON, Base64, URL, hash |
| Undang QR kartu nama | QR Tools | Teks vCard, gratis |
| Koordinat untuk laporan | Maps | Klik peta, salin DD/DMS |
| Cek dataset sebelum latih | ML CSV | Split train/test pakai seed tetap |

**Untuk performa:**

- Batasi ukuran file di bawah 200 MB agar browser tidak kehabisan memori
- Di Reader, hindari **Tampilkan Semua** untuk dokumen 500 halaman atau lebih
- Tutup tab lain bila proses terasa berat, karena semua perhitungan berjalan di thread utama
- Batch dengan banyak file memproses berkas satu per satu, jadi tunggu-indicator progres selesai
- Gunakan hard refresh setelah update agar tidak menerima versi dari cache lama

**Untuk privasi:**

- Tool ini aman untuk dokumen sensitif karena seluruh proses lokal dan file tidak dikirim ke mana pun
- Jangan memakai browser bersama atau profil yang menyimpan riwayat untuk berkas rahasia
- Cache service worker hanya berisi shell aplikasi dan library CDN, bukan dokumen kamu
- Berkas PDF hasil scan tetap perlu dihapus dari penyimpanan setelah selesai dipakai

---

## Privacy dan Keamanan

- Sepenuhnya client-side. **Tidak ada file yang diunggah ke server mana pun**, karena repo ini tidak memiliki backend.
- Tidak ada analytics, tidak ada tracking, tidak ada cookie.
- Penyimpanan lokal hanya berisi `fire-theme` (tema), `cofde_ops` (counter dashboard), preferensi Ringkas/Budget di localStorage, dan basis data IndexedDB `cofde_expense` untuk riwayat pengeluaran.
- Satu-satunya request keluar adalah pemuatan library dari CDN publik, dan pencarian/geocoding Maps yang dikirim ke Nominatim (OpenStreetMap) saat kamu menekan tombol Cari.
- Isi dokumen hanya ada di memori tab dan hilang saat tab ditutup atau di-refresh.
- Kerahasiaan berkas tetap menjadi tanggung jawab perangkat dan browser yang kamu pakai.

---

## Troubleshooting

**Halaman masih versi lama**
Tekan `Ctrl+Shift+R`, atau buka di jendela incognito, atau tambahkan query param seperti `dashboard.html?v=2`. Bila tetap stale, buka DevTools, tab Application, lalu klik **Unregister** pada service worker.

**Ikon install PWA tidak muncul**
Browser harus melihat situs melalui `http://localhost` atau `https://`. Service worker tidak berjalan pada `file://`, dan sebagian browser butuh kunjungan kedua sebelum menampilkan tombol install.

**Pintasan keyboard tidak merespons**
Shortcut otomatis dinonaktifkan saat fokus berada di kolom isian, agar mengetik huruf biasa tidak memicu aksi. Tekan `Esc` atau klik area kosong lalu coba lagi. Tekan `?` untuk melihat daftar shortcut aktif.

**Tombol potong hilang setelah memutar gambar**
Ini perilaku yang disengaja. Memutar 90 atau 270 derajat menukar sumbu potong, sehingga titik potong lama tidak valid dan dihitung ulang dari nol. Geser lagi atau pakai mode Otomatis.

**Bookmark PDF tidak muncul di pembaca tertentu**
Beberapa pembaca mobile masih tidak mendukung bookmark. Isi PDF dan bookmark-nya tetap benar; coba buka di Adobe Acrobat atau browser desktop.

**Kartu konversi tidak muncul atau tombol tidak merespons**
Library CDN gagal dimuat. Periksa koneksi internet lalu refresh. Butuh beberapa detik tambahan bila CDN sedang lambat.

**Peta Maps kosong atau tidak tampil**
Tile peta selalu butuh internet. Jika offline dan Leaflet belum pernah dimuat, muncul pesan eksplisit dan halaman tetap bisa dipakai untuk koordinat, DMS, dan tautan eksternal. Setelah pernah dimuat online, peta tetap terbuka offline tetapi petaknya kosong.

**QR tidak muncul saat offline**
Pustaka qrcode-generator hanya di-cache setelah pernah dimuat. Saat offline dan belum pernah ter-cache, tool menolak dengan jelas (tidak membuat QR yang salah). Muat sekali saat online.

**Hasil split ML CSV berbeda ketika seed sama**
Bukan. Split memakai PRNG seed, hasil selalu deterministik. Pastikan urutan baris dan header sama sebelum membandingkan.

**Reader tidak menampilkan teks**
Berkas PDF hasil scan, yaitu berupa gambar dan bukan teks. Karena tidak ada text layer, teks tidak dapat diseleksi dan tidak dapat dicari.

**Pencarian Reader tidak menemukan frasa**
Bila dokumen memakai kolom ganda atau urutan baca berantakan, teks yang tampil berdampingan bisa tersusun berbeda di text layer. Coba cari satu kata kunci, lalu navigasi ke tiap hasil.

**Gagal download**
Browser memblokir download banyak berkas pada `file://`. Jalankan lewat server lokal.

**Partikel tidak muncul atau terasa lambat**
Sudah otomatis dimatikan bila sistem operasi mengaktifkan **Reduce Motion**. Periksa di Settings, lalu Accessibility.

**Dashboard kosong atau angka tidak berubah**
Angka Dashboard memang simulasi. Yang asli hanya `Total Operations`, yang naik setelah kamu menekan tool. Bila kartunya sama sekali tidak muncul, kemungkinan CSS belum termuat.

---

## Credits

Library pihak ketiga yang dimuat lewat CDN dan tidak di-bundle ke dalam repo:

| Library | Dipakai di | Fungsi |
|---|---|---|
| [pdf.js](https://mozilla.github.io/pdf.js/) 3.11.174 | Reader, Konversi, Pisah PDF | Render dan ekstraksi PDF |
| [pdf-lib](https://pdf-lib.js.org/) 1.17.1 | Gabung PDF | Salin halaman dan tulis bookmark serta metadata |
| [mammoth.js](https://github.com/mwilliamson/mammoth.js) 1.6.0 | Reader, Konversi | Ekstraksi DOCX |
| [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 | Reader | Export halaman ke gambar |
| [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) 0.10.1 | Konversi | DOCX ke PDF |
| [docx](https://github.com/dolanmiu/docx) 8.5.0 | Konversi | Generate PDF ke DOCX |
| [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 | Gabung Gambar | Generate PDF beserta watermark |
| [JSZip](https://stuk.github.io/jszip/) 3.10.1 | Potong, Konversi | Bundle hasil dan hasil batch ke ZIP |
| [Chart.js](https://www.chartjs.org/) 4.4.1 | Ringkas Pengeluaran | Grafik pengeluaran |
| [qrcode-generator](https://kazuhikoarase.github.io/qrcode-generator/) 1.4.4 | QR Tools | Membuat matrix kode QR |
| [jsQR](https://github.com/cozmo/jsQR) 1.4.0 | QR Tools | Memindai QR dari gambar |
| [Leaflet](https://leafletjs.com/) 1.9.4 | Maps | Peta interaktif + marker |

Lisensi tiap library mengikuti lisensi masing-masing proyeknya.

---

## Deployment

Situs ini di-host di **GitHub Pages** dari branch `main`.

```
Settings > Pages > Source: Deploy from a branch > main / (root)
```

Tidak ada build step dan tidak ada proses dependency install. Push ke `main` akan langsung tayang.

**Setelah mengubah service worker**, naikkan `VERSION` di `pwa/sw.js` supaya browser mengambil cache baru, lalu tunggu satu siklus deploy. Tanpa itu, pengguna yang sudah pernah membuka situs akan tetap memakai versi lama.

**Verifikasi sebelum deploy:**

```bash
node --check assets/js/shortcuts.js
node --check assets/js/sw-register.js
node --check assets/js/devtools.js
node --check assets/js/devtools-page.js
node --check assets/js/qr.js
node --check assets/js/qr-page.js
node --check assets/js/maps.js
node --check assets/js/maps-page.js
node --check assets/js/mlcsv.js
node --check assets/js/mlcsv-page.js
node --check pwa/sw.js
node -e "JSON.parse(require('fs').readFileSync('pwa/manifest.webmanifest','utf8'))"
```
