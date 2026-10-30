# PLAN.md — Component Library UI & Layout Architecture Superadmin

> Mengacu secara ketat pada `rules-design.md` (DESIGN-ANTI-SLOP.md), `DESIGN-COLOR.md`, dan `DESIGN-STYLE.md`.
> Dokumen ini merincikan spesifikasi Component Library UI modular dan arsitektur layout Superadmin sebelum penulisan kode dimulai.

---

## 1. Latar Belakang & Kebutuhan

Saat ini, styling elemen UI (tombol, badge, input, kartu metrik, modal) pada halaman Superadmin ditulis langsung (*inline hardcoded*) di masing-masing file view (`AdminDashboard.tsx`, `PipelineView.tsx`, `JobManagement.tsx`, dll.). Hal ini menyebabkan:
1. Duplikasi utility class yang panjang dan rawan inkonsistensi styling.
2. Belum ada abstraksi komponen reusable yang siap pakai bagi pengembang lain (*design system component library*).
3. Layout halaman admin (sidebar, topbar, responsive drawer) menyatu di dalam satu file raksasa `AdminDashboard.tsx` sehingga sub-view lainnya belum memiliki layout shell yang terpadu dan modular.

Solusi: Membangun **UI Component Library** berbasis token CSS variable dan **SuperadminLayout** arsitektural yang profesional, asimetris, dan berdensitas data tinggi.

---

## 2. Arsitektur UI Component Library (`frontend/src/components/ui/`)

Semua komponen dibangun dengan TypeScript, `clsx`, dan `tailwind-merge` (`cn`), sepenuhnya mematuhi palet warna Petrol Teal (`#0E7490`), border 1px tajam, font tabular/monospace, dan radius terkontrol.

| Komponen | File | Varian & Fitur Utama | Anti-Slop Constraint |
| :--- | :--- | :--- | :--- |
| **Utility** | `utils.ts` | Helper `cn(...inputs)` untuk merging class Tailwind secara aman. | Tidak ada hardcoded hex di luar token. |
| **Button** | `Button.tsx` | `primary` (Petrol Teal `#0E7490`), `secondary` (slate outline), `outline`, `ghost`, `danger`, `accentSubtle`. Ukuran: `xs`, `sm`, `md`, `lg`. State: `isLoading` (spinner mikro), `disabled`, focus ring tactile. | Tidak ada gradient ungu-biru, shadow multi-layer tipis. |
| **Badge / Chip** | `Badge.tsx` | Varian semantik: `teal`, `neutral`, `success`, `warning`, `danger`, `info`. Format: `solid`, `soft`, `outline`. Monospace docket format `#01`. | Latar warna lembut tidak neon, font mono untuk ID/skor. |
| **Card / Surface** | `Card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Border 1px arsitektural (`--border-subtle`), elevasi layer-1/layer-2, opsi signature hairline accent (`hairlineColor="teal"`). | Dilarang rounded-3xl / rounded-full, border eksplisit. |
| **Input & Select** | `Input.tsx`<br>`Select.tsx` | Field input berdensitas tinggi, border 1px slate, focus ring Petrol Teal, slot ikon kiri/kanan, hint monospace, pesan error semantik. | Tidak ada border tebal melengkung ekstrim. |
| **Table** | `Table.tsx` | `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`. Densitas tinggi, font tabular, hover state halus (`--bg-surface-hover`), border pemisah 1px. | Kolom indeks monospace dengan hairline divider. |
| **TelemetryStrip**| `TelemetryStrip.tsx` | Ribbon metrik horizontal non-kotak terintegrasi (Rule 7/5 pemecah simetri), menggantikan 4 kartu kotak identik. | Dilarang 4 kotak seragam dengan gradasi warna-warni. |
| **Modal & Drawer**| `Modal.tsx`<br>`Drawer.tsx` | Dialog eksekutif & side-drawer geser. Header dengan docket ref (`Ref: KIN-...`), tombol escape / click-outside handling, backdrop blur halus. | Bukan pop-up klise di tengah tanpa struktur jelas. |
| **Tabs** | `Tabs.tsx` | Navigasi tab dengan signature hairline 2px Petrol Teal pada tab aktif. | Bukan kapsul melayang dengan gradient tebal. |

---

## 3. Desain Layout Superadmin (`SuperadminLayout.tsx`)

Layout shell yang membungkus semua halaman/tab Superadmin secara terpadu:

### A. Tactical Sidebar (Sisi Kiri, 256px Fixed / Drawer Mobile)
- **Brand Header:** Logogram Kinesta dengan badge `#AI_HR`.
- **User Docket Card:** Profil akun aktif dengan role tag `#SUPERADMIN` monospace dan avatar square rounded-md.
- **Categorized Navigation:** Dikelompokkan dalam 3 seksi logis:
  1. *OPERASIONAL TALENTA:* Dashboard Utama, Pipeline Seleksi (Kanban), Lowongan Kerja.
  2. *INTELIJEN & EVALUASI AI:* Peringkat & Matriks, Audit Proctoring LIVE, Analitika Eksekutif.
  3. *KONTROL SUPERADMIN:* Akses & Admin, Konfigurasi AI Engine CORE, Log Audit Keamanan.
- **Active State Indicator:** Aksen garis hairline vertikal 2px Petrol Teal di sisi kiri item aktif.
- **AI Engine Telemetry Footer:** Indikator status real-time model AI (`Gemini 2.5 Flash • 905ms`).
- **Mobile Responsive:** Drawer geser adaptif (`window.innerWidth >= 1024`) dengan backdrop blur.

### B. Executive Topbar (Sticky Header)
- **Kiri:** Tombol hamburger (mobile) + Breadcrumb / Docket Reference tag (`Ref: KIN-20261028`).
- **Kanan:** Indikator waktu real-time (`14:25 WIB`), Pill status `#SUPERADMIN`, dan tombol logout taktil.

### C. Asymmetric Grid Layout (Area Konten)
- **Grid 12-Kolom Asimetris:**
  - *Header & Status Hero:* Format `7 / 5` (7 kolom status operasional & model AI, 5 kolom Telemetry Strip eksekutif). Dilarang `6 / 6`.
  - *Data Control Ledger:* Format `8 / 4` (8 kolom search & quick filter pill, 4 kolom export & parameter dropdown).
  - *Table Section:* Format 12-kolom atau Split-view `8 / 4` saat dossier inspeksi cepat dibuka.
- **Surface Texture:** Canvas stone neutral (`#F8F9FA`) dengan overlay subtle grain mikro SVG (`opacity: 0.025`).

---

## 4. Referensi Konkret Per Aspek (Anti-Slop Compliance)

1. **Grid & Data Density:** Terinspirasi dari **Linear App** (efisiensi ruang tinggi, tata letak data padat tanpa whitespace kosong berlebihan).
2. **Surfaces & Borders:** Terinspirasi dari **Stripe Dashboard** (surface bertingkat yang bersih, border 1px tajam, bayangan tipis terkalibrasi).
3. **Telemetry Ribbon:** Terinspirasi dari **Datadog Metrics Explorer** (baris ledger data terintegrasi tanpa kartu kotak terpisah).
4. **Micro-Interactions & Motion:** Terinspirasi dari **macOS Sonoma System UI** (transisi snappy 150ms dengan kurva pegas tanpa animasi lambat).

---

## 5. Rencana Tahapan Eksekusi Bertahap

- **Tahap 1 (Component Library UI Primitives):**
  Buat direktori `frontend/src/components/ui/` yang berisi `utils.ts`, `Button.tsx`, `Badge.tsx`, `Card.tsx`, `Input.tsx`, `Select.tsx`, `Table.tsx`, `TelemetryStrip.tsx`, `Modal.tsx`.
- **Tahap 2 (SuperadminLayout Shell):**
  Buat `frontend/src/components/SuperadminLayout.tsx` yang mengelola sidebar navigasi, sticky header, mobile drawer, dan slot konten dinamis.
- **Tahap 3 (Review & Verifikasi Tahap 1 & 2):**
  Uji kompilasi TypeScript dan tinjau struktur komponen sebelum mengintegrasikan ke dalam view utama.
- **Tahap 4 (Refactor & Integrasi ke AdminDashboard):**
  Ganti elemen inline di `AdminDashboard.tsx` dengan komponen dari UI library baru.
- **Tahap 5 (Testing & Snapshot):**
  Verifikasi via `agent-browser` di desktop dan mobile viewport untuk memastikan tampilan rapih, tajam, dan tidak ada bug layout.
