import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("removeMembership cleans ClassCatechist", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/memberOperations.ts"),
    "utf8",
  );

  it("deletes class assignments for the removed user in that parish", () => {
    const start = ops.indexOf("export const removeMembership");
    const end = ops.indexOf("export const listParishMembers", start);
    const block = ops.slice(start, end);
    expect(block).toContain("ClassCatechist.deleteMany");
    expect(block).toContain("parishId: membership.parishId");
    expect(block).toContain("userId: membership.userId");
  });
});
