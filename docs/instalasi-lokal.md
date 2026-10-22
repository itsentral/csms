# Instalasi lokal (development)

Panduan ini untuk menjalankan aplikasi di komputer developer. Untuk server production lihat [deployment.md](deployment.md).

## Kebutuhan

- PHP **8.3+**, Composer 2, MySQL **8.0+**.
- Ekstensi PHP: ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl, pcre, PDO, pdo_mysql, session, tokenizer, xml, **zip** (dipakai untuk ekspor Excel). `pdo_sqlite` hanya untuk menjalankan test.
- Node.js **tidak** diperlukan untuk menjalankan aplikasi; hanya untuk membangun ulang CSS/JavaScript dan menjalankan test browser (lihat [arsitektur.md](arsitektur.md#sistem-desain-material-3)).

Rujukan resmi: [Laravel 13 Releases](https://laravel.com/docs/13.x/releases) dan [Deployment](https://laravel.com/docs/13.x/deployment). Versi framework yang terpasang tercatat di `composer.lock`.

## Ubuntu

```bash
sudo apt update
sudo apt install -y php8.3-cli php8.3-mbstring php8.3-xml php8.3-curl php8.3-mysql php8.3-zip php8.3-sqlite3 unzip git composer mysql-server
php -v && composer --version
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

## Windows dan macOS

Pasang PHP 8.3+, Composer 2, dan MySQL 8, aktifkan ekstensi yang sama, lalu ikuti langkah di bawah (di PowerShell gunakan `Copy-Item .env.example .env`). PHP bawaan beberapa paket XAMPP masih 8.2: pastikan `php -v` memenuhi syarat.

## Menjalankan aplikasi

```bash
git clone https://github.com/itsentral/csms.git && cd csms
cp .env.example .env
composer install --prefer-dist
php artisan key:generate
```

Edit `.env`: isi `DB_PASSWORD`; pastikan `DB_HOST=127.0.0.1`, `DB_DATABASE=rchsems`, `DB_USERNAME=rchsems`, `APP_ENV=local`, `APP_DEBUG=true`, `SESSION_SECURE_COOKIE=false`.

```bash
php artisan migrate --seed
php artisan db:seed --class=DemoSeeder
php artisan serve --host=127.0.0.1 --port=8000
```

Buka http://127.0.0.1:8000. Akun demo berikut memakai password **LocalDemo2026!**:

| Email                    | Peran            |
| ------------------------ | ---------------- |
| admin@example.test       | Admin            |
| vendor@example.test      | Vendor           |
| verifikator@example.test | Verifikator      |
| validator@example.test   | Validator        |
| pengadaan@example.test   | Bagian Pengadaan |

`DemoSeeder` hanya berjalan pada environment `local` atau `testing` dan tidak dipanggil oleh `DatabaseSeeder`. Untuk data kosong, jalankan hanya `php artisan migrate --seed`, lalu `php artisan rchsems:create-admin`.

## Email, 2FA, dan notifikasi (opsional)

Secara bawaan `MAIL_MAILER=log`: email lupa password dan notifikasi hanya ditulis ke log (dan hanya terlihat bila `LOG_LEVEL=debug`). Untuk mencobanya secara nyata, isi `MAIL_*` dengan SMTP (misalnya Mailpit atau Mailtrap) di `.env`.

| Variabel | Fungsi | Bawaan |
| -------- | ------ | ------ |
| `MFA_REQUIRED` | Wajibkan 2FA untuk akun internal; akun tanpa 2FA hanya dapat menyiapkannya | `false` |
| `NOTIFY_EMAIL` | Kirim email saat status vendor berubah | `false` |

Akun internal tetap dapat mengaktifkan 2FA sendiri lewat menu akun walau `MFA_REQUIRED=false`.

## Langkah berikutnya

- Menjalankan test: [pengujian.md](pengujian.md).
- Memahami alur dan hak akses: [fitur-dan-peran.md](fitur-dan-peran.md).
- Struktur kode dan cara mengubah CSS atau terjemahan: [arsitektur.md](arsitektur.md).
