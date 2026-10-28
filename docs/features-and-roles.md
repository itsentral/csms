# Features, workflow, and access rights

This document describes the application's behavior from the user's side and the business rules. For technical details see [architecture.md](architecture.md). The interface is in Indonesian by default (with an English option), so UI labels are quoted as they appear on screen, with an English gloss where needed.

## Vendor status workflow

| Status | Meaning | Next step |
| ------ | ------- | --------- |
| Menunggu Pengisian (Awaiting Fill) | The vendor fills in the profile and the 49 pre-qualification questions (draft) | The vendor submits → Menunggu Verifikasi Dokumen |
| Menunggu Verifikasi Dokumen (Awaiting Document Verification) | A verifier assesses the documents | Forward → Menunggu Validasi Lapangan, or return → Perlu Perbaikan |
| Perlu Perbaikan (Needs Revision) | The vendor corrects answers and attachments | The vendor resubmits → Menunggu Verifikasi Dokumen |
| Menunggu Validasi Lapangan (Awaiting Field Validation) | A validator assesses the field results | Set the result → Tervalidasi |
| Tervalidasi (Validated) | The final result is locked; the risk category is set | Preview and print the certificate |

## Roles

| Role | Function |
| ---- | -------- |
| Vendor | Own dashboard and data, creates the profile, fills in and submits the pre-qualification, uploads evidence while filling in or correcting |
| Verifier | Sees vendors and evidence, scores documents, returns for correction, forwards to validation |
| Validator | Sees the verification results, scores the field validation, sets the result, previews the certificate |
| Procurement | Sees the dashboard and vendors, risk results, and previews and prints the certificate |
| Admin | All functions, internal account management, and deletion of vendor data |

Internal accounts (Verifier, Validator, Procurement, Admin) are created by an admin; one account may hold more than one internal role. Self-registration only produces Vendor accounts. Admins deactivate internal accounts (they do not delete them) so score records are preserved; your own account and admin accounts are protected from deactivation through this menu.

## Scoring rules

- Score matrix: 0 / 0.25 / 0.5 / 0.75 / 1 per question.
- Each account keeps one assessment per vendor per stage; saving again only updates that account's scores.
- Total = the sum of (the matrix average of all assessors who have saved × weight) over the questions. Percentage = total ÷ **the total weight of all questions** × 100; the total weight is currently 565 and is calculated from the `questions` table.
- Category by percentage: ≥ 70 High Risk; 50 to < 70 Medium Risk; 35 to < 50 Low Risk; < 35 Not Passed. The category names follow the mockup and indicate the qualification category achieved. The final score uses the field validation result.
- A single authorized assessor can advance a stage, as in the mockup; there is no quorum or extra assignment. Other verifiers can still **save** scores after the vendor has been forwarded to validation (only forwarding or returning is limited to the verification stage). Agree among assessors before pressing **Kirim ke Validasi Lapangan** ("Send to Field Validation").
- When a vendor resubmits after a correction, the previous round's assessment is archived in the audit log and the active assessment starts from scratch. Evidence files are kept.
- The final result is locked. The certificate is a **preview of the assessment result**, not a digital signature or an automatic official issuance. A score below 35 can still be shown as "TIDAK LULUS" (Not Passed), and the two-year validity is only indicative text as in the mockup.

## Pre-qualification: draft and attachments

The form has 49 questions with file attachments; filling it in does not have to be finished in one session.

**Easy to continue.** The form is split into 8 processes (collapsible sections) instead of one very long page, with checkpoints so the vendor always sees what is filled in and what is not:

- A progress bar with a percentage and "x / 49 pertanyaan terisi" (questions answered), and a chip per process showing answered/total (for example 3/5) that turns green when the process is complete. Clicking a chip jumps to that process.
- Each process header also shows its answered/total count, and only one process is open at a time, so the page stays short.
- When the vendor returns to a saved draft, a panel shows "Draft tersimpan · 11 dari 49 pertanyaan terisi" ("Draft saved · 11 of 49 questions answered") with the time of the last save and a **Lanjutkan pengisian** ("Continue filling in") button. One click opens the right process and puts the cursor on the first unanswered question.
- On submission, the questions that are not yet answered are listed per process, and the affected processes are opened.

| Mechanism | Behavior |
| --------- | -------- |
| Answers and notes | Saved automatically to the server 2 seconds after the last change, only for the questions that changed |
| Attachments | A selected file is only sent when the vendor presses **Simpan Draft** ("Save Draft") or **Kirim untuk Verifikasi** ("Submit for Verification"); it is never sent automatically. Files are sent one at a time with visible progress ("Mengunggah berkas 2 dari 5 · 45%", i.e. "Uploading file 2 of 5 · 45%"), the save buttons are locked during the upload, files over 15 MB are rejected when picked, and a stalled or dropped upload shows a clear message (the file keeps waiting so it can be retried) |
| Draft | Stored on the server (`answers`, `vendors.draft_saved_at`); it can be continued from another device with the same login |
| Submission | Checks that all 49 questions are complete (showing the list of unanswered ones), locks the submission, and moves the status to Menunggu Verifikasi Dokumen |

After submission the inputs are locked; changes are only possible through the **Perlu Perbaikan** flow, and resubmitting opens a new assessment round.

**Draft privacy:** an unsubmitted draft is only visible to **admins** and its owner. Verifiers, validators, and procurement still see the vendor data and the number of answered questions, but not the content of the answers, notes, or draft attachments; downloading draft attachments is also refused for them.

**Deleting attachments:**

| Situation | Result |
| --------- | ------ |
| A file is chosen but not yet saved | The `×` button removes the file from the list; it is never sent to the server |
| A file is already saved on the server | The `×` button deletes it permanently from the server (`DELETE /api/evidence/{id}`) |

Only the vendor owner (while the submission can still be filled in) and admins may delete attachments. After submission, attachments are locked for the vendor and only an admin can delete them. Every deletion is recorded in `audit_logs` with the action `evidence_deleted`. Attachment formats: PDF, Word, Excel, JPG, and PNG, at most 15 MB **per file** (not in total).

## Data management

- **Deleting vendor data** (Data Vendor → **Hapus**, "Delete") is for admins only and requires retyping the vendor ID. The deletion is permanent: profile, answers, all attachments on the server, and assessment results. The owner's login account is not deleted and the audit history is kept.
- **Search and filter:** Data Vendor can be searched by name, ID, or scope, and filtered by status. The summary cards on the dashboard open an already filtered list.
- **Excel export (.xlsx):** from the account menu or the Hasil & Lingkup Risiko (Results & Risk Scope) page. It contains the sheets **Vendor** (profile, status, score, category), **Answers**, and **Assessment** (matrix averages and score per question). The content follows the user's access rights, including the draft privacy rule; headers follow the interface language (the question text stays in Indonesian).
- **Passwords:** at least 12 characters. Changing a password ends the account's other sessions; an admin who resets an internal account's password also ends that account's sessions. See also forgot password below.

## Account security and notifications

**Two-factor authentication (2FA, TOTP)** is available for internal accounts (admin, verifier, validator, procurement).

- Enable it through the account menu → **Autentikasi dua langkah** ("Two-factor authentication"): scan the **QR code** with an authenticator app (Google Authenticator, Authy, and similar), then confirm with a 6-digit code. If scanning is not possible, enter the setup key manually or open the `otpauth://` link on the same device.
- Once active, login asks for a code after the password is correct. A code that was already used cannot be reused, and wrong attempts are rate limited.
- At activation, 8 single-use **recovery codes** are shown once. The account owner can regenerate the codes (password required) or disable 2FA (password required).
- If `MFA_REQUIRED=true`, an internal account without 2FA can only open the dashboard, change its password, and set up 2FA; other features are refused until 2FA is active, and 2FA cannot be disabled.
- Lost device: an admin picks **Reset 2FA** on that account (**Kelola Akun Internal**, "Manage Internal Accounts"). If the last admin is locked out, the operator runs `php artisan rchsems:reset-mfa email`. All resets are recorded in the audit log.

**Forgot password:** on the login page choose **Lupa password?** ("Forgot password?"), enter the email, and the system always answers neutrally (it does not reveal whether the email is registered). If it is registered and active, the email contains a link valid for 60 minutes; the link opens a new-password form. After success, all of that account's sessions end and 2FA (if active) is still requested at login.

**Email notifications** (only when `NOTIFY_EMAIL=true`):

| Event | Recipients |
| ----- | ---------- |
| A vendor submits the pre-qualification | All active verifiers |
| A verifier forwards to validation | All active validators |
| A submission is returned for correction | The vendor owner |
| A result is set | The vendor owner and all active procurement accounts |

A failure to send email is logged and does not break the workflow. The email language follows `APP_LOCALE`.

## Interface experience

- **Theme:** the interface uses the KAI brand colours (indigo navy and orange, measured from the logo), a navy side navigation on desktop, and compact components (48 px fields, 36 px buttons) with soft grey field outlines.
- **Confirmation:** every action that changes data or leaves the session (save, submit, forward, return, set, delete, create account, export, log out) asks for confirmation in a dialog. Autosave runs without a dialog.
- **Form validation:** empty required fields are marked immediately with the message "Wajib diisi" ("Required"), not a browser tooltip.
- **Language:** the ID | EN switch is in the top bar and on the login page (Indonesian by default); the choice is remembered in the browser, including the language of form error messages from the server.
- **Work queue:** the Verifikasi and Validasi pages automatically select the first vendor waiting for action, and the vendor list groups "Menunggu tindakan Anda" ("Waiting for your action") above the other vendors.
- **Score format:** scores appear uniformly across all pages and the certificate: integers without decimals (for example 100 / 100), otherwise at most two decimals; truncated, not rounded, so they never appear to cross a category threshold.
- **Certificate:** shown in A4 landscape proportions and printed as exactly one A4 landscape page.
- **Accessibility:** dialogs and menus have names that screen readers announce, can be closed with Esc, and all pages are audited automatically with axe-core.
- **Account menu:** the avatar at the top right holds Ganti Password (Change Password), Ekspor Data (Export Data), and Keluar (Log Out).
- **Small screens:** bottom navigation with at most four direct destinations and the rest in the **Lainnya** ("More") sheet.

## Security in use

Passwords are hashed by Laravel; access rights are checked on the server; CSRF is active; login, registration, and password change are rate limited; files are stored privately; the final status is not trusted from browser input. Differences from the mockup that stored everything in the browser: there are no demo passwords in production, all answers must be complete before submission, stages are locked, files are validated on the server, vendor data is isolated, an audit trail is kept, and drafts are stored on the server.

## Out of scope

SSO, email verification, assessor assignment or quorum, electronic signatures, official certificate issuance, and document antivirus are not provided. Browser data from the mockup is not imported automatically. Run UAT before accepting official operational data.
