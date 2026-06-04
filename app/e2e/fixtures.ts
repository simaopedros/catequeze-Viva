/**
 * e2e/fixtures.ts — User credentials and authentication helpers.
 * 
 * Password for ALL test users: Teste@123
 */
import { test as base, Page } from '@playwright/test';

export const PASSWORD = 'Teste@123';

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  role: string;
  parish: string;
  isAdmin: boolean;
}

export const USERS: Record<string, TestUser> = {
  admin:             { id: 'user-admin-00000001', email: 'admin@catequese.com',              firstName: 'Admin',      role: 'SUPER_ADMIN',         parish: '—',          isAdmin: true },
  diocese:           { id: 'user-diocese-00001', email: 'diocese@catequese.com',             firstName: 'Diocese',    role: 'DIOCESE_ADMIN',       parish: 'São José',   isAdmin: false },
  coordSaoJose:      { id: 'user-coord-sj-0001', email: 'coord.saojose@catequese.com',       firstName: 'Coordenador', role: 'PARISH_COORDINATOR',  parish: 'São José',   isAdmin: false },
  coordSantaMaria:   { id: 'user-coord-sm-0001', email: 'coord.santamaria@catequese.com',    firstName: 'Coordenador', role: 'PARISH_COORDINATOR',  parish: 'Santa Maria',isAdmin: false },
  communityCoord:    { id: 'user-comm-sj-00001', email: 'coord.comunidade@catequese.com',    firstName: 'Coord.',     role: 'COMMUNITY_COORDINATOR',parish: 'São José',isAdmin: false },
  leadCatechist:     { id: 'user-lead-sj-00001', email: 'catequista.lead@catequese.com',     firstName: 'Catequista', role: 'LEAD_CATECHIST',      parish: 'São José',   isAdmin: false },
  assistantCatechist:{ id: 'user-aux-sj-000001', email: 'catequista.aux@catequese.com',      firstName: 'Catequista', role: 'ASSISTANT_CATECHIST',  parish: 'São José',   isAdmin: false },
  catechistSantaMaria:{ id: 'user-lead-sm-00001', email: 'catequista.sta@catequese.com',     firstName: 'Catequista', role: 'LEAD_CATECHIST',      parish: 'Santa Maria',isAdmin: false },
  guardian:          { id: 'user-guard-0000001', email: 'responsavel@catequese.com',         firstName: 'Responsável', role: 'GUARDIAN',           parish: 'São José',   isAdmin: false },
  catechumen:        { id: 'user-catech-000001', email: 'catequizando@catequese.com',        firstName: 'Catequizando', role: 'CATECHUMEN',         parish: 'São José',   isAdmin: false },
  multirole:         { id: 'user-multi-0000001', email: 'multirole@catequese.com',           firstName: 'Multi',      role: 'MULTI',              parish: 'S.José/S.M.',isAdmin: false },
  catechistNoClass:  { id: 'user-lead-notur-001', email: 'catequista.sem.turma@catequese.com', firstName: 'Catequista', role: 'LEAD_CATECHIST',   parish: 'São José',   isAdmin: false },
};

/**
 * Log in as a specific user and return the page.
 * Assumes the login page is at /login.
 */
export async function loginAs(page: Page, userKey: keyof typeof USERS) {
  const user = USERS[userKey];
  
  // Clear any existing session
  await page.context().clearCookies();
  
  await page.goto('/login');
  
  // If already logged in (redirected to app), we're done
  if (page.url().includes('/app')) {
    return;
  }
  
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
  
  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill(user.email);
  
  // Fill password
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(PASSWORD);
  
  // Click login button and wait for navigation simultaneously
  const loginButton = page.locator('button[type="submit"]').first();
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 15000 }),
    loginButton.click(),
  ]).catch(async () => {
    // If the form shows an error, screenshot for debugging
    await page.screenshot({ path: `/tmp/login-error-${userKey}.png` });
    throw new Error(`Login failed for ${user.email}`);
  });
  
  // If onboarding appears (non-admin users first time), skip it
  // But for our seed data, users already have memberships so onboarding should be skipped
  // except for users who may have been created without memberships
}

/**
 * Custom test fixture that provides a logged-in page.
 */
export const test = base.extend<{ userKey: keyof typeof USERS }>({
  userKey: ['coordSaoJose', { option: true }],
  
  page: async ({ page, userKey }, use) => {
    await loginAs(page, userKey);
    await use(page);
  },
});

export { expect } from '@playwright/test';
