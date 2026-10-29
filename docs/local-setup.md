# Local setup (development)

This guide is for running the application on a developer's computer. For a production server see [deployment.md](deployment.md).

## Requirements

- PHP **8.3+**, Composer 2, MySQL **8.0+**.
- PHP extensions: ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl, pcre, PDO, pdo_mysql, session, tokenizer, xml, **zip** (used for Excel export). `pdo_sqlite` is only needed to run the tests.
- Node.js is **not** needed to run the application; it is only needed to rebuild the CSS/JavaScript and to run the browser tests (see [architecture.md](architecture.md#material-3-design-system)).

Official references: [Laravel 13 Releases](https://laravel.com/docs/13.x/releases) and [Deployment](https://laravel.com/docs/13.x/deployment). The installed framework version is recorded in `composer.lock`.

## Ubuntu

```bash
sudo apt update
sudo apt install -y php8.3-cli php8.3-mbstring php8.3-xml php8.3-curl php8.3-mysql php8.3-zip php8.3-sqlite3 unzip git composer mysql-server
php -v && composer --version
```

Create a dedicated database and user (change the example password):

```bash
sudo mysql
```

```sql
CREATE DATABASE rchsems CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rchsems'@'localhost' IDENTIFIED BY 'CHANGE_TO_A_STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON rchsems.* TO 'rchsems'@'localhost';
EXIT;
```

## Windows and macOS

Install PHP 8.3+, Composer 2, and MySQL 8, enable the same extensions, then follow the steps below (in PowerShell use `Copy-Item .env.example .env`). The PHP bundled with some XAMPP packages is still 8.2: make sure `php -v` meets the requirement.

## Running the application

```bash
git clone https://github.com/itsentral/csms.git && cd csms
cp .env.example .env
composer install --prefer-dist
php artisan key:generate
```

Edit `.env`: set `DB_PASSWORD`; make sure `DB_HOST=127.0.0.1`, `DB_DATABASE=rchsems`, `DB_USERNAME=rchsems`, `APP_ENV=local`, `APP_DEBUG=true`, `SESSION_SECURE_COOKIE=false`.

```bash
php artisan migrate --seed
php artisan db:seed --class=DemoSeeder
composer dev
```

`composer dev` runs the PHP built-in server through `deploy/dev-router.php`, a development server that raises the upload limits to match the application (15 MB per file). Plain `php artisan serve` also works but uses your php.ini defaults (usually 2 MB per upload and 8 MB per request), so larger attachments fail with "berkas gagal diunggah" or "ditolak server karena terlalu besar".

Open http://127.0.0.1:8000. The following demo accounts use the password **LocalDemo2026!**:

| Email                    | Role        |
| ------------------------ | ----------- |
| admin@example.test       | Admin       |
| vendor@example.test      | Vendor      |
| verifikator@example.test | Verifier    |
| validator@example.test   | Validator   |
| pengadaan@example.test   | Procurement |

`DemoSeeder` only runs in the `local` or `testing` environment and is not called by `DatabaseSeeder`. For empty data, run only `php artisan migrate --seed`, then `php artisan rchsems:create-admin`.

## Email, 2FA, and notifications (optional)

By default `MAIL_MAILER=log`: forgot-password emails and notifications are only written to the log (and only visible when `LOG_LEVEL=debug`). To try them for real, fill in `MAIL_*` with an SMTP server (for example Mailpit or Mailtrap) in `.env`.

| Variable | Purpose | Default |
| -------- | ------- | ------- |
| `MFA_REQUIRED` | Make 2FA mandatory for internal accounts; an account without 2FA can only set it up | `false` |
| `NOTIFY_EMAIL` | Send email when the vendor status changes | `false` |

Internal accounts can still enable 2FA themselves through the account menu even when `MFA_REQUIRED=false`.

## Next steps

- Running the tests: [testing.md](testing.md).
- Understanding the workflow and access rights: [features-and-roles.md](features-and-roles.md).
- Code structure and how to change the CSS or translations: [architecture.md](architecture.md).
