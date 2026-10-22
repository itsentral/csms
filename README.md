# CSMS PT KAI

**CSMS** (Contractor Safety Management System) adalah portal prakualifikasi, verifikasi, validasi lapangan, dan klasifikasi risiko kontraktor PT Kereta Api Indonesia. Prosedurnya dikenal juga sebagai **RCHSEMS** (Railway Contractor Health Safety Environment Management System); nama itu tetap dipakai pada prosedur, sertifikat, dan identitas teknis (nama database, direktori, konfigurasi `rchsems.*`, dan perintah `rchsems:*`).

Laravel 13 · PHP 8.3+ · MySQL 8 · Antarmuka Material 3 (Google Sans) · Bahasa Indonesia dan English.

Fitur utama: alur prakualifikasi → verifikasi → validasi → hasil, ekspor Excel, dua bahasa (ID/EN), autentikasi dua langkah (TOTP) untuk akun internal, lupa password lewat email, dan notifikasi email perubahan status.

Aplikasi dibangun dari mockup `RCHSEMS_CSMS_PT_KAI_MVP_v11.html` (disimpan di root sebagai rujukan): 49 pertanyaan dalam 8 kelompok, bobot total 565, ringkasan penilai, kategori risiko, dan desain cetak sertifikat. Data dan kewenangan diproses di server Laravel/MySQL. Tidak memerlukan Node.js, Vite, atau CDN saat dijalankan.

## Mulai cepat

```bash
git clone https://github.com/itsentral/csms.git && cd csms
cp .env.example .env
composer install
php artisan key:generate
# isi koneksi MySQL (DB_*) di .env terlebih dahulu
php artisan migrate --seed
php artisan rchsems:create-admin
php artisan serve
```

Buka http://127.0.0.1:8000. Untuk akun demo lokal: `php artisan db:seed --class=DemoSeeder` (hanya `local`/`testing`). Jangan menjalankan `DemoSeeder` atau `migrate:fresh` di production.

## Dokumentasi

| Dokumen | Untuk siapa | Isi |
| ------- | ----------- | --- |
| [docs/instalasi-lokal.md](docs/instalasi-lokal.md) | Developer | Menyiapkan lingkungan lokal, database, dan akun demo |
| [docs/deployment.md](docs/deployment.md) | Operator server | Deploy ke Ubuntu 24.04 dengan Nginx, PHP-FPM, MySQL, dan HTTPS |
| [docs/operasional.md](docs/operasional.md) | Operator server | Backup, update, restore, dan penanganan masalah umum |
| [docs/go-live-checklist.md](docs/go-live-checklist.md) | Operator dan pemilik proses | Checklist keamanan, UAT, dan persetujuan sebelum go-live |
| [docs/fitur-dan-peran.md](docs/fitur-dan-peran.md) | Pengguna, analis, QA | Alur status, hak akses per peran, aturan penilaian, draft, lampiran, ekspor |
| [docs/arsitektur.md](docs/arsitektur.md) | Developer | Struktur source, database, sistem desain, i18n, pembatasan laju |
| [docs/pengujian.md](docs/pengujian.md) | Developer dan QA | Cara menjalankan test, cakupan, dan batas pengujian |

## Perintah yang sering dipakai

```bash
php artisan test                  # 35 test PHPUnit, SQLite in-memory
npm install && npm run test:e2e   # 11 smoke test browser (Playwright + Chrome terpasang)
composer lint && npm run lint     # Pint (PHP) dan ESLint (JavaScript); perbaiki format: composer format && npm run format
npm run build:css                 # hanya jika resources/css/portal.css diubah
php artisan rchsems:create-admin  # membuat admin pertama (password diminta interaktif)
php artisan rchsems:reset-mfa EMAIL   # darurat: atur ulang 2FA akun yang kehilangan perangkat
```

Hasil build `public/assets/portal.css` wajib ikut di-commit karena server production tidak menjalankan Node.js.
