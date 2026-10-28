# Architecture

An overview of the source structure, database, design system, internationalization, and rate limiting. User-facing behavior is described in [features-and-roles.md](features-and-roles.md).

## Overview

A single-page application (SPA) in plain JavaScript (no framework). `/` serves the `portal` view; all interaction goes through the JSON API `/api/*` (26 routes), called by `portal.js`. The JavaScript sources live in `resources/js` and are minified with esbuild into `public/assets` (the result is committed; the server does not run Node.js). Controllers are thin; business rules live in `app/Services` and validation in `app/Http/Requests`. Roles are stored in the JSON column `users.roles`; `User::hasRole()` is always true for admins.

## Source structure

| Location | Contents |
| -------- | -------- |
| `routes/web.php` | All routes: the login view and the API |
| `app/Http/Controllers/VendorController.php` | State, profile, answers, submission, vendor deletion, and export |
| `app/Http/Controllers/EvidenceController.php`, `AssessmentController.php`, `AccountController.php` | Evidence attachments, verifier/validator assessments, and internal accounts |
| `app/Http/Controllers/MfaController.php` | Second login step, 2FA setup, recovery codes, and admin reset |
| `app/Http/Requests` | Form Requests: validation rules and role authorization (run before validation) |
| `app/Services/VendorService.php`, `AssessmentService.php`, `EvidenceService.php`, `PortalState.php` | Status transitions with `lockForUpdate`, assessments, attachments, and the data loaded by the client |
| `app/Enums/VendorStatus.php` | The single definition of vendor statuses (`editable()`, `map()`); sent to the client through `/api/state` |
| `app/Services/Totp.php` | TOTP (RFC 6238) without dependencies |
| `app/Services/AppVersion.php` | The deployed commit shown in the UI (see below) |
| `app/Notifications/VendorStatusChanged.php` | Vendor status change email |
| `config/rchsems.php` | `MFA_REQUIRED`, `NOTIFY_EMAIL`, 2FA login lifetime |
| `app/Http/Controllers/AuthController.php` | Login, vendor registration, logout, password change |
| `app/Services/Portal.php` | Authorization, audit log, risk category, vendor serialization (`serializeMany`, no N+1), total calculation |
| `app/Services/VendorExport.php`, `XlsxWriter.php` | Export sheet builder and a dependency-free XLSX writer (`ZipArchive`) |
| `app/Providers/AppServiceProvider.php` | Rate limiting for login, registration, and password change |
| `app/Http/Middleware` | `ActiveUser` (inactive accounts are rejected), `SecurityHeaders`, and `SetLocale` (validation message language from the `X-Lang` header) |
| `app/Console/Commands/CreateAdmin.php` | `rchsems:create-admin` |
| `resources/views/portal.blade.php` | HTML shell, login screen, and CSRF token |
| `resources/css/portal.css` | Token and component source (Tailwind v4) |
| `resources/js/portal.js` | UI logic (source) |
| `resources/js/i18n.js` | ID/EN translator (source) |
| `resources/js/qr.js` | Dependency-free QR code generator (byte mode, versions 1-10, L/M correction); `QR.svg(text)` (source) |
| `public/assets/portal.js`, `i18n.js`, `qr.js`, `portal.css` | Build output (minified); committed, and **must not be edited directly** |
| `public/assets/fonts/` | Google Sans fonts and a Material Symbols Outlined subset (self-hosted) |
| `lang/id/validation.php`, `lang/en/validation.php` | Laravel validation messages and attribute names per language |
| `database/migrations`, `database/seeders`, `database/data` | Schema, seeders, and the question master |
| `deploy/` | Nginx and PHP configuration, plus `update.sh` |
| `tests/Feature` | Workflow and security tests |
| `RCHSEMS_CSMS_PT_KAI_MVP_v11.html` | The original mockup, kept for reference |

Asset URLs carry `?v=<file modification time>` (in `portal.blade.php`), so browsers fetch the new version automatically after a deploy.

### Leftover code from the first implementation

The `app/Http/Controllers` and `app/Models` folders still contain the first implementation, which is **not connected to any route** (`ApplicationController`, `ReviewController`, `CertificateController`, `DashboardController`, `AdminUserController`, the models `RchsemsApplication`, `Criterion`, `Review`, and related ones), together with the views in `resources/views/{applications,reviews,admin,certificates,auth}` and the migrations of its old tables (`rchsems_applications`, `criteria`, `reviews`, and so on). This code calls `hasAnyRole()`, which no longer exists, so it would not work if connected. It is safe to ignore and should be removed in the next cleanup.

## Database

Active tables: `users` (JSON column `roles` and `active`), `questions`, `vendors`, `answers`, `evidence`, `assessments`, `assessment_scores`, `audit_logs`; plus the default Laravel tables (`password_reset_tokens`, `sessions`, `cache`, `jobs`, and similar).

- Every vendor has an `owner_id`; answers are unique per question; assessments are unique per user and stage.
- The snapshot of the final result is in `vendors.final_snapshot`; the last draft save time is in `vendors.draft_saved_at` (cast as a datetime).
- Vendor statuses are stored as Indonesian text (for example `Menunggu Verifikasi Dokumen`, "Awaiting Document Verification"); these values are data, not display labels, and are not translated on the server.
- The audit log (`audit_logs`) can be inspected through the database; there is no audit menu in the interface.

**One source for questions and statuses.** `database/data/questions.json` (Indonesian and English text, groups, weights) is the master that is seeded into the `questions` table. `/api/state` sends the question list (`questions`) and the status constants (`statuses`, from `VendorStatus`) to the client; `portal.js` builds the question groups from that data and registers the English translations through `I18N.extend()`, with no copy in JavaScript. Adding or changing a question only requires the master and the seeder. Do not change weights or overwrite the master on a running database without an instrument version migration. `QuestionSeeder` is idempotent and does not overwrite existing data. The total weight (565) is calculated from the `questions` table, not from a constant.

## Material 3 design system

The interface follows Material Design 3 with a KAI brand palette on a Google-style (Gmail/Drive) layout. Tokens are defined in the `@theme` block of `resources/css/portal.css`.

| Aspect | Implementation |
| ------ | -------------- |
| Fonts | Served from `public/assets/fonts/`, no CDN: **Google Sans** (interface), **Google Sans Flex** (headings), **Google Sans Code** (registration numbers and figures), and **Material Symbols Outlined** (icons) |
| Colour | M3 colour roles (`primary`, `secondary`, `tertiary`, `surface*`, `outline*`, `error`, `success`). The palette is measured from the KAI logo: indigo navy `#2e2a72` as the primary colour and orange `#f06820` as the accent (`--color-accent`); warning statuses use a separate amber (`warning-container`) so they are not confused with the brand orange |
| Typography, shape, elevation, motion | The full M3 scales; radii of 4/8/12/16/28 px and full for buttons; five shadow levels; `standard` and `emphasized` curves |
| Layout | A navy side navigation (desktop) and content in a rounded white card. The top bar holds the system name, the language switch, and the account avatar (the page title is in the content heading). A thin navy and orange accent line runs along the top edge |
| Density | Compact components: fields are 48 px, buttons 36 px, with 14 px form text and a soft grey field outline (`--color-field-outline`) |
| Components | Filled/tonal/outlined/text buttons with 8/10/12% *state layers*, *outlined* fields with a floating label, M3 radio and checkbox, filter chips, tonal cards and outlined panels, data tables, search fields, dialogs, popup menu (desktop) or bottom sheet (mobile), snackbar, thin progress bar |
| Icons | The official **Material Symbols Outlined** font (Apache 2.0), a ±4 KB self-hosted subset. Used as a ligature: `<span class="msym" aria-hidden="true">icon_name</span>`; the active navigation item uses the filled variant (`FILL 1`). To add an icon, regenerate the subset through the Google Fonts API (`css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&icon_names=<list>`) and download the resulting woff2 file to `public/assets/fonts/materialsymbols-outlined.woff2` |
| Dialogs | No native browser `alert`/`confirm`/`prompt`. Use `m3Dialog`, `m3Confirm`, and `m3Snackbar`; use `bodyHtml` for formatted content and `body` for plain text (escaped automatically) |
| Responsive navigation | Below 900 px, the side navigation becomes a bottom navigation bar with at most four direct destinations and the rest in the **Lainnya** ("More") sheet |
| Certificate | A4 landscape proportions (297 x 210 mm) on wide screens and exactly one A4 landscape page when printed |

Rebuilding is needed whenever `resources/css/portal.css` or `resources/js/*.js` changes:

```bash
npm install
npm run build        # build:css (Tailwind) + build:js (esbuild --minify)
npm run watch:css    # optional, while developing
```

The output (`public/assets/portal.css`, `portal.js`, `i18n.js`, `qr.js`) must be committed because the server does not run Node.js; CI fails if the build output does not match the sources. esbuild does not bundle files and keeps top-level function names intact, because they are called through `data-click`/`data-change` attributes.

**Score format:** `fmtScore()` in `portal.js` shows scores in a uniform format (integers without decimals, otherwise at most two decimals, following the interface language) and truncates instead of rounding, so a score never appears to cross a risk category threshold.

**Deployed version:** the short commit hash is shown on the login page, at the bottom of the desktop sidebar, and in the account menu ("Versi 1d2ea1d"), so reports can name the exact release. `AppVersion::commit()` resolves it in this order: `APP_COMMIT` (config `rchsems.commit`), `bootstrap/cache/revision.txt` (written by `deploy/update.sh`), then the repository's own `.git` data, which it reads from files without running git. The value is rendered by `portal.blade.php` (the `app-version` meta tag feeds the account menu) and is hidden when it cannot be determined.

**Attachment upload:** files are sent one at a time with `XMLHttpRequest` (`apiUpload()` in `portal.js`) because `fetch` does not report upload progress. The interface shows "file N of M · P%", locks the save buttons during the upload, rejects files over 15 MB when they are picked, treats an upload as stalled after 90 seconds without progress (or 3 minutes without a server reply after all data was sent), and shows a clear message for dropped connections and for 413 and gateway errors. A failed file stays in the waiting list so it can be retried.

## Internationalization (ID | EN)

The source text is Indonesian. `public/assets/i18n.js` translates the DOM to English when selected: text nodes and the `placeholder`, `aria-label`, `title`, and `alt` attributes are matched against the `EN` dictionary, and dynamic text (numbers, names, "Langkah 2 dari 5", i.e. "Step 2 of 5") against `PATTERNS`. Text that changes later is caught by a `MutationObserver`; the language choice is stored in `localStorage` (`rchsems.lang`).

The principle is that only the display is translated: data values (statuses, `<option>` values, IDs) do not change, and an `<option>` without a `value` attribute is first locked to its original value. To add new text, add an entry to `EN` (the key is exactly the Indonesian text); use `PATTERNS` for text with dynamic parts. Laravel validation messages follow the selected language: the client sends the `X-Lang` header, the `SetLocale` middleware sets the locale, and the translations are in `lang/id/validation.php` (full messages) and `lang/en/validation.php` (attribute names only; the English messages use the framework defaults). Messages the server sends to users (`abort()` and JSON responses) are also localised on the server: controllers use `__('portal.<key>')` and the texts are in `lang/id/portal.php` and `lang/en/portal.php`. When adding a new server message, add the key to both files. Messages created on the client side (JavaScript) are translated through the `i18n.js` dictionary.

## Export

`GET /api/export?lang=id|en` returns an `.xlsx` file with three sheets (Vendor, Answers, Assessment). `VendorController::export` takes the data from `PortalState` so the draft privacy rules apply, `VendorExport` builds the rows, and `XlsxWriter` writes the OOXML package with `ZipArchive`. Cells hold text as *inline strings*, so content such as `=1+1` is not executed as a formula. The `php-zip` extension must be installed.

## Security

- **Content-Security-Policy** is sent by `SecurityHeaders` on all responses: `script-src 'self'` (no inline scripts and no `eval`), `style-src` allows inline styles, `object-src 'none'`, `frame-ancestors 'self'`. Over HTTPS, `Strict-Transport-Security` is added. **Rule for developers:** do not write inline `onclick`/`onchange` attributes or `<script>` tags. Use `data-click="functionName" data-args='[...]'` and `data-change="functionName"`; the binder is at the end of `portal.js`, and the function must be a global declaration. The test `test_csp_is_sent_and_frontend_has_no_inline_handlers` enforces this rule.
- **2FA (TOTP):** `users.two_factor_secret` and `two_factor_recovery_codes` are encrypted (the `encrypted` cast), recovery codes are stored as SHA-256 hashes, and `two_factor_last_step` prevents a code from being reused. Login with 2FA has two stages: `POST /api/login` returns `202 {mfa:true}` and keeps the user id in the session (valid for 5 minutes), then `POST /api/login/mfa` completes the login. The `RequireMfaSetup` middleware enforces `MFA_REQUIRED`.
- **The 2FA QR code** is generated in the browser by `qr.js` (the secret is not sent to an outside service). The `otpauth://` URI is deliberately compact (no default parameters) so it fits in a small QR version; text that is too long returns `null` and the interface falls back to the manual key. The e2e test `qr.spec.js` checks that the encoder output reads back correctly with an independent decoder (jsQR).
- **Forgot password:** uses the Laravel password broker (`password_reset_tokens`); `POST /api/password/forgot` always returns `202`, and the link opens `/?reset=TOKEN&email=...`, which `portal.js` handles. The email is localised from the request locale.
- **Notifications:** `Portal::notify()` is called after the transaction completes and swallows send failures (`report($e)`).

## Development tools

| Tool | Command | Purpose |
| ---- | ------- | ------- |
| Pint | `composer lint` / `composer format` | PHP code style (Laravel preset, `pint.json`) |
| ESLint | `npm run lint` | JavaScript quality (`eslint.config.js`; top-level functions are called through `data-click`, so they are not treated as unused) |
| Prettier | `npm run format` / `format:check` | Formatting of `resources/js`, configuration, and e2e files (`.prettierrc.json`) |
| esbuild | `npm run build:js` | JavaScript minification into `public/assets` |
| Playwright + axe-core | `npm run test:e2e` | Browser smoke tests and the accessibility audit in `e2e/` (see [testing.md](testing.md)) |
| GitHub Actions | `.github/workflows/ci.yml` | Lint, test, build, audit, and e2e on every push and pull request |

## Rate limiting

Named limiters in `app/Providers/AppServiceProvider.php`:

| Endpoint | Limit per account | Limit per IP address |
| -------- | ----------------- | -------------------- |
| `POST /api/login` | 10 / minute | 60 / minute |
| `POST /api/register` | 5 / minute | 20 / minute |
| `POST /api/login/mfa` | 5 / minute (per account being logged in) | 20 / minute |
| `POST /api/password/forgot` | 3 / minute | 10 / minute |
| `POST /api/password/reset` | — | 10 / minute |
| `PUT /api/password` | 10 / minute | 30 / minute |

The per-account limit prevents password guessing; the per-IP limit is looser because many office users share one network IP address. Attachment uploads are limited to 120 requests per minute.
