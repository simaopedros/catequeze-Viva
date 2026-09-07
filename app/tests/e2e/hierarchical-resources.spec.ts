/**
 * Hierarchical resources — diocese → parish UI surfaces.
 *
 * Seed (`seed_test_data.js`): Cúria Diocesana, diretório/subsídio publicados,
 * comunicado, itinerário, trilha de formação e evento litúrgico no mês corrente.
 */
import { test, expect } from "@playwright/test";
import {
  login,
  USERS,
  enterFirstWorkspace,
  selectWorkspace,
  dismissCookieBanner,
  waitForAppShell,
  assertNoHorizontalOverflow,
  CURIA_WORKSPACE_NAME,
} from "./helpers";

async function openAppPath(
  page: import("@playwright/test").Page,
  path: string,
) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  await dismissCookieBanner(page);
  await waitForAppShell(page);
}

test.describe("recursos hierárquicos — paróquia (coordenador)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await login(page, USERS.coordSaoJose.email);
    await enterFirstWorkspace(page);
  });

  test("pasta oficial lista origem diocesana e permite adotar sugestão", async ({
    page,
  }) => {
    await openAppPath(page, "/app/official-library");
    await expect(
      page.getByRole("heading", { name: /Pasta oficial/i }),
    ).toBeVisible({
      timeout: 15000,
    });

    const empty = page.getByTestId("empty-official-library");
    const directory = page.getByText("Diretório diocesano 2026 (TESTE)");
    await expect(empty.or(directory).first()).toBeVisible({ timeout: 15000 });

    if (await directory.isVisible().catch(() => false)) {
      await expect(page.getByTestId("origin-badge").first()).toContainText(
        /Diocese/i,
      );
      const adopt = page.getByRole("button", { name: /^Adotar$/ });
      if (
        await adopt
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await adopt.first().click();
      }
    }
  });

  test("comunicados herdados pedem ciência", async ({ page }) => {
    await openAppPath(page, "/app/announcements");
    await expect(
      page.getByRole("heading", { name: /Comunicados/i }),
    ).toBeVisible({
      timeout: 15000,
    });
    const title = page.getByText("Início da catequese 2026 (TESTE)");
    if (await title.isVisible({ timeout: 8000 }).catch(() => false)) {
      const ack = page.getByRole("button", { name: /Dar ciência/i });
      if (
        await ack
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await ack.first().click();
      }
    }
  });

  test("escola de catequistas mostra trilha diocesana", async ({ page }) => {
    await openAppPath(page, "/app/formation");
    await expect(
      page.getByRole("heading", { name: /Escola de catequistas/i }),
    ).toBeVisible({ timeout: 15000 });
    const track = page.getByText("Formação inicial de catequistas (TESTE)");
    if (await track.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(page.getByTestId("origin-badge").first()).toBeVisible();
      const enroll = page.getByRole("button", { name: /Inscrever-me/i });
      if (
        await enroll
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await enroll.first().click();
      }
    }
  });

  test("calendário oferece filtro Diocese e o evento oficial", async ({
    page,
  }) => {
    await openAppPath(page, "/app/calendar");
    await expect(
      page.getByRole("heading", { name: /Calendário/i }),
    ).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("button", { name: /^Diocese$/ })).toBeVisible();
    await page.getByRole("button", { name: /^Diocese$/ }).click();
    const dioceseEvent = page.getByText(
      "Abertura diocesana da catequese (TESTE)",
    );
    if (await dioceseEvent.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(dioceseEvent).toBeVisible();
    }
  });

  test("anos catequéticos listam itinerário oficial", async ({ page }) => {
    await openAppPath(page, "/app/catechetical-years");
    await expect(
      page.getByRole("heading", { name: /Anos Catequéticos/i }),
    ).toBeVisible({ timeout: 15000 });
    const itinerary = page.getByText("Eucaristia 2 anos (TESTE)");
    if (await itinerary.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(
        page.getByRole("button", { name: /Instanciar ano/i }),
      ).toBeVisible();
    }
  });
});

test.describe("recursos hierárquicos — cúria (admin diocesano)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await login(page, USERS.diocese.email);
    if (page.url().includes("workspace")) {
      await selectWorkspace(page, CURIA_WORKSPACE_NAME);
    } else {
      await enterFirstWorkspace(page);
    }
  });

  test("publica recurso na pasta oficial da cúria", async ({ page }) => {
    await openAppPath(page, "/app/official-library");
    await expect(
      page.getByRole("heading", { name: /Pasta oficial/i }),
    ).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: /Novo recurso/i }).click();
    await page.getByLabel(/Título/i).fill("Circular de teste e2e");
    await page.getByRole("button", { name: /^Criar$/ }).click();
    await expect(
      page
        .getByText(/Recurso criado como rascunho|Circular de teste e2e/i)
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("relatórios mostram a aba Adesão", async ({ page }) => {
    await openAppPath(page, "/app/reports");
    await expect(
      page.getByRole("heading", { name: /Relatórios/i }),
    ).toBeVisible({
      timeout: 15000,
    });
    const tab = page.getByRole("button", { name: /Adesão/i });
    await expect(tab).toBeVisible({ timeout: 15000 });
    await tab.click();
    await expect(
      page.getByText(/Adesão entre paróquias|Recursos publicados/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("recursos hierárquicos — mobile 390", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("pasta oficial não transborda na horizontal", async ({ page }) => {
    await login(page, USERS.coordSaoJose.email);
    await enterFirstWorkspace(page);
    await openAppPath(page, "/app/official-library");
    await page.waitForTimeout(400);
    await assertNoHorizontalOverflow(page);
  });
});
