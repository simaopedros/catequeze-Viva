import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(process.cwd(), 'test-results', 'ux-audit');

const USERS = {
  coordinator: 'coord.saojose@catequese.com',
};

const PASSWORD = 'Teste@123';

async function ensureDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function dismissCookies(page) {
  const reject = page.getByRole('button', { name: /reject all/i });
  const accept = page.getByRole('button', { name: /accept all/i });
  if (await reject.isVisible().catch(() => false)) {
    await reject.click();
    return;
  }
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

async function shot(page, name, fullPage = true) {
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    fullPage,
  });
}

async function saveJson(name, data) {
  await fs.writeFile(path.join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: 'pt-BR' });
const consoleMessages = [];
const pageErrors = [];

page.on('console', (msg) => {
  consoleMessages.push({
    type: msg.type(),
    text: msg.text(),
  });
});

page.on('pageerror', (error) => {
  pageErrors.push({
    message: error.message,
    stack: error.stack,
  });
});

try {
  await ensureDir();

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await dismissCookies(page);
  await shot(page, '01-home');
  await saveJson('01-home-meta', {
    url: page.url(),
    title: await page.title(),
    consoleMessages,
    pageErrors,
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await dismissCookies(page);
  await shot(page, '02-login');

  await page.getByRole('textbox', { name: /email/i }).fill(USERS.coordinator);
  await page.getByRole('textbox', { name: /senha/i }).fill(PASSWORD);
  await page.getByRole('button', { name: /^entrar$/i }).click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  const errorText = await page.locator('body').innerText();
  await shot(page, '03-login-after-submit');
  await saveJson('03-login-after-submit-meta', {
    url: page.url(),
    title: await page.title(),
    bodyTextSnippet: errorText.slice(0, 2500),
    consoleMessages,
    pageErrors,
  });
} finally {
  await browser.close();
}
