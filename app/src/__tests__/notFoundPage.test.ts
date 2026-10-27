import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

describe("not found page", () => {
  it("exposes a setter and a hook for the not-found state", async () => {
    const mod = await import("../client/notFoundState");
    expect(typeof mod.useNotFoundActive).toBe("function");
    expect(() => {
      mod.setNotFoundActive(true);
      mod.setNotFoundActive(true);
      mod.setNotFoundActive(false);
    }).not.toThrow();
  });

  it("hides the app NavBar while NotFoundPage renders its own header", () => {
    const app = readFileSync(join(root, "client/App.tsx"), "utf8");
    expect(app).toContain("useNotFoundActive");
    expect(app).toContain("shouldDisplayAppNavBar && !notFoundActive");
  });

  it("sets noindex and a pt-BR title on the 404 page", () => {
    const page = readFileSync(
      join(root, "client/components/NotFoundPage.tsx"),
      "utf8",
    );
    expect(page).toContain('"noindex"');
    expect(page).toContain('usePageTitle(t("not_found_title"), "Catechis")');
    expect(page).toContain('brandName="Catechis"');
    expect(page).toContain("setNotFoundActive(true)");
    const pt = JSON.parse(
      readFileSync(join(root, "i18n/locales/pt-BR/common.json"), "utf8"),
    ) as Record<string, string>;
    expect(pt.not_found_title).toBe("Página não encontrada");
  });

  it("usePageTitle accepts optional appName and restores APP_NAME on cleanup", () => {
    const hook = readFileSync(
      join(root, "client/hooks/usePageTitle.ts"),
      "utf8",
    );
    expect(hook).toContain("appName: string = APP_NAME");
    expect(hook).toContain("${title} · ${appName}");
    expect(hook).toContain("document.title = APP_NAME");
  });

  it("PublicFooter accepts optional brandName defaulting to Catechis", () => {
    const footer = readFileSync(
      join(root, "catequese/PublicFooter.tsx"),
      "utf8",
    );
    expect(footer).toContain('brandName = "Catechis"');
    expect(footer).toContain("{brandName}");
  });
});
