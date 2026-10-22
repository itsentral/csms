# Checklist go-live

Tandai setiap butir setelah benar-benar dilakukan. Langkah teknis ada di [deployment.md](deployment.md), pemulihan di [operasional.md](operasional.md).

## Persetujuan pemilik proses

Aturan berikut harus disepakati dan diuji oleh pemilik proses PT KAI; jangan menganggapnya benar hanya karena halaman tampil.

- [ ] Ganti kriteria placeholder dengan formulir CSMS resmi.
- [ ] Verifikasi total bobot = 565 atau nilai resmi yang berlaku, dan persentase skor benar.
- [ ] Konfirmasi ambang risiko yang berlaku.
- [ ] Konfirmasi siapa yang dapat meneruskan tahap, mengunci skor akhir, dan menerbitkan sertifikat.
- [ ] Jalankan UAT dan dapatkan persetujuan pemilik proses.

## Keamanan dan konfigurasi

- [ ] `APP_ENV=production` dan `APP_DEBUG=false`.
- [ ] HTTPS aktif dan perpanjangan sertifikat teruji (`certbot renew --dry-run`).
- [ ] Document root Nginx menunjuk `public/`, bukan root proyek.
- [ ] `.env`, log, dan folder bukti tidak dapat diakses publik.
- [ ] Tidak ada akun demo atau password bawaan; `DemoSeeder` tidak dijalankan.
- [ ] Database tidak terbuka ke internet; akses dibatasi sesuai kebutuhan.
- [ ] Unggahan divalidasi jenis dan ukurannya, dan berkas tidak dieksekusi sebagai skrip.
- [ ] Pembatasan laju aktif.
- [ ] Putuskan `MFA_REQUIRED=true` untuk akun internal; setiap admin sudah mengaktifkan 2FA dan menyimpan kode pemulihan. Sediakan minimal dua admin agar satu akun yang terkunci dapat di-reset.
- [ ] SMTP (`MAIL_*`) diuji: email lupa password diterima dan tautannya berfungsi; bila `NOTIFY_EMAIL=true`, notifikasi diterima peran yang tepat.
- [ ] Header `Content-Security-Policy` dan `Strict-Transport-Security` terkirim dan konsol browser tidak melaporkan pelanggaran CSP.
- [ ] Log, monitoring, dan backup terjadwal aktif, dan pemulihan backup teruji.

## UAT: akses dan akun

- [ ] Halaman login dapat dibuka melalui HTTPS; login dan logout berjalan.
- [ ] Uji akun Vendor, Verifikator, Validator, Pengadaan, dan Admin; setiap peran hanya melihat menu sesuai kewenangannya.
- [ ] Vendor tidak dapat mengakses data vendor lain dengan mengganti ID di URL.

## UAT: proses vendor

- [ ] Pendaftaran vendor dan validasi kolom wajib berjalan.
- [ ] Kuesioner menampilkan 49 pertanyaan sesuai mockup dengan bobot yang benar.
- [ ] Unggah banyak dokumen berjalan, ekstensi dan ukuran divalidasi, dan unduhan hanya oleh pihak berwenang.
- [ ] Penyimpanan draft: isi sebagian, tutup browser, lanjutkan dari perangkat lain; lampiran hanya terkirim setelah **Simpan Draft** atau kirim.
- [ ] Draft yang belum dikirim tidak terlihat oleh Verifikator, Validator, dan Pengadaan (termasuk lampirannya).

## UAT: verifikasi, validasi, dan hasil

- [ ] Dua verifikator dan dua validator dapat menilai satu pengajuan; rata-rata per kriteria, nilai total, klasifikasi, dan pembulatan benar.
- [ ] Skor, kategori risiko, dan status akhir sesuai aturan yang disepakati.
- [ ] Pratinjau dan cetak sertifikat hanya dapat diakses peran yang berwenang; cetak ke PDF teruji di desktop dan mobile.
- [ ] Ekspor Excel berisi data yang benar dan sesuai hak akses.

## UAT: operasional

- [ ] Data tetap tersimpan setelah logout dan login kembali.
- [ ] Penghapusan data vendor oleh admin menghapus lampiran dari server dan akun pemilik tetap aktif.
- [ ] Tidak ada error kritis di log Laravel maupun Nginx.
- [ ] Pengalih bahasa ID | EN berfungsi di semua halaman.
