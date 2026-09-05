/**
 * landingMeta — shared SEO data + HTML injection.
 */
import { describe, it, expect } from "vitest";
import {
  getLandingMeta,
  injectLandingMetaIntoHtml,
  canonicalUrlFor,
  LANDING_ROUTE_META,
} from "../shared/landingMeta";

describe("landingMeta", () => {
  it("positions the home as presence, not a management system", () => {
    const home = LANDING_ROUTE_META["/"];
    expect(home.title).toMatch(/semeia a fé/i);
    expect(home.title).toMatch(/organiza a turma/i);
    expect(home.description.toLowerCase()).not.toMatch(/sistema de gestão/);
    expect(home.description.toLowerCase()).toMatch(/presença|encontros/);
  });

  it("registers four marketing routes", () => {
    expect(Object.keys(LANDING_ROUTE_META).sort()).toEqual(
      ["/", "/ia", "/presenca", "/sistema"].sort(),
    );
  });

  it("normalizes trailing slash", () => {
    expect(getLandingMeta("/ia/")?.campaign).toBe("ia");
  });

  it("injects title description canonical and og into html shell", () => {
    const shell = `<!doctype html><html><head>
      <title>Old</title>
      <meta name="description" content="old desc" />
      <meta property="og:title" content="old og" />
    </head><body><div id="root"></div></body></html>`;
    const meta = getLandingMeta("/presenca")!;
    const out = injectLandingMetaIntoHtml(shell, meta);
    expect(out).toContain(`<title>${meta.title}</title>`);
    expect(out).toContain(`content="${meta.description}"`);
    expect(out).toContain('rel="canonical"');
    expect(out).toContain(canonicalUrlFor(meta));
    expect(out).toContain('property="og:title"');
    expect(out).toContain('name="catequese:campaign"');
    expect(out).toContain("attendance");
  });
});
