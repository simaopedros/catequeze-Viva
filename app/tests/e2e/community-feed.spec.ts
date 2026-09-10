/**
 * Comunidade / Rhema.
 *
 * The suite follows SOCIAL_FEATURES_ENABLED: while the flag is off every
 * route must redirect away and the sidebar must not offer the item. With the
 * flag on, the public feed, Shorts, Para você and public profiles are exercised.
 */
import { test, expect, type Page } from "@playwright/test";
import { SOCIAL_FEATURES_ENABLED } from "../../src/shared/socialFeatures";
import { dismissCookieBanner, login, USERS } from "./helpers";

async function openPublicFeed(page: Page) {
  await page.goto("/comunidade");
  await page.waitForLoadState("domcontentloaded");
  await dismissCookieBanner(page);
}

test.describe("Comunidade — módulo desabilitado", () => {
  test.skip(SOCIAL_FEATURES_ENABLED, "Comunidade está habilitada");

  test("/comunidade redireciona para a landing", async ({ page }) => {
    await openPublicFeed(page);

    await expect(page).not.toHaveURL(/\/comunidade/);
  });

  test("/comunidade/p/:slug redireciona para a landing", async ({ page }) => {
    await page.goto("/comunidade/p/qualquer-slug");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).not.toHaveURL(/\/comunidade/);
  });

  test("/c/:slug redireciona para fora do feed", async ({ page }) => {
    const response = await page.goto("/c/qualquer-slug");
    expect(response?.status()).toBeLessThan(500);

    await expect(page).not.toHaveURL(/\/comunidade/);
  });

  test("/app/comunidade volta para o painel", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).not.toHaveURL(/\/app\/comunidade/);
  });

  test("o menu lateral não oferece Comunidade", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('a[href="/app/comunidade"]')).toHaveCount(0);
  });
});

test.describe("Comunidade — visitante anônimo", () => {
  test.skip(!SOCIAL_FEATURES_ENABLED, "Comunidade está desabilitada");

  test("abre o feed público sem login", async ({ page }) => {
    await openPublicFeed(page);

    await expect(page.getByRole("heading", { name: /comunidade/i })).toBeVisible();
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

    await expect(page.getByRole("button", { name: /^publicar$/i })).toHaveCount(0);
  });
});

test.describe("Comunidade — membro autenticado", () => {
  test.skip(!SOCIAL_FEATURES_ENABLED, "Comunidade está desabilitada");

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

    expect((await composer.count()) === 0 || (await upsell.count()) === 0).toBe(true);
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

  test("mostra as abas Para você e Shorts", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade");
    await page.waitForLoadState("domcontentloaded");

    const foryou = page.getByRole("tab", { name: /para você/i });
    await expect(foryou).toBeVisible();
    await foryou.click();
    await expect(foryou).toHaveAttribute("aria-selected", "true");

    const shorts = page.getByRole("tab", { name: /^shorts$/i });
    await shorts.click();
    await expect(shorts).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("Comunidade — perfil público", () => {
  test.skip(!SOCIAL_FEATURES_ENABLED, "Comunidade está desabilitada");

  test("handle inexistente mostra perfil não encontrado", async ({ page }) => {
    await page.goto("/comunidade/u/handle-que-nao-existe");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page.getByText(/perfil não encontrado/i)).toBeVisible();
  });
});
