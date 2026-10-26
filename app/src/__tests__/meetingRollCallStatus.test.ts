import { describe, expect, it } from "vitest";
import { displayMeetingRollCallStatus } from "../shared/meetingRollCallStatus";

describe("displayMeetingRollCallStatus", () => {
  it("promotes NOT_STARTED to IN_PROGRESS once anyone is registered", () => {
    expect(
      displayMeetingRollCallStatus({
        meetingStatus: "NOT_STARTED",
        registeredCount: 4,
      }),
    ).toBe("IN_PROGRESS");
  });

  it("keeps NOT_STARTED when nobody is registered yet", () => {
    expect(
      displayMeetingRollCallStatus({
        meetingStatus: "NOT_STARTED",
        registeredCount: 0,
      }),
    ).toBe("NOT_STARTED");
  });

  it("never overrides CANCELLED or COMPLETED", () => {
    expect(
      displayMeetingRollCallStatus({
        meetingStatus: "CANCELLED",
        registeredCount: 9,
      }),
    ).toBe("CANCELLED");
    expect(
      displayMeetingRollCallStatus({
        meetingStatus: "COMPLETED",
        registeredCount: 9,
      }),
    ).toBe("COMPLETED");
  });
});
