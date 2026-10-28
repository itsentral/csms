import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { E2E_ENV } from '../playwright.config.js';

// Prepares a clean e2e database (separate from the development database) before the server starts.
export default function globalSetup() {
  fs.rmSync(E2E_ENV.DB_DATABASE, { force: true });
  fs.writeFileSync(E2E_ENV.DB_DATABASE, '');
  const env = { ...process.env, ...E2E_ENV };
  const artisan = (...args) => execFileSync('php', ['artisan', ...args, '--force'], { env, stdio: 'inherit' });
  artisan('migrate:fresh');
  artisan('db:seed');
  artisan('db:seed', '--class=DemoSeeder');
}
