# Go-live checklist

Tick each item only after it has actually been done. The technical steps are in [deployment.md](deployment.md) and recovery is in [operations.md](operations.md).

## Process owner approval

The following rules must be agreed and tested by the PT KAI process owner; do not assume they are correct just because the pages display.

- [ ] Replace the placeholder criteria with the official CSMS form.
- [ ] Verify that the total weight = 565 or the official value in force, and that the score percentage is correct.
- [ ] Confirm the risk thresholds in force.
- [ ] Confirm who can advance a stage, lock the final score, and issue the certificate.
- [ ] Run UAT and obtain the process owner's approval.

## Security and configuration

- [ ] PHP is patched (8.3.36, 8.4.27, 8.5.12, or a distribution build that lists CVE-2026-109618 and CVE-2026-109619), PHP-FPM was restarted, and `deploy/php-rchsems.ini` is installed.
- [ ] `APP_ENV=production` and `APP_DEBUG=false`.
- [ ] HTTPS is active and certificate renewal has been tested (`certbot renew --dry-run`).
- [ ] The Nginx document root points to `public/`, not the project root.
- [ ] `.env`, logs, and the evidence folder are not publicly accessible.
- [ ] There are no demo accounts or default passwords; `DemoSeeder` has not been run.
- [ ] The database is not exposed to the internet; access is limited to what is needed.
- [ ] Uploads are validated for type and size, and files are not executed as scripts.
- [ ] Rate limiting is active.
- [ ] Decide on `MFA_REQUIRED=true` for internal accounts; every admin has enabled 2FA and stored the recovery codes. Provide at least two admins so one locked-out account can be reset.
- [ ] SMTP (`MAIL_*`) has been tested: the forgot-password email arrives and its link works; if `NOTIFY_EMAIL=true`, notifications reach the right roles.
- [ ] The `Content-Security-Policy` and `Strict-Transport-Security` headers are sent and the browser console reports no CSP violations.
- [ ] Any proxy, WAF, or CDN in front of the application allows request bodies of at least 20 MB (the limit is 15 MB per file), and automatic script injection (for example Cloudflare Web Analytics) is disabled.
- [ ] Logs, monitoring, and scheduled backups are active, and restoring a backup has been tested.

## UAT: access and accounts

- [ ] The login page opens over HTTPS; login and logout work.
- [ ] Test the Vendor, Verifier, Validator, Procurement, and Admin accounts; each role only sees the menus matching its authority.
- [ ] A vendor cannot access another vendor's data by changing the ID in the URL.

## UAT: vendor process

- [ ] Vendor registration and required-field validation work.
- [ ] The questionnaire shows the 49 questions as in the mockup with the correct weights.
- [ ] Uploading many documents works, extensions and size are validated (including a file of about 15 MB), progress is visible during the upload, and downloads are only possible for authorized parties.
- [ ] Draft saving: fill in part of the form, close the browser, continue from another device; the process checkpoints show what is filled in; the **Lanjutkan pengisian** ("Continue filling in") button opens the first unanswered question; attachments are only sent after **Simpan Draft** ("Save Draft") or submission.
- [ ] A draft that has not been submitted is not visible to the Verifier, Validator, and Procurement (including its attachments).

## UAT: verification, validation, and results

- [ ] Two verifiers and two validators can assess one submission; the per-criterion average, total score, classification, and rounding are correct.
- [ ] The score, risk category, and final status follow the agreed rules.
- [ ] The certificate preview and printing are only accessible to authorized roles; printing to PDF has been tested on desktop and mobile (one A4 landscape page).
- [ ] The Excel export contains the correct data and follows the access rights.

## UAT: operations

- [ ] Data is still stored after logging out and logging in again.
- [ ] Deleting vendor data as an admin removes the attachments from the server and the owner's account stays active.
- [ ] There are no critical errors in the Laravel or Nginx logs.
- [ ] The ID | EN language switch works on all pages.
