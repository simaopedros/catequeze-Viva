import { describe, expect, it } from "vitest";
import {
  NOT_FILLED_STATUS,
  addStatus,
  ageFromBirthDate,
  computeAttendanceRate,
  countStatuses,
  emptyAttendanceCounts,
  isAttendedStatus,
  isCountableMeeting,
  reportPeriodStart,
  resolveMeetingStatus,
  riskLevelFromRate,
} from "../shared/attendanceMetrics";
import { isTodayInAppTimezone } from "../shared/calendarDate";

const NOW = new Date("2026-10-25T15:00:00Z");

describe("isCountableMeeting", () => {
  it("never counts cancelled meetings", () => {
    expect(
      isCountableMeeting(
        { status: "CANCELLED", date: "2026-10-01T00:00:00Z" },
        { now: NOW, hasAttendance: true },
      ),
    ).toBe(false);
  });

  it("counts past meetings", () => {
    expect(
      isCountableMeeting(
        { status: "COMPLETED", date: "2026-10-18T00:00:00Z" },
        { now: NOW },
      ),
    ).toBe(true);
  });

  it("skips future meetings without a roll call", () => {
    expect(
      isCountableMeeting(
        { status: "NOT_STARTED", date: "2026-11-01T00:00:00Z" },
        { now: NOW },
      ),
    ).toBe(false);
  });

  it("counts a later-today meeting once attendance was recorded", () => {
    expect(
      isCountableMeeting(
        { status: "IN_PROGRESS", date: "2026-10-25T22:00:00Z" },
        { now: NOW, hasAttendance: true },
      ),
    ).toBe(true);
  });
});

describe("resolveMeetingStatus", () => {
  it("uses the catechumen's own record", () => {
    expect(resolveMeetingStatus("LATE", true)).toBe("LATE");
  });

  it("treats a missing record as absent when the roll call happened", () => {
    expect(resolveMeetingStatus(undefined, true)).toBe("ABSENT");
  });

  it("marks meetings without any roll call as not filled", () => {
    expect(resolveMeetingStatus(undefined, false)).toBe(NOT_FILLED_STATUS);
  });
});

describe("computeAttendanceRate", () => {
  it("counts present, late and justified as participation", () => {
    const counts = emptyAttendanceCounts();
    ["PRESENT", "LATE", "JUSTIFIED", "ABSENT"].forEach((s) =>
      addStatus(counts, s),
    );
    expect(computeAttendanceRate(counts)).toBe(75);
  });

  it("ignores unknown statuses such as NOT_FILLED", () => {
    const counts = emptyAttendanceCounts();
    addStatus(counts, "PRESENT");
    addStatus(counts, NOT_FILLED_STATUS);
    expect(computeAttendanceRate(counts)).toBe(100);
  });

  it("returns 0 without records", () => {
    expect(computeAttendanceRate(emptyAttendanceCounts())).toBe(0);
  });
});

describe("helpers", () => {
  it("classifies attended statuses", () => {
    expect(isAttendedStatus("JUSTIFIED")).toBe(true);
    expect(isAttendedStatus("ABSENT")).toBe(false);
  });

  it("maps rates to follow-up levels", () => {
    expect(riskLevelFromRate(49)).toBe("ALTO");
    expect(riskLevelFromRate(50)).toBe("MÉDIO");
    expect(riskLevelFromRate(75)).toBe("BAIXO");
  });

  it("computes age considering whether the birthday already happened", () => {
    expect(ageFromBirthDate("2014-12-10T12:00:00Z", NOW)).toBe(11);
    expect(ageFromBirthDate("2014-03-10T12:00:00Z", NOW)).toBe(12);
    expect(ageFromBirthDate(null, NOW)).toBeNull();
  });
});

describe("countStatuses", () => {
  it("counts LATE and JUSTIFIED as participation and skips empty cells", () => {
    const counts = countStatuses([
      "PRESENT",
      "LATE",
      "JUSTIFIED",
      "ABSENT",
      undefined,
      null,
    ]);
    expect(counts).toEqual({ present: 1, late: 1, justified: 1, absent: 1 });
    expect(computeAttendanceRate(counts)).toBe(75);
  });
});

describe("reportPeriodStart", () => {
  it("has no lower bound for the whole period", () => {
    expect(reportPeriodStart("all", NOW)).toBeUndefined();
    expect(reportPeriodStart(undefined, NOW)).toBeUndefined();
  });

  it("goes back one month or one quarter", () => {
    expect(reportPeriodStart("month", NOW)?.toISOString()).toBe(
      "2026-09-25T15:00:00.000Z",
    );
    expect(reportPeriodStart("quarter", NOW)?.toISOString()).toBe(
      "2026-07-25T15:00:00.000Z",
    );
  });
});

describe("isTodayInAppTimezone", () => {
  it("treats date-only meetings as calendar days in Brazil", () => {
    const lateEveningInBrazil = new Date("2026-10-26T01:30:00Z");
    expect(
      isTodayInAppTimezone("2026-10-25T00:00:00.000Z", lateEveningInBrazil),
    ).toBe(true);
    expect(
      isTodayInAppTimezone("2026-10-26T00:00:00.000Z", lateEveningInBrazil),
    ).toBe(false);
  });

  it("compares timed meetings in the app timezone", () => {
    expect(isTodayInAppTimezone("2026-10-25T22:00:00Z", NOW)).toBe(true);
    expect(isTodayInAppTimezone("2026-10-26T04:00:00Z", NOW)).toBe(false);
    expect(isTodayInAppTimezone("invalid", NOW)).toBe(false);
  });
});
