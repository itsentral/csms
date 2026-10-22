# Pengujian

## Menjalankan test

```bash
composer install
php artisan test
```

Test memakai **SQLite in-memory** (`phpunit.xml`), sehingga tidak menyentuh database MySQL aplikasi. Hasil terakhir (22 Oktober 2026, PHP 8.5.7, Laravel 13.36.0, PHPUnit 12.5): **35 test, 225 assertion, lulus**.

Untuk menjalankan test pada MySQL, buat **database khusus kosong** `rchsems_test`, beri izin pada akun test, lalu:

```bash
DB_CONNECTION=mysql DB_DATABASE=rchsems_test DB_USERNAME=rchsems DB_PASSWORD='PASSWORD_TEST' php artisan test
```

Environment shell mengungguli default PHPUnit. `RefreshDatabase` membuat dan mengosongkan tabel, jadi **jangan memakai database production**.

## Cakupan otomatis

`tests/Feature/BasicSecurityTest.php`, `WorkflowTest.php`, dan `SecurityFeaturesTest.php` mencakup:

| Area | Skenario |
| ---- | -------- |
| Akses | Shell dapat dibuka tamu; API menolak tamu dan akun nonaktif; error API berformat JSON |
| Akun | Registrasi tidak dapat menaikkan peran; akun internal multi-peran; penonaktifan aman (akun sendiri dan admin dilindungi); ganti password mengakhiri sesi lain |
| Isolasi | Vendor tidak dapat melihat atau mengubah data vendor lain; izin per peran |
| Master data | 49 pertanyaan dan total bobot 565 sesuai mockup; batas kategori risiko |
| Alur penilaian | Dua verifikator dan dua validator dengan rata-rata; transisi status dan penguncian final; skor atau tahap tidak valid ditolak; penyimpanan nilai verifikator setelah diteruskan; pengembalian perbaikan dan pengarsipan putaran |
| Draft dan lampiran | Simpan sebagian dan lanjutkan; draft terkunci setelah kirim; pengiriman menyebut pertanyaan yang belum terjawab; draft hanya terlihat admin (termasuk unduh lampiran); bukti privat dan unduhan berizin; pemilik menghapus lampiran draft tetapi tidak setelah kirim |
| Penghapusan | Admin menghapus vendor beserta berkas; akun pemilik tetap ada |
| Performa | Jumlah query `/api/state` tidak bertambah seiring jumlah vendor |
| Ekspor | Berkas `.xlsx` valid dengan tiga sheet; isi sel di-escape |
| Bahasa | Pesan validasi dan pesan server mengikuti header `X-Lang` (ID dan EN) |
| Keamanan | CSP dikirim dan tidak ada handler inline di frontend; TOTP sesuai vektor RFC 6238 dan menolak pemakaian ulang; alur 2FA (aktivasi, tantangan login, kode pemulihan sekali pakai, reset admin, `MFA_REQUIRED`); lupa dan reset password (jawaban netral, token sekali pakai, sesi diakhiri, akun nonaktif); notifikasi email ke penerima yang benar; perintah `rchsems:reset-mfa` |

## Pemeriksaan statis

```bash
composer lint        # Pint
npm run lint         # ESLint
npm run format:check # Prettier
```

## Smoke test browser (Playwright)

```bash
npm install
npm run test:e2e
```

11 test (±30 detik) menjalankan aplikasi pada port 8123 dengan database SQLite terpisah `database/e2e.sqlite` (dibuat ulang setiap run oleh `e2e/global-setup.js`, tidak menyentuh database pengembangan) dan **memakai Chrome yang sudah terpasang** (`channel: 'chrome'`), jadi tidak ada browser yang diunduh. Ganti dengan `PW_CHANNEL=msedge` atau jalankan `npx playwright install chromium` bila Chrome tidak tersedia. Cakupan: login dengan Enter dan password salah, pelanggaran CSP, pengalih bahasa, lupa password, alur lintas peran (vendor mengirim → verifikator meneruskan → validator menetapkan → pengadaan melihat hasil dan sertifikat), admin membuat akun lewat modal dan mengekspor Excel, serta aktivasi 2FA (kode QR di layar didekode dan dicocokkan dengan kunci) dan login dengan kode. `qr.spec.js` menguji encoder QR untuk versi 1-10 dan koreksi L/M dengan dekoder independen (jsQR).

## Pemeriksaan manual

Smoke test di atas hanya jalur utama. Saat mengubah UI, periksa di browser (desktop dan lebar ±375 px) untuk semua halaman: login, dashboard, Data Vendor, pendaftaran vendor, pra-kualifikasi, verifikasi, validasi, hasil dan sertifikat, serta kelola akun. Periksa juga:

- login dengan tombol Enter, dan pesan "Wajib diisi" pada form pendaftaran;
- dialog konfirmasi pada setiap aksi yang mengubah data;
- pengalih ID | EN: tidak ada teks Indonesia tersisa saat English dipilih, dan pilihan `<select>` tetap tersimpan dengan nilai aslinya;
- menu akun (popup di desktop, lembar bawah di mobile) dan navigasi bawah mobile;
- cetak sertifikat ke PDF dari browser.

## Batas pengujian

- **MySQL langsung belum diuji di lingkungan pengembangan**; test otomatis berjalan di SQLite. Migration memakai Schema Builder Laravel dan query ditujukan untuk MySQL. Jalankan test pada MySQL sesuai langkah di atas sebelum production.
- **Cetak PDF sertifikat belum diuji otomatis.** CSS dan template sertifikat berasal dari mockup; lakukan UAT desktop, mobile, dan cetak.
- Nginx, HTTPS, PHP-FPM, backup/restore, dan beban serentak belum diuji di server production. Gunakan [go-live-checklist.md](go-live-checklist.md).
