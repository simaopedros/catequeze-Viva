import { describe, expect, it } from "vitest";
import { enrollmentCoversMeetingDate } from "../shared/enrollmentWindow";
import { toCsvContent } from "../shared/csvDownload";

describe("enrollmentCoversMeetingDate", () => {
  const meeting = "2026-10-28T12:00:00.000Z";

  it("includes meetings while enrolled", () => {
    expect(
      enrollmentCoversMeetingDate({
        meetingDate: meeting,
        startedAt: "2026-09-01T00:00:00.000Z",
        status: "ENROLLED",
      }),
    ).toBe(true);
  });

  it("excludes meetings after endedAt", () => {
    expect(
      enrollmentCoversMeetingDate({
        meetingDate: meeting,
        startedAt: "2026-09-01T00:00:00.000Z",
        endedAt: "2026-10-20T15:00:00.000Z",
        status: "DROPPED",
      }),
    ).toBe(false);
  });

  it("uses updatedAt fallback for DROPPED without endedAt", () => {
    expect(
      enrollmentCoversMeetingDate({
        meetingDate: meeting,
        status: "DROPPED",
        updatedAt: "2026-10-20T15:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("keeps meetings before removal", () => {
    expect(
      enrollmentCoversMeetingDate({
        meetingDate: "2026-10-10T12:00:00.000Z",
        endedAt: "2026-10-20T15:00:00.000Z",
        status: "DROPPED",
      }),
    ).toBe(true);
  });
});

describe("toCsvContent", () => {
  it("escapes formula injection and quotes", () => {
    const csv = toCsvContent([
      ["Nome", "Nota"],
      ["=1+1", 'disse "oi"'],
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\"'=1+1\"");
    expect(csv).toContain('"disse ""oi"""');
  });
});
