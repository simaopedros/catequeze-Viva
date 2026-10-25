import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "..");
const ENTRY = path.join(SRC, "landing-page/LandingPage.tsx");
const STATIC_IMPORT = /^\s*import\s+(?!type\b)(?:[^"';]*?\sfrom\s*)?["']([^"']+)["']/gm;
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveLocal(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Files reachable from the entry through static (eager) imports only. */
function eagerGraph(entry: string) {
  const files = new Map<string, string[]>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop()!;
    if (files.has(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    const specs = [...source.matchAll(STATIC_IMPORT)].map((m) => m[1]);
    files.set(file, specs);
    for (const spec of specs) {
      const local = resolveLocal(file, spec);
      if (local) stack.push(local);
    }
  }
  return files;
}

describe("home landing bundle guard", () => {
  const graph = eagerGraph(ENTRY);
  const rel = (f: string) => path.relative(SRC, f);

  it("keeps the motion library out of the eager home graph", () => {
    const offenders = [...graph.entries()]
      .filter(([, specs]) => specs.some((s) => s === "motion" || s.startsWith("motion/")))
      .map(([file]) => rel(file));
    expect(offenders).toEqual([]);
  });

  it("includes the CSS-only hero eagerly and loads motion sections lazily", () => {
    const eager = [...graph.keys()].map(rel);
    expect(eager).toContain(path.join("landing-page", "home", "HomeHero.tsx"));
    for (const lazyOnly of ["HomeBeforeAfter.tsx", "HomeHowItWorks.tsx", "HomeAiDemo.tsx", "HomeMotion.tsx"]) {
      expect(eager).not.toContain(path.join("landing-page", "home", lazyOnly));
    }
  });

  it("loads motion animation features asynchronously", () => {
    const provider = fs.readFileSync(path.join(SRC, "landing-page/home/HomeMotion.tsx"), "utf8");
    expect(provider).toMatch(/import\(["']\.\/motionFeatures["']\)/);
    expect(provider).not.toMatch(/import\s*\{[^}]*\bdomAnimation\b/);
  });
});
