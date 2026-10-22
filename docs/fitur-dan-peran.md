# Fitur, alur, dan hak akses

Dokumen ini menjelaskan perilaku aplikasi dari sisi pengguna dan aturan bisnis. Untuk detail teknis lihat [arsitektur.md](arsitektur.md).

## Alur status vendor

| Status | Arti | Langkah berikutnya |
| ------ | ---- | ------------------ |
| Menunggu Pengisian | Vendor mengisi profil dan 49 pertanyaan pra-kualifikasi (draft) | Vendor mengirim → Menunggu Verifikasi Dokumen |
| Menunggu Verifikasi Dokumen | Verifikator menilai dokumen | Teruskan → Menunggu Validasi Lapangan, atau kembalikan → Perlu Perbaikan |
| Perlu Perbaikan | Vendor memperbaiki jawaban dan lampiran | Vendor mengirim ulang → Menunggu Verifikasi Dokumen |
| Menunggu Validasi Lapangan | Validator menilai hasil lapangan | Tetapkan hasil → Tervalidasi |
| Tervalidasi | Hasil final dikunci; kategori risiko ditetapkan | Pratinjau dan cetak sertifikat |

## Peran

| Peran       | Fungsi                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Vendor      | Dashboard dan data sendiri, membuat profil, mengisi dan mengirim pra-kualifikasi, unggah bukti saat pengisian atau perbaikan |
| Verifikator | Melihat vendor dan bukti, memberi nilai dokumen, mengembalikan untuk perbaikan, meneruskan ke validasi               |
| Validator   | Melihat hasil verifikasi, memberi nilai lapangan, menetapkan hasil, pratinjau sertifikat                            |
| Pengadaan   | Melihat dashboard dan vendor, hasil risiko, serta pratinjau dan cetak sertifikat                                     |
| Admin       | Seluruh fungsi, pengelolaan akun internal, dan penghapusan data vendor                                              |

Akun internal (Verifikator, Validator, Pengadaan, Admin) dibuat admin; satu akun boleh memiliki lebih dari satu peran internal. Pendaftaran mandiri hanya menghasilkan akun Vendor. Admin menonaktifkan akun internal (tidak menghapusnya) sehingga rekam skor tetap terjaga; akun sendiri dan akun admin dilindungi dari penonaktifan lewat menu ini.

## Aturan penilaian

- Matriks nilai: 0 / 0,25 / 0,5 / 0,75 / 1 per pertanyaan.
- Setiap akun menyimpan satu penilaian per vendor per tahap; menyimpan ulang hanya memperbarui skor akun itu.
- Total = jumlah (rata-rata matriks tiap pertanyaan dari semua penilai yang telah menyimpan × bobot). Persentase = total ÷ **total bobot semua pertanyaan** × 100; total bobot saat ini 565 dan dihitung dari tabel `questions`.
- Kategori berdasarkan persentase: ≥ 70 Risiko Tinggi; 50–< 70 Risiko Menengah; 35–< 50 Risiko Rendah; < 35 Tidak Lulus. Nama kategori mengikuti mockup dan menunjukkan kategori kualifikasi yang dicapai. Nilai akhir memakai hasil validasi lapangan.
- Satu penilai berwenang dapat meneruskan tahap seperti pada mockup; tidak ada kuorum atau penugasan tambahan. Verifikator lain tetap dapat **menyimpan** nilai setelah vendor diteruskan ke validasi (hanya meneruskan atau mengembalikan yang terbatas pada tahap verifikasi). Karena itu, sepakati di antara penilai sebelum menekan **Kirim ke Validasi Lapangan**.
- Saat vendor mengirim ulang setelah perbaikan, penilaian putaran sebelumnya diarsipkan di audit log dan penilaian aktif dimulai dari awal. Berkas bukti tetap dipertahankan.
- Hasil final dikunci. Sertifikat adalah **pratinjau hasil penilaian**, bukan tanda tangan digital atau penerbitan resmi otomatis. Nilai di bawah 35 tetap dapat ditampilkan sebagai "TIDAK LULUS", dan masa berlaku dua tahun hanya teks indikatif seperti pada mockup.

## Pra-kualifikasi: draft dan lampiran

Formulir terdiri atas 49 pertanyaan dengan lampiran berkas; pengisian tidak harus selesai dalam satu sesi.

| Mekanisme | Perilaku |
| --------- | -------- |
| Jawaban dan keterangan | Tersimpan otomatis ke server 2 detik setelah perubahan terakhir, hanya untuk pertanyaan yang berubah |
| Lampiran | Berkas yang dipilih baru dikirim saat vendor menekan **Simpan Draft** atau **Kirim untuk Verifikasi**; tidak pernah terkirim otomatis |
| Draft | Disimpan di server (`answers`, `vendors.draft_saved_at`); dapat dilanjutkan dari perangkat lain dengan login yang sama |
| Pengiriman | Memeriksa kelengkapan 49 pertanyaan (menampilkan daftar yang belum terjawab), mengunci pengajuan, dan memindahkan status ke Menunggu Verifikasi Dokumen |

Setelah dikirim, isian terkunci; perubahan hanya lewat alur **Perlu Perbaikan**, dan pengiriman ulang membuka putaran penilaian baru.

**Privasi draft:** draft yang belum dikirim hanya terlihat oleh **admin** dan pemiliknya. Verifikator, validator, dan pengadaan tetap melihat data vendor dan jumlah pertanyaan yang terisi, tetapi tidak melihat isi jawaban, catatan, maupun lampiran draft; unduh lampiran draft juga ditolak untuk mereka.

**Menghapus lampiran:**

| Keadaan | Akibat |
| ------- | ------ |
| Berkas dipilih tetapi belum disimpan | Tombol `×` mengeluarkan berkas dari daftar; tidak pernah dikirim ke server |
| Berkas sudah tersimpan di server | Tombol `×` menghapus permanen dari server (`DELETE /api/evidence/{id}`) |

Hanya pemilik vendor (selama pengajuan masih dapat diisi) dan admin yang boleh menghapus lampiran. Setelah pengajuan dikirim, lampiran terkunci untuk vendor dan hanya admin yang dapat menghapusnya. Setiap penghapusan tercatat di `audit_logs` dengan aksi `evidence_deleted`. Format lampiran: PDF, Word, Excel, JPG, dan PNG, maksimal 15 MB per berkas.

## Pengelolaan data

- **Menghapus data vendor** (Data Vendor → **Hapus**) hanya untuk admin dan memerlukan pengetikan ulang ID vendor. Penghapusan permanen: profil, jawaban, seluruh lampiran di server, dan hasil penilaian. Akun login pemilik tidak ikut terhapus dan riwayat audit tetap disimpan.
- **Pencarian dan filter:** Data Vendor dapat dicari berdasarkan nama, ID, atau lingkup, dan difilter berdasarkan status. Kartu ringkasan di dashboard membuka daftar yang sudah terfilter.
- **Ekspor Excel (.xlsx):** dari menu akun atau halaman Hasil & Lingkup Risiko. Berisi sheet **Vendor** (profil, status, skor, kategori), **Jawaban**, dan **Penilaian** (rata-rata matriks dan nilai per pertanyaan). Isi mengikuti hak akses pengguna, termasuk aturan privasi draft; header mengikuti bahasa antarmuka (teks pertanyaan tetap Bahasa Indonesia).
- **Kata sandi:** minimal 12 karakter. Mengganti kata sandi mengakhiri sesi lain milik akun itu; admin yang mereset kata sandi akun internal juga mengakhiri sesi akun tersebut. Lihat juga lupa password di bawah.

## Keamanan akun dan notifikasi

**Autentikasi dua langkah (2FA, TOTP)** tersedia untuk akun internal (admin, verifikator, validator, pengadaan).

- Aktifkan lewat menu akun → **Autentikasi dua langkah**: pindai **kode QR** dengan aplikasi autentikator (Google Authenticator, Authy, dan sejenisnya), lalu konfirmasi dengan kode 6 digit. Bila tidak dapat memindai, masukkan kunci pengaturan secara manual atau buka tautan `otpauth://` di perangkat yang sama.
- Setelah aktif, login meminta kode setelah password benar. Kode yang sudah dipakai tidak dapat dipakai ulang, dan percobaan salah dibatasi laju.
- Saat aktivasi, 8 **kode pemulihan** sekali pakai ditampilkan satu kali. Pemilik akun dapat membuat ulang kode (perlu password) atau menonaktifkan 2FA (perlu password).
- Bila `MFA_REQUIRED=true`, akun internal tanpa 2FA hanya dapat membuka dasbor, mengganti password, dan menyiapkan 2FA; fitur lain ditolak sampai 2FA aktif, dan 2FA tidak dapat dinonaktifkan.
- Perangkat hilang: admin memilih **Reset 2FA** pada akun tersebut (**Kelola Akun Internal**). Bila admin terakhir yang terkunci, operator menjalankan `php artisan rchsems:reset-mfa email`. Semua pengaturan ulang tercatat di audit log.

**Lupa password:** di halaman login pilih **Lupa password?**, masukkan email, dan sistem selalu menjawab netral (tidak membocorkan apakah email terdaftar). Bila terdaftar dan aktif, email berisi tautan berlaku 60 menit; tautan membuka form password baru. Setelah berhasil, semua sesi akun itu berakhir dan 2FA (bila aktif) tetap diminta saat login.

**Notifikasi email** (hanya bila `NOTIFY_EMAIL=true`):

| Peristiwa | Penerima |
| --------- | -------- |
| Vendor mengirim pra-kualifikasi | Semua verifikator aktif |
| Verifikator meneruskan ke validasi | Semua validator aktif |
| Pengajuan dikembalikan untuk perbaikan | Pemilik vendor |
| Hasil ditetapkan | Pemilik vendor dan semua akun pengadaan aktif |

Kegagalan kirim email dicatat di log dan tidak menggagalkan alur kerja. Bahasa email mengikuti `APP_LOCALE`.

## Pengalaman antarmuka

- **Konfirmasi:** setiap aksi yang mengubah data atau keluar dari sesi (simpan, kirim, teruskan, kembalikan, tetapkan, hapus, buat akun, ekspor, keluar) meminta konfirmasi lewat dialog. Autosave berjalan tanpa dialog.
- **Validasi form:** kolom wajib yang kosong ditandai langsung dengan pesan "Wajib diisi", bukan tooltip browser.
- **Bahasa:** pengalih ID | EN di top bar dan halaman login (default Indonesia); pilihan diingat di browser, termasuk bahasa pesan kesalahan form dari server.
- **Antrean kerja:** halaman Verifikasi dan Validasi otomatis memilih vendor pertama yang menunggu tindakan, dan daftar vendor mengelompokkan "Menunggu tindakan Anda" di atas vendor lain.
- **Menu akun:** avatar di kanan atas memuat Ganti Password, Ekspor Data, dan Keluar.
- **Layar kecil:** navigasi bawah dengan maksimal empat tujuan langsung dan sisanya lewat lembar **Lainnya**.

## Keamanan dalam penggunaan

Password di-hash Laravel; hak akses diperiksa di server; CSRF aktif; login, registrasi, dan ganti password dibatasi laju; berkas tersimpan privat; status akhir tidak dipercaya dari input browser. Perbedaan dari mockup yang tersimpan di browser: tidak ada password demo di production, seluruh jawaban wajib lengkap sebelum kirim, tahap dikunci, file divalidasi di server, data vendor terisolasi, audit trail tersimpan, dan draft tersimpan di server.

## Di luar cakupan

SSO, MFA, verifikasi email, lupa-password lewat email, notifikasi, penugasan atau kuorum penilai, tanda tangan elektronik, penerbitan sertifikat resmi, dan antivirus dokumen belum disediakan. Data browser dari mockup tidak diimpor otomatis. Lakukan UAT sebelum menerima data operasional resmi.
