import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("catechumen access uses parish, not household parish alone", () => {
  const helpers = readFileSync(
    resolve(__dirname, "../server/auth/helpers.ts"),
    "utf8",
  );
  const scope = readFileSync(
    resolve(__dirname, "../server/operations/sharedScope.ts"),
    "utf8",
  );
  const profile = readFileSync(
    resolve(__dirname, "../server/operations/catechumenOperations.ts"),
    "utf8",
  );

  it("assertCanAccessCatechumenProfile ignores household.parishId for staff", () => {
    const start = helpers.indexOf(
      "export async function assertCanAccessCatechumenProfile",
    );
    const block = helpers.slice(start, start + 4500);
    expect(block).toContain("NEVER by household.parishId");
    expect(block).not.toContain("catechumen.household?.parishId");
    expect(block).toContain("catechumen.parishId === parishId");
  });

  it("catechumenWhereForAccess does not list by household parish", () => {
    const start = scope.indexOf("export function catechumenWhereForAccess");
    const block = scope.slice(start, start + 900);
    expect(block).toContain("{ parishId }");
    expect(block).not.toContain("household: { parishId }");
  });

  it("getCatechumenProfile omits uploadToken from the payload", () => {
    const start = profile.indexOf("export const getCatechumenProfile");
    const block = profile.slice(start, start + 2200);
    expect(block).toContain("uploadToken / uploadTokenExpires intentionally omitted");
    expect(block).toMatch(/select:\s*\{/);
    expect(block).not.toMatch(/select:\s*undefined/);
  });
});
