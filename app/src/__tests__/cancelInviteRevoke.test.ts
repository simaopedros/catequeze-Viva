import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("cancelInvitation revokes legacy membership", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/memberOperations.ts"),
    "utf8",
  );
  const wasp = readFileSync(resolve(__dirname, "../../main.wasp"), "utf8");

  it("clears INVITED membership tokens when deleting PendingInvitation", () => {
    const start = ops.indexOf("export const cancelInvitation");
    const end = ops.indexOf("export const removeMembership", start);
    const block = ops.slice(start, end);
    expect(block).toContain("PendingInvitation.delete");
    expect(block).toContain("status: 'INVITED'");
    expect(block).toContain("inviteToken: null");
    expect(block).toContain("INACTIVE");
  });

  it("declares Membership and User entities for cancelInvitation", () => {
    const re =
      /action\s+cancelInvitation\s*\{[\s\S]*?entities:\s*\[([^\]]+)\]/;
    const m = wasp.match(re);
    expect(m).toBeTruthy();
    expect(m![1]).toMatch(/Membership/);
    expect(m![1]).toMatch(/User/);
  });
});
