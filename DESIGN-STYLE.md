# DESIGN-STYLE.md — Talenta+ Assessment Platform Style Guide

> Status: Dokumen Resmi Panduan Gaya, Tipografi, dan Arsitektur Multi-Role Talenta+.
> Versi: 2.4.0 (Enterprise Multi-Role Platform Release).

---

## 1. Brand Identity & Filosofi Desain
**Talenta+** adalah platform pengujian dan asesmen multi-role terpadu (*Peserta*, *Asesor*, *Admin*) berstandar enterprise.
Desain mengutamakan:
1. **Otoritas & Kepercayaan**: Menggunakan palet Primary Navy (`#1E3A8A`) dan Navy Dark (`#172554`) yang solid, berwibawa, dan bebas dari distorsi visual.
2. **Keterbacaan & Densitas Ergonomis**: Spacing bernapas yang tidak sesak namun padat informasi, dengan border 1px terkalibrasi (`#E2E8F0`).
3. **Integritas Ujian Tanpa Kompromi**: Pengawasan AI proctoring berbasis OpenCV dan penguncian browser berlapis yang aman.

---

## 2. Sistem Tipografi Resmi: Geist & Geist Mono

| Peran | Font Family | Fallback | Karakteristik & Pemakaian |
| :--- | :--- | :--- | :--- |
| **UI Utama** | `Geist`, sans-serif | `Arial, Helvetica, sans-serif` | Modern, bersih, aperture terbuka, netral, sangat mudah dibaca pada dashboard, kartu pertanyaan, dan instruksi asesmen. |
| **Teknis & Numerik** | `Geist Mono`, monospace | `monospace, Courier New` | Monospaced tajam, angka tabular sejajar. Dipakai untuk countdown timer, kode asesmen (`TLN-SE-2026`), ID peserta, p-value butir soal, IP address, timestamp audit trail. |

### Skala Tipografi Modular

| Token | Ukuran | Line Height | Tracking | Weight | Pemakaian |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-1` | `32px / 2.0rem` | `1.15` | `-0.03em` | `800 (Extrabold)` | Angka skor headline, persentase ringkasan kelulusan |
| `heading-1` | `24px / 1.5rem` | `1.25` | `-0.025em` | `700 (Bold)` | Judul halaman portal, judul section utama |
| `heading-2` | `20px / 1.25rem` | `1.3` | `-0.02em` | `700 (Bold)` | Judul kartu program, modal dialog header |
| `subheading` | `16px / 1.0rem` | `1.4` | `-0.015em` | `600 (Semibold)` | Label tahapan pipeline, nama kompetensi |
| `body-base` | `14px / 0.875rem` | `1.55` | `0` | `400 (Regular)` | Teks soal ujian, instruksi, paragraf deskripsi |
| `body-medium` | `14px / 0.875rem` | `1.55` | `-0.01em` | `500 / 600` | Opsi pilihan ganda, teks tombol, nama kandidat |
| `caption` | `12px / 0.75rem` | `1.4` | `+0.01em` | `500 (Medium)` | Status badge, subtitle tabel, legenda navigator |
| `mono-timer` | `15px - 18px` | `1.2` | `+0.02em` | `700 (Geist Mono)` | Countdown timer sticky, p-value, token kode ujian |

---

## 3. Palet Warna Resmi Talenta+ (13 Token)

| Token Name | Hex Code | Peran / Penggunaan Utama |
| :--- | :--- | :--- |
| **Primary Navy** | `#1E3A8A` | Brand logomark, tombol utama (CTA), heading penting |
| **Navy Dark** | `#172554` | Hover tombol utama, kontras gelap, background live console |
| **Blue Accent** | `#2563EB` | Link, highlight, kurva grafik tren peserta, tab aktif |
| **Soft Blue** | `#EEF2FF` | Background menu aktif, kartu ringan, status chip soft |
| **Page Background** | `#F8FAFC` | Latar kanvas utama seluruh portal dashboard |
| **Exam Background** | `#F1F5F9` | Latar ruang ujian peserta, header tabel, striping |
| **Ink** | `#0F172A` | Teks utama, judul metrik, nama peserta |
| **Muted Slate** | `#64748B` | Teks sekunder, label metadata, keterangan tahapan |
| **Border** | `#E2E8F0` | Garis struktural 1px, pembatas sel tabel, card borders |
| **Success Green** | `#16A34A` | Status berhasil/online, status "Lulus", soal terjawab hijau |
| **Warning Amber** | `#F59E0B` | Timer ujian countdown, peringatan, status ragu-ragu kuning |
| **Error Red** | `#DC2626` | Error, status tidak lolos, pelanggaran integritas merah |
| **Info Cyan** | `#0EA5E9` | Informasi tambahan, telemetry live, face tracking info |

---

## 4. Arsitektur Multi-Role & Peta Rute

### Landing Page Hub
- `/` : **Role Portal Selector** — 3 kartu interaktif (*Peserta*, *Asesor*, *Admin*) untuk akses cepat reviewer.

### Role A: PESERTA (`/peserta`)
1. `/peserta` atau `/peserta/dashboard`: Dashboard ringkasan, kartu ujian aktif, jadwal interview, progres tahapan.
2. `/peserta/asesmen`: Katalog program asesmen terdaftar beserta status kelulusan.
3. `/peserta/detail/:id`: Silabus materi, tahapan seleksi, dan aturan ujian.
4. `/peserta/device-check`: Pre-flight check (kamera dengan simulasi OpenCV face detection 30 FPS, mic volume meter, koneksi/ping, resolusi layar, pakta integritas).
5. `/peserta/exam/:id`: **Exam Player** (layar ujian paling krusial):
   - Timer countdown chip menempel di header (Geist Mono).
   - Indikator proctoring aktif (OpenCV bounding box & status dot).
   - Area kiri: Butir soal dengan 5 variasi tipe soal mock (Single Choice, Multi-Select, Short Answer, Essay dengan snippet kode, Matching).
   - Area kanan (280px): Navigator 40 butir soal interaktif dengan 4 kode warna (Belum / Ragu / Sudah / Aktif), tombol "Tandai Ragu", navigasi, dan tombol "Selesai & Kumpulkan".
   - Ringkasan modal sebelum submit (status 40 butir soal).
6. `/peserta/waiting-room`: Ruang tunggu antrean wawancara dengan nomor antrean dan status live asesor.
7. `/peserta/interview`: Ruang live interview dengan layout video peserta, self-view PIP, panel pertanyaan terstruktur, dan kontrol media.
8. `/peserta/hasil`: Scorecard komprehensif, status akhir, radar chart kompetensi, dan unduh PDF dossier.

### Role B: ASESOR (`/asesor`)
1. `/asesor` atau `/asesor/dashboard`: Jadwal interview hari ini, antrean penilaian tertunda, flag proctoring yang perlu diaudit.
2. `/asesor/interview-queue`: Tabel antrean slot kandidat dengan CAT score dan status room.
3. `/asesor/live-console/:id`: Ruang pengujian asesor dengan stream video kandidat, OpenCV face pitch telemetry overlay, dan rubrik penilaian 4 kompetensi skala 1-5 dengan pembobotan persentase otomatis.
4. `/asesor/proctoring`: Audit rekaman snapshot kejadian kecurangan yang ditangkap AI proctoring, gauge integritas 0-100, severity filter, dan aksi konfirmasi "Valid" / "False Positive".
5. `/asesor/scoring/:id`: Formulir rekomendasi akhir (Lanjut / Dipertimbangkan / Tidak Disarankan) dan catatan kualitatif.
6. `/asesor/rekap`: Matriks rekapitulasi penilaian semua peserta beserta tombol ekspor CSV.

### Role C: ADMIN (`/admin`)
1. `/admin/dashboard`: Ringkasan metrik 4 StatCard, kurva tren 30 hari, panel "Perlu tindakan" AI, dan DataTable peserta lengkap.
2. **Program Builder Studio (3 Kolom)**:
   - Kolom 1: Informasi program & passing grade.
   - Kolom 2: Pipeline builder tahapan seleksi drag/move dengan bobot persentase akumulatif 100%.
   - Kolom 3: Inspector detail tahapan terpilih dan live preview kandidat.
3. **Import CSV (Wizard 3 Langkah)**:
   - Langkah 1: Drag & drop file CSV.
   - Langkah 2: Pemetaan kolom CSV ke field database Talenta+.
   - Langkah 3: Validasi baris real-time dengan penandaan error spesifik sebelum impor.
4. **Master Materi & Kurikulum**:
   - Tree silabus hierarkis (Kategori > Subkategori > Kompetensi > Modul Materi).
   - Editor modul, rubrik penilaian asesor, dan daftar indikator perilaku teramati (*behavioral indicators*).
5. **Bank Soal & Item Analytics**:
   - Tabel repositori butir soal dengan p-value.
   - Editor butir soal lengkap untuk 5 tipe soal dengan rich text dan kunci jawaban.
   - Analisis efektivitas pengecoh (*Distractor Analysis Bar Chart*).
6. **PT & Perusahaan Rekanan**:
   - Kuota asesmen terpakai dengan bar progress interaktif.
   - Matriks sebaran peserta program x tahap seleksi x status kelulusan.
7. **Vertical Audit Trail Timeline**:
   - Modal audit vertikal komprehensif yang merekam seluruh jejak digital peserta dari otorisasi device, tes CAT, insiden proctoring, submit lembar jawaban, hingga wawancara asesor.

---

## 5. Mesin AI Proctoring & Anti-Cheat Engine (`proctoringEngine.ts`)

| Mekanisme Pencegahan | Landasan Teknis | Respons Sistem |
| :--- | :--- | :--- |
| **Deteksi Pindah Tab / Browser** | `document.visibilityState` + `window.onblur/focus` (Page Visibility API) | Memberikan peringatan popup Strike #1, mencatat durasi keluar (detik), dan mengirim log insiden ke dashboard asesor. |
| **Pencegahan Screenshot / Print** | Intersepsi event `keydown` (`PrintScreen`, `Ctrl+P`, `Meta+P`, `F12`) + CSS `@media print { body { display: none !important; } }` | Menggagalkan print dialog, mencatat percobaan screenshot, dan memastikan kertas/PDF hasil print menjadi halaman kosong. |
| **Blokir Klik Kanan & Clipboard** | `contextmenu`, `copy`, `cut`, `paste` event cancellation | Mencegah inspect element dan copy-paste soal ujian ke mesin pencari. |
| **Fullscreen Lockdown** | `requestFullscreen()` + `fullscreenchange` event listener | Memaksa browser ke mode layar penuh dan memberikan peringatan instan jika kandidat keluar dari fullscreen. |
| **Computer Vision AI Monitoring** | OpenCV SSD Face Detection (Simulasi & Modul Stream) | Deteksi wajah berkelanjutan, peringatan wajah hilang (*No Face Detected*) atau wajah ganda (*Multiple Faces Detected*). |

---

## 6. Standar Komponen & Status UI
Setiap modul pada platform memiliki 4 state visual yang terdefinisi secara matang:
1. **Default State**: Data terisi lengkap dengan tipografi Geist dan micro-interaction responsif.
2. **Loading State**: Skeleton shimmer dengan dimensi identik untuk mencegah layout shift (CLS).
3. **Empty State**: Ilustrasi ikon terkalibrasi, judul ramah, deskripsi penjelas, dan tombol CTA pembuat aksi pertama.
4. **Error State**: Halaman 403, 404, Offline, dan kartu feedback dengan pesan error jelas serta tombol kembali.
