import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'tests/e2e/report' }], ['list']],
  timeout: 60000,
  expect: { timeout: 15000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // Prefer an already-running app (local dev). Set SKIP_WEBSERVER=0 to force spawn.
  webServer: process.env.SKIP_WEBSERVER === '0'
    ? {
        command: 'npx wasp start',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 180000,
        cwd: process.cwd(),
      }
    : undefined,
});
