import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { login, confirmDialog, openAccountMenu, totp, decodeQr } from './helpers.js';

test('admin membuat akun internal lewat modal dan mengekspor Excel', async ({ page }) => {
  await login(page, 'admin@example.test');
  await page.click('#nav button[data-page="accounts"]');
  await expect(page.locator('#internalAccountForm')).toHaveCount(0); // form tidak tampil sebelum tombol ditekan

  await page.click('[data-click="createAccountDialog"]');
  const dialog = page.locator('.dialog-form');
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.locator('.field-error')).not.toHaveCount(0); // validasi inline
  await dialog.locator('input[name="name"]').fill('Penilai Baru');
  await dialog.locator('input[name="username"]').fill('penilai.baru@example.test');
  await dialog.locator('input[name="password"]').fill('PasswordBaru2026!');
  await dialog.locator('input[value="validator"]').check();
  await dialog.locator('button[type="submit"]').click();
  await expect(page.locator('.snackbar')).toContainText('berhasil dibuat');
  await expect(page.locator('#view')).toContainText('penilai.baru@example.test');

  await openAccountMenu(page, 'Ekspor Data');
  const download = page.waitForEvent('download');
  await confirmDialog(page);
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
  const bytes = fs.readFileSync(await file.path());
  expect(bytes.subarray(0, 2).toString()).toBe('PK'); // paket OOXML (zip)
});

test('akun internal mengaktifkan 2FA lalu login memerlukan kode', async ({ page }) => {
  await login(page, 'admin@example.test');
  await openAccountMenu(page, 'Autentikasi dua langkah');
  await page.click('[data-act="start"]');
  const secret = (await page.locator('.mfa-secret').textContent()).replace(/\s/g, '');
  const qr = await decodeQr(page, '.mfa-qr svg'); // QR berisi URI otpauth dengan kunci yang sama
  expect(qr).toContain('otpauth://totp/');
  expect(qr).toContain(`secret=${secret}`);
  await page.fill('#mfaCode', totp(secret));
  await page.click('[data-act="confirm"]');
  await expect(page.locator('.mfa-codes li')).toHaveCount(8);
  await page.click('[data-act="done"]');

  await openAccountMenu(page, 'Keluar');
  await confirmDialog(page);
  await expect(page.locator('#authScreen')).toBeVisible();

  await page.fill('#authUser', 'admin@example.test');
  await page.fill('#authPass', 'LocalDemo2026!');
  await page.press('#authPass', 'Enter');
  await expect(page.locator('#authTitle')).toHaveText('Verifikasi dua langkah');
  await page.fill('#authCode', '000000');
  await page.press('#authCode', 'Enter');
  await expect(page.locator('#authError')).toContainText('tidak valid');
  await page.fill('#authCode', totp(secret, 1)); // langkah berikutnya: kode pada langkah konfirmasi tidak boleh dipakai ulang
  await page.press('#authCode', 'Enter');
  await expect(page.locator('#authScreen')).toBeHidden();
});
