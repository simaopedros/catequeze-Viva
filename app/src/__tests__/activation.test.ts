/**
 * activation.test.ts — first-value definition and trial banner modes.
 */
import { describe, it, expect } from "vitest";
import {
  computeActivationFlags,
  getTrialBannerMode,
  getPersonalOnboardingNextPath,
} from "../shared/activation";

describe("computeActivationFlags", () => {
  it("is incomplete without class", () => {
    const f = computeActivationFlags({
      activeClasses: 0,
      activeCatechumens: 2,
      hasAnyAttendance: true,
      hasAnyMeeting: true,
    });
    expect(f.firstValueReached).toBe(false);
    expect(f.nextStep?.id).toBe("class");
  });

  it("next is people after class", () => {
    const f = computeActivationFlags({
      activeClasses: 1,
      activeCatechumens: 0,
      myClasses: [{ id: "c1" }],
    });
    expect(f.nextStep?.id).toBe("people");
    expect(f.firstValueReached).toBe(false);
  });

  it("next is attendance when class+people but no action", () => {
    const f = computeActivationFlags({
      activeClasses: 1,
      activeCatechumens: 3,
      hasAnyAttendance: false,
      hasAnyMeeting: false,
      myClasses: [{ id: "c1" }],
    });
    expect(f.nextStep?.id).toBe("attendance");
    expect(f.firstValueReached).toBe(false);
  });

  it("first value with attendance only (not meeting)", () => {
    const f = computeActivationFlags({
      activeClasses: 1,
      activeCatechumens: 2,
      hasAnyAttendance: true,
      hasAnyMeeting: false,
      myClasses: [{ id: "c1" }],
    });
    expect(f.firstValueReached).toBe(true);
    expect(f.nextStep).toBeUndefined();
    expect(f.bonusStep?.id).toBe("meeting");
  });

  it("first value with meeting only (not attendance)", () => {
    const f = computeActivationFlags({
      activeClasses: 1,
      activeCatechumens: 2,
      hasAnyAttendance: false,
      hasAnyMeeting: true,
    });
    expect(f.firstValueReached).toBe(true);
    expect(f.bonusStep?.id).toBe("attendance");
  });

  it("does not use avgAttendance as proxy", () => {
    const f = computeActivationFlags({
      activeClasses: 1,
      activeCatechumens: 2,
      avgAttendance: 80,
      hasAnyAttendance: false,
      hasAnyMeeting: false,
    });
    expect(f.firstValueReached).toBe(false);
  });
});

describe("getTrialBannerMode", () => {
  it("hides while activating mid-trial", () => {
    expect(
      getTrialBannerMode({
        daysLeft: 5,
        hasReachedFirstValue: false,
        softDismissed: false,
      }),
    ).toBe("hidden");
  });

  it("urgency near end even without first value", () => {
    expect(
      getTrialBannerMode({
        daysLeft: 2,
        hasReachedFirstValue: false,
        softDismissed: false,
      }),
    ).toBe("urgency");
  });

  it("soft after first value when not near end", () => {
    expect(
      getTrialBannerMode({
        daysLeft: 4,
        hasReachedFirstValue: true,
        softDismissed: false,
      }),
    ).toBe("soft");
  });

  it("hidden after soft dismiss", () => {
    expect(
      getTrialBannerMode({
        daysLeft: 4,
        hasReachedFirstValue: true,
        softDismissed: true,
      }),
    ).toBe("hidden");
  });
});

describe("getPersonalOnboardingNextPath", () => {
  it("sends to attendance when class has people", () => {
    expect(
      getPersonalOnboardingNextPath({ classId: "c1", catechumensCount: 2 }),
    ).toEqual({
      to: "/app/classes/c1/attendance",
      action: "register_attendance",
    });
  });

  it("sends to class when no people yet", () => {
    expect(
      getPersonalOnboardingNextPath({ classId: "c1", catechumensCount: 0 }),
    ).toEqual({ to: "/app/classes/c1", action: "add_people" });
  });
});
