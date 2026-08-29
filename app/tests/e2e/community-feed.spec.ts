/**
 * Comunidade — the public feed must work without an account, and publishing
 * must stay behind an active subscription.
 */
import { test, expect, type Page } from "@playwright/test";
import { dismissCookieBanner, login, USERS } from "./helpers";

async function openPublicFeed(page: Page) {
  await page.goto("/comunidade");
  await page.waitForLoadState("domcontentloaded");
  await dismissCookieBanner(page);
}

test.describe("Comunidade — visitante anônimo", () => {
  test("abre o feed público sem login", async ({ page }) => {
    await openPublicFeed(page);

    await expect(page.getByRole("heading", { name: /comunidade/i })).toBeVisible();
    // Never bounced to the login screen.
    await expect(page).toHaveURL(/\/comunidade$/);
  });

  test("filtra por tema pela URL", async ({ page }) => {
    await page.goto("/comunidade/t/liturgia");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(/\/comunidade\/t\/liturgia$/);
    await expect(page.getByRole("heading", { name: /comunidade/i })).toBeVisible();
  });

  test("não mostra o composer", async ({ page }) => {
    await openPublicFeed(page);

    await expect(
      page.getByRole("button", { name: /^publicar$/i }),
    ).toHaveCount(0);
  });

  test("/c/:slug redireciona o navegador para a página do post", async ({ page }) => {
    const response = await page.goto("/c/post-inexistente-999");
    expect(response?.status()).toBeLessThan(500);
    // Unknown slugs land back on the feed rather than erroring out.
    await expect(page).toHaveURL(/\/comunidade/);
  });
});

test.describe("Comunidade — membro autenticado", () => {
  test("acessa o feed pelo menu do app", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/app\/comunidade/);
    await expect(page.getByRole("heading", { name: /comunidade/i })).toBeVisible();
  });

  test("vê o composer ou o convite para assinar, nunca os dois", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade");
    await page.waitForLoadState("domcontentloaded");

    const composer = page.getByRole("button", { name: /^publicar$/i });
    const upsell = page.getByRole("link", { name: /ver planos|entrar/i });

    await expect
      .poll(async () => (await composer.count()) + (await upsell.count()), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);

    const composerCount = await composer.count();
    const upsellCount = await upsell.count();
    expect(composerCount === 0 || upsellCount === 0).toBe(true);
  });

  test("alterna entre Recentes, Em alta e De quem eu sigo", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade");
    await page.waitForLoadState("domcontentloaded");

    const trending = page.getByRole("tab", { name: /em alta/i });
    await expect(trending).toBeVisible();
    await trending.click();
    await expect(trending).toHaveAttribute("aria-selected", "true");

    const following = page.getByRole("tab", { name: /de quem eu sigo/i });
    await following.click();
    await expect(following).toHaveAttribute("aria-selected", "true");
  });
});
