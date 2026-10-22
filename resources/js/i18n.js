/* Penerjemah antarmuka ID/EN.
   Teks sumber aplikasi berbahasa Indonesia. Saat bahasa Inggris dipilih, teks DOM (node teks dan atribut
   placeholder/aria-label/title) diterjemahkan berdasarkan kamus di bawah. Logika aplikasi tidak berubah,
   karena nilai data (status, opsi, ID) tidak pernah diterjemahkan, hanya tampilannya. */
(function () {
  'use strict';
  var STORE = 'rchsems.lang';

  var EN = {
    // --- Navigasi & kerangka
    Dashboard: 'Dashboard',
    'Data Vendor': 'Vendor Data',
    'Pendaftaran Vendor': 'Vendor Registration',
    'Pra-Kualifikasi': 'Pre-Qualification',
    'Verifikasi Dokumen': 'Document Verification',
    'Validasi Lapangan': 'Field Validation',
    'Hasil & Lingkup Risiko': 'Results & Risk Scope',
    'Kelola Akun Internal': 'Internal Accounts',
    Lainnya: 'More',
    'Menu lainnya': 'More menu',
    'Navigasi utama': 'Main navigation',
    'Akun Anda': 'Your account',
    Bahasa: 'Language',
    'Semakin Melayani': 'Always Serving',
    'Portal Kontraktor & Keselamatan': 'Contractor & Safety Portal',
    'Pengisian Pra-Kualifikasi': 'Pre-Qualification Form',
    'Validasi Dokumen & Lapangan': 'Document & Field Validation',
    'Memuat aplikasi...': 'Loading application...',
    'Memuat data': 'Loading data',
    'Aplikasi belum dapat dimuat': 'The application could not be loaded',
    'Coba lagi': 'Try again',
    Tutup: 'Close',
    Batal: 'Cancel',
    Simpan: 'Save',
    Hapus: 'Delete',
    Buka: 'Open',
    Keluar: 'Sign out',
    'Lanjut mengisi': 'Continue filling',
    Lanjutkan: 'Continue',

    // --- Login & pendaftaran akun
    'Masuk ke aplikasi': 'Sign in',
    'Pendaftaran akun': 'Create account',
    'Gunakan akun sesuai peran Anda.': 'Use the account for your role.',
    'Pendaftaran mandiri hanya tersedia untuk Vendor.': 'Self-registration is only available for Vendors.',
    Login: 'Sign in',
    'Pendaftaran Akun': 'Register',
    'Akun / Email': 'Account / Email',
    Password: 'Password',
    'Gunakan email resmi perusahaan atau unit Anda.': 'Use your official company or unit email.',
    'Minimal 12 karakter.': 'At least 12 characters.',
    Masuk: 'Sign in',
    'Daftar Akun': 'Create Account',
    'Memproses...': 'Processing...',
    'Mendaftarkan...': 'Registering...',
    'Nama lengkap': 'Full name',
    'Peran akun (centang semua yang sesuai)': 'Account role (select all that apply)',
    'Pendaftaran mandiri hanya untuk akun Vendor. Akun Verifikator, Validator, Bagian Pengadaan, dan Admin harus disiapkan oleh administrator sistem.':
      'Self-registration is for Vendor accounts only. Verifier, Validator, Procurement, and Admin accounts must be set up by the system administrator.',
    'Akun internal (Verifikator, Validator, Pengadaan, dan Admin) tidak dapat dibuat melalui pendaftaran mandiri. Gunakan akun internal yang disiapkan administrator.':
      'Internal accounts (Verifier, Validator, Procurement, and Admin) cannot be created through self-registration. Use the internal account prepared by the administrator.',
    'Akun internal disiapkan oleh administrator sistem.': 'Internal accounts are set up by the system administrator.',
    'Tampilkan password': 'Show password',
    'Sembunyikan password': 'Hide password',
    Vendor: 'Vendor',
    Verifikator: 'Verifier',
    Validator: 'Validator',
    'Bagian Pengadaan': 'Procurement',
    Admin: 'Admin',

    // --- Dashboard
    'Portal manajemen kontraktor': 'Contractor management portal',
    'Dashboard CSMS': 'CSMS Dashboard',
    'Pantau pendaftaran, pra-kualifikasi, verifikasi, validasi, dan klasifikasi risiko vendor.':
      'Track registration, pre-qualification, verification, validation, and vendor risk classification.',
    'Daftarkan Vendor': 'Register Vendor',
    'Vendor Baru': 'New Vendor',
    'Total Vendor': 'Total Vendors',
    'Terdaftar dalam portal': 'Registered in the portal',
    'Menunggu Verifikasi': 'Awaiting Verification',
    'Tugas Unit Keselamatan': 'Safety Unit task',
    'Menunggu Validasi': 'Awaiting Validation',
    'Tinjauan lapangan': 'Field review',
    Tervalidasi: 'Validated',
    'Nilai lapangan final': 'Final field score',
    'Alur proses': 'Process flow',
    'Sesuai prosedur RCHSEMS': 'Per RCHSEMS procedure',
    '01 · Pendaftaran': '01 · Registration',
    'Data perusahaan, NIB/OSS, lingkup kerja.': 'Company data, NIB/OSS, scope of work.',
    '02 · Pra-kualifikasi': '02 · Pre-qualification',
    'Isi 8 proses dan unggah bukti dokumen.': 'Complete 8 processes and upload document evidence.',
    '03 · Verifikasi': '03 · Verification',
    'Unit Keselamatan menilai dokumen.': 'The Safety Unit assesses the documents.',
    '04 · Validasi': '04 · Validation',
    'Validasi lapangan dan pembaruan nilai.': 'Field validation and score update.',
    '05 · Penetapan': '05 · Determination',
    'Klasifikasi risiko berdasarkan nilai lapangan.': 'Risk classification based on the field score.',
    '06 · Sertifikat': '06 · Certificate',
    'Vendor Management menerbitkan sertifikat.': 'Vendor Management issues the certificate.',
    'Aktivitas terbaru': 'Recent activity',
    'Lihat semua': 'View all',
    'Catatan:': 'Note:',
    'Data dan bukti tersimpan terpusat di server. Setiap pengguna hanya dapat menjalankan tindakan sesuai kewenangannya.':
      'Data and evidence are stored centrally on the server. Each user can only perform actions within their authority.',
    'Belum ada data vendor. Mulai dari pendaftaran vendor.': 'No vendor data yet. Start by registering a vendor.',
    'Belum ada data vendor. Daftarkan vendor terlebih dahulu.': 'No vendor data yet. Register a vendor first.',

    // --- Data vendor / tabel
    'Database vendor': 'Vendor database',
    'Daftar dan status setiap perusahaan/lingkup yang didaftarkan.':
      'List and status of every registered company/scope.',
    'Cari nama, ID, atau lingkup': 'Search name, ID, or scope',
    'Cari vendor': 'Search vendors',
    Semua: 'All',
    'Belum ada vendor.': 'No vendors yet.',
    'Tidak ada vendor yang cocok dengan pencarian atau filter.': 'No vendors match the search or filter.',
    'Hapus filter': 'Clear filters',
    'ID / Perusahaan': 'ID / Company',
    Lingkup: 'Scope',
    Status: 'Status',
    'Nilai PK': 'PQ Score',
    Kategori: 'Category',
    Aksi: 'Actions',
    '(Nama belum diisi)': '(Name not filled in)',
    Nama: 'Name',
    Peran: 'Role',
    'Email / username': 'Email / username',
    'Hapus vendor': 'Delete vendor',

    // --- Status & risiko
    'Draft Pendaftaran': 'Registration Draft',
    'Menunggu Pengisian': 'Awaiting Completion',
    'Menunggu Verifikasi Dokumen': 'Awaiting Document Verification',
    'Perlu Perbaikan': 'Needs Revision',
    'Menunggu Validasi Lapangan': 'Awaiting Field Validation',
    'Tidak Lulus': 'Not Passed',
    'Risiko Tinggi': 'High Risk',
    'Risiko Menengah': 'Medium Risk',
    'Risiko Rendah': 'Low Risk',
    'RISIKO TINGGI': 'HIGH RISK',
    'RISIKO MENENGAH': 'MEDIUM RISK',
    'RISIKO RENDAH': 'LOW RISK',
    'TIDAK LULUS': 'NOT PASSED',
    'Tidak memenuhi ambang': 'Below threshold',
    'Belum dilakukan': 'Not yet done',
    Sesuai: 'Compliant',
    'Sesuai dengan catatan': 'Compliant with notes',
    'Tidak sesuai': 'Non-compliant',
    'Belum dinilai': 'Not yet scored',
    'Tidak tersedia': 'Not available',
    'Menengah Rendah': 'Medium-Low',
    'Menengah Tinggi': 'Medium-High',
    Tinggi: 'High',
    Rendah: 'Low',
    'Pilih...': 'Select...',

    // --- Pendaftaran vendor
    'Isi data perusahaan dan lingkup yang akan dikualifikasi.': 'Enter the company data and the scope to be qualified.',
    '1 Pendaftaran': '1 Registration',
    '2 Pra-Kualifikasi': '2 Pre-Qualification',
    '3 Verifikasi': '3 Verification',
    '4 Validasi': '4 Validation',
    '5 Penetapan': '5 Determination',
    'Nama Perusahaan': 'Company Name',
    NIB: 'NIB',
    NPWP: 'Tax ID (NPWP)',
    'Tingkat Risiko OSS': 'OSS Risk Level',
    'Alamat Perusahaan': 'Company Address',
    'Cabang/Unit yang didaftarkan': 'Registered branch/unit',
    'Penanggung Jawab HSE': 'HSE Person in Charge',
    'Email Resmi': 'Official Email',
    'Nomor Telepon': 'Phone Number',
    'Bidang Usaha': 'Line of Business',
    'Lingkup pekerjaan yang dimohonkan': 'Requested scope of work',
    'Catatan / informasi tambahan': 'Notes / additional information',
    'Kolom bertanda * wajib diisi.': 'Fields marked * are required.',
    'Simpan & Lanjut Pra-Kualifikasi →': 'Save & Continue to Pre-Qualification →',
    'Wajib diisi.': 'Required.',
    'Format email tidak valid.': 'Invalid email format.',
    'Periksa kolom yang ditandai.': 'Please check the highlighted fields.',

    // --- Pra-kualifikasi
    'Kelengkapan jawaban': 'Answer completeness',
    'Kembali ke daftar': 'Back to list',
    'Belum ada perubahan': 'No changes yet',
    Tersimpan: 'Saved',
    'Simpan Draft': 'Save Draft',
    'Kirim untuk Verifikasi': 'Submit for Verification',
    'Kirim untuk Verifikasi →': 'Submit for Verification →',
    'Ya, tersedia': 'Yes, available',
    'Tidak tersedia ': 'Not available',
    'Pilih berkas': 'Choose file',
    'Belum ada lampiran': 'No attachments',
    'Tambah keterangan': 'Add note',
    Keterangan: 'Note',
    'Keterangan tersimpan': 'Note saved',
    'Batalkan pilihan berkas': 'Remove selected file',
    'Pengisian belum lengkap': 'Form incomplete',
    'Pilih vendor untuk melihat isian pra-kualifikasinya.': 'Select a vendor to view its pre-qualification answers.',
    'Pilih vendor terlebih dahulu dari': 'First select a vendor from',
    'atau daftarkan vendor baru.': 'or register a new vendor.',
    'Lanjutkan pengisian': 'Continue filling',
    'menunggu simpan': 'pending save',
    'Pengajuan sedang diproses atau telah final. Formulir terkunci sampai dikembalikan untuk perbaikan.':
      'The submission is being processed or is final. The form is locked until it is returned for revision.',
    'Catatan perbaikan verifikator': 'Verifier revision notes',
    'Masih ada': 'There are still',
    'pertanyaan yang belum dijawab.': 'unanswered questions.',
    'Tanpa bukti': 'No evidence',
    'Belum diisi': 'Not filled in',
    Ya: 'Yes',
    Tidak: 'No',
    'Nomor dokumen, masa berlaku, atau catatan': 'Document number, validity period, or notes',
    'File bukti': 'Evidence file',
    'per berkas': 'per file',
    Pertanyaan: 'Question',
    Bobot: 'Weight',
    'Jawaban vendor': 'Vendor answer',
    'Matriks dokumen': 'Document matrix',
    'Matriks lapangan': 'Field matrix',
    Nilai: 'Score',
    'Keterangan verifikasi': 'Verification note',
    'Catatan pemeriksa': 'Reviewer note',
    'Catatan lapangan': 'Field note',
    'Catatan validasi': 'Validation note',
    Kepemimpinan: 'Leadership',
    Perencanaan: 'Planning',
    Pendukung: 'Support',
    Perbaikan: 'Improvement',

    // --- Verifikasi & validasi
    'Unit Keselamatan menilai dokumen dan memberi catatan per pertanyaan.':
      'The Safety Unit assesses the documents and adds notes per question.',
    'Validasi dilakukan Unit Keselamatan atau Ahli Keselamatan Daerah sesuai penetapan Unit Keselamatan.':
      'Validation is carried out by the Safety Unit or a Regional Safety Expert as designated by the Safety Unit.',
    'Pilih vendor': 'Select vendor',
    'Vendor lain': 'Other vendors',
    'Pilih vendor untuk mulai verifikasi.': 'Select a vendor to start verification.',
    'Pilih vendor untuk validasi.': 'Select a vendor to validate.',
    'Tanggal verifikasi dokumen': 'Document verification date',
    'Nama evaluator': 'Evaluator name',
    'Tanggal validasi lapangan': 'Field validation date',
    'Validator / Ahli Keselamatan Daerah': 'Validator / Regional Safety Expert',
    'Lokasi validasi': 'Validation location',
    'Hasil tinjauan': 'Review result',
    'Setiap akun verifikator menyimpan rekam penilaiannya sendiri. Lebih dari satu verifikator dapat menilai pengajuan yang sama.':
      'Each verifier account keeps its own assessment record. More than one verifier can assess the same submission.',
    'Setiap akun validator dapat menyimpan rekam validasinya sendiri. Lebih dari satu validator dapat memvalidasi pengajuan yang sama.':
      'Each validator account can keep its own validation record. More than one validator can validate the same submission.',
    'Rekap penilaian seluruh verifikator': 'Summary of all verifier assessments',
    'Rekap penilaian seluruh validator': 'Summary of all validator assessments',
    'Data dapat dilihat bersama. Nilai per kriteria dan total dihitung dari rata-rata skor verifikator yang telah menyimpan penilaian.':
      'Data is shared. Per-criterion and total scores are calculated from the average scores of verifiers who have saved their assessment.',
    'Nilai akhir per kriteria dihitung dari rata-rata skor semua validator yang sudah menyimpan penilaian.':
      'The final per-criterion score is calculated from the average scores of all validators who have saved their assessment.',
    'Hasil verifikasi dokumen': 'Document verification results',
    'Ringkasan seluruh verifikator. Nilai dokumen per kriteria adalah rata-rata skor yang sudah disimpan; catatan tiap verifikator ditampilkan agar dapat ditinjau validator.':
      "Summary of all verifiers. The per-criterion document score is the average of saved scores; each verifier's notes are shown so the validator can review them.",
    'Belum ada penilaian yang disimpan.': 'No assessments have been saved yet.',
    'Belum ada hasil penilaian.': 'No assessment results yet.',
    'Detail skor verifikator': 'Verifier score details',
    'Skala matriks sesuai formulir: 0; 0,25; 0,5; 0,75; 1. Nilai dicapai = matriks × nilai maksimum. Nilai total dokumen bersifat sementara; nilai akhir mengikuti hasil validasi lapangan.':
      'Matrix scale per the form: 0; 0.25; 0.5; 0.75; 1. Score achieved = matrix × maximum score. The document total is provisional; the final score follows the field validation result.',
    'Masukkan nilai matriks berdasarkan bukti yang telah dikonfirmasi saat validasi lapangan. Nilai lapangan adalah nilai akhir penetapan kategori RCHSEMS.':
      'Enter matrix scores based on evidence confirmed during field validation. The field score is the final score that determines the RCHSEMS category.',
    'Simpan Verifikasi': 'Save Verification',
    'Simpan Validasi': 'Save Validation',
    'Kirim ke Validasi Lapangan →': 'Send to Field Validation →',
    'Minta Perbaikan': 'Request Revision',
    'Tetapkan Hasil →': 'Determine Result →',
    'Jumlah kriteria': 'Number of criteria',
    'Nilai total': 'Total score',
    'Waktu simpan': 'Saved at',
    'Nilai dokumen sementara': 'Provisional document score',
    'Nilai lapangan': 'Field score',
    'Rata-rata nilai lapangan': 'Average field score',
    'Rata-rata verifikasi dokumen': 'Average document verification',
    'Unit Keselamatan': 'Safety Unit',
    'Validasi penilaian': 'Assessment validation',

    // --- Hasil & sertifikat
    'Nilai akhir memakai hasil validasi lapangan. Lingkup sertifikat dibatasi pada perusahaan/cabang dan lingkup pekerjaan yang divalidasi.':
      'The final score uses the field validation result. The certificate scope is limited to the validated company/branch and scope of work.',
    'Ekspor Excel': 'Export Excel',
    'Aturan kategori sesuai formulir verifikasi': 'Category rules per the verification form',
    'Rekap hasil penilaian': 'Assessment results summary',
    'Sertifikat rekanan — pratinjau': 'Partner certificate — preview',
    'Pilih vendor tervalidasi': 'Select validated vendor',
    'Buat Pratinjau Sertifikat': 'Generate Certificate Preview',
    'Penerbitan resmi sertifikat tetap dilakukan Vendor Management sesuai kewenangan dan persetujuan internal.':
      'Official certificate issuance remains with Vendor Management, in line with its authority and internal approval.',
    'Pilih vendor terlebih dahulu.': 'Please select a vendor first.',
    'Cetak / Simpan PDF': 'Print / Save PDF',
    'Saat mencetak, hanya sertifikat yang akan dicetak.': 'When printing, only the certificate is printed.',
    'SERTIFIKAT HASIL PENILAIAN': 'ASSESSMENT RESULT CERTIFICATE',
    'Dengan ini menyatakan bahwa rekanan berikut telah mengikuti proses penilaian CSMS (RCHSEMS)':
      'This certifies that the following partner has completed the CSMS (RCHSEMS) assessment process',
    'Nomor registrasi:': 'Registration number:',
    'Tanggal validasi:': 'Validation date:',
    'Lingkup pekerjaan:': 'Scope of work:',
    'Status:': 'Status:',
    'Masa berlaku indikatif 2 (dua) tahun sejak tanggal validasi lapangan, sesuai prosedur RCHSEMS dan ketentuan penerbitan sertifikat yang berlaku.':
      'Indicative validity of 2 (two) years from the field validation date, per RCHSEMS procedure and the applicable certificate issuance rules.',
    'Penerbitan sesuai kewenangan': 'Issued per authority',
    'Vendor Management': 'Vendor Management',
    'Logo KAI': 'KAI logo',

    // --- Kelola akun
    'Administrasi sistem': 'System administration',
    'Admin dapat mendaftarkan akun Verifikator, Validator, dan Bagian Pengadaan. Satu akun dapat memiliki lebih dari satu peran internal.':
      'Admins can register Verifier, Validator, and Procurement accounts. One account can hold more than one internal role.',
    'Daftarkan akun internal': 'Register internal account',
    'Nama lengkap ': 'Full name',
    'Password sementara (min. 12 karakter)': 'Temporary password (min. 12 characters)',
    'Peran internal': 'Internal roles',
    'Jangan pilih Vendor untuk akun internal. Verifikator dan Validator boleh dipilih bersamaan.':
      'Do not select Vendor for internal accounts. Verifier and Validator can be selected together.',
    'Akun tersimpan di server dengan password terenkripsi satu arah.':
      'Accounts are stored on the server with one-way encrypted passwords.',
    'Buat Akun Internal': 'Create Internal Account',
    'Daftar akun internal': 'Internal account list',
    'Atur ulang password': 'Reset password',
    'Atur ulang password:': 'Reset password:',
    'Belum ada akun internal tambahan.': 'No additional internal accounts yet.',
    'Akses diperiksa oleh server. Penghapusan menonaktifkan akun dan mempertahankan riwayat penilaian.':
      'Access is checked by the server. Deleting deactivates the account and keeps the assessment history.',
    'Menu ini hanya untuk Admin.': 'This menu is for Admins only.',
    'Ganti Password': 'Change Password',
    'Ganti password': 'Change password',
    'Ekspor Data (Excel)': 'Export Data (Excel)',
    'Password saat ini': 'Current password',
    'Password baru (minimal 12 karakter)': 'New password (minimum 12 characters)',
    'Password baru minimal 12 karakter.': 'New password must be at least 12 characters.',
    'Password berhasil diubah.': 'Password changed successfully.',
    'Password diubah dan sesi akun tersebut dihentikan.': "Password changed and that account's sessions were ended.",

    // --- Dialog konfirmasi
    'Simpan data pendaftaran?': 'Save registration data?',
    'Data perusahaan disimpan ke server dan Anda lanjut ke pengisian pra-kualifikasi.':
      'The company data will be saved to the server and you will continue to the pre-qualification form.',
    'Simpan draft?': 'Save draft?',
    'Jawaban dan lampiran yang dipilih akan disimpan ke server. Anda dapat melanjutkan kapan saja sebelum mengirim.':
      'Your answers and selected attachments will be saved to the server. You can continue at any time before submitting.',
    'Kirim pra-kualifikasi?': 'Submit pre-qualification?',
    Kirim: 'Submit',
    'Setelah dikirim, jawaban dan lampiran dikunci dan diproses oleh verifikator. Pastikan semuanya sudah benar.':
      'Once submitted, answers and attachments are locked and processed by the verifier. Make sure everything is correct.',
    'Simpan penilaian verifikasi?': 'Save verification assessment?',
    'Nilai dan catatan Anda disimpan ke server. Anda masih dapat memperbaruinya nanti.':
      'Your scores and notes will be saved to the server. You can still update them later.',
    'Teruskan ke validasi lapangan?': 'Send to field validation?',
    Teruskan: 'Send',
    'Vendor akan dipindahkan ke tahap validasi lapangan dan tidak dapat dikembalikan ke tahap verifikasi. Pastikan seluruh verifikator sudah menyimpan nilainya.':
      'The vendor will move to the field validation stage and cannot be moved back to verification. Make sure all verifiers have saved their scores.',
    'Kembalikan ke vendor?': 'Return to vendor?',
    Kembalikan: 'Return',
    'Vendor harus memperbaiki jawaban dan mengirim ulang. Putaran penilaian saat ini diarsipkan dan dimulai dari awal saat vendor mengirim kembali.':
      'The vendor must correct the answers and resubmit. The current assessment round is archived and restarted when the vendor resubmits.',
    'Simpan penilaian validasi?': 'Save validation assessment?',
    'Nilai dan hasil tinjauan lapangan Anda disimpan ke server. Anda masih dapat memperbaruinya sebelum hasil ditetapkan.':
      'Your scores and field review result will be saved to the server. You can still update them before the result is determined.',
    'Tetapkan hasil akhir?': 'Determine the final result?',
    'Tetapkan hasil': 'Determine result',
    'Penilaian lapangan akan dikunci dan tidak dapat diubah. Pastikan seluruh validator telah menyimpan nilainya.':
      'The field assessment will be locked and cannot be changed. Make sure all validators have saved their scores.',
    'Buat akun internal?': 'Create internal account?',
    'Buat akun internal': 'Create internal account',
    'Pilih minimal satu peran.': 'Select at least one role.',
    'Buat akun': 'Create account',
    'Ekspor data?': 'Export data?',
    Unduh: 'Download',
    'Data vendor yang dapat Anda akses akan diunduh sebagai berkas Excel (.xlsx). Berkas berisi informasi perusahaan, simpan dengan aman.':
      'The vendor data you can access will be downloaded as an Excel (.xlsx) file. It contains company information, so store it securely.',
    'Keluar dari aplikasi?': 'Sign out?',
    'Anda perlu masuk kembali untuk melanjutkan. Jawaban pra-kualifikasi yang sudah diubah akan disimpan lebih dulu.':
      'You will need to sign in again to continue. Modified pre-qualification answers will be saved first.',
    'Keluarkan berkas dari daftar?': 'Remove file from the list?',
    Keluarkan: 'Remove',
    'Berkas ini belum diunggah ke server dan akan dikeluarkan dari daftar lampiran.':
      'This file has not been uploaded to the server yet and will be removed from the attachment list.',
    'Hapus lampiran?': 'Delete attachment?',
    'Hapus lampiran': 'Delete attachment',
    'Berkas yang dihapus akan dihapus permanen dari server dan tidak dapat dikembalikan.':
      'The deleted file will be permanently removed from the server and cannot be restored.',
    'Lampiran dihapus dari server.': 'Attachment deleted from the server.',
    'Hapus data vendor?': 'Delete vendor data?',
    'Konfirmasi penghapusan': 'Confirm deletion',
    'Hapus permanen': 'Delete permanently',
    'Ketik ID vendor di bawah untuk melanjutkan. Tindakan ini tidak dapat dibatalkan.':
      'Type the vendor ID below to continue. This action cannot be undone.',
    'Ketik ID vendor terlebih dahulu.': 'Please type the vendor ID first.',
    'ID vendor tidak cocok. Penghapusan dibatalkan.': 'Vendor ID does not match. Deletion cancelled.',
    'Nonaktifkan akun?': 'Deactivate account?',
    'Akun internal berhasil dibuat.': 'Internal account created successfully.',
    'Data berhasil disimpan di server.': 'Data saved to the server.',
    'Draft tersimpan di server.': 'Draft saved to the server.',
    'Pra-kualifikasi tersimpan dan masuk antrean verifikasi.':
      'Pre-qualification saved and added to the verification queue.',

    // --- Autentikasi dua langkah, lupa password
    'Verifikasi dua langkah': 'Two-step verification',
    'Masukkan kode dari aplikasi autentikator Anda.': 'Enter the code from your authenticator app.',
    'Lupa password': 'Forgot password',
    'Lupa password?': 'Forgot password?',
    'Kembali ke login': 'Back to sign in',
    'Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur ulang password.':
      'Enter your account email. We will send a link to reset your password.',
    'Buat password baru untuk akun Anda.': 'Create a new password for your account.',
    'Kode autentikasi': 'Authentication code',
    'Masukkan 6 digit dari aplikasi autentikator, atau satu kode pemulihan.':
      'Enter the 6 digits from your authenticator app, or one recovery code.',
    Verifikasi: 'Verify',
    'Memeriksa...': 'Checking...',
    'Kirim tautan': 'Send link',
    'Mengirim...': 'Sending...',
    'Simpan password baru': 'Save new password',
    'Menyimpan...': 'Saving...',
    'Jika email terdaftar, tautan atur ulang password telah dikirim.':
      'If the email is registered, a password reset link has been sent.',
    'Password berhasil diatur ulang. Silakan masuk.': 'Password reset successfully. Please sign in.',
    'Autentikasi dua langkah': 'Two-step authentication',
    Mulai: 'Start',
    Aktifkan: 'Enable',
    Aktif: 'Active',
    Nonaktifkan: 'Disable',
    'Buat ulang': 'Regenerate',
    Salin: 'Copy',
    'Administrator mewajibkan autentikasi dua langkah untuk akun internal. Aktifkan sekarang untuk melanjutkan.':
      'The administrator requires two-step authentication for internal accounts. Enable it now to continue.',
    'Lindungi akun internal Anda dengan kode sekali pakai dari aplikasi autentikator (misalnya Google Authenticator atau Authy), selain password.':
      'Protect your internal account with a one-time code from an authenticator app (such as Google Authenticator or Authy), in addition to your password.',
    'Siapkan aplikasi autentikator': 'Set up your authenticator app',
    'Buka aplikasi autentikator dan pilih tambah akun.': 'Open your authenticator app and choose add account.',
    'Masukkan kunci pengaturan berikut (atau': 'Enter the following setup key (or',
    'Atau masukkan kunci pengaturan berikut (atau': 'Or enter the following setup key (or',
    'Buka aplikasi autentikator, pilih tambah akun, lalu pindai kode QR berikut:':
      'Open your authenticator app, choose add account, then scan this QR code:',
    'Kode QR pengaturan autentikasi dua langkah': 'Two-step authentication setup QR code',
    'buka langsung': 'open it directly',
    'di perangkat ini):': 'on this device):',
    'Salin kunci': 'Copy key',
    'Masukkan 6 digit yang ditampilkan aplikasi:': 'Enter the 6 digits shown by the app:',
    'Kode 6 digit': '6-digit code',
    'Simpan kode pemulihan': 'Save your recovery codes',
    'Saya sudah menyimpannya': 'I have saved them',
    'Gunakan satu kode bila Anda kehilangan akses ke aplikasi autentikator. Setiap kode hanya berlaku sekali dan tidak akan ditampilkan lagi.':
      'Use one code if you lose access to your authenticator app. Each code works only once and will not be shown again.',
    'Login memerlukan kode dari aplikasi autentikator.': 'Sign-in requires a code from your authenticator app.',
    'Buat ulang kode pemulihan': 'Regenerate recovery codes',
    'Kode pemulihan lama tidak berlaku lagi. Masukkan password Anda untuk melanjutkan.':
      'The old recovery codes will no longer work. Enter your password to continue.',
    'Nonaktifkan autentikasi dua langkah': 'Disable two-step authentication',
    'Akun Anda hanya dilindungi password setelah ini. Masukkan password Anda untuk melanjutkan.':
      'Your account will only be protected by your password after this. Enter your password to continue.',
    'Kunci disalin.': 'Key copied.',
    'Kode pemulihan disalin.': 'Recovery codes copied.',
    'Autentikasi dua langkah aktif.': 'Two-step authentication is enabled.',
    'Autentikasi dua langkah dinonaktifkan.': 'Two-step authentication disabled.',
    'Autentikasi dua langkah akun diatur ulang.': "The account's two-step authentication was reset.",
    'Atur ulang autentikasi dua langkah?': 'Reset two-step authentication?',
    'Atur ulang': 'Reset',
    'Reset 2FA': 'Reset 2FA',
    Akun: 'Account',
    'akan masuk hanya dengan password sampai mengaktifkannya kembali. Gunakan ini bila perangkat pemilik akun hilang.':
      "will sign in with a password only until they enable it again. Use this if the account owner's device is lost.",

    // --- Pesan dari klien (pesan server dilokalkan di sisi server: lang/*/portal.php)
    'Permintaan gagal.': 'Request failed.',
    'Permintaan gagal': 'Request failed',
    'Respons server tidak valid.': 'Invalid server response.',
    'Sesi kedaluwarsa. Muat ulang halaman dan login kembali.': 'Session expired. Reload the page and sign in again.',
    'Sesi untuk akun ini akan berakhir. Silakan masuk kembali dengan password baru.':
      "This account's session will end. Please sign in again with the new password.",
  };

  // Pola untuk teks dinamis. Fungsi mengembalikan teks Inggris; tr() menerjemahkan potongan bersarang.
  var PATTERNS = [
    [
      /^([\d]+\.[a-z])\. (.+)$/,
      function (m, tr) {
        return m[1] + '. ' + tr(m[2]);
      },
    ],
    [
      /^(.+) \*$/,
      function (m, tr) {
        var o = tr(m[1]);
        return o === m[1] ? m[0] : o + ' *';
      },
    ],
    [
      /^(\d+) berkas belum diunggah · tekan Simpan Draft$/,
      function (m) {
        return m[1] + ' file' + (m[1] === '1' ? '' : 's') + ' not yet uploaded · press Save Draft';
      },
    ],
    [
      /^(.+): maksimal 15 MB\.$/,
      function (m) {
        return m[1] + ': maximum 15 MB.';
      },
    ],
    [
      /^Menunggu tindakan Anda \((\d+)\)$/,
      function (m) {
        return 'Awaiting your action (' + m[1] + ')';
      },
    ],
    [
      /^Langkah (\d+) dari (\d+)$/,
      function (m) {
        return 'Step ' + m[1] + ' of ' + m[2];
      },
    ],
    [
      /^(\d+) \/ (\d+) pertanyaan terisi$/,
      function (m) {
        return m[1] + ' / ' + m[2] + ' questions answered';
      },
    ],
    [
      /^(\d+) dari (\d+) pertanyaan terisi$/,
      function (m) {
        return m[1] + ' of ' + m[2] + ' questions answered';
      },
    ],
    [
      /^Draft (\d+)\/(\d+)$/,
      function (m) {
        return 'Draft ' + m[1] + '/' + m[2];
      },
    ],
    [
      /^Draft tersimpan$/,
      function () {
        return 'Draft saved';
      },
    ],
    [
      /^Pertanyaan ([\w.]+)$/,
      function (m) {
        return 'Question ' + m[1];
      },
    ],
    [
      /^Bobot maksimum (\d+)$/,
      function (m) {
        return 'Maximum weight ' + m[1];
      },
    ],
    [
      /^Tersimpan (.+)$/,
      function (m) {
        return 'Saved ' + m[1];
      },
    ],
    [
      /^Gagal menyimpan: (.*)$/,
      function (m, tr) {
        return 'Failed to save: ' + tr(m[1]);
      },
    ],
    [
      /^Gagal menyimpan$/,
      function () {
        return 'Failed to save';
      },
    ],
    [
      /^Menyimpan…$/,
      function () {
        return 'Saving…';
      },
    ],
    [
      /^Terakhir disimpan (.*)\. Draft ini tersimpan di server, jadi bisa dilanjutkan dari perangkat lain\.$/,
      function (m) {
        return (
          'Last saved ' + m[1] + '. This draft is stored on the server, so you can continue it from another device.'
        );
      },
    ],
    [
      /^Jawaban dan keterangan tersimpan otomatis\. Berkas lampiran baru diunggah ke server setelah tombol simpan ditekan\. Format: (.*)\.$/,
      function (m) {
        return (
          'Answers and notes are saved automatically. New attachments are uploaded to the server after you press save. Formats: ' +
          m[1].replace(/, dan /, ', and ').replace('maks. 15 MB per berkas', 'max. 15 MB per file') +
          '.'
        );
      },
    ],
    [
      /^Unduh:? (.*)$/,
      function (m, tr) {
        return 'Download: ' + tr(m[1]);
      },
    ],
    [
      /^Akses tidak tersedia untuk peran (.*)$/,
      function (m, tr) {
        return 'Access is not available for role ' + tr(m[1]);
      },
    ],
    [
      /^Akun (.*) dinonaktifkan\.$/,
      function (m) {
        return 'Account ' + m[1] + ' deactivated.';
      },
    ],
    [
      /^Data vendor (.*) beserta seluruh lampirannya telah dihapus\.$/,
      function (m) {
        return 'Vendor data ' + m[1] + ' and all its attachments have been deleted.';
      },
    ],
    [
      /^Akun (.*) akan dibuat dengan peran: (.*)\.$/,
      function (m, tr) {
        return 'Account ' + m[1] + ' will be created with role(s): ' + tr(m[2]) + '.';
      },
    ],
    [
      /^(\d+) akun$/,
      function (m) {
        return m[1] + (m[1] === '1' ? ' account' : ' accounts');
      },
    ],
    [
      /^Hapus data vendor (.*)\?$/,
      function (m) {
        return 'Delete vendor data ' + m[1] + '?';
      },
    ],
    [
      /^ID vendor \((.*)\)$/,
      function (m) {
        return 'Vendor ID (' + m[1] + ')';
      },
    ],
    [
      /^Atur ulang password: (.*)$/,
      function (m) {
        return 'Reset password: ' + m[1];
      },
    ],
    [
      /^Nilai persentase = jumlah \(matriks lapangan × nilai maksimum\) ÷ (\d+) × 100\. Ambang di atas berasal dari Form Verifikasi yang diunggah; konfigurasi final perlu disahkan pemilik prosedur\.$/,
      function (m) {
        return (
          'Percentage score = sum of (field matrix × maximum score) ÷ ' +
          m[1] +
          ' × 100. The thresholds above come from the uploaded Verification Form; the final configuration must be approved by the procedure owner.'
        );
      },
    ],
    [
      /^(.*) · Isi ketersediaan dokumen dan unggah bukti untuk tiap proses\.$/,
      function (m) {
        return m[1] + ' · Indicate document availability and upload evidence for each process.';
      },
    ],
    [
      /^Data vendor (\S+) \((.*)\) beserta seluruh lampiran, jawaban, dan hasil penilaian akan dihapus permanen\.?(.*)$/,
      function (m) {
        return (
          'Vendor data ' +
          m[1] +
          ' (' +
          m[2] +
          ') together with all attachments, answers, and assessment results will be permanently deleted.'
        );
      },
    ],
    [
      /^Akun (\S+) tidak lagi dapat masuk\..*$/,
      function (m) {
        return 'Account ' + m[1] + ' will no longer be able to sign in. Assessment history is retained.';
      },
    ],
    [
      /^Password baru untuk (.*)\. Minimal 12 karakter\.?$/,
      function (m) {
        return 'New password for ' + m[1] + '. Minimum 12 characters.';
      },
    ],
  ];

  var lang = 'id';
  var applying = false;
  var cache = {};

  function tr(text) {
    if (!text) return text;
    var lead = text.match(/^\s*/)[0],
      trail = text.match(/\s*$/)[0];
    var core = text.slice(lead.length, text.length - trail.length);
    if (!core) return text;
    var out = lookup(core);
    return out === core ? text : lead + out + trail;
  }

  function lookup(core) {
    if (Object.prototype.hasOwnProperty.call(cache, core)) return cache[core];
    var out = core;
    if (Object.prototype.hasOwnProperty.call(EN, core)) out = EN[core];
    else {
      for (var i = 0; i < PATTERNS.length; i++) {
        var m = core.match(PATTERNS[i][0]);
        if (m) {
          out = PATTERNS[i][1](m, tr);
          break;
        }
      }
      if (out === core) {
        var seps = [' · ', ' + ', ' — ', ' / '];
        for (var s = 0; s < seps.length && out === core; s++) {
          if (core.indexOf(seps[s]) > -1) {
            var parts = core.split(seps[s]).map(function (p) {
              return tr(p);
            });
            var joined = parts.join(seps[s]);
            if (joined !== core) out = joined;
          }
        }
      }
      if (out === core) {
        var prefix = core.match(/^(.*?)(\s*(?:→|:|\.\.\.|…)?)$/);
        if (prefix && prefix[2] && Object.prototype.hasOwnProperty.call(EN, prefix[1])) out = EN[prefix[1]] + prefix[2];
      }
    }
    cache[core] = out;
    return out;
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 0 };
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'label'];

  function textNode(node) {
    var parent = node.parentNode;
    if (!parent || SKIP[parent.nodeName]) return;
    if (parent.classList && parent.classList.contains('msym')) return; // nama ikon (ligature) bukan teks tampilan
    if (node.__t !== undefined && node.nodeValue === node.__t) return; // sudah diterjemahkan
    var orig = node.nodeValue;
    var out = tr(orig);
    if (out === orig) {
      node.__o = undefined;
      node.__t = undefined;
      return;
    }
    // <option> tanpa atribut value memakai teksnya sebagai nilai: kunci nilai asli agar data tidak ikut berubah
    if (parent.nodeName === 'OPTION' && !parent.hasAttribute('value')) parent.setAttribute('value', orig.trim());
    node.__o = orig;
    node.__t = out;
    node.nodeValue = out;
  }

  function attrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a);
      el.__oa = el.__oa || {};
      var rec = el.__oa[a];
      if (rec && cur === rec[1]) continue;
      var out = tr(cur);
      if (out === cur) {
        if (rec) delete el.__oa[a];
        continue;
      }
      el.__oa[a] = [cur, out];
      el.setAttribute(a, out);
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      textNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (SKIP[root.nodeName]) return;
      attrs(root);
    }
    var kids = root.childNodes;
    for (var i = 0; i < kids.length; i++) walk(kids[i]);
  }

  function restore(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (root.__t !== undefined && root.nodeValue === root.__t) root.nodeValue = root.__o;
      root.__o = root.__t = undefined;
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && root.__oa) {
      for (var a in root.__oa) if (root.getAttribute(a) === root.__oa[a][1]) root.setAttribute(a, root.__oa[a][0]);
      root.__oa = undefined;
    }
    var kids = root.childNodes;
    for (var i = 0; i < kids.length; i++) restore(kids[i]);
  }

  function apply() {
    applying = true;
    try {
      if (lang === 'en') {
        walk(document.body);
        document.title = tr(document.documentElement.__title || document.title);
      } else {
        restore(document.body);
        if (document.documentElement.__title) document.title = document.documentElement.__title;
      }
    } finally {
      applying = false;
    }
  }

  var observer = new MutationObserver(function (list) {
    if (applying || lang !== 'en') return;
    applying = true;
    try {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        } else if (m.type === 'characterData') textNode(m.target);
        else if (m.type === 'attributes' && m.target.nodeType === 1) attrs(m.target);
      }
    } finally {
      applying = false;
    }
  });

  function syncSwitchers() {
    document.querySelectorAll('.lang-switch [data-lang]').forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function set(next) {
    if (next !== 'id' && next !== 'en') next = 'id';
    lang = next;
    try {
      localStorage.setItem(STORE, next);
    } catch (e) {
      /* penyimpanan dapat diblokir */
    }
    document.documentElement.lang = next;
    apply();
    syncSwitchers();
  }

  function init() {
    document.documentElement.__title = document.title;
    try {
      var saved = localStorage.getItem(STORE);
      if (saved === 'en' || saved === 'id') lang = saved;
    } catch (e) {
      /* abaikan */
    }
    document.documentElement.lang = lang;
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.lang-switch [data-lang]');
      if (b) set(b.getAttribute('data-lang'));
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
    apply();
    syncSwitchers();
  }

  /** Menambah terjemahan dari data dinamis (misalnya teks pertanyaan dari server) lalu menerapkannya bila English aktif. */
  function extend(map) {
    Object.assign(EN, map);
    cache = {};
    if (lang === 'en') apply();
  }

  window.I18N = {
    get lang() {
      return lang;
    },
    locale: function () {
      return lang === 'en' ? 'en-US' : 'id-ID';
    },
    t: tr,
    set: set,
    extend: extend,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
