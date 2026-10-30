# 🚀 PANDUAN DEPLOYMENT OTOMATIS (COOLIFY & WILDCARD PROXY)

> **Untuk User:** Anda **hanya perlu mengisi 2 token** di bawah ini. Semua deployment berikutnya akan otomatis mendapatkan link/domain yang aktif tanpa perlu menyentuh Caddyfile atau reverse proxy manual di VPS!

```ini
# 1. Masukkan GitHub Token Anda:
GITHUB_TOKEN="ghp_PLACEHOLDER_TOKEN_MASUKKAN_DISINI"

# 2. Masukkan Coolify API Token Anda:
COOLIFY_TOKEN="12|PLACEHOLDER_COOLIFY_TOKEN_DISINI"

# 3. URL Repository GitHub (OPSIONAL - Boleh dikosongkan):
# - Jika KOSONG: AI akan otomatis mengambil link dari prompt chat Anda (misal: "deploy https://github.com/..."),
#   atau mendeteksi proyek di folder aktif saat ini, atau menanyakannya langsung jika belum tersedia.
# - Jika DIISI: AI akan memprioritaskan URL repository di bawah ini.
GIT_REPOSITORY=""
```

---

## 🏗️ ARSITEKTUR JARINGAN & KENAPA TIDAK PERLU REVERSE PROXY MANUAL

Jaringan Proxsis telah dikonfigurasi dengan rantai otomatis:
```
Pengunjung (Internet)
  ↓
Cloudflare (DNS Wildcard *.connect.proxsis.com)
  ↓
VPS Utama (Caddy Host: 143.20.49.131)
  [Rule: *.connect.proxsis.com -> reverse_proxy 192.168.10.21:80]
  ↓
Server Coolify Proxsis (Sitkrop Infra: 192.168.10.21)
  [Traefik / Coolify Proxy membaca domain container otomatis]
  ↓
Container Web / Aplikasi Anda (Berjalan Otomatis)
```

> [!IMPORTANT]
> **KUNCI BEBAS DARI REVERSE PROXY MANUAL:**
> 1. **WAJIB Deploy ke Server `Sitkrop Infra`** (`IP: 192.168.10.21` / `UUID: hb8pxcicfub6dvpmtjgfffyn` / `Destination: dbfkaogjjlrpuejuxy68lebd`). JANGAN deploy ke *Main VPS Host*.
> 2. **WAJIB Menggunakan Domain Berakhiran `.connect.proxsis.com`**, contoh: `https://namaproject.connect.proxsis.com`.
> 3. Caddy di VPS Utama sudah memiliki rule wildcard permanen ke server `Sitkrop Infra`, sehingga **DILARANG atau TIDAK PERLU menambahkan reverse proxy manual lagi di `/etc/caddy/Caddyfile`**.

---

## 🤖 PANDUAN OTOMASI UNTUK AI AGENT

### ⚙️ Standar Konfigurasi Default:
- **Coolify API URL:** `https://connect.proxsis.com`
- **Target Server:** `Sitkrop Infra` (`uuid: hb8pxcicfub6dvpmtjgfffyn`)
- **Target Destination:** `coolify` (`uuid: dbfkaogjjlrpuejuxy68lebd`)
- **Domain Template:** `https://${SUBDOMAIN}.connect.proxsis.com`
- **GitHub Target Default:** `cleavers25` (atau organisasi `Proxsis-Biztech`)
- **Coolify User-Agent:** Wajib sertakan `-H "User-Agent: curl/8.5.0"` di semua request API untuk melewati Cloudflare WAF.

---

### 🛠️ Alur Eksekusi Langkah demi Langkah (AI Agent):

#### Langkah 1: Validasi Input & Inisialisasi Environment
```bash
export GITHUB_TOKEN="{GITHUB_TOKEN}"
export COOLIFY_TOKEN="{COOLIFY_TOKEN}"
export COOLIFY_URL="https://connect.proxsis.com"

# Target Server & Destination Tetap (Sitkrop Infra Proxmox)
export SERVER_UUID="hb8pxcicfub6dvpmtjgfffyn"
export DESTINATION_UUID="dbfkaogjjlrpuejuxy68lebd"
```

#### Langkah 2: Resolusi Alamat Repository GitHub (Urutan Prioritas)
AI Agent menentukan target repository dengan logika berikut:

1. **Prioritas 1 (Dari Chat / Prompt User):**
   Jika pengguna mengetik URL repository di prompt (contoh: *"deploy https://github.com/Proxsis-Biztech/Sitkorp_Status.git"*), gunakan URL tersebut sebagai `TARGET_REPO`.
2. **Prioritas 2 (Dari Variabel `GIT_REPOSITORY` di atas):**
   Jika variabel `GIT_REPOSITORY` di atas diisi oleh user, gunakan URL tersebut.
3. **Prioritas 3 (Dari Folder Proyek Lokal Saat Ini):**
   Jika user meminta *"deploy proyek ini"* dan sedang berada di folder kode lokal:
   - Dapatkan remote GitHub yang sudah ada: `git remote get-url origin`
   - Atau jika belum ada remote, buat repository baru di akun GitHub user (`cleavers25`) secara otomatis via GitHub API dan lakukan commit & push.
4. **Prioritas 4 (Tanya Pengguna):**
   Jika tidak ada URL di prompt, variabel kosong, dan tidak ada file proyek lokal, tanyakan langsung kepada user: *"Apa URL repository GitHub yang ingin dideploy?"*

```bash
# Contoh jika membuat/push repo dari folder lokal:
GH_USER=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user | jq -r '.login')
REPO_NAME="landingpage_test"

curl -s -X POST -H "Authorization: Bearer $GITHUB_TOKEN" \
  -d "{\"name\":\"$REPO_NAME\",\"private\":false}" \
  https://api.github.com/user/repos || true

git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_TOKEN}@github.com/${GH_USER}/${REPO_NAME}.git"
git push -u origin main --force
TARGET_REPO="https://github.com/${GH_USER}/${REPO_NAME}"
```

#### Langkah 3: Setup Resource di Coolify

1. **Dapatkan atau Buat Project di Coolify:**
```bash
PROJECTS_JSON=$(curl -s -X GET "$COOLIFY_URL/api/v1/projects" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "User-Agent: curl/8.5.0")
PROJECT_UUID=$(echo $PROJECTS_JSON | jq -r '.[0].uuid // empty')

if [ -z "$PROJECT_UUID" ] || [ "$PROJECT_UUID" = "null" ]; then
  PROJECT_RES=$(curl -s -X POST "$COOLIFY_URL/api/v1/projects" \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "User-Agent: curl/8.5.0" \
    -H "Content-Type: application/json" \
    -d '{"name": "Web Projects"}')
  PROJECT_UUID=$(echo $PROJECT_RES | jq -r '.uuid')
fi
```

2. **Tentukan Subdomain:**
```bash
# Contoh subdomain: status.connect.proxsis.com atau nama unik lainnya
SUBDOMAIN="landing" # Sesuaikan dengan nama project
TARGET_DOMAIN="https://${SUBDOMAIN}.connect.proxsis.com"
```

3. **Daftarkan Aplikasi (Wajib ke Sitkrop Infra):**
```bash
APP_RES=$(curl -s -X POST "$COOLIFY_URL/api/v1/applications/public" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "User-Agent: curl/8.5.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_uuid\": \"$PROJECT_UUID\",
    \"server_uuid\": \"$SERVER_UUID\",
    \"destination_uuid\": \"$DESTINATION_UUID\",
    \"environment_name\": \"production\",
    \"git_repository\": \"$TARGET_REPO\",
    \"git_branch\": \"main\",
    \"build_pack\": \"static\",
    \"ports_exposes\": \"80\"
  }")

APP_UUID=$(echo $APP_RES | jq -r '.uuid')
```

4. **Atur Domain pada Aplikasi:**
```bash
# Gunakan parameter 'domains' untuk mendaftarkan URL ke Traefik Coolify
curl -s -X PATCH "$COOLIFY_URL/api/v1/applications/$APP_UUID" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "User-Agent: curl/8.5.0" \
  -H "Content-Type: application/json" \
  -d "{
    \"domains\": \"$TARGET_DOMAIN\",
    \"force_domain_override\": true
  }"
```

5. **Trigger Build & Deploy:**
```bash
DEPLOY_RES=$(curl -s -X POST "$COOLIFY_URL/api/v1/deploy?uuid=$APP_UUID&force=true" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "User-Agent: curl/8.5.0")
DEPLOYMENT_UUID=$(echo $DEPLOY_RES | jq -r '.deployments[0].deployment_uuid')
```

#### Langkah 4: Monitoring Status
Pantau deployment hingga selesai:
```bash
# Cek deployment sampai status "finished"
curl -s -X GET "$COOLIFY_URL/api/v1/deployments/$DEPLOYMENT_UUID" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "User-Agent: curl/8.5.0" | jq -r '.status'
```

Setelah status `finished`, web langsung aktif di `$TARGET_DOMAIN`.

---

## 💡 KETENTUAN KHUSUS UNTUK APLIKASI KOMPLEKS

### 1. Aplikasi Dockerfile (Node.js, Python, Go, dll)
- Set `build_pack: "dockerfile"`.
- Set `ports_exposes: "<PORT_CONTAINER>"` (misal `4180` atau `3000`).
- Daftarkan domain dengan `PATCH /api/v1/applications/{uuid}` menggunakan field `domains: "https://<subdomain>.connect.proxsis.com"`.
- Masukkan variabel lingkungan via `POST /api/v1/applications/{uuid}/envs` (hanya kirim `{"key": "...", "value": "..."}`).

### 2. Database PostgreSQL / MySQL
- Buat database secara terpisah via API Coolify:
  `POST /api/v1/databases/postgresql` dengan `server_uuid: $SERVER_UUID` dan `destination_uuid: $DESTINATION_UUID`.
- Coolify akan menempatkan database di Docker network `coolify`.
- Hubungkan aplikasi ke database menggunakan internal host URL dari database Coolify.

---

## 🚫 APA YANG TIDAK BOLEH DILAKUKAN
1. ❌ **JANGAN** menambah blok `reverse_proxy` di `/etc/caddy/Caddyfile` VPS Utama.
2. ❌ **JANGAN** mendeploy aplikasi ke `Main VPS Host` (`143.20.49.131`), karena aplikasi di sana tidak tercakup oleh proxy otomatis Traefik.
3. ❌ **JANGAN** menggunakan ekstensi domain selain `*.connect.proxsis.com` tanpa mendaftarkan record DNS terlebih dahulu di Cloudflare.
