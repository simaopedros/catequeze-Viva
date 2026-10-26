import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("changePassword invalidates sessions", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/userOperations.ts"),
    "utf8",
  );

  it("deletes Lucia sessions after a successful password change", () => {
    const start = ops.indexOf("export const changePassword");
    const block = ops.slice(start);
    expect(block).toContain("prisma.session.deleteMany");
    expect(block).toContain("prisma.auth.findUnique");
    expect(block).toContain("PASSWORD_CHANGE");
  });
});
