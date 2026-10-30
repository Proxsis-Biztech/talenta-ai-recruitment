# DESIGN-ANTI-SLOP.md

> Aturan desain global untuk SEMUA project. File ini bersifat MENGIKAT.
> Jika ada konflik dengan preferensi lain, file ini menang.
> File ini TIDAK mendefinisikan warna/font spesifik — itu ada di
> `DESIGN-COLOR.md` dan `DESIGN-STYLE.md` yang digenerate per project.
> Jika file-file itu belum ada, AI WAJIB berhenti dan meminta user
> menjalankannya lebih dulu (lihat bagian 9).

---

## 1. PRINSIP DASAR

1. Desain harus terasa DIBUAT, bukan DIGENERATE.
2. Asimetri > simetri. Whitespace > kepadatan. Sedikit elemen berani > banyak elemen aman.
3. Setiap halaman wajib punya SATU keputusan visual yang tidak akan dipilih default.
4. Copy adalah bagian dari desain. Tidak ada teks placeholder di deliverable.
5. Motion dipakai untuk menjelaskan hierarki, bukan untuk menghibur.
6. Kalau ragu antara "aman" dan "berkarakter", pilih berkarakter — lalu uji keterbacaan.

---

## 2. LARANGAN KERAS (AI-SLOP TELLS)

AI DILARANG menghasilkan pola berikut tanpa izin eksplisit user:

**Layout & struktur**
- Hero center dengan judul + subjudul + 2 CTA sejajar + ilustrasi abstrak di tengah.
- 3 atau 4 card sejajar berukuran identik dengan ikon di atas tiap card.
- Grid 6/6 simetris membelah layar.
- Setiap section punya struktur sama (judul tengah → 3 card → CTA).
- Card di dalam card di dalam card.
- Container `max-width` + `mx-auto` untuk SEMUA section tanpa variasi.

**Visual**
- Gradient ungu→biru (#6366F1 → #8B5CF6) atau pink→ungu sebagai aksen.
- Glassmorphism blur penuh (`backdrop-blur-2xl` + `bg-white/10`) di mana-mana.
- `rounded-3xl` / `rounded-full` untuk semua elemen.
- `shadow-lg` / `shadow-xl` tunggal sebagai satu-satunya shadow.
- Background putih polos #FFFFFF atau slate-50 tanpa tekstur.
- Ikon Lucide/Feather di setiap card, ukuran sama, warna sama.
- Blob/gradient glow blur 100px di belakang hero.
- Emoji di UI, label, tombol, atau heading.
- Dark mode = inverter sederhana (putih→hitam), bukan palette terpisah.

**Tipografi**
- Inter + Inter, atau Poppins/Manrope/Roboto sebagai display.
- Semua teks `font-weight: 600` tanpa hierarki berat.
- `letter-spacing` default di heading besar (display font wajib tracking negatif).
- Line-height seragam untuk heading dan body.
- Lebih dari 2 family font aktif.

**Copy**
- "Lorem ipsum", "Your headline here", "Feature one/two/three".
- "Empower your workflow", "Seamless experience", "Unlock potential", "Elevate your...".
- Deskripsi fitur 3 kata ("Fast. Simple. Powerful.").
- Setiap heading diakhiri tanda baca dramatis.

---

## 3. WAJIB ADA DI SETIAP PROJECT

1. **Design token sebagai satu-satunya sumber nilai.**
 Tidak boleh ada hex, px radius, atau shadow literal di komponen. Semua lewat CSS variable.
2. **Skala tipografi modular.**
 Rasio 1.2 (produk) atau 1.333 (editorial). Maks 6 ukuran aktif.
3. **Satu display font berkarakter + satu teks netral.** Maksimal 2 family.
4. **Tekstur halus** di minimal satu permukaan: noise/grain SVG, garis tipis, atau pola.
5. **Shadow berlapis** (2-3 layer) bila memakai shadow, bukan satu blur besar.
6. **State lengkap** untuk tiap interaktif: default, hover, focus-visible, active, disabled.
7. **Focus ring** custom yang terlihat jelas — bukan `outline: none`.

---

## 4. ATURAN LAYOUT (PEMECAH SIMETRI)

1. Gunakan grid 12 kolom. Setiap section WAJIB memakai span GANJIL:
 `7/5`, `8/4`, `5/7`, `9/3` — DILARANG `6/6`.
2. Per halaman, minimal SATU elemen boleh keluar container
 (offset negatif, bleed ke tepi viewport, atau overlap section).
3. Section pertama BUKAN hero center. Pilih: split asimetris, editorial
 kolom sempit + whitespace besar, atau grid dengan sel kosong.
4. Variasikan jumlah kolom antar section: 2 → 3 → 1 → 4. Jangan konstan.
5. Satu halaman = satu elemen signature non-fungsional
 (nomor indeks besar, garis panjang, tipografi vertikal, marker tepi).
6. Whitespace vertikal section minimal 96px desktop / 56px mobile,
 dan TIDAK SERAGAM antar section (variasikan 96/128/160).

---

## 5. ALUR KERJA WAJIB UNTUK AI

AI TIDAK BOLEH langsung menulis kode UI. Urutan:

1. Baca `DESIGN-COLOR.md` dan `DESIGN-STYLE.md` project ini.
2. Tulis `PLAN.md` singkat: struktur section, grid span tiap section,
 elemen signature, 1 referensi konkret per aspek.
3. Tunggu approval user.
4. Implementasi SATU section dulu. Berhenti. Minta review.
5. Setelah section disetujui, baru lanjut.
6. Setelah semua section jadi, jalankan **Self-Audit** (bagian 7).

---

## 6. ATURAN REFERENSI

- Dilarang memakai kata "modern", "clean", "professional", "sleek" tanpa
 merujuk produk nyata.
- Referensi wajib spesifik per aspek:
 grid dari <produk>, tipografi dari <produk>, density dari <produk>, warna dari <produk>.
- Gabungkan minimal 3 sumber. Tidak boleh meniru satu produk utuh.

---

## 7. SELF-AUDIT (WAJIB SEBELUM SELESAI)

Sebelum menyatakan pekerjaan selesai, AI harus menjawab dan menampilkan:

1. Sebutkan 5 hal di halaman ini yang paling khas hasil AI.
2. Untuk tiap hal: perbaiki ATAU jelaskan kenapa dipertahankan.
3. Cek: apakah semua warna/radius/shadow berasal dari token? (ya/tidak)
4. Cek: apakah ada section ber-span 6/6? (harus tidak ada)
5. Cek: apakah ada teks placeholder? (harus tidak ada)
6. Cek: apakah elemen signature ada? (harus ada)
7. Cek: kontras teks minimal 4.5:1? (ya/tidak)

Jika ada jawaban yang gagal, perbaiki dulu — jangan lapor selesai.

---

## 8. RESPONSIF & AKSESIBILITAS (NON-NEGOTIABLE)

1. Layout fluid: `max-width` + `width: 100%`, bukan lebar px kaku.
2. Grid `repeat(auto-fit, minmax(<x>, 1fr))` untuk daftar kartu.
3. Dilarang `position: absolute` untuk konten utama (hanya ornamen kecil).
4. Tabel lebar → wrapper `overflow-x: auto`.
5. Semua interaktif punya label aksesibel.
6. Prefers-reduced-motion: matikan animasi non-esensial.

---

## 9. GENERATE FILE PER PROJECT

File ini tidak berisi warna/font. Sebelum mulai UI pada project baru,
pastikan ada:

- `DESIGN-COLOR.md` — palette, token warna, aturan pemakaian, proporsi aksen.
- `DESIGN-STYLE.md` — font, skala tipografi, radius, shadow, spacing,
 motion, tekstur, dan elemen signature project ini.

Jika belum ada: AI WAJIB memakai prompt di bagian bawah file ini
untuk memintanya ke user, dan BERHENTI sebelum menulis UI.

---

## 10. PROMPT TEMPLATE — GENERATE `DESIGN-COLOR.md`

Salin dan isi sudut kurung, lalu jalankan di AI:

---
Buat file `DESIGN-COLOR.md` untuk project ini dengan ketentuan aturan
`DESIGN-ANTI-SLOP.md` (bagian 2 dan 3) berlaku penuh.

Konteks project:
- Nama/tipe produk: <...>
- Audiens: <...>
- Mood 3 kata: <...>
- Referensi warna konkret: <produk A>, <produk B>, <produk C>
- Mode: <light / dark / keduanya>
- Aksen yang DILARANG: <mis. ungu-biru, #6366F1>

Isi file wajib memuat:
1. Rasional 3-5 kalimat: kenapa palette ini, bukan yang lain.
2. Tabel token: name | hex/oklch | peran | maks area (%) | catatan.
 Wajib ada: base (2-3 level), surface (2-3 level), border (2 level),
 ink (3 level: primary, secondary, muted), accent (1), dan state
 (success, warning, danger, info — turunan, bukan warna default library).
3. Proporsi pemakaian (mis. 60/30/8/2) dan aturan aksen maks 5% area.
4. Aturan dark mode: palette terpisah, bukan inverter. Sebutkan apa yang berubah.
5. Pasangan kontras yang sudah diverifikasi (minimal 6 pasang, rasio dicantumkan).
6. Daftar "JANGAN pakai warna ini untuk": kasus yang mudah salah.
7. Blok CSS `:root` siap tempel.

Aturan bentuk:
- Preferensi `oklch()` bila didukung; fallback hex.
- Jangan pakai palette default framework apa pun (Tailwind slate/indigo, dsb).
- Jangan tambahkan warna di luar spektrum yang dirasionalkan.
---

## 11. PROMPT TEMPLATE — GENERATE `DESIGN-STYLE.md`

---
Buat file `DESIGN-STYLE.md` untuk project ini dengan ketentuan
`DESIGN-ANTI-SLOP.md` berlaku penuh.

Konteks project:
- Nama/tipe produk: <...>
- Kepribadian 3 kata: <...>
- Referensi konkret per aspek:
 grid dari <...>, tipografi dari <...>, density dari <...>, motion dari <...>
- Target perangkat utama: <...>
- Tone copy: <...>

Isi file wajib memuat:
1. 1 display font berkarakter + 1 teks netral (nama, sumber, lisensi,
 fallback stack). Jelaskan kenapa font ini, bukan Inter.
2. Skala tipografi modular dengan rasio eksplisit (1.2 atau 1.333):
 token, px/rem, line-height, letter-spacing, weight, pemakaian.
3. Skala spacing (basis 4px atau 8px) + aturan whitespace section
 yang TIDAK seragam (minimal 3 nilai vertikal berbeda).
4. Radius: 1 skala kecil (mis. 2/4/6), dilarang rounded-3xl default.
5. Shadow: definisi 2-3 layer per elevasi. Sebutkan kapan dipakai.
6. Border: warna, ketebalan, kapan dipakai vs shadow.
7. Grid: jumlah kolom, gutter, maks-width, pola span yang dipakai project.
8. Motion: durasi, easing, pola masuk (maks 2 pola), aturan reduced-motion.
9. Tekstur: jenis (noise/garis/pola), intensitas, di mana dipakai.
10. Elemen signature project ini: 1-3 ide konkret dan tempat pemakaiannya.
11. Blok CSS `:root` siap tempel untuk token style.
12. 10 aturan "JANGAN" spesifik project ini.

Aturan bentuk:
- Semua angka konkret. Tidak ada kata "sesuai kebutuhan".
- Setiap keputusan disertai 1 alasan singkat.
---

## 12. HIERARKI FILE

