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

---

## Cara Cepat

Tidak perlu install apa pun.

1. Buka https://malikzert.github.io/toolsss/
2. Klik tombol menu di pojok kiri atas
3. Pilih fitur yang diperlukan

Kalau halaman masih menampilkan versi lama, paksa refresh dengan **Ctrl+Shift+R**.

> **Catatan internet:** library berat (pdf.js, mammoth, jsPDF) dimuat dari CDN. Koneksi pertama butuh beberapa detik. Setelah ter-cache browser, halaman berikutnya bisa dibuka lebih cepat. Reader dan Konversi **tidak dapat dipakai sepenuhnya tanpa internet**.

---

## Fitur

### 01 Dashboard

Ringkasan seluruh fitur dalam satu tampilan.

| Bagian | Isi |
|---|---|
| **Speedometer** | Gauge "Optimal Load" dengan jarum beranimasi, sudut 270 derajat |
| **Total Operations** | Counter operasi sesi, tersimpan di localStorage |
| **Available Tools** | Empat mini-card: Reader, Potong, Gabung, Konversi |
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

**Yang bisa dilakukan:**

- Text layer PDF, sehingga teks bisa diseleksi normal (bukan hasil gambar)
- Render halaman PDF di canvas dengan skala otomatis
- Ekstraksi teks DOCX melalui mammoth
- Ekspor halaman sebagai gambar melalui html2canvas

**Kontrol:**

| Tombol | Fungsi |
|---|---|
| `Sebelumnya` | Halaman mundur |
| `Selanjutnya` | Halaman maju |
| `Tampilkan Semua` | Render seluruh dokumen sekaligus |
| `SS Bergulir` | Mode scroll kontinu |
| `Per Halaman` | Mode satu halaman per layar |

> **Batasan:** file sangat besar (500 halaman atau lebih) akan berat. Gunakan mode **Per Halaman**. PDF hasil scan (gambar) tidak punya text layer, sehingga teksnya tidak dapat diseleksi.

---

### 03 Potong Gambar

Memotong gambar panjang seperti screenshot panjang, chat, atau web full-page menjadi beberapa file terpisah.

**Cara pakai:**

1. Upload gambar
2. Klik **pada gambar** untuk menambah titik potong, atau biarkan pengaturan otomatis yang bekerja
3. Pilih mode potong:

| Mode | Fungsi |
|---|---|
| **Per Bagian** | Bagi menjadi N bagian sama rata |
| **Per Tinggi** | Potong setiap N pixel |
| **Kustom** | Titik potong manual dari klik kamu |

4. Atur **Overlap (px)** bila perlu, supaya konten tidak terpotong di tengah
5. Klik **Potong dan Tampilkan** untuk melihat preview hasil
6. Klik **Download Semua (ZIP)** untuk mengunduh sekaligus

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
| **Orientasi** | Potret, Lanskap |
| **Skala Gambar** | Sesuai halaman, Sesuai lebar, Ukuran asli |
| **Margin** | dalam piksel |

> **Tips:** untuk hasil paling rapi, pakai **Skala Gambar = Sesuai lebar**, orientasi **Lanskap**, ukuran **A4**. Untuk dokumen yang butuh presisi tinggi seperti scan arsip, pilih **Ukuran asli** dan tambahkan margin.

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

> **Batasan penting:** konversi bersifat ekstrak konten (teks menjadi struktur), bukan rendering visual. PDF bergambar, tabel kompleks, multi-kolom, atau layout fancy akan menghasilkan markdown dan teks yang lebih sederhana. PDF ke Word sangat bergantung pada text layer. PDF hasil scan memerlukan OCR terlebih dahulu, yang berada di luar cakupan tool ini.

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
|-- index.html        # 02 Dokumen Reader
|-- crop.html         # 03 Potong Gambar
|-- gabung.html       # 04 Gabung ke PDF
|-- konversi.html     # 05 Konversi
|-- dashboard.html    # 01 Dashboard
|-- style.css         # Tema, drawer, glassmorphism, Valorant styling
|-- drawer.js         # Sidebar, theme switcher, brand corner
|-- particles.js      # Glass shards, bokeh, mouse flecks
`-- server.js         # Dev server lokal, tidak dipakai GitHub Pages
```

**Aturan penting:** semua path ditulis relatif (`style.css`, bukan `/style.css`) supaya situs tetap bisa di-host di sub-path GitHub Pages tanpa konfigurasi tambahan.

---

## Rekomendasi

**Untuk hasil terbaik:**

| Kebutuhan | Tool | Setting |
|---|---|---|
| Baca dokumen panjang | Reader | Mode **Per Halaman** |
| Screenshot panjang | Potong | **Overlap 30 px**, PNG |
| Scan arsip ke PDF | Gabung | **Ukuran asli**, margin 0 |
| Presentasi atau slide | Gabung | **A4 Lanskap**, Sesuai lebar |
| Arsip markdown | Konversi | **PDF ke Markdown** |
| Catatan cepat | Konversi | **Word ke Markdown** |

**Untuk performa:**

- Batasi ukuran file di bawah 200 MB agar browser tidak kehabisan memori
- Di Reader, hindari **Tampilkan Semua** untuk dokumen 500 halaman atau lebih
- Tutup tab lain bila proses terasa berat, karena semua perhitungan berjalan di thread utama
- Gunakan hard refresh setelah update agar tidak menerima versi dari cache lama

**Untuk privasi:**

- Tool ini aman untuk dokumen sensitif karena seluruh proses lokal dan file tidak dikirim ke mana pun
- Jangan memakai browser bersama atau profil yang menyimpan riwayat untuk berkas rahasia
- Berkas PDF hasil scan tetap perlu dihapus dari penyimpanan setelah selesai dipakai

---

## Privacy dan Keamanan

- Sepenuhnya client-side. **Tidak ada file yang diunggah ke server mana pun**, karena repo ini tidak memiliki backend.
- Tidak ada analytics, tidak ada tracking, tidak ada cookie.
- Penyimpanan lokal hanya berisi `fire-theme` untuk tema aktif dan `cofde_ops` untuk counter dashboard.
- Satu-satunya request keluar adalah pemuatan library dari CDN publik.
- Confidentialitas berkas tetap menjadi tanggung jawab perangkat dan browser yang kamu pakai.

---

## Troubleshooting

**Halaman masih versi lama**
Tekan `Ctrl+Shift+R`, atau buka di jendela incognito, atau tambahkan query param seperti `dashboard.html?v=2`.

**Kartu konversi tidak muncul atau tombol tidak merespons**
Library CDN gagal dimuat. Periksa koneksi internet lalu refresh. Butuh beberapa detik tambahan bila CDN sedang lambat.

**Reader tidak menampilkan teks**
Berkas PDF hasil scan, yaitu berupa gambar dan bukan teks. Karena tidak ada text layer, teks tidak dapat diseleksi.

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
| [pdf.js](https://mozilla.github.io/pdf.js/) 3.11.174 | Reader, Konversi | Render dan ekstraksi PDF |
| [mammoth.js](https://github.com/mwilliamson/mammoth.js) 1.6.0 | Reader, Konversi | Ekstraksi DOCX |
| [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 | Reader | Export halaman ke gambar |
| [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) 0.10.1 | Konversi | DOCX ke PDF |
| [docx](https://github.com/dolanmiu/docx) 8.5.0 | Konversi | Generate PDF ke DOCX |
| [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 | Gabung | Generate PDF |
| [JSZip](https://stuk.github.io/jszip/) 3.10.1 | Potong | Bundle hasil ke ZIP |

Lisensi tiap library mengikuti lisensi masing-masing proyeknya.

---

## Deployment

Situs ini di-host di **GitHub Pages** dari branch `main`.

```
Settings > Pages > Source: Deploy from a branch > main / (root)
```

Tidak ada build step dan tidak ada proses dependency install. Push ke `main` akan langsung tayang.
