# Panduan Instalasi CSMS PT KAI — Laravel 13 + MySQL di VPS Ubuntu 24.04

Panduan ini disesuaikan dengan kondisi server: domain sudah tersedia, akses melalui SSH, VPS sudah menjalankan aplikasi lain, dan MySQL telah terpasang.

> **Penting:** Jangan langsung mengubah konfigurasi Nginx global, PHP, atau database yang sudah berjalan. Periksa kondisi server dan buat backup terlebih dahulu agar aplikasi yang sudah ada tidak terganggu.

Laravel 13 mensyaratkan PHP minimal 8.3. Nginx harus mengarah ke direktori `public` proyek Laravel, bukan root folder proyek.

## 1. Arsitektur

Alur yang disarankan:

1. Pengguna CSMS (Admin, Vendor, Verifikator, Validator)
2. Domain dan HTTPS
3. Nginx + PHP-FPM untuk Laravel 13
4. Database MySQL khusus CSMS

Gunakan subdomain khusus, misalnya `csms.domainanda.co.id`, jika domain utama sudah digunakan aplikasi lain.

## 2. Siapkan variabel instalasi

Contoh berikut harus disesuaikan dengan domain dan lokasi folder Anda:

```bash
DOMAIN="csms.domainanda.co.id"
APP_DIR="/var/www/csms-pt-kai"
DB_NAME="csms_pt_kai"
DB_USER="csms_app"
```

Jangan jalankan variabel ini secara membabi buta sebelum memastikan domain dan folder yang benar.

## 3. Periksa server melalui SSH

Login ke VPS:

```bash
ssh USER_SSH@IP_VPS
```

Periksa kondisi server:

```bash
lsb_release -a
php -v
php -m
composer --version
nginx -v
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo systemctl status mysql --no-pager
sudo ss -lntp
ls -l /run/php/
```

Catat versi PHP dan socket PHP-FPM. Jangan mengganti versi PHP secara langsung jika aplikasi lain di VPS menggunakannya; PHP CLI dan PHP-FPM yang digunakan Nginx dapat berbeda.

Kebutuhan utama:

- PHP minimal 8.3 beserta ekstensi yang dibutuhkan Laravel.
- Composer.
- Nginx dan PHP-FPM aktif.
- MySQL dapat menerima koneksi lokal.
- Port 80 dan 443 dapat diakses untuk verifikasi HTTPS HTTP-01.

## 4. Backup konfigurasi dan database

Buat lokasi backup:

```bash
sudo mkdir -p /var/backups/csms-preinstall
sudo cp -a /etc/nginx \
  /var/backups/csms-preinstall/nginx-$(date +%F-%H%M)
```

Lihat daftar database:

```bash
sudo mysql -e "SHOW DATABASES;"
```

Ekspor database yang akan terdampak, misalnya:

```bash
sudo mysqldump --single-transaction \
  --routines --triggers --events \
  NAMA_DATABASE_LAMA \
  > /var/backups/csms-preinstall/database-lama.sql
```

Ganti `NAMA_DATABASE_LAMA` dengan nama yang benar. Jika database besar atau menggunakan autentikasi khusus, sesuaikan metode backup dan uji pemulihannya.

**Jangan** menjalankan `DROP DATABASE`, menghapus folder aplikasi lama, atau menimpa konfigurasi Nginx tanpa memahami dampaknya.

## 5. Unggah dan ekstrak paket CSMS

Unduh paket starter CSMS yang telah disiapkan dari percakapan, lalu unggah dari komputer lokal:

```bash
scp CSMS_PT_KAI_Laravel13_MySQL.zip \
  USER_SSH@IP_VPS:/tmp/
```

Di VPS, periksa isi arsip terlebih dahulu:

```bash
sudo mkdir -p /tmp/csms-extract
sudo unzip -l /tmp/CSMS_PT_KAI_Laravel13_MySQL.zip
sudo unzip /tmp/CSMS_PT_KAI_Laravel13_MySQL.zip \
  -d /tmp/csms-extract
find /tmp/csms-extract -maxdepth 3 -type f | head -80
```

Cari lokasi `artisan`, `composer.json`, dan folder `public`. Salin isi folder proyek yang benar ke direktori aplikasi. Contoh ini mengasumsikan folder induk hasil ekstraksi bernama `CSMS_PT_KAI_Laravel13_MySQL`:

```bash
sudo mkdir -p "$APP_DIR"
sudo rsync -a \
  /tmp/csms-extract/CSMS_PT_KAI_Laravel13_MySQL/ \
  "$APP_DIR"/

cd "$APP_DIR"
ls -la
```

Jika struktur arsip berbeda, sesuaikan sumber `rsync`. Hindari struktur folder bertingkat yang salah.

Verifikasi:

```bash
test -f artisan && echo "artisan ditemukan"
test -f composer.json && echo "composer.json ditemukan"
test -d public && echo "folder public ditemukan"
```

Jika salah satu tidak ditemukan, hentikan proses dan perbaiki lokasi ekstraksi.

> Paket ini adalah starter yang masih memerlukan pengujian instalasi dan UAT, bukan aplikasi yang sudah dinyatakan siap produksi.

## 6. Instal dependensi Laravel

Masuk ke folder proyek:

```bash
cd /var/www/csms-pt-kai
composer install --no-dev --prefer-dist --optimize-autoloader
```

Jalankan Composer sebagai pengguna non-root yang memiliki akses tulis ke proyek. Jika gagal karena ekstensi PHP atau versi paket, perbaiki penyebabnya. Hindari `--ignore-platform-reqs`.

Siapkan file konfigurasi:

```bash
if [ ! -f .env ]; then
  cp .env.example .env
fi
```

Jika `.env.example` tidak ada, periksa README dan struktur proyek; jangan membuat konfigurasi secara asal.

## 7. Buat database MySQL khusus CSMS

Masuk ke MySQL dengan akun administrator yang sesuai:

```bash
sudo mysql
```

Jalankan SQL berikut. Ganti password contoh dengan password acak yang kuat:

```sql
CREATE DATABASE csms_pt_kai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'csms_app'@'localhost'
  IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_ACAK_YANG_KUAT';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, INDEX, DROP, REFERENCES
ON csms_pt_kai.*
TO 'csms_app'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

Hak akses ini dibatasi pada database CSMS. Untuk produksi, tinjau kebutuhan hak istimewa berdasarkan migrasi yang digunakan. Jangan memberi akun aplikasi hak administratif global.

Edit `.env`:

```bash
nano .env
```

Sesuaikan konfigurasi berikut:

```dotenv
APP_NAME="CSMS PT KAI"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://csms.domainanda.co.id

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=csms_pt_kai
DB_USERNAME=csms_app
DB_PASSWORD="PASSWORD_MYSQL_YANG_ANDA_BUAT"
```

Gunakan password yang benar-benar dibuat. Jangan membagikan password, private key SSH, atau isi `.env` ke chat atau Git.

Atur izin `.env`. Ganti `USER_SSH` dengan pengguna Linux yang benar:

```bash
sudo chown USER_SSH:www-data .env
sudo chmod 640 .env
```

Pastikan PHP-FPM dapat membaca `.env` melalui grup atau mekanisme izin yang dipilih.

## 8. Tinjau migrasi dan jalankan migrasi database

Sebelum migrasi, periksa file di `database/migrations` dan seeder. Pastikan tidak ada operasi yang menghapus database atau data di luar lingkup CSMS.

```bash
cd /var/www/csms-pt-kai
php artisan --version
php artisan config:clear
php artisan migrate:status
```

Jika migrasi sudah ditinjau dan database CSMS masih kosong:

```bash
php artisan migrate --force
```

Perintah `--force` menjalankan migrasi dalam mode produksi tanpa konfirmasi interaktif. Pastikan nama database dan migrasi benar sebelum menjalankannya.

Jika proyek menyediakan seeder, periksa `database/seeders/DatabaseSeeder.php` dan seeder yang dipanggilnya. Jalankan hanya setelah memastikan isinya aman:

```bash
php artisan db:seed --force
```

Jangan jalankan seeder secara otomatis jika belum diketahui apakah seeder membuat akun bawaan, menggunakan password default, atau menimpa data.

Periksa status migrasi kembali:

```bash
php artisan migrate:status
```

Jika terjadi error, periksa log dan kondisi database sebelum mencoba lagi.

## 9. Atur izin dan cache Laravel

Contoh berikut mengasumsikan pengguna SSH bernama `USER_SSH`. Sesuaikan jika berbeda:

```bash
cd /var/www/csms-pt-kai

sudo chown -R USER_SSH:www-data .
sudo find . -type d -exec chmod 755 {} \;
sudo find . -type f -exec chmod 644 {} \;
sudo chmod 640 .env

sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rwX storage bootstrap/cache
```

Laravel membutuhkan hak tulis pada `storage` dan `bootstrap/cache`. Jangan menjadikan seluruh proyek dapat ditulis oleh web server. Jika diperlukan, atur izin tambahan hanya pada direktori unggahan yang relevan.

Buat application key hanya jika belum ada:

```bash
php artisan key:generate
```

**Jangan mengganti `APP_KEY` pada instalasi yang sudah menyimpan data terenkripsi atau memiliki sesi aktif.** Jika `.env` sudah memiliki key yang benar, pertahankan.

Bersihkan dan buat cache:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan view:cache
```

Jalankan `php artisan route:cache` hanya setelah memastikan seluruh route dapat di-cache tanpa konflik.

## 10. Konfigurasi Nginx

Periksa konfigurasi yang sudah ada:

```bash
ls -l /etc/nginx/sites-enabled/
sudo nginx -T
```

Pastikan tidak ada server block lain yang menggunakan domain CSMS. Backup file yang akan diubah, lalu buat konfigurasi baru:

```bash
sudo nano /etc/nginx/sites-available/csms-pt-kai
```

Contoh konfigurasi HTTP berikut harus disesuaikan dengan domain, folder proyek, dan socket PHP-FPM:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name csms.domainanda.co.id;

    root /var/www/csms-pt-kai/public;
    index index.php;

    charset utf-8;
    client_max_body_size 20M;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }

    location = /robots.txt {
        access_log off;
        log_not_found off;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~* ^/(storage|vendor|bootstrap|config|database|resources|routes)/ {
        deny all;
    }

    location ~ \.php$ {
        return 404;
    }

    location = /index.php {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
        fastcgi_hide_header X-Powered-By;
    }
}
```

Jika socket PHP-FPM bukan `/run/php/php8.3-fpm.sock`, ganti sesuai hasil pemeriksaan `ls -l /run/php/`.

Aktifkan konfigurasi:

```bash
sudo ln -s /etc/nginx/sites-available/csms-pt-kai \
  /etc/nginx/sites-enabled/csms-pt-kai

sudo nginx -t
```

Jika validasi berhasil:

```bash
sudo systemctl reload nginx
```

Jika symlink sudah ada, jangan membuat duplikat. Jangan menonaktifkan konfigurasi aplikasi lama tanpa memastikan dampaknya.

## 11. Aktifkan HTTPS dengan Let's Encrypt

Pastikan:

- DNS `A` domain CSMS mengarah ke IP publik VPS.
- Record `AAAA`, jika digunakan, mengarah ke IPv6 yang benar.
- Port 80 dan 443 terbuka pada firewall VPS dan penyedia hosting.
- Domain dapat diakses melalui Nginx sebelum meminta sertifikat.

Jika Certbot belum terpasang, instal dengan metode yang sesuai. Contoh memakai Snap:

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
```

Jika Certbot sudah tersedia, periksa versi dan metode instalasinya agar tidak memasang dua versi sekaligus.

Minta sertifikat dan konfigurasi HTTPS:

```bash
sudo certbot --nginx -d csms.domainanda.co.id
```

Ikuti petunjuk verifikasi domain. Sertakan nama domain lain hanya jika memang diarahkan ke aplikasi dan ingin dicakup sertifikat.

Setelah selesai:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certificates
sudo certbot renew --dry-run
```

Perintah terakhir menguji proses perpanjangan sertifikat.

## 12. Pengujian teknis

Jalankan:

```bash
cd /var/www/csms-pt-kai

php artisan about
php artisan migrate:status
php artisan route:list
```

Uji respons domain:

```bash
curl -I http://csms.domainanda.co.id
curl -I https://csms.domainanda.co.id
```

Respons `200`, `301`, atau `302` bisa wajar tergantung konfigurasi. Respons `500` perlu ditelusuri.

Periksa log:

```bash
tail -n 100 storage/logs/laravel.log
sudo tail -n 100 /var/log/nginx/error.log
sudo journalctl -u php8.3-fpm -n 100 --no-pager
```

Ganti nama layanan PHP-FPM jika berbeda. Jangan membagikan log yang berisi kredensial atau data sensitif.

## 13. Checklist UAT CSMS

Tandai setiap pengujian setelah benar-benar dilakukan:

### Akses dan akun

- [ ] Halaman login dapat dibuka melalui HTTPS.
- [ ] Login dan logout berjalan dengan benar.
- [ ] Setiap role hanya dapat mengakses menu sesuai kewenangannya.

### Proses vendor

- [ ] Pendaftaran vendor dan validasi data berjalan.
- [ ] Kuesioner tampil lengkap sesuai 49 pertanyaan pada mockup.
- [ ] Bobot penilaian sesuai konfigurasi dan total bobot 565.
- [ ] Unggah dokumen dapat dilakukan dan berkas tidak dapat diakses publik tanpa izin.

### Verifikasi dan hasil

- [ ] Verifikator dapat meninjau dokumen dan mencatat hasil.
- [ ] Validator dapat mencatat hasil validasi lapangan.
- [ ] Skor, lingkup risiko, dan status akhir sesuai aturan yang disepakati.
- [ ] Pratinjau sertifikat atau hasil hanya dapat diakses role yang berwenang.

### Operasional

- [ ] Data tetap tersimpan setelah logout dan login kembali.
- [ ] Tidak ada error kritis pada log Laravel atau Nginx.
- [ ] Backup database berhasil dan prosedur pemulihannya telah diuji.

Pastikan aturan penilaian, ambang risiko, persetujuan hasil, penguncian skor, dan penerbitan sertifikat disepakati serta diuji oleh pemilik proses PT KAI. Jangan menganggap fitur tersebut benar hanya karena halaman tampil.

## 14. Pengamanan sebelum go-live

- [ ] `APP_ENV=production` dan `APP_DEBUG=false`.
- [ ] HTTPS aktif dan perpanjangan sertifikat teruji.
- [ ] Akun admin bawaan dan password default tidak dibiarkan aktif.
- [ ] Password disimpan menggunakan hashing, bukan teks biasa.
- [ ] Unggahan divalidasi berdasarkan jenis dan ukuran; file tidak dieksekusi sebagai skrip.
- [ ] Hak akses vendor, verifikator, validator, dan admin diuji secara terpisah.
- [ ] Database tidak dibuka ke internet; akses dibatasi sesuai kebutuhan.
- [ ] Backup terjadwal dan pemulihan backup diuji.
- [ ] Log dan file `.env` tidak dapat diakses publik.

## 15. Urutan kerja yang disarankan

1. Periksa versi PHP, PHP-FPM, Nginx, dan MySQL.
2. Backup konfigurasi serta data yang berpotensi terdampak.
3. Unggah paket dan periksa struktur proyek.
4. Instal dependensi Composer.
5. Buat database khusus CSMS dan konfigurasi `.env`.
6. Tinjau migrasi dan seeder, lalu jalankan migrasi.
7. Atur izin folder dan cache Laravel.
8. Tambahkan server block Nginx terpisah.
9. Aktifkan HTTPS.
10. Jalankan pengujian teknis, UAT, keamanan, dan pemulihan backup.

> **Catatan:** Paket starter CSMS yang disiapkan sebelumnya belum dinyatakan teruji end-to-end. Lakukan instalasi pada staging atau subdomain uji terlebih dahulu sebelum digunakan secara resmi.

## Referensi

- [Laravel — Deployment](https://laravel.com/docs/13.x/deployment)
- [Laravel — Database: Migrations](https://laravel.com/docs/13.x/migrations)
- [Ubuntu Server — Obtain TLS certificates](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/)
