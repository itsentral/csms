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
  await page.click('[data-click="submitReview"]');
  await confirmDialog(page);
  await expect(page.locator('.snackbar')).toContainText('berhasil disimpan');
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
