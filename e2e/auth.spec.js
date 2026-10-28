import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test('login page: Enter logs in, wrong password is rejected, CSP is not violated', async ({ page }) => {
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

test('the ID/EN language switch persists after a reload', async ({ page }) => {
  await login(page, 'vendor@example.test');
  await page.click('.top-actions .lang-switch [data-lang="en"]');
  await expect(page.locator('#view h1')).toHaveText('CSMS Dashboard');
  await page.reload();
  await expect(page.locator('#view h1')).toHaveText('CSMS Dashboard');
  await page.click('.top-actions .lang-switch [data-lang="id"]');
  await expect(page.locator('#view h1')).toHaveText('Dashboard CSMS');
});

test('forgot password: request page and neutral message', async ({ page }) => {
  await page.goto('/');
  await page.click('#linkForgot');
  await expect(page.locator('#authTitle')).toHaveText('Lupa password');
  await page.fill('#authUser', 'tidak-ada@example.test');
  await page.press('#authUser', 'Enter');
  await expect(page.locator('.snackbar')).toContainText('Jika email terdaftar');
  await expect(page.locator('#authTitle')).toHaveText('Masuk ke aplikasi');
});

test('question text comes from the server and follows English', async ({ page }) => {
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

test('the deployed commit is shown on the login page and in the sidebar', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.footer-version')).toHaveText(/^Versi [0-9a-f]{7}$/);
  await login(page, 'vendor@example.test');
  await expect(page.locator('.sidefoot-version')).toHaveText(/^Versi [0-9a-f]{7}$/);
  await page.click('#accountBtn');
  await expect(page.locator('.sheet .app-version')).toHaveText(/^Versi [0-9a-f]{7}$/);
});

test('the KAI favicon is declared and served', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="icon"][href^="/favicon.ico"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  for (const path of ['/favicon.ico', '/favicon-32x32.png', '/apple-touch-icon.png']) {
    const res = await request.get(path);
    expect(res.ok(), path).toBe(true);
    expect(res.headers()['content-type']).toMatch(/image\//);
  }
});
