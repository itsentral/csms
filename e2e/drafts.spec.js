import { test, expect } from '@playwright/test';
import { login, confirmDialog } from './helpers.js';

// What is typed in a form that cannot be saved half-filled survives a closed page, and can be discarded.
test('the registration form keeps a draft on the server and fills it back in after a reload', async ({ page }) => {
  await login(page, 'vendor@example.test');
  await page.evaluate(() => {
    currentId = null; // a new vendor, not the demo one
    go('register');
  });
  await expect(page.locator('#view h1')).toHaveText('Pendaftaran Vendor');
  await page.fill('#regForm [name="name"]', 'PT Draft Uji');
  await page.fill('#regForm [name="nib"]', '123456');
  await expect(page.locator('#draftNote')).toContainText('tersimpan otomatis');

  await page.reload();
  await expect(page.locator('#authScreen')).toBeHidden();
  await page.evaluate(() => {
    currentId = null;
    go('register');
  });
  await expect(page.locator('#regForm [name="name"]')).toHaveValue('PT Draft Uji');
  await expect(page.locator('#regForm [name="nib"]')).toHaveValue('123456');
  await expect(page.locator('#draftNote')).toContainText('dipulihkan');

  // Discarding removes the draft: the form is empty again, also after another reload.
  await page.click('[data-click="draftDiscard"]');
  await confirmDialog(page);
  await expect(page.locator('#regForm [name="name"]')).toHaveValue('');
  await expect(page.locator('#draftNote')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#authScreen')).toBeHidden();
  await page.evaluate(() => {
    currentId = null;
    go('register');
  });
  await expect(page.locator('#regForm [name="name"]')).toHaveValue('');
});
