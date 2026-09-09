/**
 * routeMeta.test.ts — SPA landing meta registry.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  LANDING_ROUTE_META,
  applyLandingRouteMeta,
  getLandingRouteMeta,
  SITE_ORIGIN,
} from "../landing-page/routeMeta";

describe("landing route meta", () => {
  beforeEach(() => {
    document.title = "initial";
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("registers campaign landings and the public blog", () => {
    expect(Object.keys(LANDING_ROUTE_META).sort()).toEqual(
      ["/", "/blog", "/ia", "/presenca", "/sistema"].sort(),
    );
  });

  it("returns null for unknown paths", () => {
    expect(getLandingRouteMeta("/app")).toBeNull();
    expect(applyLandingRouteMeta("/pricing")).toBeNull();
  });

  it("applies title, description, canonical and og tags", () => {
    const applied = applyLandingRouteMeta("/ia");
    expect(applied?.campaign).toBe("ia");
    expect(document.title).toContain("Assistência editorial");
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toMatch(/assistência editorial/i);
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe(`${SITE_ORIGIN}/ia`);
    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    ).toBe(document.title);
    expect(
      document.querySelector('meta[name="catequese:campaign"]')?.getAttribute(
        "content",
      ),
    ).toBe("ia");
  });

  it("uses root canonical for home", () => {
    applyLandingRouteMeta("/");
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe(`${SITE_ORIGIN}/`);
  });

  it("positions the home title around presence, not a management system", () => {
    applyLandingRouteMeta("/");
    expect(document.title).toMatch(/semeia a fé/i);
    expect(document.title).not.toMatch(/sistema de gestão/i);
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toMatch(/presença/i);
  });
});
