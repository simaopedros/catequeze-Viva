import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("family search scope", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/searchOperations.ts"),
    "utf8",
  );

  it("resolves family access per workspace and shares the profile predicate", () => {
    expect(ops).toContain("resolveWorkspaceAccess(context, parishId");
    expect(ops).toContain("access.role === 'GUARDIAN' || access.role === 'CATECHUMEN'");
    expect(ops).toContain("guardians: { some: { userId: context.user.id } }");
    expect(ops).toContain("catechumenProfile: catechumenFilter");
    expect(ops).not.toContain("rolesAreFamilyOnly");
  });
});
