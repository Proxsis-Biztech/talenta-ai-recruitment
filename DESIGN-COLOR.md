# DESIGN-COLOR.md — Talenta+ Assessment Platform Color System

> Status: Dokumen Token Desain Warna Resmi Talenta+.
> Mengacu secara penuh pada spesifikasi `Talenta+ Assessment Platform`.

---

## 1. Rasional Palette Talenta+
Platform asesmen dan rekrutmen profesional **Talenta+** menggunakan palet berwibawa berbasis *Primary Navy* (`#1E3A8A`) dan *Navy Dark* (`#172554`) yang melambangkan keandalan institusional, integritas, dan stabilitas enterprise. Dikombinasikan dengan *Blue Accent* (`#2563EB`) untuk navigasi dan link aktif, serta *Soft Blue* (`#EEF2FF`) untuk kontainer aktif dan latar kartu ringan yang menenangkan mata tanpa silau.

Tipografi menggunakan warna *Ink* (`#0F172A`) yang tajam dan berkontras tinggi terhadap *Page Background* (`#F8FAFC`) serta *Exam Background* (`#F1F5F9`), memenuhi standar aksesibilitas WCAG AAA (> 14:1).

---

## 2. Tabel Resmi Color Palette Talenta+

| Token Name | Hex Code | Peran / Penggunaan Utama | Aturan Pemakaian |
| :--- | :--- | :--- | :--- |
| **Primary Navy** | `#1E3A8A` | Brand logomark, tombol utama (CTA), heading penting | Tombol utama, icon aktif, badge identitas |
| **Navy Dark** | `#172554` | Hover tombol utama, kontras gelap | State hover interaktif tombol navy |
| **Blue Accent** | `#2563EB` | Link, highlight, kurva grafik tren peserta | Aksen tautan aktif, spline chart line |
| **Soft Blue** | `#EEF2FF` | Background menu aktif, kartu ringan ("Butuh bantuan?") | Menu sidebar aktif, chip status proses |
| **Page Background** | `#F8FAFC` | Latar utama dashboard & seluruh viewport | Background canvas dasar |
| **Exam Background** | `#F1F5F9` | Latar halaman ujian, header tabel, striping | Permukaan lapis kedua |
| **Ink** | `#0F172A` | Teks utama, judul metrik, nama peserta | Kontras tajam terhadap background putih/slate |
| **Muted Slate** | `#64748B` | Teks sekunder, subtitle, label metadata | Label form, deskripsi metrik, email |
| **Border** | `#E2E8F0` | Garis struktural, pembatas tabel, card borders | Batas kartu 1px halus terkalibrasi |
| **Success Green** | `#16A34A` | Status berhasil/online, status "Lulus", tren naik | Indikator lulus asesmen, pertumbuhan KPI |
| **Warning Amber** | `#F59E0B` | Timer ujian, peringatan proctoring, "Perlu tindakan" | Alert integritas, soal review |
| **Error Red** | `#DC2626` | Error, status gagal ("Gagal"), flag pelanggaran | Notifikasi counter badge, status gugur |
| **Info Cyan** | `#0EA5E9` | Informasi tambahan, telemetry live | Chip live info dan telemetry |

---

## 3. Proporsi Distribusi Warna (Rule 60 / 30 / 8 / 2)
1. **60% Base Canvas:** Didominasi oleh `#F8FAFC` (Page Background).
2. **30% Structural Surfaces:** `#FFFFFF` untuk card container & data table, `#F1F5F9` untuk header table & exam background.
3. **8% Ink & Typographic Structure:** `#0F172A` untuk teks primer, `#64748B` untuk teks sekunder.
4. **2% Accent & Semantic State:** `#1E3A8A` (Primary Navy) dan `#2563EB` (Blue Accent) sebagai interactive CTA, serta semantic chips (`#16A34A`, `#F59E0B`, `#DC2626`).

---

## 4. Variabel CSS `:root` Siap Pakai

```css
:root {
  /* Surfaces */
  --bg-base: #F8FAFC;
  --bg-surface-1: #FFFFFF;
  --bg-surface-2: #F1F5F9;
  --bg-surface-hover: #EEF2FF;
  
  /* Borders */
  --border-subtle: #E2E8F0;
  --border-bold: #CBD5E1;
  --border-focus: #1E3A8A;

  /* Typography / Ink */
  --ink-primary: #0F172A;
  --ink-secondary: #64748B;
  --ink-muted: #94A3B8;
  --ink-inverse: #FFFFFF;

  /* Brand / Primary Navy & Accents */
  --primary-navy: #1E3A8A;
  --navy-dark: #172554;
  --blue-accent: #2563EB;
  --soft-blue: #EEF2FF;
  --page-bg: #F8FAFC;
  --exam-bg: #F1F5F9;

  /* Accent tokens mapped to Primary Navy */
  --accent: #1E3A8A;
  --accent-hover: #172554;
  --accent-surface: #EEF2FF;
  --accent-border: #C7D2FE;

  /* Semantic State */
  --state-success: #16A34A;
  --state-success-bg: #DCFCE7;
  --state-warning: #F59E0B;
  --state-warning-bg: #FEF3C7;
  --state-danger: #DC2626;
  --state-danger-bg: #FEE2E2;
  --state-info: #0EA5E9;
  --state-info-bg: #E0F2FE;
}
```
