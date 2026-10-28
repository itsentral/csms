<?php

return [
    // Require two-factor authentication (TOTP) for all internal accounts (admin, verifier, validator, procurement).
    'mfa_required' => (bool) env('MFA_REQUIRED', false),

    // Send email notifications when the vendor status changes. Requires valid MAIL_* configuration.
    'notify_email' => (bool) env('NOTIFY_EMAIL', false),

    // Commit shown in the UI. Normally resolved automatically (revision file or .git); set APP_COMMIT to override it.
    'commit' => env('APP_COMMIT'),

    // Lifetime of the second-step verification code after the password is correct (seconds).
    'mfa_login_ttl' => 300,
];
