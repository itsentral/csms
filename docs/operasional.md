# Operasional: backup, update, restore, dan troubleshooting

Untuk instalasi awal lihat [deployment.md](deployment.md).

## Backup

Backup satu set: database, `.env` (termasuk `APP_KEY`), dan seluruh `storage/app/private` (bukti dokumen). Simpan di lokasi terbatas dan terenkripsi, bukan di direktori `public`. `-p` meminta password tanpa meletakkannya di command line:

```bash
mkdir -p ~/backup-rchsems
mysqldump -h 127.0.0.1 -u rchsems -p --no-tablespaces --single-transaction rchsems > ~/backup-rchsems/database.sql
tar -czf ~/backup-rchsems/private-files.tar.gz storage/app/private
cp .env ~/backup-rchsems/environment-backup
chmod -R go-rwx ~/backup-rchsems
```

Untuk backup yang benar-benar satu titik waktu, jalankan `php artisan down` selama backup lalu `php artisan up`. Jadwalkan backup berkala dan uji pemulihannya secara rutin.

## Update

1. Lakukan backup (di atas).
2. Ambil rilis baru tanpa menimpa `.env` dan `storage`:

   ```bash
   git pull origin main
   ```

3. Jalankan `bash deploy/update.sh`. Script ini lebih dulu menjalankan `php artisan down`, lalu `composer install --no-dev`, `migrate --force`, `db:seed --force` (idempoten, tidak menimpa data), membersihkan dan membuat ulang cache, lalu `php artisan up`. Script tidak menjalankan `migrate:fresh` dan tidak menghapus data.
4. Jika script gagal, aplikasi **tetap dalam mode maintenance** agar operator dapat memperbaiki atau memulihkan backup sebelum `php artisan up`.

Hasil build `public/assets/portal.css` dan `i18n.js` sudah ikut di repo; server tidak perlu Node.js.

## Restore

Restore memerlukan source rilis yang sesuai, database, folder bukti, dan `APP_KEY` yang sama. Uji restore di lingkungan terpisah terlebih dahulu. Jangan mengandalkan rollback migration sebagai pemulihan data.

## Troubleshooting

- **500 / permission denied:** periksa `storage/logs/laravel.log`, kepemilikan `storage` dan `bootstrap/cache`, `.env`, serta koneksi MySQL.
- **419:** muat ulang halaman; periksa domain dan cookie, HTTPS, serta `APP_KEY`; gunakan satu domain aplikasi yang konsisten.
- **413 / unggahan gagal:** periksa `client_max_body_size` (Nginx), `upload_max_filesize` dan `post_max_size` (PHP); restart PHP-FPM setelah perubahan.
- **could not find driver:** pasang `php8.3-mysql` dan pastikan CLI serta FPM sama-sama memuat ekstensinya.
- **Ekspor Excel gagal:** pastikan ekstensi `php8.3-zip` terpasang dan direktori temporer PHP dapat ditulis.
- **Email tidak terkirim (lupa password/notifikasi):** periksa `MAIL_*`, `storage/logs/laravel.log`, dan bahwa `MAIL_MAILER` bukan `log`. Kegagalan kirim notifikasi dicatat di log dan tidak menggagalkan alur kerja; tautan lupa password berlaku 60 menit.
- **Akun internal kehilangan perangkat 2FA:** admin membuka **Kelola Akun Internal** → **Reset 2FA**. Bila admin terakhir yang terkunci, jalankan `php artisan rchsems:reset-mfa email@akun`. Kode pemulihan sekali pakai juga dapat dipakai saat login.
- **403:** periksa peran, status akun aktif, dan kepemilikan vendor; jangan menghapus pemeriksaan otorisasi.
- **409:** tahap sudah berubah atau terkunci; buka ulang halaman untuk memuat keadaan terbaru.
- **Composer gagal:** periksa PHP 8.3+, ekstensi, dan internet; jalankan `composer diagnose`. Jangan memakai `--ignore-platform-reqs` di production.
- **Perubahan `.env` tidak terbaca:** `php artisan optimize:clear`, lalu buat ulang cache konfigurasi, rute, dan view.
- **Tampilan lama setelah update:** URL aset memuat versi berdasarkan waktu ubah berkas, jadi hard refresh jarang diperlukan; bila masih lama, periksa cache CDN atau proxy.

## Pemeriksaan teknis cepat

```bash
php artisan about
php artisan migrate:status
php artisan route:list
curl -I https://csms.example.com
tail -n 100 storage/logs/laravel.log
sudo tail -n 100 /var/log/nginx/error.log
sudo journalctl -u php8.3-fpm -n 100 --no-pager
```

Respons `200`, `301`, atau `302` wajar tergantung konfigurasi; `500` perlu ditelusuri. Jangan membagikan log yang berisi kredensial atau data sensitif.
