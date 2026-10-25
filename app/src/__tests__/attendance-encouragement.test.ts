import { describe, expect, it } from "vitest";
import {
  firstNameOf,
  getAttendanceEncouragement,
} from "../catequese/lib/attendanceEncouragement";

describe("getAttendanceEncouragement", () => {
  it("returns none when there are no meetings to evaluate", () => {
    expect(
      getAttendanceEncouragement({ frequency: 0, totalValidMeetings: 0 }),
    ).toBe("none");
  });

  it("celebrates perfect attendance", () => {
    expect(
      getAttendanceEncouragement({ frequency: 100, totalValidMeetings: 8 }),
    ).toBe("perfect");
  });

  it("recognises excellent attendance even with a recent streak", () => {
    expect(
      getAttendanceEncouragement({
        frequency: 92,
        totalValidMeetings: 25,
        consecutiveAbsences: 1,
      }),
    ).toBe("excellent");
  });

  it("keeps good attendance positive", () => {
    expect(
      getAttendanceEncouragement({ frequency: 80, totalValidMeetings: 10 }),
    ).toBe("good");
  });

  it("switches good attendance to a gentle nudge after 3 missed meetings in a row", () => {
    expect(
      getAttendanceEncouragement({
        frequency: 80,
        totalValidMeetings: 15,
        consecutiveAbsences: 3,
      }),
    ).toBe("missYou");
  });

  it("uses missYou for the middle band", () => {
    expect(
      getAttendanceEncouragement({ frequency: 50, totalValidMeetings: 6 }),
    ).toBe("missYou");
    expect(
      getAttendanceEncouragement({ frequency: 74, totalValidMeetings: 6 }),
    ).toBe("missYou");
  });

  it("uses an encouraging new start for low attendance", () => {
    expect(
      getAttendanceEncouragement({ frequency: 30, totalValidMeetings: 10 }),
    ).toBe("newStart");
  });
});

describe("firstNameOf", () => {
  it("returns the first word of the name", () => {
    expect(firstNameOf("  Maria  Clara Souza ")).toBe("Maria");
    expect(firstNameOf(null)).toBe("");
  });
});
