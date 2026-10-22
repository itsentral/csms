# Deployment production (Ubuntu 24.04)

Panduan ini men-deploy aplikasi ke VPS Ubuntu 24.04 dengan Nginx, PHP-FPM, dan MySQL. Contoh domain: `csms.example.com`, lokasi aplikasi `/var/www/rchsems-kai`. Ganti domain dan password sebelum menjalankan perintah.

Sebelum go-live, selesaikan [go-live-checklist.md](go-live-checklist.md). Backup, update, dan restore ada di [operasional.md](operasional.md).

> **Penting:** Jangan langsung mengubah konfigurasi Nginx global, PHP, atau database yang sudah berjalan. Periksa kondisi server dan buat backup terlebih dahulu agar aplikasi lain di server tidak terganggu.

## 1. Arsitektur

Pengguna → domain dan HTTPS → Nginx + PHP-FPM (Laravel 13) → MySQL khusus aplikasi ini. Bukti dokumen disimpan di disk server pada `storage/app/private` dan hanya diunduh melalui endpoint berotorisasi. Tidak ada queue worker, scheduler, atau layanan email: semua operasi sinkron. Gunakan subdomain khusus bila domain utama sudah dipakai aplikasi lain.

## 2. Kebutuhan

- Ubuntu 24.04 LTS, PHP **8.3+** (FPM dan CLI), Composer 2, MySQL **8.0+**, Nginx.
- Ekstensi PHP: ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl, pcre, PDO, pdo_mysql, session, tokenizer, xml, zip.
- Akses internet untuk `composer install` dan sertifikat HTTPS (port 80/443 terbuka untuk verifikasi HTTP-01).
- Disk untuk dokumen. Batas aplikasi 15 MB **per berkas**; antarmuka mengunggah berkas satu per satu.

## 3. Memeriksa server yang sudah berisi aplikasi lain

Lewati bagian ini bila server baru dan kosong.

```bash
ssh USER_SSH@IP_VPS
lsb_release -a
php -v && php -m
composer --version
nginx -v && sudo nginx -t
sudo systemctl status nginx mysql --no-pager
sudo ss -lntp
ls -l /run/php/
```

Catat versi PHP dan socket PHP-FPM. PHP CLI dan PHP-FPM yang dipakai Nginx bisa berbeda; jangan mengganti versi PHP yang dipakai aplikasi lain. Backup konfigurasi dan database yang berpotensi terdampak:

```bash
sudo mkdir -p /var/backups/rchsems-preinstall
sudo cp -a /etc/nginx /var/backups/rchsems-preinstall/nginx-$(date +%F-%H%M)
sudo mysql -e "SHOW DATABASES;"
sudo mysqldump --single-transaction --routines --triggers --events NAMA_DATABASE_LAMA \
  > /var/backups/rchsems-preinstall/database-lama.sql
```

Ganti `NAMA_DATABASE_LAMA` dengan nama yang benar dan uji pemulihannya. **Jangan** menjalankan `DROP DATABASE`, menghapus folder aplikasi lama, atau menimpa konfigurasi Nginx tanpa memahami dampaknya.

## 4. Paket server dan database

```bash
sudo apt update
sudo apt install -y nginx mysql-server php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip unzip git composer certbot python3-certbot-nginx
sudo systemctl enable --now nginx mysql php8.3-fpm
```

Buat database dan pengguna khusus seperti di [instalasi-lokal.md](instalasi-lokal.md#ubuntu) (nama `rchsems`, password kuat milik Anda). Database tidak boleh dibuka ke internet.

## 5. Source dan konfigurasi

Jalankan sebagai akun deploy, bukan root:

```bash
sudo git clone https://github.com/itsentral/csms.git /var/www/rchsems-kai
sudo chown -R "$USER":www-data /var/www/rchsems-kai
cd /var/www/rchsems-kai
cp .env.example .env
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan key:generate
```

Isi `.env` production:

```dotenv
APP_NAME="CSMS PT KAI"
APP_ENV=production
APP_KEY=base64:KUNCI_YANG_DIBUAT_ARTISAN
APP_DEBUG=false
APP_URL=https://csms.example.com
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
MAIL_MAILER=smtp
MAIL_HOST=smtp.domain-perusahaan.co.id
MAIL_PORT=587
MAIL_USERNAME=akun-smtp
MAIL_PASSWORD="PASSWORD_SMTP"
MAIL_FROM_ADDRESS="noreply@domain-perusahaan.co.id"
MAIL_FROM_NAME="CSMS PT KAI"
MFA_REQUIRED=true
NOTIFY_EMAIL=true
```

Pertahankan `APP_KEY` hasil `key:generate`; **jangan** memasukkan placeholder di atas dan jangan menggantinya pada deployment rutin, karena sesi terenkripsi akan batal. Email dipakai untuk tautan **lupa password** (wajib agar fitur itu berfungsi) dan, bila `NOTIFY_EMAIL=true`, notifikasi perubahan status. Isi `MAIL_*` sesuai SMTP perusahaan dan uji pengiriman sebelum go-live. `MFA_REQUIRED=true` mewajibkan 2FA bagi akun internal; buat admin pertama, aktifkan 2FA-nya, lalu buat akun internal lain.

```bash
php artisan migrate --seed --force
php artisan rchsems:create-admin admin@domain-perusahaan.co.id
```

Perintah admin meminta password secara tersembunyi (minimal 12 karakter). Seeder production tidak membuat akun atau password bawaan. Admin membuat akun internal lewat menu **Kelola Akun Internal**; vendor mendaftar sendiri.

## 6. Izin direktori

```bash
sudo find /var/www/rchsems-kai -type d -exec chmod 750 {} \;
sudo find /var/www/rchsems-kai -type f -exec chmod 640 {} \;
sudo chmod -R ug+rwX storage bootstrap/cache
sudo find storage bootstrap/cache -type d -exec chmod g+s {} \;
sudo chmod 640 .env
```

Hanya `storage` dan `bootstrap/cache` membutuhkan akses tulis PHP-FPM; jangan menjadikan seluruh proyek dapat ditulis web server. **Tidak perlu** `php artisan storage:link`, dan jangan mempublikasikan folder bukti.

## 7. PHP-FPM dan Nginx

Konfigurasi siap pakai ada di folder `deploy/` (`nginx.conf`, `php-rchsems.ini`).

```bash
sudo cp deploy/php-rchsems.ini /etc/php/8.3/fpm/conf.d/99-rchsems.ini
sudo cp deploy/nginx.conf /etc/nginx/sites-available/rchsems
sudo ln -s /etc/nginx/sites-available/rchsems /etc/nginx/sites-enabled/rchsems
```

Ubah `server_name` di `/etc/nginx/sites-available/rchsems`. Document root harus `/var/www/rchsems-kai/public`, bukan root proyek. Periksa konfigurasi yang sudah ada (`ls -l /etc/nginx/sites-enabled/`) agar tidak bentrok, dan jangan menghapus situs lain.

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart php8.3-fpm
```

## 8. HTTPS

Arahkan DNS ke server, pastikan port 80/443 terbuka, lalu:

```bash
sudo certbot --nginx -d csms.example.com
sudo certbot renew --dry-run
cd /var/www/rchsems-kai
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

Aplikasi mengirim header `Content-Security-Policy` ketat (tanpa skrip inline) dan, pada HTTPS, `Strict-Transport-Security`. `SESSION_SECURE_COOKIE=true` mengharuskan aplikasi dibuka lewat HTTPS. Bila memakai reverse proxy atau load balancer, atur *trusted proxy* Laravel sesuai alamat proxy yang Anda kendalikan; contoh di sini untuk Nginx langsung. Health endpoint: `https://csms.example.com/up` (menandakan Laravel dapat boot, bukan pemeriksaan semua dependensi).

## 9. Verifikasi setelah deployment

1. Buka HTTPS dan login sebagai admin; ganti password lewat menu akun bila perlu.
2. Buat akun verifikator, validator, dan pengadaan. Satu akun boleh memiliki peran verifikator dan validator sekaligus.
3. Daftarkan akun vendor, lengkapi profil, isi 49 jawaban, unggah satu bukti, lalu kirim.
4. Login verifikator: unduh bukti, simpan nilai, minta perbaikan atau teruskan ke validasi.
5. Login validator: isi tanggal, lokasi, dan hasil validasi, simpan skor, tetapkan hasil.
6. Login pengadaan: pilih vendor tervalidasi, pratinjau sertifikat, **Cetak / Simpan PDF**.
7. Pastikan vendor lain tidak melihat pengajuan tersebut, lalu coba ekspor Excel dari menu akun.
8. Uji lupa password (email diterima, tautan membuka form password baru), dan aktifkan 2FA pada satu akun internal lalu login memakai kode.
9. Periksa `storage/logs/laravel.log` dan `/var/log/nginx/error.log` tidak berisi error kritis.

Instalasi pertama sebaiknya dicoba di staging atau subdomain uji sebelum dipakai resmi.

## Referensi

- [Laravel — Deployment](https://laravel.com/docs/13.x/deployment)
- [Laravel — Migrations](https://laravel.com/docs/13.x/migrations)
- [Ubuntu Server — Obtain TLS certificates](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/)
