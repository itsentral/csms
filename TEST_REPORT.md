# Laporan Pengujian

Tanggal: 15 Oktober 2026. Runtime: PHP 8.3.6; Laravel **13.36.0** (composer.lock). Target deployment: Ubuntu 24.04, PHP 8.3+, MySQL 8.0+.

## Pengujian yang dijalankan

| Pemeriksaan | Hasil |
|---|---|
| PHPUnit / Laravel Feature Test, SQLite in-memory | **10 test, 45 assertion, lulus** |
| Migration lengkap dan QuestionSeeder/DemoSeeder, SQLite | Lulus |
| Idempotensi master seeder | Lulus: 49 pertanyaan, bobot 565 |
| PHP syntax lint | Lulus, 32 file |
| JavaScript syntax check | Lulus |
| Laravel route registration | Lulus, 16 route aplikasi |
| Blade view cache, route cache, configuration cache | Lulus |
| Integrasi JavaScript DOM dengan HTTP Laravel nyata (jsdom + SQLite) | Lulus |

Skenario PHPUnit: master data; pencegahan peningkatan peran melalui registrasi; isolasi vendor; dua verifikator dan dua validator dengan rata-rata; transisi/penguncian final; penolakan skor/tahap tidak valid; pengembalian perbaikan dan pengarsipan putaran; bukti privat dan unduhan berizin; tamu/akun nonaktif; multi-peran akun internal; perlindungan admin; batas kategori risiko.

Integrasi DOM/HTTP menjalankan login vendor dengan cookie session dan CSRF aktif, pembuatan vendor dari form, render 49 pertanyaan, kirim pra-kualifikasi, login verifikator dan kirim ke validasi, login validator dan finalisasi, pratinjau sertifikat dengan nilai 75,00, serta akses menu akun admin. Token CSRF diperbarui dari respons server setelah sesi diregenerasi.

## Batas pengujian

- **MySQL langsung belum diuji.** MySQL 8.0.46 berhasil disiapkan, tetapi server tidak dapat berjalan karena lingkungan eksekusi melarang UNIX socket. Migration memakai Schema Builder Laravel dan query ditujukan untuk MySQL. Jalankan test MySQL di database khusus sesuai panduan sebelum production.
- **Rendering browser dan cetak PDF belum diuji.** Unduhan Chromium tidak menghasilkan paket valid. Uji DOM/HTTP bukan pengganti uji rendering browser. CSS dan template sertifikat berasal dari mockup; lakukan UAT desktop/mobile dan cetak.
- Nginx, HTTPS, PHP-FPM, backup/restore, dan beban serentak belum diuji di server production pengguna.
- ZIP tidak berisi vendor Composer. Instalasi dependensi memerlukan internet dan memakai `composer install` dengan lock file.

Fungsi inti lolos pengujian aplikasi dan integrasi DOM/HTTP pada SQLite. Paket disiapkan untuk instalasi MySQL; verifikasi MySQL, rendering browser dan UAT server target masih diperlukan. Server production pengguna belum dideploy dalam pekerjaan ini.
