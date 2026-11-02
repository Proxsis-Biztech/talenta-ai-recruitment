# PLAN.md — Peningkatan UI/UX User-Friendly: Peserta, Asesor, dan Admin

> Mengacu secara ketat pada `rules-design.md` (DESIGN-ANTI-SLOP.md), `DESIGN-COLOR.md`, dan `DESIGN-STYLE.md`.
> Dokumen ini merincikan peta transformasi menyeluruh untuk ketiga peran pengguna (Peserta, Asesor, Admin) agar memiliki tulisan (microcopy) yang ramah & terarah, layout asimetris berdensitas ergonomis, serta komponen taktil berstandar enterprise.

---

## 1. Visi & Prinsip Transformasi User-Friendly

Untuk menjadikan platform **Talenta+** ramah pengguna (user-friendly) di seluruh touchpoint:
1. **Tulisan (Copywriting & Microcopy)**:
   - Mengganti jargon teknis kaku/intimidatif dengan bahasa Indonesia profesional, suportif, dan berbasis aksi (*action-oriented*).
   - Menghadirkan konteks dan kepastian langkah berikutnya (*"Apa yang harus saya lakukan sekarang?"*).
   - Label metrik, feedback error, dan validasi form ditulis secara empatik dengan solusi konkret.

2. **Tata Letak (Layout & Hierarchy)**:
   - Menggunakan sistem grid 12-kolom asimetris (`7/5`, `8/4`, `9/3` — menghindari grid simetris membosankan `6/6`).
   - Penempatan informasi terpenting (*Primary Call-to-Action*) di zona pandang pertama (*above the fold*).
   - Navigasi sidebar terorganisir dengan collapsible mode & mobile drawer halus tanpa layout shift.
   - Whitespace bernapas yang konsisten (ritme vertikal rapi).

3. **Komponen & Visual Token (DESIGN-COLOR & STYLE Compliant)**:
   - Sepenuhnya berbasis token warna resmi: **Primary Navy** (`#1E3A8A`), **Navy Dark** (`#172554`), **Blue Accent** (`#2563EB`), **Soft Blue** (`#EEF2FF`), **Ink** (`#0F172A`), dan **Muted Slate** (`#64748B`).
   - Border 1px arsitektural halus (`#E2E8F0`), bayangan berlapis mikro (*multi-layer shadow*), dan radius terkalibrasi (`--radius-md: 10px` / `--radius-lg: 14px`).
   - Font `Geist` untuk keterbacaan teks UI & `Geist Mono` untuk countdown timer, kode peserta, dan data tabular.

---

## 2. Rincian Peningkatan per Role

### A. Portal Peserta (`/peserta`) — *Menenangkan, Jelas, & Mengurangi Kecemasan Tes*
- **Masalah Saat Ini**:
  - Teks proctoring terasa kaku dan menakut-nakuti kandidat.
  - Kartu hero menggunakan gradasi klise dengan `rounded-3xl`.
  - Tahapan seleksi belum memberikan estimasi waktu dan persiapan yang perlu dibawa.
- **Peningkatan Tulisan**:
  - Salam personal hangat: *"Selamat datang kembali, [Nama]. Sesi tes Anda telah terjadwal dan siap diikuti dengan nyaman."*
  - Banner panduan ramah: Mengganti *"Peringatan Pelanggaran AI"* dengan *"Panduan Suasana Ujian Kondusif: Pastikan pencahayaan cukup dan wajah terlihat jelas di kamera."*
  - Badge status intuitif: `Siap Dikerjakan`, `Dalam Penilaian Asesor`, `Terverifikasi Lolos`.
- **Peningkatan Layout**:
  - Header split asimetris `8 / 4`: Sisi kiri berisi kartu aksi berikutnya (*Next Immediate Step*), sisi kanan berisi countdown jadwal & widget bantuan cepat.
  - Timeline seleksi vertikal berdensitas ergonomis dengan indikator waktu estimasi per tahapan.
- **Peningkatan Komponen**:
  - Tombol aksi utama taktil dengan icon penjelas (*"Mulai Uji Perangkat"*, *"Masuk Ruang Ujian"*).
  - Kartu ringkasan materi dan tata tertib ujian dengan checklist yang interaktif.
  - Modal panduan kendala teknis (FAQ kamera mati, koneksi drop) yang mudah diakses dari header.

---

### B. Portal Asesor (`/asesor`) — *Efisiensi Tinggi, Rubrik Transparan, & Tanpa Distraksi*
- **Masalah Saat Ini**:
  - Dashboard asesor memiliki 3 kartu sejajar identik (indikator slop).
  - Tombol aksi ke konsol penilaian kurang menonjol di tengah antrean.
  - Panduan rubrik BARS (Behaviorally Anchored Rating Scales) belum terintegrasi secara kontekstual di samping lembar penilaian.
- **Peningkatan Tulisan**:
  - Copy operasional yang presisi: *"Jadwal Pengujian Hari Ini: 5 Kandidat Siap Dinilai"*.
  - Indikator antrean jelas: *"Kandidat Berikutnya: [Nama] • CAT Score: 88/100 • Status: Menunggu di Waiting Room"*.
  - Deskripsi skala nilai rubrik BARS (1-5) ditampilkan secara deskriptif (bukan sekadar angka, tapi penjelasan perilaku nyata yang dinilai).
- **Peningkatan Layout**:
  - Grid asimetris `7 / 5`: Sisi kiri tabel antrean kandidat terurut jam sidang, sisi kanan panel "Kandidat Saat Ini" lengkap dengan quick dossier & catatan sesi sebelumnya.
  - Konsol Live Interview split-screen: stream video kandidat di kiri, rubrik penilaian instan & live AI-telemetry di kanan tanpa perlu scroll jauh.
- **Peningkatan Komponen**:
  - Status badge berkode warna lembut (Hijau mint untuk Online, Soft Blue untuk Menunggu, Muted Slate untuk Terjadwal).
  - Quick action button *"Buka Ruang Uji"* yang menonjol dan disable otomatis bila belum masuk jam sesi.
  - Slider/radio button rubrik penilaian yang ramah keyboard (aksesibilitas WCAG).

---

### C. Portal Admin (`/admin`) — *Densitas Data Eksekutif, Kontrol Cepat, & Navigasi Terstruktur*
- **Masalah Saat Ini**:
  - Banyak tampilan tabel padat tanpa filter pill yang cepat.
  - Informasi metrik masih berupa kartu terpisah yang memakan ruang vertikal berlebih.
  - Formulir setting/program builder belum memiliki wizard langkah demi langkah yang intuitif.
- **Peningkatan Tulisan**:
  - Headline informatif: *"Pusat Kendali Rekrutmen: [Nama Batch/Program]"*.
  - Placeholder pencarian kontekstual: *"Cari berdasarkan nama peserta, nomor registrasi, atau instansi..."*.
  - Empty state yang mendidik: menampilkan ilustrasi subtle dan tombol panduan jika belum ada data.
- **Peningkatan Layout**:
  - Layout arsitektural `SuperadminLayout` dengan header docket ref dan breadcrumb terstandar.
  - Split grid `8 / 4`: Tabel data kandidat + Inspector drawer samping untuk melihat CV, rekaman interview, dan audit log tanpa berpindah halaman.
- **Peningkatan Komponen**:
  - `TelemetryStrip` horizontal hemat tempat menggantikan deretan kartu statis.
  - Multi-filter quick chips (Filter Status: Lolos, Perlu Review, Gugur).
  - Modal konfirmasi aksi massal (*bulk action*) dengan pesan peringatan yang ramah dan aman.

---

## 3. Rencana Eksekusi Bertahap

- **Tahap 1**: Portal Peserta (Dashboard, Device Check, dan Exam Player).
- **Tahap 2**: Portal Asesor (Dashboard, Antrean Interview, dan Scoring Console).
- **Tahap 3**: Portal Admin (Dashboard Utama, Pipeline View, dan User Ledger).
- **Tahap 4**: Review Konsistensi & Pengujian Visual (Desktop & Mobile).
