import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("removeMembership cuts guardian residual access", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/memberOperations.ts"),
    "utf8",
  );
  const helpers = readFileSync(
    resolve(__dirname, "../server/auth/helpers.ts"),
    "utf8",
  );
  const wasp = readFileSync(resolve(__dirname, "../../main.wasp"), "utf8");

  it("unlinks GuardianProfile and invalidates sessions on remove", () => {
    const start = ops.indexOf("export const removeMembership");
    const block = ops.slice(start, start + 3500);
    expect(block).toContain("GuardianProfile");
    expect(block).toContain("userId: null");
    expect(block).toContain("householdId: null");
    expect(block).toContain("session.deleteMany");
    expect(block).toContain("auth.findUnique");
  });

  it("declares GuardianProfile on removeMembership entities", () => {
    const start = wasp.indexOf("action removeMembership");
    const block = wasp.slice(start, start + 350);
    expect(block).toContain("GuardianProfile");
    expect(block).toContain("Household");
  });

  it("requires ACTIVE membership for guardian profile access", () => {
    const start = helpers.indexOf(
      "export async function assertCanAccessCatechumenProfile",
    );
    const block = helpers.slice(start, start + 2200);
    expect(block).toContain('status: "ACTIVE"');
    expect(block).toContain("activeGuardian");
  });
});
