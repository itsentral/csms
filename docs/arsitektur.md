# Arsitektur

Ringkasan struktur source, database, sistem desain, internasionalisasi, dan pembatasan laju. Perilaku dari sisi pengguna ada di [fitur-dan-peran.md](fitur-dan-peran.md).

## Gambaran umum

Aplikasi satu halaman (SPA) tanpa build frontend. `/` menyajikan view `portal`; seluruh interaksi memakai JSON API `/api/*` (26 route) yang dipanggil `public/assets/portal.js` dengan JavaScript biasa. Controller tipis; aturan bisnis ada di `app/Services` dan validasi di `app/Http/Requests`. Peran disimpan sebagai kolom JSON `users.roles`; `User::hasRole()` selalu bernilai benar untuk admin.

## Struktur source

| Lokasi | Isi |
| ------ | --- |
| `routes/web.php` | Seluruh route: view login dan API |
| `app/Http/Controllers/VendorController.php` | State, profil, jawaban, pengiriman, penghapusan vendor, dan ekspor |
| `app/Http/Controllers/EvidenceController.php`, `AssessmentController.php`, `AccountController.php` | Lampiran bukti, penilaian verifikator/validator, dan akun internal |
| `app/Http/Controllers/MfaController.php` | Langkah kedua login, penyiapan 2FA, kode pemulihan, dan reset oleh admin |
| `app/Http/Requests` | Form Request: aturan validasi dan otorisasi peran (dijalankan sebelum validasi) |
| `app/Services/VendorService.php`, `AssessmentService.php`, `EvidenceService.php`, `PortalState.php` | Transisi status dengan `lockForUpdate`, penilaian, lampiran, dan data yang dimuat klien |
| `app/Services/Totp.php` | TOTP (RFC 6238) tanpa dependensi |
| `app/Notifications/VendorStatusChanged.php` | Email perubahan status vendor |
| `config/rchsems.php` | `MFA_REQUIRED`, `NOTIFY_EMAIL`, masa berlaku login 2FA |
| `app/Http/Controllers/AuthController.php` | Login, registrasi vendor, logout, ganti password |
| `app/Services/Portal.php` | Otorisasi, audit log, kategori risiko, serialisasi vendor (`serializeMany`, tanpa N+1), hitung total |
| `app/Services/VendorExport.php`, `XlsxWriter.php` | Penyusun sheet ekspor dan penulis XLSX tanpa dependensi (`ZipArchive`) |
| `app/Providers/AppServiceProvider.php` | Pembatasan laju login, registrasi, dan ganti password |
| `app/Http/Middleware` | `ActiveUser` (akun nonaktif ditolak), `SecurityHeaders`, dan `SetLocale` (bahasa pesan validasi dari header `X-Lang`) |
| `app/Console/Commands/CreateAdmin.php` | `rchsems:create-admin` |
| `resources/views/portal.blade.php` | Kerangka HTML, layar login, dan token CSRF |
| `resources/css/portal.css` | Sumber token dan komponen (Tailwind v4) |
| `public/assets/portal.js` | Logika antarmuka |
| `public/assets/i18n.js` | Penerjemah ID/EN |
| `public/assets/qr.js` | Pembuat kode QR (mode byte, versi 1-10, koreksi L/M) tanpa dependensi; `QR.svg(teks)` |
| `public/assets/portal.css` | Hasil build CSS (ikut di-commit) |
| `public/assets/fonts/` | Font Google Sans dan subset Material Symbols Outlined (self-hosted) |
| `lang/id/validation.php`, `lang/en/validation.php` | Pesan dan nama atribut validasi Laravel per bahasa |
| `database/migrations`, `database/seeders`, `database/data` | Skema, seeder, dan master pertanyaan |
| `deploy/` | Konfigurasi Nginx dan PHP, serta `update.sh` |
| `tests/Feature` | Pengujian alur dan keamanan |
| `RCHSEMS_CSMS_PT_KAI_MVP_v11.html` | Mockup asal, disimpan sebagai rujukan |

URL aset memuat `?v=<waktu ubah berkas>` (di `portal.blade.php`), sehingga browser mengambil versi baru otomatis setelah deploy.

### Kode sisa implementasi awal

Folder `app/Http/Controllers` dan `app/Models` masih memuat implementasi awal yang **tidak terhubung ke route mana pun** (`ApplicationController`, `ReviewController`, `CertificateController`, `DashboardController`, `AdminUserController`, model `RchsemsApplication`, `Criterion`, `Review`, dan terkait), beserta view di `resources/views/{applications,reviews,admin,certificates,auth}` dan migrasi tabel lamanya (`rchsems_applications`, `criteria`, `reviews`, dan sebagainya). Kode ini memanggil `hasAnyRole()` yang tidak ada lagi, jadi tidak akan berjalan bila dihubungkan. Aman diabaikan; sebaiknya dihapus pada pembersihan berikutnya.

## Database

Tabel aktif: `users` (kolom `roles` JSON dan `active`), `questions`, `vendors`, `answers`, `evidence`, `assessments`, `assessment_scores`, `audit_logs`; ditambah tabel bawaan Laravel (`password_reset_tokens`, `sessions`, `cache`, `jobs`, dan sejenisnya).

- Setiap vendor memiliki `owner_id`; jawaban unik per pertanyaan; penilaian unik per pengguna dan tahap.
- Snapshot hasil final ada di `vendors.final_snapshot`; waktu simpan draft terakhir di `vendors.draft_saved_at` (di-cast sebagai datetime).
- Status vendor disimpan sebagai teks Indonesia (misalnya `Menunggu Verifikasi Dokumen`); nilai ini adalah data, bukan label tampilan, dan tidak diterjemahkan di server.
- Audit log (`audit_logs`) dapat diperiksa lewat database; tidak ada menu audit di antarmuka.

**Master pertanyaan** harus konsisten dengan frontend: `database/data/questions.json` (sumber seeder) dan konstanta `groups` di `portal.js` berasal dari sumber yang sama. Jangan mengubah bobot atau menimpa master pada database yang berjalan tanpa migrasi versi instrumen. `QuestionSeeder` idempoten dan tidak menimpa data yang ada. Total bobot (565) dihitung dari tabel `questions`, bukan konstanta.

## Sistem desain Material 3

Antarmuka mengikuti Material Design 3 dengan palet gaya Google (Gmail/Drive). Token didefinisikan pada blok `@theme` di `resources/css/portal.css`.

| Aspek | Implementasi |
| ----- | ------------ |
| Font | Dilayani dari `public/assets/fonts/`, tanpa CDN: **Google Sans** (antarmuka), **Google Sans Flex** (judul), **Google Sans Code** (nomor registrasi dan angka), dan **Material Symbols Outlined** (ikon) |
| Warna | Peran warna M3 (`primary` `#0b57d0`, `secondary`, `tertiary`, `surface*`, `outline*`, `error`, `success`) |
| Tipografi, bentuk, elevation, gerak | Skala M3 penuh; radius 4/8/12/16/28 px dan penuh untuk tombol; lima tingkat bayangan; kurva `standard` dan `emphasized` |
| Layout | Navigasi samping terang yang menyatu dengan latar halaman; konten berada di kartu putih membulat. Top bar memuat nama sistem, pengalih bahasa, dan avatar akun (judul halaman ada di heading konten) |
| Komponen | Tombol filled/tonal/outlined/text dengan *state layer* 8/10/12%, medan isian *outlined* dengan label mengambang, radio dan checkbox M3, chip filter, kartu tonal dan panel outlined, tabel data, kolom pencarian, dialog, menu popup (desktop) atau bottom sheet (mobile), snackbar, bar progres tipis |
| Ikon | Font resmi **Material Symbols Outlined** (Apache 2.0), subset ±4 KB yang dilayani sendiri. Dipakai sebagai ligature: `<span class="msym" aria-hidden="true">nama_ikon</span>`; item navigasi aktif memakai varian terisi (`FILL 1`). Untuk menambah ikon, buat ulang subset lewat API Google Fonts (`css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&icon_names=<daftar>`), unduh berkas woff2 hasilnya ke `public/assets/fonts/materialsymbols-outlined.woff2` |
| Dialog | Tidak ada `alert`/`confirm`/`prompt` bawaan browser. Gunakan `m3Dialog`, `m3Confirm`, dan `m3Snackbar`; isi berformat memakai `bodyHtml`, teks biasa memakai `body` (di-escape otomatis) |
| Navigasi responsif | Di bawah 900 px, navigasi samping menjadi navigation bar bawah dengan maksimal empat tujuan langsung dan sisanya di lembar **Lainnya** |

Build ulang CSS hanya diperlukan bila `resources/css/portal.css` diubah:

```bash
npm install
npm run build:css
```

Hasilnya (`public/assets/portal.css`) wajib ikut di-commit karena server tidak menjalankan Node.js.

## Internasionalisasi (ID | EN)

Teks sumber berbahasa Indonesia. `public/assets/i18n.js` menerjemahkan DOM ke English saat dipilih: node teks dan atribut `placeholder`, `aria-label`, `title`, `alt` dicocokkan dengan kamus `EN`, dan teks dinamis (angka, nama, "Langkah 2 dari 5") dengan `PATTERNS`. Teks yang berubah belakangan ditangkap `MutationObserver`; pilihan bahasa disimpan di `localStorage` (`rchsems.lang`).

Prinsipnya hanya tampilan yang diterjemahkan: nilai data (status, opsi `<option>`, ID) tidak berubah, dan `<option>` tanpa atribut `value` dikunci dahulu ke nilai aslinya. Untuk menambah teks baru, tambahkan entri ke `EN` (kunci persis sama dengan teks Indonesia); gunakan `PATTERNS` untuk teks dengan bagian dinamis. Pesan validasi Laravel mengikuti bahasa yang dipilih: klien mengirim header `X-Lang`, middleware `SetLocale` mengatur locale, dan terjemahan ada di `lang/id/validation.php` (pesan lengkap) serta `lang/en/validation.php` (hanya nama atribut; pesan Inggris memakai bawaan framework). Pesan yang dikirim server ke pengguna (`abort()` dan respons JSON) juga dilokalkan di server: controller memakai `__('portal.<kunci>')` dan teksnya ada di `lang/id/portal.php` serta `lang/en/portal.php`. Saat menambah pesan baru dari server, tambahkan kunci di kedua berkas. Pesan yang dibuat di sisi klien (JavaScript) diterjemahkan lewat kamus `i18n.js`.

## Ekspor

`GET /api/export?lang=id|en` mengembalikan berkas `.xlsx` dengan tiga sheet (Vendor, Jawaban, Penilaian). `VendorController::export` mengambil data dari `PortalState` agar aturan privasi draft ikut berlaku, `VendorExport` menyusun baris, dan `XlsxWriter` menulis paket OOXML dengan `ZipArchive`. Sel berisi teks sebagai *inline string*, sehingga isi seperti `=1+1` tidak dieksekusi sebagai rumus. Ekstensi `php-zip` wajib terpasang.

## Keamanan

- **Content-Security-Policy** dikirim `SecurityHeaders` pada semua respons: `script-src 'self'` (tanpa skrip inline dan tanpa `eval`), `style-src` mengizinkan gaya inline, `object-src 'none'`, `frame-ancestors 'self'`. Pada HTTPS ditambah `Strict-Transport-Security`. **Aturan untuk developer:** jangan menulis atribut `onclick`/`onchange` atau `<script>` inline. Gunakan `data-click="namaFungsi" data-args='[...]'` dan `data-change="namaFungsi"`; pengikatnya ada di akhir `portal.js`, dan fungsi harus berupa deklarasi global. Test `test_csp_is_sent_and_frontend_has_no_inline_handlers` menjaga aturan ini.
- **2FA (TOTP):** `users.two_factor_secret` dan `two_factor_recovery_codes` terenkripsi (cast `encrypted`), kode pemulihan disimpan sebagai hash SHA-256, dan `two_factor_last_step` mencegah kode dipakai ulang. Login dengan 2FA dua tahap: `POST /api/login` mengembalikan `202 {mfa:true}` dan menyimpan id pengguna di sesi (berlaku 5 menit), lalu `POST /api/login/mfa` menyelesaikan login. Middleware `RequireMfaSetup` menegakkan `MFA_REQUIRED`.
- **Kode QR 2FA** dibuat di browser oleh `qr.js` (rahasia tidak dikirim ke layanan luar). URI `otpauth://` sengaja ringkas (tanpa parameter bawaan) agar muat di QR versi kecil; teks yang terlalu panjang mengembalikan `null` dan antarmuka jatuh ke kunci manual. Test e2e `qr.spec.js` memastikan hasil encoder terbaca ulang oleh dekoder independen (jsQR).
- **Lupa password:** memakai password broker Laravel (`password_reset_tokens`); `POST /api/password/forgot` selalu `202`, tautan membuka `/?reset=TOKEN&email=...` yang ditangani `portal.js`. Email dilokalkan dari locale permintaan.
- **Notifikasi:** `Portal::notify()` dipanggil setelah transaksi selesai dan menelan kegagalan kirim (`report($e)`).

## Alat pengembangan

| Alat | Perintah | Fungsi |
| ---- | -------- | ------ |
| Pint | `composer lint` / `composer format` | Gaya kode PHP (preset Laravel, `pint.json`) |
| ESLint | `npm run lint` | Mutu JavaScript (`eslint.config.js`; fungsi tingkat atas dipanggil lewat `data-click`, jadi tidak dianggap tak terpakai) |
| Prettier | `npm run format` / `format:check` | Format `portal.js`, `i18n.js`, dan berkas e2e (`.prettierrc.json`) |
| Playwright | `npm run test:e2e` | Smoke test browser di `e2e/` (lihat [pengujian.md](pengujian.md)) |

## Pembatasan laju

Named limiter di `app/Providers/AppServiceProvider.php`:

| Endpoint | Batas per akun | Batas per alamat IP |
| -------- | -------------- | ------------------- |
| `POST /api/login` | 10 / menit | 60 / menit |
| `POST /api/register` | 5 / menit | 20 / menit |
| `POST /api/login/mfa` | 5 / menit (per akun yang sedang login) | 20 / menit |
| `POST /api/password/forgot` | 3 / menit | 10 / menit |
| `POST /api/password/reset` | — | 10 / menit |
| `PUT /api/password` | 10 / menit | 30 / menit |

Batas per akun mencegah tebak-sandi; batas per IP dilonggarkan karena banyak pengguna kantor berbagi satu alamat IP jaringan. Unggahan lampiran dibatasi 120 permintaan per menit.
