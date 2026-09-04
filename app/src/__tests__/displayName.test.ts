import { describe, expect, it } from "vitest";
import {
  formatDashboardAvgAttendance,
  getUserDisplayFirstName,
} from "../shared/displayName";

describe("getUserDisplayFirstName", () => {
  it("prefers firstName over username", () => {
    expect(
      getUserDisplayFirstName({
        firstName: "Maria",
        username: "maria@catequista.com",
      }),
    ).toBe("Maria");
  });

  it("uses non-email username when firstName is missing", () => {
    expect(getUserDisplayFirstName({ username: "maria.catequista" })).toBe(
      "maria.catequista",
    );
  });

  it("returns null for email-shaped username", () => {
    expect(getUserDisplayFirstName({ username: "maria@catequista.com" })).toBe(
      null,
    );
  });
});

describe("formatDashboardAvgAttendance", () => {
  it("shows dash when roll call is open and incomplete", () => {
    expect(
      formatDashboardAvgAttendance({
        hasAnyAttendance: true,
        avgAttendance: 100,
        openRollCallIncomplete: true,
        noDataLabel: "Sem presença",
      }),
    ).toBe("—");
  });

  it("shows percentage when roll call is complete", () => {
    expect(
      formatDashboardAvgAttendance({
        hasAnyAttendance: true,
        avgAttendance: 87,
        openRollCallIncomplete: false,
        noDataLabel: "Sem presença",
      }),
    ).toBe("87%");
  });
});
