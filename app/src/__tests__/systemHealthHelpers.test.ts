import { describe, expect, it } from "vitest";
import {
  classifyJobErrorMessage,
  groupErrorsByMessage,
  latestJobRunByName,
  resolveErrorWindowDays,
} from "../server/operations/systemHealthHelpers";

describe("resolveErrorWindowDays", () => {
  it("defaults to 7 and caps at 90", () => {
    expect(resolveErrorWindowDays(undefined)).toBe(7);
    expect(resolveErrorWindowDays(0)).toBe(7);
    expect(resolveErrorWindowDays(-3)).toBe(7);
    expect(resolveErrorWindowDays(30)).toBe(30);
    expect(resolveErrorWindowDays(120)).toBe(90);
  });
});

describe("classifyJobErrorMessage", () => {
  it("maps daily stats 401 and generic failures", () => {
    expect(
      classifyJobErrorMessage("Error calculating daily stats: HTTP error! Status: 401"),
    ).toBe("daily_stats_401");
    expect(classifyJobErrorMessage("Error calculating daily stats: boom")).toBe(
      "daily_stats",
    );
    expect(classifyJobErrorMessage("lifecycleNudge failed")).toBe("lifecycle_nudge");
    expect(classifyJobErrorMessage("something else")).toBeNull();
  });
});

describe("groupErrorsByMessage", () => {
  it("deduplicates by message and keeps count + lastAt", () => {
    const grouped = groupErrorsByMessage([
      {
        id: 1,
        message: "Error calculating daily stats: HTTP error! Status: 401",
        createdAt: "2026-10-20T10:00:00.000Z",
      },
      {
        id: 2,
        message: "Error calculating daily stats: HTTP error! Status: 401",
        createdAt: "2026-10-21T12:00:00.000Z",
      },
      {
        id: 3,
        message: "other",
        createdAt: "2026-10-22T08:00:00.000Z",
      },
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0].message).toBe("other");
    expect(grouped[1].count).toBe(2);
    expect(grouped[1].labelKey).toBe("daily_stats_401");
    expect(grouped[1].lastAt).toBe("2026-10-21T12:00:00.000Z");
    expect(grouped[1].firstAt).toBe("2026-10-20T10:00:00.000Z");
  });
});

describe("latestJobRunByName", () => {
  it("picks the newest run per name", () => {
    const map = latestJobRunByName(
      [
        {
          name: "dailyStats",
          startedAt: "2026-10-01T00:00:00.000Z",
          finishedAt: "2026-10-01T00:01:00.000Z",
          ok: false,
          error: "old",
        },
        {
          name: "dailyStats",
          startedAt: "2026-10-20T00:00:00.000Z",
          finishedAt: "2026-10-20T00:01:00.000Z",
          ok: true,
          error: null,
        },
        {
          name: "lifecycleNudge",
          startedAt: "2026-10-19T00:00:00.000Z",
          finishedAt: null,
          ok: null,
          error: null,
        },
      ],
      ["dailyStats", "lifecycleNudge", "aiCreditsReset"],
    );

    expect(map.get("dailyStats")?.ok).toBe(true);
    expect(map.get("lifecycleNudge")?.startedAt).toBe("2026-10-19T00:00:00.000Z");
    expect(map.has("aiCreditsReset")).toBe(false);
  });
});
