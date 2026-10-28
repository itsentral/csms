# Operations: backup, update, restore, and troubleshooting

For the first installation see [deployment.md](deployment.md).

## Backup

Back up one set: the database, `.env` (including `APP_KEY`), and the whole `storage/app/private` folder (evidence documents). Keep it in a restricted, encrypted location, not in the `public` directory. `-p` asks for the password without putting it on the command line:

```bash
mkdir -p ~/backup-rchsems
mysqldump -h 127.0.0.1 -u rchsems -p --no-tablespaces --single-transaction rchsems > ~/backup-rchsems/database.sql
tar -czf ~/backup-rchsems/private-files.tar.gz storage/app/private
cp .env ~/backup-rchsems/environment-backup
chmod -R go-rwx ~/backup-rchsems
```

For a truly point-in-time backup, run `php artisan down` during the backup and `php artisan up` afterwards. Schedule regular backups and test the restore routinely.

## Update

1. Make a backup (above).
2. Pull the new release without overwriting `.env` and `storage`:

   ```bash
   git pull origin main
   ```

3. Run `bash deploy/update.sh`. The script first runs `php artisan down`, then `composer install --no-dev`, `migrate --force`, `db:seed --force` (idempotent, does not overwrite data), clears and rebuilds the caches, and finally runs `php artisan up`. The script does not run `migrate:fresh` and does not delete data.
4. If the script fails, the application **stays in maintenance mode** so an operator can fix the problem or restore the backup before `php artisan up`.

`deploy/update.sh` also records the release commit in `bootstrap/cache/revision.txt`; the UI shows it as "Versi <commit>" (login page, sidebar, account menu). If the version is missing or wrong, check that the file exists and is readable by PHP-FPM, or set `APP_COMMIT` in `.env`.

The build output in `public/assets/` (CSS and JavaScript) is already in the repository; the server does not need Node.js.

## PHP security updates

PHP 8.5.12, 8.4.27, 8.3.36, and 8.2.35 fix two critical remote code execution vulnerabilities (CVE-2026-109618 and CVE-2026-109619, announced on php.net on 21 October 2026). Applying them is the only complete remedy:

```bash
php -v                                              # CLI version
sudo apt update && sudo apt upgrade                 # Ubuntu installs the patched packages
apt changelog php8.3-fpm | grep -i CVE-2026-10961   # the changelog should mention both CVEs
sudo systemctl restart php8.3-fpm
```

Check the FPM version too (it can differ from the CLI), for example by looking at the package version with `apt policy php8.3-fpm`. PHP 8.1 and older receive no updates from the PHP project; the application requires PHP 8.3 or newer. Until the update is installed, `deploy/php-rchsems.ini` already sets `session.upload_progress.enabled = 0` and `fatal_error_backtraces = 0`, which close two of the known attack paths (copy the file and restart FPM, see [deployment.md](deployment.md)). They do not make an unpatched installation safe.

## Restore

A restore needs the matching release source, the database, the evidence folder, and the same `APP_KEY`. Test the restore in a separate environment first. Do not rely on a migration rollback as a way to recover data.

## Troubleshooting

- **500 / permission denied:** check `storage/logs/laravel.log`, the ownership of `storage` and `bootstrap/cache`, `.env`, and the MySQL connection.
- **419:** reload the page; check the domain and cookies, HTTPS, and `APP_KEY`; use one consistent application domain.
- **413 / upload failed:** check `client_max_body_size` (Nginx), `upload_max_filesize` and `post_max_size` (PHP); restart PHP-FPM after changing them. The 15 MB limit applies **per file** (each file is sent as its own request). The message on screen helps point to the cause: "berkas gagal diunggah" ("file failed to upload") means the PHP limit (`upload_max_filesize`), "ditolak server karena terlalu besar" ("rejected by the server because it is too large") means a 413 from Nginx, and "koneksi terputus" ("connection dropped") or "unggahan terhenti" ("upload stalled") usually means a proxy, WAF, or the network (for example Cloudflare or a firewall that limits requests to about 10 MB).
- **could not find driver:** install `php8.3-mysql` and make sure both the CLI and FPM load the extension.
- **Excel export fails:** make sure the `php8.3-zip` extension is installed and the PHP temporary directory is writable.
- **Email not sent (forgot password/notifications):** check `MAIL_*`, `storage/logs/laravel.log`, and that `MAIL_MAILER` is not `log`. A failure to send notifications is logged and does not break the workflow; the forgot password link is valid for 60 minutes.
- **An internal account lost its 2FA device:** an admin opens **Kelola Akun Internal** ("Manage Internal Accounts") → **Reset 2FA**. If the last admin is locked out, run `php artisan rchsems:reset-mfa account@email`. A single-use recovery code can also be used at login.
- **403:** check the role, the active account status, and vendor ownership; do not remove the authorization checks.
- **409:** the stage has changed or is locked; reopen the page to load the latest state.
- **Composer fails:** check PHP 8.3+, the extensions, and the internet connection; run `composer diagnose`. Do not use `--ignore-platform-reqs` in production.
- **`.env` changes are not picked up:** run `php artisan optimize:clear`, then rebuild the configuration, route, and view caches.
- **Old appearance after an update:** asset URLs carry a version based on the file modification time, so a hard refresh is rarely needed; if it is still old, check the CDN or proxy cache.

## Quick technical checks

```bash
php artisan about
php artisan migrate:status
php artisan route:list
curl -I https://csms.example.com
tail -n 100 storage/logs/laravel.log
sudo tail -n 100 /var/log/nginx/error.log
sudo journalctl -u php8.3-fpm -n 100 --no-pager
```

A `200`, `301`, or `302` response is normal depending on the configuration; a `500` needs investigating. Do not share logs that contain credentials or sensitive data.
