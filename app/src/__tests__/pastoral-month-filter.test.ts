import { describe, expect, it } from "vitest";
import {
  PASTORAL_PERIOD_ALL,
  filterPastoralByMonth,
  formatMonthLabel,
  monthKeyFromDate,
  resolveDefaultMonth,
  toLineChartRows,
  type PastoralAnalysisSlice,
} from "../catequese/lib/pastoralMonthFilter";

function sampleData(
  overrides: Partial<PastoralAnalysisSlice> = {},
): PastoralAnalysisSlice {
  return {
    overallFrequency: 67,
    presentCount: 4,
    absentCount: 2,
    lateCount: 1,
    justifiedCount: 1,
    consecutiveAbsences: 2,
    rankingPosition: 3,
    totalCatechumensInClass: 10,
    totalValidMeetings: 8,
    monthlyPresence: [
      {
        month: "2026-07",
        present: 2,
        late: 0,
        absent: 1,
        justified: 0,
        totalMeetings: 3,
      },
      {
        month: "2026-08",
        present: 2,
        late: 1,
        absent: 1,
        justified: 1,
        totalMeetings: 5,
      },
    ],
    meetingTimeline: [
      { id: "1", date: "2026-07-05T00:00:00.000Z", status: "PRESENT" },
      { id: "2", date: "2026-07-12T00:00:00.000Z", status: "ABSENT" },
      { id: "3", date: "2026-07-19T00:00:00.000Z", status: "PRESENT" },
      { id: "4", date: "2026-08-02T00:00:00.000Z", status: "PRESENT" },
      { id: "5", date: "2026-08-09T00:00:00.000Z", status: "LATE" },
      { id: "6", date: "2026-08-16T00:00:00.000Z", status: "JUSTIFIED" },
      { id: "7", date: "2026-08-23T00:00:00.000Z", status: "ABSENT" },
      { id: "8", date: "2026-08-30T00:00:00.000Z", status: "PRESENT" },
    ],
    attendedThemes: [
      { date: "2026-07-05T00:00:00.000Z", title: "Fé", status: "PRESENT" },
      { date: "2026-08-02T00:00:00.000Z", title: "Oração", status: "PRESENT" },
      { date: "2026-08-09T00:00:00.000Z", title: "Igreja", status: "LATE" },
    ],
    missedThemes: [
      { date: "2026-07-12T00:00:00.000Z", title: "Batismo" },
      { date: "2026-08-23T00:00:00.000Z", title: "Eucaristia" },
    ],
    alerts: [{ type: "consecutive_absences" }],
    riskLevel: "MÉDIO",
    canSeeSensitiveSignals: true,
    ...overrides,
  };
}

describe("monthKeyFromDate", () => {
  it("reads YYYY-MM from ISO strings without timezone shift", () => {
    expect(monthKeyFromDate("2026-08-01T00:00:00.000Z")).toBe("2026-08");
  });
});

describe("resolveDefaultMonth", () => {
  it("uses the current month when the series has it", () => {
    expect(
      resolveDefaultMonth(
        [{ month: "2026-07" }, { month: "2026-08" }],
        new Date(2026, 7, 15),
      ),
    ).toBe("2026-08");
  });

  it("falls back to the last month with meetings", () => {
    expect(
      resolveDefaultMonth(
        [{ month: "2026-06" }, { month: "2026-07" }],
        new Date(2026, 7, 15),
      ),
    ).toBe("2026-07");
  });

  it("returns all when there is no monthly series", () => {
    expect(resolveDefaultMonth([], new Date(2026, 7, 15))).toBe(
      PASTORAL_PERIOD_ALL,
    );
  });
});

describe("filterPastoralByMonth", () => {
  it("keeps full totals for the entire period", () => {
    const data = sampleData();
    const slice = filterPastoralByMonth(data, PASTORAL_PERIOD_ALL);
    expect(slice.overallFrequency).toBe(67);
    expect(slice.presentCount).toBe(4);
    expect(slice.meetingTimeline).toHaveLength(8);
    expect(slice.rankingPosition).toBe(3);
  });

  it("filters KPIs and lists to the selected month", () => {
    const slice = filterPastoralByMonth(sampleData(), "2026-08");
    expect(slice.totalValidMeetings).toBe(5);
    expect(slice.presentCount).toBe(2);
    expect(slice.lateCount).toBe(1);
    expect(slice.justifiedCount).toBe(1);
    expect(slice.absentCount).toBe(1);
    expect(slice.overallFrequency).toBe(80);
    expect(slice.attendedThemes.map((item) => item.title)).toEqual([
      "Oração",
      "Igreja",
    ]);
    expect(slice.missedThemes.map((item) => item.title)).toEqual([
      "Eucaristia",
    ]);
    expect(slice.rankingPosition).toBeNull();
  });

  it("returns zero frequency when the month has no meetings", () => {
    const slice = filterPastoralByMonth(sampleData(), "2026-09");
    expect(slice.totalValidMeetings).toBe(0);
    expect(slice.overallFrequency).toBe(0);
    expect(slice.meetingTimeline).toEqual([]);
    expect(slice.attendedThemes).toEqual([]);
    expect(slice.missedThemes).toEqual([]);
  });

  it("hides sensitive consecutive absences when the source hid them", () => {
    const slice = filterPastoralByMonth(
      sampleData({
        canSeeSensitiveSignals: false,
        consecutiveAbsences: null,
        rankingPosition: null,
        riskLevel: null,
        alerts: [],
      }),
      "2026-07",
    );
    expect(slice.consecutiveAbsences).toBeNull();
    expect(slice.alerts).toEqual([]);
  });
});

describe("toLineChartRows", () => {
  it("keeps the full history and folds justified into absent counts", () => {
    const rows = toLineChartRows(sampleData().monthlyPresence);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      month: "2026-08",
      present: 2,
      late: 1,
      absent: 2,
      frequency: 80,
    });
  });
});

describe("formatMonthLabel", () => {
  it("formats a month key in pt-BR", () => {
    expect(formatMonthLabel("2026-08", "pt-BR").toLowerCase()).toContain(
      "agosto",
    );
  });
});
