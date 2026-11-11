import { test, expect } from '@playwright/test';
import { login, confirmDialog } from './helpers.js';

// Main cross-role flow on one demo vendor: submit → verification → validation → result.
test.describe.configure({ mode: 'serial' });

test('vendor answers 49 questions and submits for verification', async ({ page }) => {
  await login(page, 'vendor@example.test');
  await page.click('#nav button[data-page="vendors"]');
  await page.locator('#vendorList [data-click="openVendorDefault"]').first().click();
  await expect(page.locator('#view h1')).toHaveText('Pra-Kualifikasi');

  await page.evaluate(() => document.querySelectorAll('input[type=radio][value=Ya]').forEach(r => r.click()));
  await expect(page.locator('#view')).toContainText('49 / 49');

  await page.click('[data-click="submitQuestionnaire"]');
  await confirmDialog(page);
  await expect(page.locator('.snackbar')).toContainText('antrean verifikasi');
});

test('verification sheet shows the own score next to the team average', async ({ page }) => {
  // A first verifier saves 0.5 for every question.
  await login(page, 'verifikator2@example.test');
  await expect(page.locator('#vendorPicker')).not.toHaveValue('');
  await page.evaluate(() => {
    document.querySelectorAll('[data-review]').forEach(s => {
      s.value = '0.5';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.click('[data-click="saveReview"]');
  await confirmDialog(page);
  await expect(page.locator('.snackbar')).toContainText('berhasil disimpan');
  await expect(page.locator('[data-own="1.a"]')).toHaveText('5');
  await expect(page.locator('#scoreOwnState')).toHaveText('Tersimpan');

  // The second verifier has not saved yet: other verifiers' scores stay hidden so they cannot anchor the assessment.
  await page.context().clearCookies();
  await login(page, 'verifikator@example.test');
  await expect(page.locator('#scoreOwnState')).toHaveText('49 pertanyaan belum dinilai');
  await expect(page.locator('[data-team-hold="1.a"]')).toBeVisible();
  await expect(page.locator('[data-team-box="1.a"]')).toBeHidden();
  await expect(page.locator('#scoreTeamBox')).toBeHidden();
  await expect(page.locator('#view')).not.toContainText('282,5 / 565'); // the first verifier's total in the summary

  // The rubric opens in the row: picking a criterion sets the matrix and opens the next question.
  await expect(page.locator('[data-rubric-toggle="1.a"]')).toContainText('Pilih kriteria');
  await page.click('[data-rubric-toggle="1.a"]');
  await expect(page.locator('[data-rubric-option="1.a"]')).toHaveCount(5);
  await expect(page.locator('[data-rubric-option="1.a"]').first()).toContainText('Tidak melakukan identifikasi');
  await page.locator('[data-rubric-option="1.a"]').nth(4).click();
  await expect(page.locator('[data-own="1.a"]')).toHaveText('10'); // matrix × weight, not the average
  await expect(page.locator('[data-rubric-toggle="1.a"]')).toContainText('rencana tindakan untuk mitigasi risiko');
  await expect(page.locator('[data-rubric-row="1.a"]')).toBeHidden();
  await expect(page.locator('[data-rubric-row="1.b"]')).toBeVisible();
  await page.keyboard.press('3'); // keyboard: third criterion = 0.5
  await expect(page.locator('[data-own="1.b"]')).toHaveText('5');
  await expect(page.locator('[data-rubric-row="1.c"]')).toBeVisible();
  await expect(page.locator('[data-team-box="1.a"]')).toBeHidden();

  // Saving is refused while questions are unrated.
  await page.click('[data-click="saveReview"]');
  await expect(page.locator('.snackbar')).toContainText('47 pertanyaan belum dinilai');
  await expect(page.locator('.dialog-backdrop')).toHaveCount(0);
  await page.evaluate(() => {
    document.querySelectorAll('[data-review]').forEach(s => {
      if (s.value !== '') return;
      s.value = '0';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // After saving, the team average appears.
  await page.click('[data-click="saveReview"]');
  await confirmDialog(page);
  await expect(page.locator('.snackbar', { hasText: 'berhasil disimpan' })).toBeVisible();
  await expect(page.locator('[data-team-box="1.a"]')).toBeVisible();
  await expect(page.locator('[data-team="1.a"]')).toHaveText('7,5'); // (0.5 + 1) / 2 × 10
  await expect(page.locator('[data-team-n="1.a"]')).toHaveText('2 penilai');
  await expect(page.locator('[data-team-chip="1.a"]')).toHaveText('Beda dari tim');
  await expect(page.locator('#scoreTeamN')).toHaveText('2 verifikator');
  await expect(page.locator('#view')).toContainText('282,5 / 565');
});

test('verifier assesses and forwards to field validation', async ({ page }) => {
  await login(page, 'verifikator@example.test');
  await expect(page.locator('#view h1')).toHaveText('Verifikasi Dokumen');
  await expect(page.locator('#vendorPicker')).not.toHaveValue(''); // the waiting vendor is selected automatically
  await page.evaluate(() => {
    document.querySelectorAll('[data-review]').forEach(s => {
      s.value = '1';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  // Long notes: the textarea grows with its content.
  const note = page.locator('textarea[data-comment="1.a"]');
  const before = (await note.boundingBox()).height;
  await note.fill(
    'Dokumen isu internal/eksternal lengkap.\nRencana tindakan ada untuk 6 isu.\nBelum ada bukti tinjauan.\nPerlu dicek saat lapangan.'
  );
  expect((await note.boundingBox()).height).toBeGreaterThan(before);
  await page.click('[data-click="submitReview"]');
  await confirmDialog(page);
  await expect(page.locator('.snackbar')).toContainText('berhasil disimpan');

  // Once forwarded, the sheet is read-only: the note and the chosen criterion are shown as full text.
  await page.evaluate(() => go('verification'));
  await expect(page.locator('#view h1')).toHaveText('Verifikasi Dokumen');
  await expect(page.locator('textarea[data-comment]')).toHaveCount(0);
  await expect(page.locator('.note-text').first()).toContainText('Perlu dicek saat lapangan.');
  await expect(page.locator('.rubric-static[data-rubric-toggle="1.a"]')).toContainText(
    'rencana tindakan untuk mitigasi'
  );
  await expect(page.locator('[data-rubric-row]')).toHaveCount(0);
});

test('validator sets the final result', async ({ page }) => {
  await login(page, 'validator@example.test');
  await expect(page.locator('#view h1')).toContainText('Validasi');
  await expect(page.locator('#vendorPicker')).not.toHaveValue('');
  await page.evaluate(() => {
    document.querySelectorAll('[data-fieldscore]').forEach(s => {
      s.value = '1';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.fill('input[name="fieldDate"]', '2026-10-22');
  await page.fill('input[name="fieldLocation"]', 'Jakarta');
  await page.fill('input[name="validator"]', 'Validator Demo');
  await page.selectOption('select[name="fieldResult"]', 'Sesuai');
  await page.click('[data-click="finalizeValidation"]');
  await confirmDialog(page);
  await expect(page.locator('#view h1')).toContainText('Hasil');
  await expect(page.locator('#view')).toContainText('Risiko Tinggi');
});

test('procurement sees the result and the certificate preview', async ({ page }) => {
  await login(page, 'pengadaan@example.test');
  await expect(page.locator('#view h1')).toContainText('Hasil');
  await expect(page.locator('#view')).toContainText('PT Vendor Contoh');
  await page.selectOption('#certVendor', { index: 1 });
  await page.click('[data-click="previewCert"]');
  await expect(page.locator('.certificate')).toContainText('SERTIFIKAT HASIL PENILAIAN');
  await expect(page.locator('.certificate')).toContainText('PT Vendor Contoh');
  await expect(page.locator('.cert-score')).toHaveText(/^100\s*\/ 100$/); // whole score without decimals
  await expect(page.locator('.cert-meta')).toContainText('Oktober 2026');
});
