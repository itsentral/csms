import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { expect } from '@playwright/test';

export const PASSWORD = 'LocalDemo2026!';

export async function login(page, email, password = PASSWORD) {
  await page.goto('/');
  await page.fill('#authUser', email);
  await page.fill('#authPass', password);
  await page.press('#authPass', 'Enter'); // Enter must trigger login
  await expect(page.locator('#authScreen')).toBeHidden();
}

/** Clicks the confirm button (the last button) of the Material 3 dialog that is currently open. */
export async function confirmDialog(page) {
  const dialog = page.locator('.dialog-backdrop .dialog').last();
  await expect(dialog).toBeVisible();
  await dialog.locator('.dialog-actions button').last().click();
}

export async function openAccountMenu(page, itemLabel) {
  await page.click('#accountBtn');
  await page.locator('.sheet-item', { hasText: itemLabel }).click();
}

function base32Decode(text) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of text.replace(/[\s=]/g, '').toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** 6-digit TOTP code (RFC 6238) for step (now + offset). */
export function totp(secret, offset = 0) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const o = hmac[19] & 0xf;
  const value = ((hmac[o] & 0x7f) << 24) | (hmac[o + 1] << 16) | (hmac[o + 2] << 8) | hmac[o + 3];
  return String(value % 1_000_000).padStart(6, '0');
}

const JSQR_SOURCE = fs.readFileSync(createRequire(import.meta.url).resolve('jsqr'), 'utf8');

/** Reads the QR code content from an <svg> element on the page. jsQR is loaded through CDP because the CSP forbids inline scripts. */
export async function decodeQr(page, selector) {
  await page.evaluate(`${JSQR_SOURCE}\n;window.jsQR = (typeof jsQR !== 'undefined' ? jsQR : window.jsQR);`);
  return page.evaluate(async selector => {
    const svg = document.querySelector(selector).outerHTML;
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 600, 600);
    const { data, width, height } = ctx.getImageData(0, 0, 600, 600);
    return window.jsQR(data, width, height)?.data ?? null;
  }, selector);
}
