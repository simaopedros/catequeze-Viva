import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("family callers get 403 on staff-only pastoral ops", () => {
  const meeting = readFileSync(
    resolve(__dirname, "../server/operations/meetingOperations.ts"),
    "utf8",
  );
  const pastoral = readFileSync(
    resolve(__dirname, "../server/operations/pastoralReportOperations.ts"),
    "utf8",
  );
  const wasp = readFileSync(resolve(__dirname, "../../main.wasp"), "utf8");

  it("assertCanTakeAttendance rejects family before GuardianProfile lookup", () => {
    const start = meeting.indexOf("async function assertCanTakeAttendance");
    const block = meeting.slice(start, start + 1400);
    const familyIdx = block.indexOf("rolesAreFamilyOnly");
    const belongCallIdx = block.indexOf("await assertUserBelongsToClass");
    expect(familyIdx).toBeGreaterThan(-1);
    expect(belongCallIdx).toBeGreaterThan(familyIdx);
  });

  it("pastoral analysis returns 403 for non-staff", () => {
    const start = pastoral.indexOf("export const getCatechumenPastoralAnalysis");
    const block = pastoral.slice(start, start + 1200);
    expect(block).toContain("Apenas coordenadores e catequistas podem aceder");
  });

  it("declares entities needed to avoid 500 on family class access paths", () => {
    const matrix = wasp.slice(
      wasp.indexOf("query getClassAttendanceMatrix"),
      wasp.indexOf("query getClassAttendanceMatrix") + 400,
    );
    expect(matrix).toContain("GuardianProfile");
    expect(matrix).toContain("ClassEnrollment");

    const birthdays = wasp.slice(
      wasp.indexOf("query listUpcomingBirthdays"),
      wasp.indexOf("query listUpcomingBirthdays") + 400,
    );
    expect(birthdays).toContain("Membership");
    expect(birthdays).toContain("GuardianProfile");
  });
});
