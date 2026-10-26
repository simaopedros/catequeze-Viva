import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("meeting create/update/delete staff scope", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/meetingOperations.ts"),
    "utf8",
  );

  function block(name: string, next: string) {
    const start = ops.indexOf(`export const ${name}`);
    const end = ops.indexOf(`export const ${next}`, start);
    return ops.slice(start, end > start ? end : undefined);
  }

  it("createMeeting uses parish-scoped assertCanTakeAttendance", () => {
    const b = block("createMeeting", "saveAttendance");
    expect(b).toContain("assertCanTakeAttendance");
    expect(b).not.toContain("getUserRole");
  });

  it("updateMeeting uses assertCanTakeAttendance (not global getUserRole)", () => {
    const b = block("updateMeeting", "getMeeting");
    expect(b).toContain("assertCanTakeAttendance");
    expect(b).not.toContain("getUserRole");
  });

  it("deleteMeeting rejects family-only via assertCanTakeAttendance", () => {
    // deleteMeeting is last export in the attendance section — match by body
    const start = ops.indexOf("export const deleteMeeting");
    const b = ops.slice(start, start + 800);
    expect(b).toContain("assertCanTakeAttendance");
    expect(b).not.toMatch(/await assertUserBelongsToClass\(context, meeting\.classId\);/);
  });
});
