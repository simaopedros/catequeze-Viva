import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("loading fallbacks", () => {
  it("App uses RouteFallback instead of a bare Carregando label", () => {
    const app = readFileSync(resolve(__dirname, "../client/App.tsx"), "utf8");
    expect(app).toContain("RouteFallback");
    expect(app).not.toMatch(/Carregando/);
    expect(app).toContain("<Suspense fallback={<RouteFallback");
  });

  it("activates font preloads promptly to avoid unused-preload warnings", () => {
    const fonts = readFileSync(
      resolve(__dirname, "../client/fonts.ts"),
      "utf8",
    );
    expect(fonts).toContain("activatePreloadedFonts");
    expect(fonts).toContain('typeof window !== "undefined"');
    expect(fonts).toContain('addEventListener("load"');
  });
});
