/**
 * E2E Test Helpers — Login, navigation, and data constants.
 *
 * All test users from seed_test_data.js. Password: Teste@123
 */
import { Page, expect } from "@playwright/test";

// ═══ Base URL ═══════════════════════════════════════════════════════════════
export const BASE = process.env.BASE_URL || "http://localhost:3000";

// ═══ Test users ═════════════════════════════════════════════════════════════
export const USERS = {
  admin: { email: "admin@catequese.com", role: "Super Admin" },
  diocese: { email: "diocese@catequese.com", role: "Diocese Admin" },
  coordSaoJose: {
    email: "coord.saojose@catequese.com",
    role: "Coordenador São José",
  },
  coordSantaMaria: {
    email: "coord.santamaria@catequese.com",
    role: "Coordenador Santa Maria",
  },
  communityCoord: {
    email: "coord.comunidade@catequese.com",
    role: "Coordenador Comunidade",
  },
  leadCatechist: {
    email: "catequista.lead@catequese.com",
    role: "Catequista Lead",
  },
  assistantCatechist: {
    email: "catequista.aux@catequese.com",
    role: "Catequista Auxiliar",
  },
  catechistSantaMaria: {
    email: "catequista.sta@catequese.com",
    role: "Catequista Santa Maria",
  },
  guardian: { email: "responsavel@catequese.com", role: "Responsável" },
  catechumen: { email: "catequizando@catequese.com", role: "Catequizando" },
  multirole: { email: "multirole@catequese.com", role: "Multi-role" },
  reviewer: { email: "revisor@catequese.com", role: "Revisor" },
  viewer: { email: "visitante@catequese.com", role: "Visitante" },
  catechistNoClass: {
    email: "catequista.sem.turma@catequese.com",
    role: "Catequista sem Turma",
  },
};

export const PASSWORD = "Teste@123";

// ═══ Login ═══════════════════════════════════════════════════════════════════
/** Remove vanilla-cookieconsent overlay so it cannot block pointer events in e2e. */
export async function dismissCookieBanner(page: Page) {
  await page
    .evaluate(() => {
      document.getElementById("cc-main")?.remove();
      document
        .querySelectorAll('.cm-wrapper, .cm--box, [class*="cm__"]')
        .forEach((el) => el.remove());
      // Guided tour full-screen overlay (blocks bottom nav taps)
      document
        .querySelectorAll(
          '.fixed.inset-0.z-\\[100\\], .fixed.inset-0[class*="z-[100]"]',
        )
        .forEach((el) => el.remove());
      document
        .querySelectorAll("[data-tour-overlay]")
        .forEach((el) => el.remove());
    })
    .catch(() => {});
}

export async function login(page: Page, email: string, password = PASSWORD) {
  // Prevent cookie banner + guided tour overlay from blocking e2e clicks
  await page.addInitScript(() => {
    try {
      document.cookie =
        "cc_cookie=" +
        encodeURIComponent(
          JSON.stringify({
            categories: ["necessary"],
            revision: 0,
            data: null,
            rfc_cookie: true,
          }),
        ) +
        "; path=/; max-age=31536000; SameSite=Lax";
      localStorage.setItem("catequese-tour-seen", "true");
      localStorage.setItem("cv-soft-upgrade-dismissed", "1");
      localStorage.setItem("cv-activation-checklist-dismissed", "1");
    } catch {
      /* ignore */
    }
  });
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await dismissCookieBanner(page);

  // Already authenticated (warm session) → skip form
  if (/\/app|\/workspace-selector/.test(page.url())) {
    return;
  }

  // Email/password form is behind "Continuar com email" (Google-first login UI)
  const emailField = page.locator('input[type="email"], input[name="email"]');
  if (
    !(await emailField
      .first()
      .isVisible({ timeout: 4000 })
      .catch(() => false))
  ) {
    // Exact product copy on login page (pt-BR / en)
    const continueWithEmail = page.getByRole("button", {
      name: /Continuar com email|Continue with email|Continuar con correo/i,
    });
    await continueWithEmail.click({ timeout: 15000 });
  }
  await dismissCookieBanner(page);
  await emailField.first().waitFor({ state: "visible", timeout: 20000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await dismissCookieBanner(page);
  await page
    .locator('button[type="submit"]')
    .click({ force: true, timeout: 15000 });
  // Wait for navigation to app
  await page.waitForURL(/\/app|\/workspace-selector/, { timeout: 20000 });
}

export async function logout(page: Page) {
  await page.goto("/app");
  // Look for user menu / logout button
  const userMenu = page.locator(
    '[data-testid="user-menu"], button:has-text("Sair")',
  );
  if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await userMenu.click();
  }
  const logoutBtn = page.locator(
    'button:has-text("Sair"), a:has-text("Sair"), [data-testid="logout"]',
  );
  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutBtn.click();
  }
  await page.waitForURL(/\/login|\//, { timeout: 10000 });
}

// ═══ Navigation helpers ══════════════════════════════════════════════════════
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
}

export async function selectWorkspace(page: Page, workspaceName?: string) {
  // If redirected to workspace selector
  if (page.url().includes("workspace")) {
    if (workspaceName) {
      await page.click(`button:has-text("${workspaceName}")`);
    } else {
      // Click the first available workspace button
      await page.click('button:has-text("Catequese de")');
    }
    await page.waitForURL(/\/app/, { timeout: 10000 });
  }
}

/** Switch the header workspace picker when already inside /app. */
export async function ensureWorkspace(page: Page, workspaceName: string) {
  if (page.url().includes("workspace")) {
    await selectWorkspace(page, workspaceName);
    await dismissCookieBanner(page);
    return;
  }
  await waitForAppShell(page);
  const trigger = page.getByTestId("workspace-context-trigger");
  await expect(trigger).toBeVisible({ timeout: 15000 });
  const current = (await trigger.innerText()) || "";
  if (current.includes(workspaceName)) return;

  await trigger.click();
  const option = page
    .locator("[data-radix-menu-content] button, [role='menu'] button")
    .filter({ hasText: workspaceName })
    .first();
  await option.click({ timeout: 10000 });
  await expect(trigger).toContainText(workspaceName, { timeout: 10000 });
}

// ═══ Assertions ══════════════════════════════════════════════════════════════
export async function expectToast(page: Page, text: string) {
  const toast = page.locator('[role="status"], [data-testid="toast"], .toast');
  await expect(toast.first()).toContainText(text, { timeout: 10000 });
}

export async function expectPageTitle(page: Page, title: string) {
  await expect(page.locator("h1, h2").first()).toContainText(title, {
    timeout: 10000,
  });
}

// ═══ Seed data IDs ═══════════════════════════════════════════════════════════
export const PARISH_SAO_JOSE = "aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa";
export const PARISH_SANTA_MARIA = "bbbbbbbb-2222-4bbb-b222-bbbbbbbbbbbb";
export const WORKSPACE_CURIA = "99999999-9999-4999-a999-999999999999";
export const CURIA_WORKSPACE_NAME = "Cúria Diocesana (TESTE)";
export const CLASS_CRISMA = "test-class-crisma-001";
export const CLASS_INFANTIL = "test-class-infantil-001";
export const CLASS_EUCARISTIA = "test-class-eucaristia-001";

/** Seeded meetings (`seed_test_data.js`) for encounter mobile e2e */
export const MEETING_CRISMA_1 = "test-meeting-crisma-01";
export const MEETING_CRISMA_2 = "test-meeting-crisma-02";
export const MEETING_INFANTIL_1 = "test-meeting-infantil-01";

/** Enter first available workspace after login (shared by nav / encounter specs). */
export async function enterFirstWorkspace(page: Page) {
  if (page.url().includes("workspace") || page.url().includes("select")) {
    const btn = page
      .locator(
        'button:has-text("Catequese"), button:has-text("Meu Espaço"), button:has-text("São José"), a:has-text("Entrar")',
      )
      .first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await page.waitForURL(/\/app/, { timeout: 15000 }).catch(() => {});
    }
  }
  await page.goto("/app");
  await page.waitForLoadState("domcontentloaded");
  await dismissCookieBanner(page);
}

// ═══ UX / layout assertions ═════════════════════════════════════════════════

/** Acceptance viewports from the UI/UX brief */
export const UX_VIEWPORTS = [
  { name: "iphone-se", width: 320, height: 568 },
  { name: "android-360", width: 360, height: 800 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

/**
 * Fail if document width exceeds viewport by more than `slackPx`
 * (involuntary horizontal scroll).
 */
export async function assertNoHorizontalOverflow(
  page: Page,
  slackPx = 2,
): Promise<void> {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: Math.max(doc.scrollWidth, body?.scrollWidth || 0),
      innerWidth: window.innerWidth,
    };
  });
  expect(
    metrics.scrollWidth,
    `horizontal overflow: scrollWidth=${metrics.scrollWidth} clientWidth=${metrics.clientWidth}`,
  ).toBeLessThanOrEqual(metrics.clientWidth + slackPx);
}

/**
 * Sample visible interactive controls in mobile bottom nav / main sheet
 * and assert min height ~44 CSS px. Skips skip-links and off-screen nodes.
 */
export async function assertPrimaryTouchTargets(
  page: Page,
  opts?: { min?: number; sample?: number },
): Promise<void> {
  const min = opts?.min ?? 44;
  const sample = opts?.sample ?? 12;
  const undersized = await page.evaluate(
    ({ minSize, sampleSize }) => {
      // Prefer operational chrome: fixed bottom nav + main content primary buttons
      const roots = [
        document.querySelector("nav.fixed"),
        document.querySelector("main"),
        document.querySelector("#main-content"),
      ].filter(Boolean) as Element[];
      const nodes: Element[] = [];
      for (const root of roots) {
        nodes.push(
          ...Array.from(
            root.querySelectorAll(
              'a[href], button:not([disabled]), [role="button"]',
            ),
          ),
        );
      }
      const bad: string[] = [];
      let checked = 0;
      for (const el of nodes) {
        if (checked >= sampleSize) break;
        const href = el.getAttribute("href") || "";
        if (href.startsWith("#")) continue; // skip links
        const style = window.getComputedStyle(el);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.pointerEvents === "none"
        ) {
          continue;
        }
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        checked++;
        // Height matters most for thumb targets in lists
        if (r.height + 0.5 < minSize) {
          const label =
            (el as HTMLElement).innerText?.trim().slice(0, 40) ||
            el.getAttribute("aria-label") ||
            el.tagName;
          bad.push(`${label} (${Math.round(r.width)}×${Math.round(r.height)})`);
        }
      }
      return { checked, bad };
    },
    { minSize: min, sampleSize: sample },
  );
  expect(
    undersized.bad.length,
    `undersized targets: ${undersized.bad.join("; ")}`,
  ).toBeLessThanOrEqual(2);
}

/** Mobile bottom "Mais" trigger (not header overflow menus). */
export function bottomMoreButton(page: Page) {
  return page.locator('[aria-controls="bottom-sheet-nav"]').first();
}

/** Mobile bottom nav (fixed; sidebar is hidden on small screens). */
export function mobileBottomNav(page: Page) {
  return page.locator("nav.fixed").filter({
    has: page.locator('[aria-controls="bottom-sheet-nav"]'),
  });
}

/** Wait for main app chrome after login */
export async function waitForAppShell(page: Page) {
  await page
    .locator('#main-content, main, [data-tour="dashboard-stats"]')
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await dismissCookieBanner(page);
}
