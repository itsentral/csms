import path from 'node:path';
import { defineConfig } from '@playwright/test';

const PORT = 8123;
export const E2E_ENV = {
  APP_ENV: 'local',
  APP_DEBUG: 'false',
  APP_URL: `http://127.0.0.1:${PORT}`,
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: path.resolve('database/e2e.sqlite'),
  SESSION_DRIVER: 'database',
  SESSION_SECURE_COOKIE: 'false',
  CACHE_STORE: 'database',
  MAIL_MAILER: 'array',
  MFA_REQUIRED: 'false',
  NOTIFY_EMAIL: 'false',
};

// End-to-end smoke tests use the installed Chrome (no browser download) and a separate SQLite database.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.js',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: process.env.PW_CHANNEL || 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `php artisan serve --host=127.0.0.1 --port=${PORT} --no-reload`,
    url: `http://127.0.0.1:${PORT}/up`,
    reuseExistingServer: false,
    env: E2E_ENV,
  },
});
