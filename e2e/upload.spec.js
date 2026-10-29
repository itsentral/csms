import { test, expect } from '@playwright/test';
import { login, confirmDialog } from './helpers.js';

// Pre-qualification attachments upload as soon as they are picked: progress is visible, oversized files are rejected,
// network failures give a clear message with a retry, and nothing needs the "Simpan Draft" button.
// Runs before workflow.spec.js (alphabetical order) because it needs a demo vendor that can still be filled in.
test.describe.configure({ mode: 'serial' });

// Content starts with the PDF signature so it passes the server file type check.
const pdf = (name, bytes) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(bytes, 'a')]),
});

const FILE_INPUT = '[id="pqFile_1.a"]';
const SAVED = name => `.pq-file a:has-text("${name}")`;

async function openQuestionnaire(page) {
  await login(page, 'vendor@example.test');
  await page.click('#nav button[data-page="vendors"]');
  await page.locator('#vendorList [data-click="openVendorDefault"]').first().click();
  await expect(page.locator('#view h1')).toHaveText('Pra-Kualifikasi');
  await page.evaluate(() => pqGoGroup(0)); // open process 1 so its attachments are visible
}

// Deletes an uploaded file again so the e2e storage does not pile up.
async function removeSaved(page, name) {
  await page
    .locator('.pq-file', { has: page.locator(`a:has-text("${name}")`) })
    .locator('.pq-file-x')
    .click();
  await confirmDialog(page);
  await expect(page.locator(SAVED(name))).toHaveCount(0);
}

test('a picked file uploads right away, with no Simpan Draft needed', async ({ page }) => {
  await openQuestionnaire(page);
  await page.locator(FILE_INPUT).setInputFiles(pdf('bukti-a.pdf', 512 * 1024));

  await expect(page.locator(SAVED('bukti-a.pdf'))).toBeVisible();
  await expect(page.locator('.pq-file.uploading')).toHaveCount(0);
  await expect(page.locator('#pqPending')).toHaveText('');

  // The file is really on the server: it survives a reload of the page state.
  await page.reload();
  await page.click('#nav button[data-page="vendors"]');
  await page.locator('#vendorList [data-click="openVendorDefault"]').first().click();
  await expect(page.locator('#view h1')).toHaveText('Pra-Kualifikasi');
  await page.evaluate(() => pqGoGroup(0));
  await expect(page.locator(SAVED('bukti-a.pdf'))).toBeVisible();
  await removeSaved(page, 'bukti-a.pdf');
});

test('progress never claims 100% before the server answers, then shows the saving phase', async ({ page }) => {
  await openQuestionnaire(page);
  // Forward the request, but hold the server's answer back so the "saving on the server" phase can be observed.
  await page.route('**/api/vendors/*/evidence', async route => {
    const response = await route.fetch();
    await new Promise(r => setTimeout(r, 1500));
    await route.fulfill({ response });
  });
  await page.locator(FILE_INPUT).setInputFiles(pdf('bukti-b.pdf', 256 * 1024));

  await expect(page.locator('.pq-file.uploading')).toBeVisible();
  await expect(page.locator('.pq-file.uploading em')).toHaveText(/^(Mengirim \d+%|Menyimpan di server…)$/);
  await expect(page.locator('.pq-file.uploading em')).not.toContainText('100%');
  await expect(page.locator('#pqPending')).toContainText('Mengunggah 1 berkas');
  await expect(page.locator('[data-click="submitQuestionnaire"]')).toBeDisabled();

  await expect(page.locator(SAVED('bukti-b.pdf'))).toBeVisible();
  await expect(page.locator('[data-click="submitQuestionnaire"]')).toBeEnabled();
  await page.unroute('**/api/vendors/*/evidence');
  await removeSaved(page, 'bukti-b.pdf');
});

test('several files are uploaded one after another', async ({ page }) => {
  await openQuestionnaire(page);
  await page.locator(FILE_INPUT).setInputFiles([pdf('satu.pdf', 64 * 1024), pdf('dua.pdf', 64 * 1024)]);
  await expect(page.locator(SAVED('satu.pdf'))).toBeVisible();
  await expect(page.locator(SAVED('dua.pdf'))).toBeVisible();
  await removeSaved(page, 'satu.pdf');
  await removeSaved(page, 'dua.pdf');
});

test('a file over 15 MB is rejected when picked', async ({ page }) => {
  await openQuestionnaire(page);
  await page.locator(FILE_INPUT).setInputFiles(pdf('terlalu-besar.pdf', 16 * 1024 * 1024));
  await expect(page.locator('.snackbar')).toContainText('terlalu-besar.pdf: lebih dari 15 MB');
  await expect(page.locator('.pq-file.uploading, .pq-file.failed')).toHaveCount(0);
});

test('a dropped connection shows a clear failure and the file can be retried', async ({ page }) => {
  await openQuestionnaire(page);
  await page.route('**/api/vendors/*/evidence', route => route.abort('failed'));
  await page.locator(FILE_INPUT).setInputFiles(pdf('bukti-c.pdf', 128 * 1024));

  const failed = page.locator('.pq-file.failed');
  await expect(failed).toContainText('bukti-c.pdf');
  await expect(failed).toContainText('Gagal: Koneksi terputus saat mengunggah');
  await expect(page.locator('#pqPending')).toHaveText('1 berkas gagal diunggah');

  await page.unroute('**/api/vendors/*/evidence');
  await failed.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.locator(SAVED('bukti-c.pdf'))).toBeVisible();
  await expect(page.locator('.pq-file.failed')).toHaveCount(0);
  await expect(page.locator('#pqPending')).toHaveText('');
  await removeSaved(page, 'bukti-c.pdf');
});

test('a failed upload can be removed from the list', async ({ page }) => {
  await openQuestionnaire(page);
  await page.route('**/api/vendors/*/evidence', route => route.abort('failed'));
  await page.locator(FILE_INPUT).setInputFiles(pdf('bukti-d.pdf', 64 * 1024));
  await expect(page.locator('.pq-file.failed')).toBeVisible();
  await page.locator('.pq-file.failed .pq-file-x').click();
  await expect(page.locator('.pq-file.failed')).toHaveCount(0);
  await expect(page.locator('#pqPending')).toHaveText('');
});
