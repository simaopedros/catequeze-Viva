import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("guardian link hardening", () => {
  const familyOps = readFileSync(
    resolve(__dirname, "../server/operations/familyOperations.ts"),
    "utf8",
  );
  const memberOps = readFileSync(
    resolve(__dirname, "../server/operations/memberOperations.ts"),
    "utf8",
  );

  it("refuses reassigning a guardian already linked to another household", () => {
    expect(familyOps).toContain("já está vinculado a outra família");
    expect(familyOps).toContain("existing.householdId !== args.householdId");
  });

  it("scopes invite household and linkProfile to the invitation parish", () => {
    expect(memberOps).toContain(
      "A família do convite deve pertencer à mesma paróquia.",
    );
    expect(memberOps).toMatch(/async function linkProfile\(/);
    expect(memberOps).toContain("parishId?: string | null");
    expect(memberOps).toContain(
      "await linkProfile(context, invitation.role, invitation.parishId);",
    );
    expect(memberOps).toContain("household: { parishId }");
  });
});
