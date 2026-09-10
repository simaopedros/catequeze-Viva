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

    await expect(page.getByTestId("community-hero")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /juntos na missão/i }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/comunidade$/);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        x: doc.scrollWidth - doc.clientWidth,
        title: document.title,
      };
    });
    expect(overflow.x).toBeLessThan(8);
    expect(overflow.title.toLowerCase()).toMatch(/comunidade/);
  });

  test("filtra por tema pela URL", async ({ page }) => {
    await page.goto("/comunidade/t/liturgia");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(/\/comunidade\/t\/liturgia$/);
    await expect(page.getByTestId("community-hero")).toBeVisible();
  });

  test("não mostra o composer", async ({ page }) => {
    await openPublicFeed(page);

    await expect(page.getByRole("button", { name: /^publicar$/i })).toHaveCount(
      0,
    );
  });

  test("alterna Para você, Recentes e Em alta", async ({ page }) => {
    await openPublicFeed(page);

    const foryou = page.getByRole("tab", { name: /para você/i });
    const recent = page.getByRole("tab", { name: /recentes/i });
    const trending = page.getByRole("tab", { name: /em alta/i });

    await expect(foryou).toHaveAttribute("aria-selected", "true");
    await recent.click();
    await expect(recent).toHaveAttribute("aria-selected", "true");
    await trending.click();
    await expect(trending).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tab", { name: /de quem eu sigo/i }),
    ).toHaveCount(0);
  });
});

test.describe("Comunidade — membro autenticado", () => {
  test.skip(!SOCIAL_FEATURES_ENABLED, "Comunidade está desabilitada");

  test("acessa o feed pelo menu do app", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/app\/comunidade/);
    await expect(page.getByTestId("community-hero")).toBeVisible();
  });

  test("vê o composer ou o convite para assinar, nunca os dois", async ({
    page,
  }) => {
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

    expect((await composer.count()) === 0 || (await upsell.count()) === 0).toBe(
      true,
    );
  });

  test("alterna entre Recentes, Em alta e De quem eu sigo", async ({
    page,
  }) => {
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

  test("filtra por tema sem sair do shell do app", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade/t/liturgia");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/app\/comunidade\/t\/liturgia$/);
    await expect(page.getByTestId("community-hero")).toBeVisible();
  });

  test("permalink de post inexistente fica no app", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade/p/slug-que-nao-existe");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/app\/comunidade\/p\/slug-que-nao-existe/);
    await expect(page.getByText(/não encontrad/i)).toBeVisible();
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

  test("permalink inexistente mostra publicação não encontrada", async ({
    page,
  }) => {
    await page.goto("/comunidade/p/slug-que-nao-existe");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page.getByText(/não encontrad/i)).toBeVisible();
  });

  test("handle inexistente mostra perfil não encontrado", async ({ page }) => {
    await page.goto("/comunidade/u/handle-que-nao-existe");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page.getByText(/perfil não encontrado/i)).toBeVisible();
  });
});

async function openNativeShare(page: Page) {
  await dismissCookieBanner(page);
  const share = page.getByTestId("share-to-community").first();
  await expect(share).toBeVisible({ timeout: 20000 });
  await share.click({ force: true });
}

test.describe("Comunidade — partilha nativa e perfil", () => {
  test.skip(!SOCIAL_FEATURES_ENABLED, "Comunidade está desabilitada");

  test("assinante partilha um versículo pelo diálogo nativo", async ({
    page,
  }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/bible?ref=Jo%C3%A3o%203:16");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);
    await expect(page.getByTestId("share-to-community").first()).toBeVisible({
      timeout: 20000,
    });

    await openNativeShare(page);

    await expect(
      page.getByRole("heading", { name: /partilhar na comunidade/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^publicar$/i })).toBeVisible(
      {
        timeout: 15000,
      },
    );
  });

  test("assinante partilha uma entrada do Catecismo", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/catechism?entry=1");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(
      page.getByText(/Deus, infinitamente perfeito/i).first(),
    ).toBeVisible({ timeout: 20000 });
    await openNativeShare(page);
    await expect(
      page.getByRole("heading", { name: /partilhar na comunidade/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^publicar$/i })).toBeVisible(
      {
        timeout: 15000,
      },
    );
  });

  test("plano gratuito vê o rascunho e o convite para assinar", async ({
    page,
  }) => {
    await login(page, USERS.communityFree.email);

    await page.goto("/app/directory?entry=1");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page.getByText(/a catequese pertence/i).first()).toBeVisible({
      timeout: 20000,
    });
    await openNativeShare(page);
    await expect(
      page.getByRole("heading", { name: /partilhar na comunidade/i }),
    ).toBeVisible();
    await expect(page.getByText(/assine para publicar/i)).toBeVisible();
    await expect(
      page.getByText(/texto pronto para a publicação/i),
    ).toBeVisible();
  });

  test("assinante partilha um documento da biblioteca", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/content-library");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(
      page.getByText(/lição sobre o espírito santo/i).first(),
    ).toBeVisible({ timeout: 20000 });
    await openNativeShare(page);
    await expect(
      page.getByRole("heading", { name: /partilhar na comunidade/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^publicar$/i })).toBeVisible(
      {
        timeout: 15000,
      },
    );
  });

  test("perfil autenticado oferece seguir e o @", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade/u/coord_saojose");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(/@coord_saojose/i)).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole("button", { name: /^seguir$/i })).toBeVisible();
  });

  test("link público /u/:handle abre o perfil no shell autenticado", async ({
    page,
  }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/u/coord_saojose");
    await page.waitForURL(/\/app\/comunidade\/u\/coord_saojose/, {
      timeout: 20000,
    });
    await expect(page.getByText(/@coord_saojose/i)).toBeVisible();
  });

  test("settings mostram o @ e permitem copiar o link público", async ({
    page,
  }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByLabel(/nome de usuário/i)).toHaveValue(
      "catequista_lead",
    );
    await expect(
      page.getByRole("button", { name: /copiar link do perfil/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /trocar foto/i }),
    ).toBeVisible();
    await expect(page.getByTestId("social-avatar-input")).toHaveAttribute(
      "accept",
      /image\/(jpeg|png|webp)/,
    );

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await page.getByTestId("social-avatar-input").setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(page.getByText(/foto atualizada/i)).toBeVisible({
      timeout: 20000,
    });
  });

  test("assinante bloqueia e desbloqueia um perfil", async ({ page }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/comunidade/u/coord_saojose");
    await page.waitForLoadState("domcontentloaded");
    await dismissCookieBanner(page);

    await expect(page.getByText(/@coord_saojose/i)).toBeVisible({
      timeout: 20000,
    });

    const toggle = page.getByTestId("social-block-toggle");
    if (/desbloquear/i.test((await toggle.innerText()) || "")) {
      await toggle.click();
      await expect(toggle).toHaveText(/bloquear/i, { timeout: 15000 });
    }
    await expect(toggle).toHaveText(/bloquear/i);
    await toggle.click();

    await expect(page.getByText(/você bloqueou/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(toggle).toHaveText(/desbloquear/i);
    await expect(
      page.getByText(
        /posts ficam ocultos|publicações ficam ocultas|bloqueou esta conta/i,
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^seguir$/i })).toHaveCount(
      0,
    );

    await toggle.click();
    await expect(page.getByText(/você desbloqueou/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(toggle).toHaveText(/bloquear/i);
    await expect(page.getByRole("button", { name: /^seguir$/i })).toBeVisible();
  });

  test("o diálogo de partilha fica acima do banner de cookies", async ({
    page,
  }) => {
    await login(page, USERS.leadCatechist.email);

    await page.goto("/app/bible?ref=Jo%C3%A3o%203:16");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("share-to-community").first()).toBeVisible({
      timeout: 20000,
    });

    await page.getByTestId("share-to-community").first().click({ force: true });
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: /partilhar na comunidade/i }),
    ).toBeVisible();

    const stacking = await page.evaluate(() => {
      const dialogEl = document.querySelector('[data-slot="dialog-content"]');
      const banner = document.getElementById("cc-main");
      if (!dialogEl) return { dialogZ: 0, bannerZ: 0, bannerHidden: true };
      const dialogZ = Number.parseFloat(getComputedStyle(dialogEl).zIndex) || 0;
      const bannerZ = banner
        ? Number.parseFloat(getComputedStyle(banner).zIndex) || 0
        : 0;
      const bannerHidden =
        !banner || getComputedStyle(banner).visibility === "hidden";
      return { dialogZ, bannerZ, bannerHidden };
    });

    expect(stacking.dialogZ).toBeGreaterThan(0);
    expect(stacking.bannerHidden || stacking.dialogZ > stacking.bannerZ).toBe(
      true,
    );
  });
});
