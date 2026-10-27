import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("acceptInvitation expiry", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/memberOperations.ts"),
    "utf8",
  );

  it("rejects expired INVITED memberships and marks them inactive", () => {
    const start = ops.indexOf("export const acceptInvitation");
    const end = ops.indexOf("export const ", start + 10);
    const block = ops.slice(start, end > start ? end : undefined);
    expect(block).toContain("inviteTokenExpiresAt");
    expect(block).toContain("Este convite expirou");
    expect(block).toContain("status: 'INACTIVE'");
  });
});
