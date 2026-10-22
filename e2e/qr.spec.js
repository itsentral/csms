import fs from 'node:fs';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const JSQR_SOURCE = fs.readFileSync(require.resolve('jsqr'), 'utf8');

// jsQR dimuat lewat CDP (evaluate) karena CSP aplikasi melarang skrip inline; semua dekode berjalan di dalam halaman.
async function prepare(page) {
  await page.goto('/');
  await page.evaluate(`${JSQR_SOURCE}\n;window.jsQR = (typeof jsQR !== 'undefined' ? jsQR : window.jsQR);`);
}

const roundTrip = (page, cases) =>
  page.evaluate(async cases => {
    const scale = 4;
    const toImage = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const out = [];
    for (const { text, ecc, kind } of cases) {
      let canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (kind === 'svg') {
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(QR.svg(text, { size: 600 }));
        await img.decode();
        canvas.width = canvas.height = 600;
        ctx.drawImage(img, 0, 0);
      } else {
        const m = QR.matrix(text, ecc);
        canvas.width = canvas.height = (m.length + 8) * scale;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        m.forEach((row, y) =>
          row.forEach((dark, x) => dark && ctx.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale))
        );
      }
      const img = toImage(canvas);
      out.push({ text, ecc, decoded: window.jsQR(img.data, img.width, img.height)?.data ?? null });
    }
    return out;
  }, cases);

test('QR: hasil encoder terbaca ulang untuk versi 1-10, koreksi L dan M', async ({ page }) => {
  await prepare(page);
  const base = 'otpauth://totp/CSMS:é-' + 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(8);
  const cases = [];
  for (const ecc of ['M', 'L'])
    for (const len of [4, 14, 30, 50, 70, 90, 110, 140, 170, 200, 212]) cases.push({ text: base.slice(0, len), ecc });
  cases.push({ text: 'x'.repeat(270), ecc: 'L' });
  for (const r of await roundTrip(page, cases)) expect(r.decoded, `ecc=${r.ecc} panjang=${r.text.length}`).toBe(r.text);
});

test('QR: SVG untuk URI otpauth terbaca, teks terlalu panjang ditolak', async ({ page }) => {
  await prepare(page);
  const uri = 'otpauth://totp/CSMS%3Aadmin%40example.test?secret=DKAJC7JUQYV775EX7Q345EBIXU4OG2JQ&issuer=CSMS';
  const [r] = await roundTrip(page, [{ text: uri, kind: 'svg' }]);
  expect(r.decoded).toBe(uri);
  expect(await page.evaluate(() => QR.svg('x'.repeat(400)))).toBeNull();
});
