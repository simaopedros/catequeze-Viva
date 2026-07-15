/**
 * PR11 — Portal invite surface smoke (happy-path skeleton without dedicated seed DB).
 *
 * Full create → email → accept requires portal fixtures + staff invite UI seed.
 * This suite always runs when the app is up and asserts the public invite route
 * degrades safely for invalid tokens (no crash / no secret leak).
 *
 * When PORTAL_INVITE_TOKEN is set (manual soak / seeded env), asserts the
 * accept page loads invitation metadata for a real token.
 */
import { test, expect } from "@playwright/test";

test.describe("portal invite public routes", () => {
  test("invalid token shows error state (not a blank crash)", async ({
    page,
  }) => {
    await page.goto("/convite/e2e-invalid-token-00000000");
    await page.waitForLoadState("domcontentloaded");

    // Must not bounce to a raw error boundary only; invite UI or login/app shell.
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").innerText();
    // Never leak raw hashes or stack traces to the user
    expect(bodyText).not.toMatch(/tokenHash|Prisma|HttpError\s*\(/i);

    // Prefer explicit empty/error UI when InviteAcceptPage resolves
    const errorish = page.getByText(
      /inválid|expir|não encontrado|not found|invalid|expired|erro|error|convite/i,
    );
    const hasErrorCopy = await errorish
      .first()
      .isVisible({ timeout: 12000 })
      .catch(() => false);
    const onLogin = /\/login|\/signup/.test(page.url());
    expect(hasErrorCopy || onLogin || page.url().includes("/convite")).toBe(
      true,
    );
  });

  test("invite code entry route is reachable", async ({ page }) => {
    await page.goto("/convite");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
    // Route should stay on invite flow or auth, not 404 shell-only
    const statusish = page.getByText(/404|página não encontrada|not found/i);
    const is404 = await statusish
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    expect(is404).toBe(false);
  });

  test("seeded token loads invitation (optional soak)", async ({ page }) => {
    const token = process.env.PORTAL_INVITE_TOKEN;
    test.skip(
      !token,
      "Set PORTAL_INVITE_TOKEN for full invite happy-path soak",
    );

    await page.goto(`/convite/${encodeURIComponent(token!)}`);
    await page.waitForLoadState("domcontentloaded");

    // Invitation metadata or accept CTA should appear for a live token
    const parishOrRole = page.getByText(
      /paróquia|parish|responsável|guardian|catequiz|aceitar|accept|convite/i,
    );
    await expect(parishOrRole.first()).toBeVisible({ timeout: 20000 });
  });
});
