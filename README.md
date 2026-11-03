# Sistem Formulir Pendaftaran & Rekrutmen Kerja

Aplikasi Full-Stack modern yang dibuat menggunakan React.js, Tailwind CSS, Express.js, Prisma ORM, dan PostgreSQL/SQLite.

## Fitur Utama
1. **Formulir Pendaftaran Dinamis**: Validasi client-side menggunakan Yup, input dinamis (Pengalaman Kerja, Universitas/Jurusan disesuaikan dengan pendidikan terakhir).
2. **Keamanan Upload CV**: Hanya menerima PDF maksimal 2MB dengan penggantian nama file dinamis berdasarkan timestamp untuk mencegah Path Traversal.
3. **Admin Dashboard**: Terlindungi JWT. Tabel daftar pelamar lengkap dengan filter (Pendidikan), pencarian (Nama/Jurusan), pagination sisi server (Server-Side Pagination), dan fitur unduh CV satu klik.
4. **Desain Profesional**: Menggunakan Tailwind CSS murni dengan desain korporat premium dan *micro-animations*.

## Struktur Proyek
- `/frontend` - Aplikasi React (Vite)
- `/backend` - REST API (Express.js)

## Cara Menjalankan Aplikasi

### 1. Backend (Server API)
Pastikan Anda berada di direktori proyek.
```bash
cd backend
# Install dependencies
npm install

# Setup Database SQLite & Seed Admin
npx prisma db push
npx prisma generate
npx tsx prisma/seed.ts

# Jalankan Server (Akan berjalan di http://localhost:5000)
npm run dev
```

> **Akun Admin Default:**
> Username: `superadmin`
> Password: `cleaverzz25` (ubah lewat `SUPERADMIN_PASSWORD` di production)

Database default menggunakan PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:12345@localhost:5432/ai_recruitment?schema=public"
```
Buat database terlebih dahulu, lalu jalankan `npx prisma db push` dari folder `backend`.

### 2. Frontend (UI/UX)
Buka terminal baru:
```bash
cd frontend
# Install dependencies
npm install

# Jalankan server frontend
npm run dev
```
Buka URL yang diberikan oleh Vite (biasanya `http://localhost:5173`) di browser Anda.

## Endpoint API Utama
- `POST /api/applicants`: Submit form pendaftaran (multipart/form-data untuk CV).
- `POST /api/admin/login`: Autentikasi Admin.
- `GET /api/admin/applicants`: List pendaftar (Membutuhkan Bearer Token).
- `GET /api/admin/applicants/cv/:fileName`: Unduh file CV pendaftar (Membutuhkan Bearer Token).
