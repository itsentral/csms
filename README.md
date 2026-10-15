# RCHSEMS / CSMS PT KAI

Laravel 13 · PHP 8.3+ · MySQL 8 · UI sesuai mockup v11.

Mulai dari **[PANDUAN_INSTALASI.md](PANDUAN_INSTALASI.md)** untuk local dan production Ubuntu 24.04. Hasil pengujian ada di **[TEST_REPORT.md](TEST_REPORT.md)**.

```bash
cp .env.example .env
composer install
php artisan key:generate
# Isi koneksi MySQL di .env terlebih dahulu
php artisan migrate --seed
php artisan rchsems:create-admin
php artisan serve
```

Demo lokal opsional: `php artisan db:seed --class=DemoSeeder`.
Tidak perlu build frontend. Jangan menjalankan demo seeder atau migrate:fresh pada production.
