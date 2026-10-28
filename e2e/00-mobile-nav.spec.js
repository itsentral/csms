import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

// Runs before admin.spec.js (alphabetical order), while the admin account still has no 2FA.
test('the mobile "Lainnya" sheet lists the overflow pages by their labels, not icon names', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin@example.test');
  await page.click('#navMore');
  const items = page.locator('.sheet .sheet-item');
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText('Verifikasi Dokumen');
  await expect(items.nth(1)).toContainText('Validasi Lapangan');
  await expect(items.nth(2)).toContainText('Hasil & Lingkup Risiko');
  await expect(items.nth(3)).toContainText('Kelola Akun Internal');
  for (const label of ['search', 'task_alt', 'bar_chart', 'person']) {
    await expect(page.locator('.sheet .sheet-item span:not(.msym)', { hasText: new RegExp(`^${label}$`) })).toHaveCount(
      0
    );
  }
  await items.nth(3).click();
  await expect(page.locator('#view h1')).toHaveText('Kelola Akun Internal');
});

test('opening the "Lainnya" sheet keeps the current page instead of reloading it as a skeleton', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'admin@example.test');
  await expect(page.locator('#view h1')).toHaveText('Dashboard CSMS');
  await page.click('#navMore');
  await expect(page.locator('.sheet')).toBeVisible();
  await expect(page.locator('.skeleton-page')).toHaveCount(0);
  await expect(page.locator('#view')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#view h1')).toHaveText('Dashboard CSMS');
  await page.keyboard.press('Escape');
  await expect(page.locator('#view h1')).toHaveText('Dashboard CSMS');
});

for (const tab of ['login', 'register']) {
  test(`the ${tab} form can be scrolled to every field on a short phone screen`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 380 });
    await page.goto('/');
    await expect(page.locator('#authScreen')).toBeVisible();
    if (tab === 'register') await page.click('#tabRegister');
    const overlay = page.locator('#authScreen');
    const metrics = await overlay.evaluate(el => ({ scroll: el.scrollHeight, client: el.clientHeight }));
    expect(metrics.scroll).toBeGreaterThan(metrics.client); // the form is taller than the screen

    // Top: the logo is reachable (not clipped above the screen).
    await overlay.evaluate(el => (el.scrollTop = 0));
    expect((await page.locator('.login-box .brand').boundingBox()).y).toBeGreaterThanOrEqual(0);

    // Bottom: the submit button and the footer are reachable.
    await overlay.evaluate(el => (el.scrollTop = el.scrollHeight));
    await expect(page.locator('#authSubmit')).toBeInViewport();
    await expect(page.locator('.login-box .footer')).toBeInViewport();
  });
}
