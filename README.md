# CSMS PT KAI

**CSMS** (Contractor Safety Management System) is the portal for pre-qualification, verification, field validation, and risk classification of PT Kereta Api Indonesia contractors. The procedure is also known as **RCHSEMS** (Railway Contractor Health Safety Environment Management System); that name is still used in the procedure, the certificate, and technical identifiers (database name, directories, the `rchsems.*` configuration, and the `rchsems:*` commands).

Laravel 13 · PHP 8.3+ · MySQL 8 · Material 3 interface (Google Sans, KAI colours) · Indonesian and English.

Main features: the pre-qualification → verification → validation → result workflow, a pre-qualification form that is split into processes with progress checkpoints and can be resumed with one click, Excel export, two languages (ID/EN), two-factor authentication (TOTP) for internal accounts, forgot password by email, and email notifications for status changes.

The application was built from the mockup `RCHSEMS_CSMS_PT_KAI_MVP_v11.html` (kept in the root as a reference): 49 questions in 8 groups, a total weight of 565, the assessor summary, risk categories, and the certificate print design. Data and authority are processed on the Laravel/MySQL server. Node.js, Vite, and a CDN are not needed at runtime.

## Quick start

```bash
git clone https://github.com/itsentral/csms.git && cd csms
cp .env.example .env
composer install
php artisan key:generate
# fill in the MySQL connection (DB_*) in .env first
php artisan migrate --seed
php artisan rchsems:create-admin
composer dev   # or: php artisan serve (uses your php.ini upload limits, usually 2 MB per file)
```

Open http://127.0.0.1:8000. For local demo accounts: `php artisan db:seed --class=DemoSeeder` (only `local`/`testing`). Never run `DemoSeeder` or `migrate:fresh` in production.

## Documentation

| Document | Audience | Contents |
| -------- | -------- | -------- |
| [docs/local-setup.md](docs/local-setup.md) | Developers | Setting up the local environment, database, and demo accounts |
| [docs/deployment.md](docs/deployment.md) | Server operators | Deploying to Ubuntu 24.04 with Nginx, PHP-FPM, MySQL, and HTTPS |
| [docs/operations.md](docs/operations.md) | Server operators | Backup, update, restore, and common troubleshooting |
| [docs/go-live-checklist.md](docs/go-live-checklist.md) | Operators and process owners | Security, UAT, and approval checklist before go-live |
| [docs/features-and-roles.md](docs/features-and-roles.md) | Users, analysts, QA | Status workflow, access rights per role, scoring rules, drafts, attachments, export |
| [docs/architecture.md](docs/architecture.md) | Developers | Source structure, database, design system, i18n, rate limiting |
| [docs/testing.md](docs/testing.md) | Developers and QA | How to run the tests, coverage, and testing limits |

## Frequently used commands

```bash
php artisan test                  # 42 PHPUnit tests, in-memory SQLite
npm install && npm run test:e2e   # 12 smoke tests + 6 upload tests + 4 mobile tests + 3 accessibility audits (Playwright + installed Chrome)
composer lint && npm run lint     # Pint (PHP) and ESLint (JavaScript); fix formatting with: composer format && npm run format
npm run build                     # required after changing resources/css or resources/js
php artisan rchsems:create-admin  # create the first admin (the password is asked interactively)
php artisan rchsems:reset-mfa EMAIL   # emergency: reset 2FA for an account that lost its device
```

The build output in `public/assets/` (CSS and minified JavaScript) must be committed because the production server does not run Node.js. The JavaScript sources are in `resources/js`. CI (GitHub Actions) checks lint, tests, build freshness, dependency audit, and e2e.
