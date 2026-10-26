import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("attendance role scope", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/meetingOperations.ts"),
    "utf8",
  );

  it("uses assertCanTakeAttendance for write paths instead of global getUserRole", () => {
    const save = ops.slice(ops.indexOf("export const saveAttendance"));
    const saveFn = save.slice(0, save.indexOf("export const ", 10));
    expect(saveFn).toContain("assertCanTakeAttendance");
    expect(saveFn).not.toMatch(/getUserRole\(context\)\s*;/);

    const batchStart = ops.indexOf("export const saveAttendanceBatch");
    const batch = ops.slice(batchStart, batchStart + 1800);
    expect(batch).toContain("assertCanTakeAttendance");
    expect(batch).not.toMatch(/const role = await getUserRole\(context\);/);
  });
});
