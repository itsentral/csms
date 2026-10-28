# Production deployment (Ubuntu 24.04)

This guide deploys the application to an Ubuntu 24.04 VPS with Nginx, PHP-FPM, and MySQL. Example domain: `csms.example.com`, application location `/var/www/rchsems-kai`. Replace the domain and passwords before running the commands.

Complete [go-live-checklist.md](go-live-checklist.md) before going live. Backup, update, and restore are covered in [operations.md](operations.md).

> **Important:** Do not directly change the global Nginx, PHP, or database configuration of a server that is already running. Check the server's condition and make a backup first, so other applications on the server are not disturbed.

## 1. Architecture

Users → domain and HTTPS → Nginx + PHP-FPM (Laravel 13) → a MySQL database dedicated to this application. Evidence documents are stored on the server disk in `storage/app/private` and are only downloaded through an authorized endpoint. There is no queue worker, scheduler, or email service: all operations are synchronous. Use a dedicated subdomain if the main domain is already used by another application.

## 2. Requirements

- Ubuntu 24.04 LTS, PHP **8.3+** (FPM and CLI), Composer 2, MySQL **8.0+**, Nginx.
- A **patched PHP**: 8.5.12, 8.4.27, 8.3.36, or newer (security release of 21 October 2026, CVE-2026-109618 and CVE-2026-109619, remote code execution). On Ubuntu, install the distribution update (`sudo apt update && sudo apt upgrade`); Ubuntu keeps its own version numbers, so confirm the fix with `apt changelog php8.3-fpm | grep -i CVE-2026-10961`. Restart PHP-FPM afterwards. See [operations.md](operations.md#php-security-updates).
- PHP extensions: ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl, pcre, PDO, pdo_mysql, session, tokenizer, xml, zip.
- Internet access for `composer install` and the HTTPS certificate (ports 80/443 open for HTTP-01 verification).
- Disk space for documents. The application limit is 15 MB **per file**; the interface uploads files one at a time.

## 3. Checking a server that already hosts other applications

Skip this section if the server is new and empty.

```bash
ssh SSH_USER@VPS_IP
lsb_release -a
php -v && php -m
composer --version
nginx -v && sudo nginx -t
sudo systemctl status nginx mysql --no-pager
sudo ss -lntp
ls -l /run/php/
```

Note the PHP version and the PHP-FPM socket. The PHP CLI and the PHP-FPM used by Nginx can differ; do not change the PHP version used by other applications. Back up the configuration and databases that may be affected:

```bash
sudo mkdir -p /var/backups/rchsems-preinstall
sudo cp -a /etc/nginx /var/backups/rchsems-preinstall/nginx-$(date +%F-%H%M)
sudo mysql -e "SHOW DATABASES;"
sudo mysqldump --single-transaction --routines --triggers --events OLD_DATABASE_NAME \
  > /var/backups/rchsems-preinstall/old-database.sql
```

Replace `OLD_DATABASE_NAME` with the correct name and test the restore. **Do not** run `DROP DATABASE`, delete old application folders, or overwrite the Nginx configuration without understanding the impact.

## 4. Server packages and database

```bash
sudo apt update
sudo apt install -y nginx mysql-server php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip unzip git composer certbot python3-certbot-nginx
sudo systemctl enable --now nginx mysql php8.3-fpm
```

Create the dedicated database and user as described in [local-setup.md](local-setup.md#ubuntu) (name `rchsems`, with your own strong password). The database must not be exposed to the internet.

## 5. Source and configuration

Run as the deploy account, not root:

```bash
sudo git clone https://github.com/itsentral/csms.git /var/www/rchsems-kai
sudo chown -R "$USER":www-data /var/www/rchsems-kai
cd /var/www/rchsems-kai
cp .env.example .env
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan key:generate
```

Fill in the production `.env`:

```dotenv
APP_NAME="CSMS PT KAI"
APP_ENV=production
APP_KEY=base64:KEY_GENERATED_BY_ARTISAN
APP_DEBUG=false
APP_URL=https://csms.example.com
APP_TIMEZONE=Asia/Jakarta
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rchsems
DB_USERNAME=rchsems
DB_PASSWORD="YOUR_DATABASE_PASSWORD"
SESSION_DRIVER=database
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
LOG_LEVEL=warning
MAIL_MAILER=smtp
MAIL_HOST=smtp.company-domain.co.id
MAIL_PORT=587
MAIL_USERNAME=smtp-account
MAIL_PASSWORD="SMTP_PASSWORD"
MAIL_FROM_ADDRESS="noreply@company-domain.co.id"
MAIL_FROM_NAME="CSMS PT KAI"
MFA_REQUIRED=true
NOTIFY_EMAIL=true
```

Keep the `APP_KEY` produced by `key:generate`; **do not** paste in the placeholder above and do not change it on routine deployments, because encrypted sessions would be invalidated. Email is used for the **forgot password** link (required for that feature to work) and, when `NOTIFY_EMAIL=true`, for status change notifications. Fill in `MAIL_*` according to the company SMTP and test sending before going live. `MFA_REQUIRED=true` makes 2FA mandatory for internal accounts; create the first admin, enable its 2FA, then create the other internal accounts.

```bash
php artisan migrate --seed --force
php artisan rchsems:create-admin admin@company-domain.co.id
```

The admin command asks for the password with hidden input (at least 12 characters). The production seeder does not create default accounts or passwords. The admin creates internal accounts through the **Kelola Akun Internal** ("Manage Internal Accounts") menu; vendors register themselves.

## 6. Directory permissions

```bash
sudo find /var/www/rchsems-kai -type d -exec chmod 750 {} \;
sudo find /var/www/rchsems-kai -type f -exec chmod 640 {} \;
sudo chmod -R ug+rwX storage bootstrap/cache
sudo find storage bootstrap/cache -type d -exec chmod g+s {} \;
sudo chmod 640 .env
```

Only `storage` and `bootstrap/cache` need write access for PHP-FPM; do not make the whole project writable by the web server. `php artisan storage:link` is **not needed**, and do not publish the evidence folder.

## 7. PHP-FPM and Nginx

Ready-to-use configuration is in the `deploy/` folder (`nginx.conf`, `php-rchsems.ini`).

```bash
sudo cp deploy/php-rchsems.ini /etc/php/8.3/fpm/conf.d/99-rchsems.ini
sudo cp deploy/nginx.conf /etc/nginx/sites-available/rchsems
sudo ln -s /etc/nginx/sites-available/rchsems /etc/nginx/sites-enabled/rchsems
```

Change `server_name` in `/etc/nginx/sites-available/rchsems`. The document root must be `/var/www/rchsems-kai/public`, not the project root. Check the existing configuration (`ls -l /etc/nginx/sites-enabled/`) to avoid conflicts, and do not remove other sites.

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart php8.3-fpm
```

## 8. HTTPS

Point DNS to the server, make sure ports 80/443 are open, then:

```bash
sudo certbot --nginx -d csms.example.com
sudo certbot renew --dry-run
cd /var/www/rchsems-kai
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

The application sends a strict `Content-Security-Policy` header (no inline scripts) and, over HTTPS, `Strict-Transport-Security`. `SESSION_SECURE_COOKIE=true` requires the application to be opened over HTTPS. If you use a reverse proxy or load balancer, configure Laravel's *trusted proxies* for the proxy addresses you control; the example here is for Nginx directly. If a proxy, WAF, or CDN (for example Cloudflare) sits in front of the application, make sure its request body limit is at least 20 MB, and disable automatic script injection (such as Cloudflare Web Analytics), which the CSP blocks by design. Health endpoint: `https://csms.example.com/up` (it only shows that Laravel can boot, not a check of all dependencies).

## 9. Verification after deployment

1. Open the HTTPS site and log in as admin; change the password through the account menu if needed.
2. Create verifier, validator, and procurement accounts. One account may hold both the verifier and validator roles.
3. Register a vendor account, complete the profile, fill in the 49 answers, upload one piece of evidence, then submit.
4. Log in as the verifier: download the evidence, save scores, request a correction or forward to validation.
5. Log in as the validator: fill in the date, location, and validation result, save the scores, set the result.
6. Log in as procurement: pick a validated vendor, preview the certificate, **Cetak / Simpan PDF** ("Print / Save PDF").
7. Make sure other vendors do not see that submission, then try the Excel export from the account menu.
8. Test forgot password (the email arrives, the link opens the new-password form), and enable 2FA on one internal account and then log in with a code.
9. Check that `storage/logs/laravel.log` and `/var/log/nginx/error.log` contain no critical errors.

Try the first installation on staging or a test subdomain before official use.

## References

- [Laravel: Deployment](https://laravel.com/docs/13.x/deployment)
- [Laravel: Migrations](https://laravel.com/docs/13.x/migrations)
- [Ubuntu Server: Obtain TLS certificates](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/)
