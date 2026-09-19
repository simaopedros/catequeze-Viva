import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:8081').replace(/\/$/, '');
const OUT_DIR = process.env.OUT_DIR || '/opt/cursor/artifacts/mobile-audit';
const EMAIL = process.env.EMAIL || 'coord.saojose@catequese.com';
const PASSWORD = process.env.PASSWORD || 'Teste@123';

const issues = [];

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function tap(page, selector) {
  const loc = page.locator(selector).locator('visible=true').first();
  await loc.waitFor({ state: 'attached', timeout: 15000 });
  await loc.scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(200);
  try {
    await loc.click({ timeout: 8000 });
  } catch {
    await loc.click({ force: true, timeout: 8000 });
  }
}

async function gotoSafe(page, route, name) {
  const url = route.startsWith('http') ? route : `${BASE_URL}${route.startsWith('/') ? route : `/${route}`}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1200);
    await shot(page, name);
    return true;
  } catch (err) {
    issues.push({ route, name, error: String(err) });
    await shot(page, `${name}--error`).catch(() => undefined);
    return false;
  }
}

async function login(page) {
  await gotoSafe(page, '/login', '00-login');
  await tap(page, '[data-testid="login-email"] input, [data-testid="login-email"]');
  await page.keyboard.type(EMAIL);
  await tap(page, '[data-testid="login-password"] input, [data-testid="login-password"]');
  await page.keyboard.type(PASSWORD);
  await tap(page, '[data-testid="login-submit"]');
  await page.waitForTimeout(3500);
  await shot(page, '01-after-login');
}

async function tabRoute(page, route, slug) {
  await gotoSafe(page, route, slug);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'pt-BR',
});

await fs.mkdir(OUT_DIR, { recursive: true });

try {
  await login(page);

  await tabRoute(page, '/', 'tab-home');
  await tabRoute(page, '/community', 'tab-community');
  await tabRoute(page, '/classes', 'tab-classes');
  await tabRoute(page, '/messages', 'tab-messages');
  await tabRoute(page, '/more', 'tab-more');

  const routes = [
    ['/catechumens', 'route-catechumens'],
    ['/families', 'route-families'],
    ['/documents', 'route-documents'],
    ['/birthdays', 'route-birthdays'],
    ['/announcements', 'route-announcements'],
    ['/bible', 'route-bible'],
    ['/catechism', 'route-catechism'],
    ['/directory', 'route-directory'],
    ['/content', 'route-content'],
    ['/calendar', 'route-calendar'],
    ['/team', 'route-team'],
    ['/reports', 'route-reports'],
    ['/settings', 'route-settings'],
    ['/notifications', 'route-notifications'],
    ['/search', 'route-search'],
    ['/sacraments', 'route-sacraments'],
    ['/formation', 'route-formation'],
    ['/groups', 'route-groups'],
    ['/support', 'route-support'],
    ['/community/shorts', 'route-shorts'],
    ['/community/search', 'route-community-search'],
    ['/community/topics', 'route-topics'],
    ['/community/following', 'route-following'],
    ['/messages/new', 'route-message-new'],
    ['/class/new', 'route-class-new'],
    ['/forgot-password', 'route-forgot-password'],
  ];

  for (const [route, slug] of routes) {
    await gotoSafe(page, route, slug);
  }

  await gotoSafe(page, '/classes', 'deep-classes');
  const classRow = page.locator('[data-testid^="class-"]').first();
  if (await classRow.isVisible().catch(() => false)) {
    await classRow.click();
    await page.waitForTimeout(2000);
    await shot(page, 'deep-class-detail');
    const meeting = page.locator('[data-testid^="meeting-"]').first();
    if (await meeting.isVisible().catch(() => false)) {
      await meeting.click();
      await page.waitForTimeout(2000);
      await shot(page, 'deep-meeting-detail');
    }
  }
} finally {
  await fs.writeFile(
    path.join(OUT_DIR, 'capture-log.json'),
    JSON.stringify({ baseUrl: BASE_URL, email: EMAIL, issues }, null, 2),
    'utf8',
  );
  await browser.close();
}

console.log(`Audit capture done → ${OUT_DIR} (${issues.length} route errors)`);
