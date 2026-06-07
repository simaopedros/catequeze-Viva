/**
 * Captura screenshots reais da aplicação para a landing page.
 *
 * Pré-requisitos:
 *   1. Banco de dados com seed de teste (usuários E2E)
 *   2. Servidor rodando: `wasp start` (ou deixe o webServer do Playwright iniciar)
 *
 * Uso:
 *   cd app
 *   npx playwright test capture-landing-screenshots --project=chromium
 *
 * Saída:
 *   public/landing/{id}-light.webp
 *   public/landing/{id}-dark.webp
 */
import { mkdirSync } from 'fs';
import { join } from 'path';
import { test } from '@playwright/test';
import { login, USERS } from './helpers';

const OUTPUT_DIR = join(process.cwd(), 'public', 'landing');

const CAPTURES = [
  {
    id: 'dashboard',
    path: '/app',
    email: USERS.coordSaoJose.email,
    waitFor: 'text=Painel',
  },
  {
    id: 'attendance',
    path: '/app/classes',
    email: USERS.leadCatechist.email,
    waitFor: 'text=Turmas',
  },
  {
    id: 'sacraments',
    path: '/app/sacraments',
    email: USERS.coordSaoJose.email,
    waitFor: 'text=Sacramentos',
  },
  {
    id: 'library',
    path: '/app/content-library',
    email: USERS.leadCatechist.email,
    waitFor: 'text=Biblioteca',
  },
  {
    id: 'ai-planner',
    path: '/app/ai-planner',
    email: USERS.leadCatechist.email,
    waitFor: 'text=Gerador',
  },
  {
    id: 'family-portal',
    path: '/app',
    email: USERS.guardian.email,
    waitFor: 'text=Portal',
  },
] as const;

test.describe.configure({ mode: 'serial' });

test.describe('capture landing screenshots', () => {
  test.beforeAll(() => {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  for (const capture of CAPTURES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${capture.id} (${theme})`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.emulateMedia({ colorScheme: theme });

        if (theme === 'dark') {
          await page.addInitScript(() => {
            document.documentElement.classList.add('dark');
          });
        }

        await login(page, capture.email);
        await page.goto(capture.path);
        await page.waitForLoadState('networkidle');

        try {
          await page.getByText(capture.waitFor, { exact: false }).first().waitFor({ timeout: 10000 });
        } catch {
          // Continua mesmo se o seletor de texto não for encontrado — captura o que estiver visível
        }

        await page.screenshot({
          path: join(OUTPUT_DIR, `${capture.id}-${theme}.webp`),
          type: 'webp',
          fullPage: false,
        });
      });
    }
  }
});
