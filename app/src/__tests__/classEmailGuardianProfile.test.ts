import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("class announcement email recipients", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/announcementEmailOperations.ts"),
    "utf8",
  );

  it("includes GuardianProfile.email when User.email is missing", () => {
    expect(ops).toContain("g.user?.email || g.email");
    expect(ops).toMatch(/trim\(\)\.toLowerCase\(\)/);
  });
});
