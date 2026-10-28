# Testing

## Running the tests

```bash
composer install
php artisan test
```

The tests use **in-memory SQLite** (`phpunit.xml`), so they never touch the application's MySQL database. Latest result (22 October 2026, PHP 8.5.7, Laravel 13.36.0, PHPUnit 12.5): **36 tests, 233 assertions, passing**.

To run the tests on MySQL, create a **dedicated empty database** `rchsems_test`, grant access to the test account, then:

```bash
DB_CONNECTION=mysql DB_DATABASE=rchsems_test DB_USERNAME=rchsems DB_PASSWORD='TEST_PASSWORD' php artisan test
```

The shell environment overrides the PHPUnit defaults. `RefreshDatabase` creates and empties tables, so **never use the production database**.

## Automated coverage

`tests/Feature/BasicSecurityTest.php`, `WorkflowTest.php`, and `SecurityFeaturesTest.php` cover:

| Area | Scenarios |
| ---- | --------- |
| Access | The shell is available to guests; the API rejects guests and inactive accounts; API errors are JSON |
| Accounts | Registration cannot escalate roles; internal accounts with multiple roles; safe deactivation (your own account and admins are protected); changing a password ends other sessions |
| Isolation | A vendor cannot see or change another vendor's data; permissions per role |
| Master data | 49 questions and a total weight of 565 as in the mockup; risk category thresholds; `/api/state` provides the question master and status constants |
| Assessment flow | Two verifiers and two validators with averages; status transitions and the final lock; invalid scores or stages are rejected; saving verifier scores after forwarding; return for correction and round archiving |
| Draft and attachments | Partial save and resume; the draft is locked after submission; submission names the unanswered questions; the draft is visible to admins only (including attachment download); private evidence and authorized downloads; the owner deletes draft attachments but not after submission |
| Deletion | An admin deletes a vendor together with its files; the owner's account remains |
| Performance | The number of `/api/state` queries does not grow with the number of vendors |
| Export | A valid `.xlsx` file with three sheets; cell content is escaped |
| Language | Validation messages and server messages follow the `X-Lang` header (ID and EN) |
| Security | CSP is sent and the frontend has no inline handlers; TOTP matches the RFC 6238 vectors and rejects reuse; the 2FA flow (activation, login challenge, single-use recovery codes, admin reset, `MFA_REQUIRED`); forgot and reset password (neutral answer, single-use token, sessions ended, inactive account); email notifications go to the right recipients; the `rchsems:reset-mfa` command |

## Static checks

```bash
composer lint        # Pint
npm run lint         # ESLint
npm run format:check # Prettier
```

## Browser smoke tests (Playwright)

```bash
npm install
npm run test:e2e
```

12 flow tests (plus 3 attachment upload tests and 3 accessibility audits, about 70 seconds) run the application on port 8123 with a separate SQLite database `database/e2e.sqlite` (recreated on every run by `e2e/global-setup.js`, never touching the development database) and **use the installed Chrome** (`channel: 'chrome'`), so no browser is downloaded. Switch with `PW_CHANNEL=msedge` or run `npx playwright install chromium` if Chrome is not available. Coverage: login with Enter and with a wrong password, CSP violations, the language switch, forgot password, the cross-role flow (vendor submits → verifier forwards → validator sets the result → procurement sees the result and the certificate), an admin creating an account through the modal and exporting Excel, and 2FA activation (the QR code on screen is decoded and compared with the key) and login with a code. `upload.spec.js` tests attachment upload: visible progress and locked buttons during the upload, files over 15 MB rejected when picked, and a clear message with the file left waiting when the connection drops. `qr.spec.js` tests the QR encoder for versions 1-10 and L/M correction with an independent decoder (jsQR). The question text is verified to come from the server and to follow English, and the certificate score format is verified to be uniform.

### Accessibility (axe-core)

`e2e/a11y.spec.js` runs axe-core (WCAG 2.0/2.1 A and AA plus best practices) on the login page, forgot password, all admin pages, the account menu, the create-account modal, the 2FA dialog, and the phone view (390 px). *Serious* and *critical* violations fail the test; all findings are printed with the prefix `A11Y`. An automated audit does not replace manual testing with a screen reader and keyboard.

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on pushes to `main` and on every pull request, with three checks: (1) **PHP (lint, test, audit)**: `composer lint`, `php artisan test`, `composer audit`; (2) **Frontend (lint, build, audit)**: ESLint, Prettier, `npm run build`, which must not change `public/assets`, and `npm audit --omit=dev`; (3) **E2E and accessibility (Playwright)**: all Playwright tests with the Chrome that ships with the runner. The npm audit only fails the build for production dependencies (currently none). The build tooling has a `braces` advisory (GHSA-vfj7-8cjw-p6xm, DoS on nested patterns) that has no patched version yet; it is only used in local `watch` mode and does not process user input.

## Manual checks

The smoke tests above only cover the main paths. When changing the UI, check in a browser (desktop and about 375 px wide) all pages: login, dashboard, Data Vendor, vendor registration, pre-qualification, verification, validation, results and certificate, and account management. Also check:

- login with the Enter key, and the "Wajib diisi" ("Required") message on the registration form;
- the confirmation dialog on every action that changes data;
- the ID | EN switch: no Indonesian text remains when English is selected, and `<select>` choices are still stored with their original values;
- the account menu (popup on desktop, bottom sheet on mobile) and the mobile bottom navigation;
- printing the certificate to PDF from the browser (one A4 landscape page).

## Testing limits

- **MySQL has not been tested directly in the development environment**; the automated tests run on SQLite. Migrations use the Laravel Schema Builder and the queries are intended for MySQL. Run the tests on MySQL following the steps above before production.
- **Certificate PDF printing is not tested automatically.** Check the printed result manually (desktop, mobile, and print) as part of UAT.
- Nginx, HTTPS, PHP-FPM, backup/restore, and concurrent load have not been tested on the production server. Use [go-live-checklist.md](go-live-checklist.md).
