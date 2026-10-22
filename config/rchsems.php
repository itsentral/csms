<?php

return [
    // Wajibkan autentikasi dua langkah (TOTP) untuk semua akun internal (admin, verifikator, validator, pengadaan).
    'mfa_required' => (bool) env('MFA_REQUIRED', false),

    // Kirim email notifikasi saat status vendor berubah. Perlu konfigurasi MAIL_* yang valid.
    'notify_email' => (bool) env('NOTIFY_EMAIL', false),

    // Masa berlaku kode verifikasi langkah kedua setelah password benar (detik).
    'mfa_login_ttl' => 300,
];
