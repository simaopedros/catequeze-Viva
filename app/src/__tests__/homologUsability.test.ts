import { describe, expect, it } from "vitest";
import {
  formatClassSchedule,
  inferDayOfWeekFromMeetings,
  normalizeDayOfWeek,
} from "../shared/classSchedule";
import {
  parseBirthDateUtc,
  parseCatechumenCsv,
} from "../shared/csvCatechumenImport";
import {
  classEnrollmentCount,
  meetingAttendanceCount,
} from "../shared/dashboardCounts";
import { displayDateToIso, isoToDisplayDate } from "../shared/displayDate";
import {
  filterJourneyTemplatesByLocale,
  buildJourneyTemplateListWhere,
} from "../shared/journeyTemplateLocale";

describe("CSV catechumen import", () => {
  it("parses a turma column and quoted fields", () => {
    const rows = parseCatechumenCsv(
      `nome,sobrenome,nascimento,familia,turma
João,Silva,2015-03-15,Silva Santos,Eucaristia 2026
"Maria, Ana",Santos,15/03/2014,Santos,`,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].className).toBe("Eucaristia 2026");
    expect(rows[1].firstName).toBe("Maria, Ana");
    expect(rows[1].className).toBe("");
  });

  it("parses ISO and PT-BR birth dates", () => {
    expect(parseBirthDateUtc("2015-03-15")?.toISOString()).toBe(
      "2015-03-15T12:00:00.000Z",
    );
    expect(parseBirthDateUtc("15/03/2015")?.toISOString()).toBe(
      "2015-03-15T12:00:00.000Z",
    );
  });
});

describe("class schedule", () => {
  it("normalizes weekday aliases and formats PT schedule", () => {
    expect(normalizeDayOfWeek("6")).toBe(6);
    expect(normalizeDayOfWeek("sábado")).toBe(6);
    expect(normalizeDayOfWeek("Saturday")).toBe(6);
    const label = formatClassSchedule(
      { dayOfWeek: "sábado", startTime: "19:00", endTime: "20:30" },
      (i) => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i],
      "Sem horário",
    );
    expect(label).toBe("Sáb 19:00-20:30");
  });

  it("does not show a dash when only the time exists", () => {
    const label = formatClassSchedule(
      { startTime: "19:00", endTime: "20:30" },
      () => "Domingo",
      "Sem horário",
    );
    expect(label).toBe("19:00-20:30");
    expect(label.startsWith("—")).toBe(false);
  });

  it("infers weekday from meetings", () => {
    expect(
      inferDayOfWeekFromMeetings([{ date: "2026-03-14" }]), // Saturday UTC noon
    ).toBe(6);
  });
});

describe("dashboard counts", () => {
  it("prefers enrollmentCount over missing _count", () => {
    expect(classEnrollmentCount({ enrollmentCount: 15 })).toBe(15);
    expect(classEnrollmentCount({ _count: { enrollments: 0 } })).toBe(0);
    expect(
      classEnrollmentCount({ enrollmentCount: 15, _count: { enrollments: 0 } }),
    ).toBe(15);
  });

  it("reads attendance from _count or dedicated field", () => {
    expect(meetingAttendanceCount({ _count: { attendance: 15 } })).toBe(15);
    expect(meetingAttendanceCount({ attendanceCount: 8 })).toBe(8);
  });
});

describe("display dates", () => {
  it("formats and parses DD/MM for pt-BR", () => {
    expect(isoToDisplayDate("2026-03-15", "pt-BR")).toBe("15/03/2026");
    expect(displayDateToIso("15/03/2026", "pt-BR")).toBe("2026-03-15");
  });
});

describe("journey template locale", () => {
  it("keeps only the UI locale plus parish-owned templates", () => {
    const filtered = filterJourneyTemplatesByLocale(
      [
        { id: "1", locale: "pt-BR" },
        { id: "2", locale: "en" },
        { id: "3", locale: "es" },
        { id: "4", locale: "pt-BR" },
        { id: "5", locale: "en" },
        { id: "6", locale: "es" },
        { id: "7", locale: "pt-BR" },
        { id: "8", locale: "en" },
        { id: "9", locale: "es" },
        { id: "10", locale: "pt-BR" },
        { id: "11", locale: "en" },
        { id: "12", locale: "es" },
        { id: "parish-en", locale: "en", parishId: "p1" },
        { id: "legacy-global", locale: "" },
      ],
      "pt-BR",
    );
    expect(filtered.map((t) => t.id)).toEqual([
      "1",
      "4",
      "7",
      "10",
      "parish-en",
      "legacy-global",
    ]);
  });
});

describe("journey template list where", () => {
  it("does not filter admin queries by locale null", () => {
    expect(
      buildJourneyTemplateListWhere({
        isAdmin: true,
        parishIds: ["p1"],
        dioceseIds: [],
        hasOnlyPersonal: false,
      }),
    ).toBeUndefined();
  });

  it("returns global templates when the actor has no parish scope", () => {
    expect(
      buildJourneyTemplateListWhere({
        isAdmin: false,
        parishIds: [],
        dioceseIds: [],
        hasOnlyPersonal: false,
      }),
    ).toEqual({ parishId: null });
  });

  it("includes globals for personal-only workspaces", () => {
    expect(
      buildJourneyTemplateListWhere({
        isAdmin: false,
        parishIds: ["personal-1"],
        dioceseIds: [],
        hasOnlyPersonal: true,
      }),
    ).toEqual({
      OR: [{ parishId: { in: ["personal-1"] } }, { parishId: null }],
    });
  });
});
