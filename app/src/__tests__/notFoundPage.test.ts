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
    expect(page).toContain('t("not_found_title")');
    expect(page).toContain("setNotFoundActive(true)");
    const pt = JSON.parse(
      readFileSync(join(root, "i18n/locales/pt-BR/common.json"), "utf8"),
    ) as Record<string, string>;
    expect(pt.not_found_title).toBe("Página não encontrada");
  });
});
