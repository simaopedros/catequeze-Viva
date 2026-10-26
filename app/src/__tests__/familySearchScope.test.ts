import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("family search scope", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/searchOperations.ts"),
    "utf8",
  );

  it("restricts catechumens/households/documents when roles are family-only", () => {
    expect(ops).toContain("rolesAreFamilyOnly");
    expect(ops).toContain("familyCatechumenFilter");
    expect(ops).toContain("familyHouseholdIds");
    expect(ops).toContain("familyOnly && familyHouseholdIds.length === 0");
  });
});
