import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './helpers.js';

// Audit aksesibilitas otomatis (axe-core, WCAG 2.1 A/AA + praktik terbaik) pada layar dan dialog utama.
// Hanya pelanggaran berdampak serious/critical yang menggagalkan test; sisanya dicetak sebagai peringatan.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function audit(page, name) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const lines = violations.map(
    v =>
      `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes
        .slice(0, 3)
        .map(n => n.target.join(' '))
        .join(' | ')}`
  );
  if (lines.length) console.log(`A11Y ${name}\n${lines.join('\n')}`);
  const blocking = violations.filter(v => ['serious', 'critical'].includes(v.impact));
  expect
    .soft(
      blocking.map(v => v.id),
      `${name}: pelanggaran serius`
    )
    .toEqual([]);
  return violations;
}

test('login dan lupa password', async ({ page }) => {
  await page.goto('/');
  await audit(page, 'login');
  await page.click('#linkForgot');
  await audit(page, 'lupa password');
});

test('halaman utama (admin)', async ({ page }) => {
  await login(page, 'admin@example.test');
  await audit(page, 'dashboard');
  for (const p of ['vendors', 'register', 'verification', 'validation', 'risk', 'accounts']) {
    await page.evaluate(p => go(p), p);
    await page.waitForTimeout(900);
    await audit(page, p);
  }
  await page.evaluate(() => {
    currentId = 'RCH-DEMO-001';
    go('questionnaire');
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => pqToggleGroup(0));
  await page.waitForTimeout(300);
  await audit(page, 'pra-kualifikasi');
});

test('dialog, menu akun, dan layar ponsel', async ({ page }) => {
  await login(page, 'admin@example.test');
  await page.click('#accountBtn');
  await page.waitForTimeout(400);
  await audit(page, 'menu akun');
  await page.keyboard.press('Escape');
  await page.evaluate(() => go('accounts'));
  await page.waitForTimeout(900);
  await page.click('[data-click="createAccountDialog"]');
  await page.waitForTimeout(400);
  await audit(page, 'modal buat akun');
  await page.click('[data-cancel]');
  await page.evaluate(() => mfaDialog());
  await page.click('[data-act="start"]');
  await page.waitForTimeout(700);
  await audit(page, 'dialog 2FA');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 800 });
  await page.evaluate(() => go('dashboard'));
  await page.waitForTimeout(900);
  await audit(page, 'ponsel dashboard');
});
