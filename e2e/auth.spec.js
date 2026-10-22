import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test('halaman login: Enter masuk, password salah ditolak, CSP tidak dilanggar', async ({ page }) => {
  const violations = [];
  page.on('console', msg => {
    if (/content security policy/i.test(msg.text())) violations.push(msg.text());
  });
  await page.goto('/');
  await expect(page.locator('#authTitle')).toHaveText('Masuk ke aplikasi');

  await page.fill('#authUser', 'vendor@example.test');
  await page.fill('#authPass', 'password-salah-123');
  await page.press('#authPass', 'Enter');
  await expect(page.locator('#authError')).toContainText('tidak sesuai');

  await login(page, 'vendor@example.test');
  await expect(page.locator('#view h1')).toContainText('Dashboard');
  expect(violations).toEqual([]);
});

test('pengalih bahasa ID/EN bertahan setelah muat ulang', async ({ page }) => {
  await login(page, 'vendor@example.test');
  await page.click('.top-actions .lang-switch [data-lang="en"]');
  await expect(page.locator('#view h1')).toHaveText('CSMS Dashboard');
  await page.reload();
  await expect(page.locator('#view h1')).toHaveText('CSMS Dashboard');
  await page.click('.top-actions .lang-switch [data-lang="id"]');
  await expect(page.locator('#view h1')).toHaveText('Dashboard CSMS');
});

test('lupa password: halaman permintaan dan pesan netral', async ({ page }) => {
  await page.goto('/');
  await page.click('#linkForgot');
  await expect(page.locator('#authTitle')).toHaveText('Lupa password');
  await page.fill('#authUser', 'tidak-ada@example.test');
  await page.press('#authUser', 'Enter');
  await expect(page.locator('.snackbar')).toContainText('Jika email terdaftar');
  await expect(page.locator('#authTitle')).toHaveText('Masuk ke aplikasi');
});
