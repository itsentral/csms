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

test('teks pertanyaan berasal dari server dan ikut berbahasa English', async ({ page }) => {
  await login(page, 'vendor@example.test');
  await page.click('.top-actions .lang-switch [data-lang="en"]');
  await page.click('#nav button[data-page="vendors"]');
  await page.locator('#vendorList [data-click="openVendorDefault"]').first().click();
  await page.locator('.pq-group-head').first().click();
  await expect(page.locator('.qtitle').first()).toContainText('Does the company identify internal and external issues');
  await expect(page.locator('.pq-group-name').first()).toHaveText('Process 1. Organizational Context');
  await page.click('.top-actions .lang-switch [data-lang="id"]');
  await expect(page.locator('.qtitle').first()).toContainText('Apakah perusahaan melakukan identifikasi');
});
