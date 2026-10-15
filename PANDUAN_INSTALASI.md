# RCHSEMS / CSMS PT KAI — Laravel 13 + MySQL

Aplikasi berdasarkan `RCHSEMS_CSMS_PT_KAI_MVP_v11.html`. Bahasa antarmuka, warna, layout, logo, 49 pertanyaan dalam 8 kelompok, bobot 565, ringkasan penilai, kategori risiko, dan desain cetak sertifikat dipertahankan. JavaScript antarmuka memakai render mockup asli; data dan kewenangan diproses Laravel/MySQL. Tidak memerlukan Node.js, Vite, CDN, atau build frontend.

## 1. Kebutuhan

- Ubuntu 24.04 LTS, PHP **8.3+**, Composer 2, MySQL **8.0+**, Nginx.
- Ekstensi PHP: ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl, pcre, PDO, pdo_mysql, session, tokenizer, xml, zip. SQLite hanya diperlukan jika menjalankan test default.
- Server perlu akses internet untuk `composer install`. ZIP berisi source dan `composer.lock`; tidak menyertakan folder vendor, database, atau kredensial aktif.
- Sediakan disk untuk dokumen; batas aplikasi 15 MB **per berkas**. Frontend mengunggah beberapa berkas satu per satu.

Rujukan resmi: https://laravel.com/framework/docs/13.x/releases dan https://laravel.com/framework/docs/13.x/deployment . Versi terpasang yang diuji tercatat dalam `TEST_REPORT.md` dan `composer.lock`.

## 2. Instalasi local development

Ekstrak ZIP, masuk ke direktori `rchsems-kai`. Di Ubuntu lokal:

```bash
sudo apt update
sudo apt install -y php8.3-cli php8.3-mbstring php8.3-xml php8.3-curl php8.3-mysql php8.3-zip php8.3-sqlite3 unzip git composer mysql-server
php -v
composer --version
```

Buat database dan pengguna khusus (ubah password contoh):

```bash
sudo mysql
```

```sql
CREATE DATABASE rchsems CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rchsems'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_DB_YANG_KUAT';
GRANT ALL PRIVILEGES ON rchsems.* TO 'rchsems'@'localhost';
EXIT;
```

```bash
cp .env.example .env
composer install --prefer-dist
php artisan key:generate
```

Edit `.env`: isi `DB_PASSWORD`, pastikan `DB_HOST=127.0.0.1`, `DB_DATABASE=rchsems`, `DB_USERNAME=rchsems`, `APP_ENV=local`, `APP_DEBUG=true`, `SESSION_SECURE_COOKIE=false`.

```bash
php artisan migrate --seed
php artisan db:seed --class=DemoSeeder
php artisan serve --host=127.0.0.1 --port=8000
```

Buka http://127.0.0.1:8000 . Akun demo berikut memiliki password **LocalDemo2026!**:

| Email                    | Peran            |
| ------------------------ | ---------------- |
| admin@example.test       | Admin            |
| vendor@example.test      | Vendor           |
| verifikator@example.test | Verifikator      |
| validator@example.test   | Validator        |
| pengadaan@example.test   | Bagian Pengadaan |

DemoSeeder hanya berjalan pada environment `local` atau `testing`. Demo tidak dipasang otomatis oleh DatabaseSeeder. Untuk data kosong, jalankan hanya `migrate --seed`, kemudian `php artisan rchsems:create-admin`.

Windows/macOS: pasang PHP 8.3+, Composer 2, dan MySQL 8; aktifkan ekstensi yang sama, lalu mulai dari `cp .env.example .env` (Windows PowerShell: `Copy-Item .env.example .env`). Perintah Artisan sama. PHP bawaan beberapa paket XAMPP masih 8.2: pastikan `php -v` memenuhi syarat.

## 3. Production Ubuntu 24.04

Contoh domain: `rchsems.example.com`. Ganti domain dan password sebelum menjalankan.

### A. Paket server

```bash
sudo apt update
sudo apt install -y nginx mysql-server php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip unzip git composer certbot python3-certbot-nginx
sudo systemctl enable --now nginx mysql php8.3-fpm
```

Buat database seperti langkah local. Letakkan source hasil ekstrak pada `/var/www/rchsems-kai` menggunakan akun deploy Anda; jalankan Composer sebagai akun tersebut, bukan root.

```bash
cd /var/www/rchsems-kai
cp .env.example .env
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan key:generate
```

Isi `.env` production:

```dotenv
APP_NAME="RCHSEMS PT KAI"
APP_ENV=production
APP_KEY=base64:KUNCI_YANG_DIBUAT_ARTISAN
APP_DEBUG=false
APP_URL=https://rchsems.example.com
APP_TIMEZONE=Asia/Jakarta
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rchsems
DB_USERNAME=rchsems
DB_PASSWORD="PASSWORD_DATABASE_ANDA"
SESSION_DRIVER=database
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
LOG_LEVEL=warning
```

Pertahankan APP_KEY hasil `key:generate`; **jangan** memasukkan placeholder di atas. Jangan mengganti APP_KEY pada deployment rutin karena akan membatalkan sesi terenkripsi. Tidak ada konfigurasi email wajib: alur mockup tidak mengirim email/notifikasi.

```bash
php artisan migrate --seed --force
php artisan rchsems:create-admin admin@domain-perusahaan.co.id
```

Perintah admin meminta password secara tersembunyi, minimal 12 karakter. Seeder produksi tidak membuat akun/password bawaan. Admin membuat akun internal melalui menu **Kelola Akun Internal**. Vendor mendaftarkan akun secara mandiri.

### B. Izin direktori

Contoh dijalankan sebagai pemilik source / akun deploy:

```bash
sudo chown -R "$USER":www-data /var/www/rchsems-kai
sudo find /var/www/rchsems-kai -type d -exec chmod 750 {} \;
sudo find /var/www/rchsems-kai -type f -exec chmod 640 {} \;
sudo chmod -R ug+rwX storage bootstrap/cache
sudo find storage bootstrap/cache -type d -exec chmod g+s {} \;
sudo chmod 640 .env
```

Hanya `storage` dan `bootstrap/cache` membutuhkan akses tulis PHP-FPM. Bukti berada di `storage/app/private/evidence` dan diunduh melalui endpoint berotorisasi. **Tidak perlu** `php artisan storage:link`; jangan mempublikasikan folder bukti.

### C. PHP-FPM dan Nginx

```bash
sudo cp deploy/php-rchsems.ini /etc/php/8.3/fpm/conf.d/99-rchsems.ini
sudo cp deploy/nginx.conf /etc/nginx/sites-available/rchsems
sudo ln -s /etc/nginx/sites-available/rchsems /etc/nginx/sites-enabled/rchsems
```

Edit `server_name` pada `/etc/nginx/sites-available/rchsems`. Document root harus menunjuk `/var/www/rchsems-kai/public`, bukan root project. Pastikan tidak ada konfigurasi domain yang bertabrakan. Jangan hapus konfigurasi website lain.

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart php8.3-fpm
```

Arahkan DNS domain ke server dan pastikan port 80/443 terbuka. Aktifkan HTTPS:

```bash
sudo certbot --nginx -d rchsems.example.com
sudo certbot renew --dry-run
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

`SESSION_SECURE_COOKIE=true` mengharuskan membuka aplikasi melalui HTTPS. Jika memakai reverse proxy/load balancer, konfigurasi trusted proxy Laravel sesuai **alamat proxy yang Anda kendalikan** sebelum digunakan; contoh di sini untuk Nginx langsung.

Tidak perlu queue worker/Supervisor atau scheduler untuk fungsi yang tersedia; aplikasi menggunakan operasi sinkron. Health endpoint: `https://rchsems.example.com/up` (menandakan Laravel dapat boot, bukan pemeriksaan lengkap semua dependensi).

### D. Verifikasi setelah deployment

1. Buka HTTPS, login admin, ganti password melalui tombol Ganti Password bila perlu.
2. Buat akun verifikator, validator, pengadaan. Satu akun boleh memiliki peran verifikator dan validator sekaligus.
3. Daftar akun vendor baru, lengkapi profil, isi 49 jawaban, unggah satu bukti, kirim.
4. Login verifikator, unduh bukti, simpan nilai, minta perbaikan atau kirim ke validasi.
5. Login validator, isi tanggal/lokasi/hasil validasi, simpan skor, tetapkan hasil.
6. Login pengadaan, pilih vendor tervalidasi, pratinjau sertifikat, Cetak / Simpan PDF.
7. Periksa bahwa vendor lain tidak melihat pengajuan tersebut.

## 4. Perilaku dan hak akses

| Peran       | Fungsi                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Vendor      | Dashboard/data sendiri, membuat profil, mengisi dan mengirim pra-kualifikasi, upload bukti saat pengisian/perbaikan |
| Verifikator | Melihat vendor dan bukti, memberi nilai dokumen, mengembalikan perbaikan, meneruskan validasi                       |
| Validator   | Melihat verifikasi, memberi nilai lapangan, menetapkan hasil, pratinjau sertifikat                                  |
| Pengadaan   | Melihat dashboard/vendor, hasil risiko dan pratinjau/cetak sertifikat                                               |
| Admin       | Seluruh fungsi dan pengelolaan akun internal                                                                        |

- Matriks nilai: 0 / 0,25 / 0,5 / 0,75 / 1.
- Setiap akun menyimpan satu penilaian per vendor per tahap; simpan ulang memperbarui skor akun itu saja.
- Total = jumlah (rata-rata matriks tiap kriteria dari penilai tersimpan × bobot). Persentase = total ÷ 565 × 100.
- Kategori: ≥70 Risiko Tinggi; 50–<70 Risiko Menengah; 35–<50 Risiko Rendah; <35 Tidak Lulus. Nama kategori mengikuti mockup, menunjukkan kategori kualifikasi yang dicapai.
- Semua penilai yang hendak dihitung harus menyimpan sebelum tahap diteruskan/ditetapkan. Satu penilai berwenang dapat meneruskan tahap seperti mockup; tidak ada kuorum atau assignment tambahan.
- Saat perbaikan dikirim ulang, penilaian putaran sebelumnya diarsipkan di audit log dan penilaian aktif dimulai kembali. Berkas bukti tetap dipertahankan.
- Hasil final dikunci. Sertifikat merupakan **pratinjau hasil penilaian**, bukan tanda tangan digital atau penerbitan resmi otomatis. Nilai <35 tetap dapat ditampilkan sebagai “TIDAK LULUS”, sesuai mockup. Masa berlaku dua tahun hanya teks indikatif seperti mockup.
- Ekspor adalah JSON sesuai implementasi mockup; label “CSV/JSON” diperjelas menjadi “Ekspor JSON”.
- Penghapusan akun internal menjadi penonaktifan, sehingga rekam skor tetap terjaga. Akun admin dan akun sendiri dilindungi dari penonaktifan menu ini.
- Password disimpan dengan hash Laravel; akses diperiksa pada server, CSRF aktif, login/registrasi dibatasi laju, file tersimpan privat, status akhir tidak dipercaya dari input browser.
- Perbedaan untuk penggunaan server: tidak menggunakan password demo produksi, password baru minimal 12 karakter, seluruh jawaban wajib lengkap sebelum kirim, penguncian tahap, validasi file server, isolasi data vendor, dan penyimpanan audit trail.

## 5. Struktur source dan database

| Lokasi                                      | Isi                                                       |
| ------------------------------------------- | --------------------------------------------------------- |
| `resources/views/portal.blade.php`        | Kerangka HTML dan token CSRF                              |
| `public/assets/portal.css`, `portal.js` | Desain asli + integrasi API                               |
| `app/Http/Controllers`                    | Login, akun, profil, pengajuan, upload, penilaian, ekspor |
| `app/Services/Portal.php`                 | Hak akses, serialisasi, hitung rata-rata, kategori, audit |
| `database/migrations`                     | Semua tabel dan foreign key                               |
| `database/seeders`                        | Pertanyaan produksi dan data demo opsional                |
| `database/data`                           | Master pertanyaan yang diekstrak dari mockup              |
| `deploy`                                  | Konfigurasi Nginx/PHP dan script update                   |
| `tests/Feature/WorkflowTest.php`          | Pengujian alur dan kontrol akses                          |

Tabel: `users` (roles JSON, mendukung multi-peran), `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs` dari Laravel; serta `questions`, `vendors`, `answers`, `evidence`, `assessments`, `assessment_scores`, `audit_logs`. Snapshot hasil final ada di `vendors.final_snapshot`. Setiap vendor memiliki owner, jawaban unik per pertanyaan, dan penilaian unik per pengguna/tahap. Audit log dapat diperiksa oleh administrator database; tidak ada menu audit tambahan pada mockup.

Master pertanyaan harus konsisten dengan frontend: file JSON seeder dan konstanta `groups` di JavaScript berasal dari sumber sama. Jangan mengubah bobot atau menimpa master pada database berjalan tanpa migrasi versi instrumen. QuestionSeeder idempoten dan tidak menimpa data yang sudah ada.

## 6. Pengujian

```bash
composer install
php artisan test
```

Test default memakai SQLite in-memory, tidak menyentuh MySQL aplikasi. Untuk menguji migration dan alur yang sama pada MySQL, buat **database khusus kosong** `rchsems_test` dan berikan izin kepada akun test. Jalankan:

```bash
DB_CONNECTION=mysql DB_DATABASE=rchsems_test DB_USERNAME=rchsems DB_PASSWORD='PASSWORD_TEST' php artisan test
```

Environment shell mengungguli default PHPUnit. RefreshDatabase akan membuat/mengosongkan tabel: **jangan gunakan database production**. Rincian hasil pengujian paket ini ada di `TEST_REPORT.md`.

## 7. Backup, update, dan restore

Backup satu set database, `.env`/APP_KEY, dan seluruh `storage/app/private`. Simpan di lokasi terbatas dan terenkripsi. Contoh gunakan akun DB yang memiliki izin backup; `-p` meminta password tanpa meletakkannya di command line:

```bash
mkdir -p ~/backup-rchsems
mysqldump -h 127.0.0.1 -u rchsems -p --no-tablespaces --single-transaction rchsems > ~/backup-rchsems/database.sql
tar -czf ~/backup-rchsems/private-files.tar.gz storage/app/private
cp .env ~/backup-rchsems/environment-backup
chmod -R go-rwx ~/backup-rchsems
```

Untuk backup database dan file yang benar-benar satu titik waktu, aktifkan `php artisan down` selama backup, lalu `php artisan up`. Jangan menyimpan backup di direktori `public`.

Update: backup, masuk maintenance, letakkan source baru tanpa menimpa `.env` dan storage, lalu jalankan `bash deploy/update.sh`. Script tidak melakukan `migrate:fresh` dan tidak menghapus data. Jika gagal, aplikasi tetap maintenance agar operator dapat memperbaiki atau memulihkan backup. Restore memerlukan source release yang sesuai, database, folder bukti dan APP_KEY yang sama; uji restore di environment terpisah. Jangan mengandalkan rollback migration sebagai pemulihan data.

## 8. Masalah umum

- **500 / permission denied:** periksa `storage/logs/laravel.log`, kepemilikan storage/cache, `.env`, dan koneksi MySQL.
- **419:** muat ulang halaman; periksa domain/cookie, HTTPS dan APP_KEY; gunakan satu domain aplikasi konsisten.
- **413 / upload gagal:** periksa `client_max_body_size`, `upload_max_filesize`, `post_max_size`; restart PHP-FPM setelah perubahan.
- **could not find driver:** pasang `php8.3-mysql` dan pastikan CLI serta FPM sama-sama memuat ekstensi.
- **403:** periksa peran, akun aktif, dan kepemilikan vendor; jangan menghapus pemeriksaan otorisasi.
- **409:** tahap sudah berubah atau terkunci; buka ulang halaman untuk memuat keadaan terbaru.
- **Composer gagal:** periksa PHP 8.3+, ekstensi, internet, dan jalankan `composer diagnose`; jangan gunakan `--ignore-platform-reqs` pada production.
- **Perubahan .env tidak terbaca:** `php artisan optimize:clear` lalu ulangi cache konfigurasi/rute/view.

Fitur di luar mockup (SSO, MFA, verifikasi email, lupa-password melalui email, notifikasi, penugasan/kuorum penilai, tanda tangan elektronik, penerbitan sertifikat resmi, dan antivirus dokumen) belum disediakan. Data browser dari mockup tidak diimpor otomatis. Gunakan UAT pengguna sebelum menerima data operasional resmi.
