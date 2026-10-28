import { test, expect } from '@playwright/test';
import { login, confirmDialog } from './helpers.js';

// Pre-qualification attachment upload: progress is visible, oversized files are rejected when picked, and network failures give a clear message.
// Runs before workflow.spec.js (alphabetical order) because it needs a demo vendor that can still be filled in.
test.describe.configure({ mode: 'serial' });

// Content starts with the PDF signature so it passes the server file type check.
const pdf = (name, bytes) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(bytes, 'a')]),
});

async function openQuestionnaire(page) {
  await login(page, 'vendor@example.test');
  await page.click('#nav button[data-page="vendors"]');
  await page.locator('#vendorList [data-click="openVendorDefault"]').first().click();
  await expect(page.locator('#view h1')).toHaveText('Pra-Kualifikasi');
}

test('upload shows progress, locks the buttons, then saves', async ({ page }) => {
  await openQuestionnaire(page);
  await page.locator('[id="pqFile_1.a"]').setInputFiles(pdf('bukti-a.pdf', 512 * 1024));
  await expect(page.locator('#pqPending')).toContainText('1 berkas belum diunggah');

  // Hold the response briefly so the "uploading" state can be observed.
  await page.route('**/api/vendors/*/evidence', async route => {
    await new Promise(r => setTimeout(r, 1200));
    await route.continue();
  });
  await page.click('[data-click="saveDraft"]');
  await confirmDialog(page);

  await expect(page.locator('#pqUpload')).toBeVisible();
  await expect(page.locator('#pqUploadText')).toHaveText(/Mengunggah berkas 1 dari 1 · \d+%/);
  await expect(page.locator('#pqUploadName')).toHaveText('bukti-a.pdf');
  await expect(page.locator('[data-click="saveDraft"]')).toBeDisabled();

  await expect(page.locator('.snackbar')).toContainText('Draft tersimpan di server.');
  await expect(page.locator('#pqUpload')).toBeHidden();
  await expect(page.locator('[data-click="saveDraft"]')).toBeEnabled();
  await expect(page.locator('#pqPending')).toHaveText('');
  await expect(page.locator('.pq-file a', { hasText: 'bukti-a.pdf' })).toHaveCount(1);

  // Clean up: delete the attachment from the server so it does not pile up in storage.
  await page.unroute('**/api/vendors/*/evidence');
  await page.evaluate(() => pqGoGroup(0)); // open process 1 so the delete button is visible
  await page.locator('.pq-file-x').first().click();
  await confirmDialog(page);
  await expect(page.locator('.pq-file a', { hasText: 'bukti-a.pdf' })).toHaveCount(0);
});

test('a file over 15 MB is rejected when picked', async ({ page }) => {
  await openQuestionnaire(page);
  await page.locator('[id="pqFile_1.a"]').setInputFiles(pdf('terlalu-besar.pdf', 16 * 1024 * 1024));
  await expect(page.locator('.snackbar')).toContainText('terlalu-besar.pdf: lebih dari 15 MB');
  await expect(page.locator('#pqPending')).toHaveText('');
});

test('a dropped connection gives a clear message and the file keeps waiting', async ({ page }) => {
  await openQuestionnaire(page);
  await page.locator('[id="pqFile_1.a"]').setInputFiles(pdf('bukti-b.pdf', 1024 * 1024));
  await page.route('**/api/vendors/*/evidence', route => route.abort('failed'));
  await page.click('[data-click="saveDraft"]');
  await confirmDialog(page);

  await expect(page.locator('.snackbar')).toContainText('bukti-b.pdf: Koneksi terputus saat mengunggah');
  await expect(page.locator('#pqUpload')).toBeHidden();
  await expect(page.locator('[data-click="saveDraft"]')).toBeEnabled();
  await expect(page.locator('#pqPending')).toContainText('1 berkas belum diunggah');
});
