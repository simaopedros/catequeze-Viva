/**
 * dashboard-next-actions.test.ts — central de ação do catequista (helpers puros).
 *
 * Run: npx vitest run src/__tests__/dashboard-next-actions.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  BIRTHDAY_ACTION_WINDOW_DAYS,
  LOW_FREQUENCY_MIN_RECORDS,
  LOW_FREQUENCY_THRESHOLD,
  buildNextActions,
  computeAttendanceTrend,
  computeFrequencyStats,
  daysUntilBirthday,
  getCatechesisStatus,
  isLowFrequency,
} from "../shared/dashboardActions";
import type { EncounterFocus } from "../shared/encounter";

const NOW = new Date("2026-09-06T12:00:00");

function focus(
  partial: Partial<EncounterFocus> & {
    ctaAction?: EncounterFocus["primaryCta"]["action"];
  },
): EncounterFocus {
  const { ctaAction = "PREPARE", ...rest } = partial;
  return {
    meeting: {
      id: "m1",
      title: "Purgatório",
      theme: null,
      date: "2026-09-06T09:00:00.000Z",
      status: "NOT_STARTED",
      kind: "REGULAR",
      class: { id: "c1", name: "Crisma 1" },
      locationHint: "Paróquia",
    },
    focusKind: "today",
    primaryCta: { action: ctaAction, href: "/app/meetings/m1", labelKey: "x" },
    secondaryActions: [],
    notices: [],
    fetchedAt: NOW.toISOString(),
    ...rest,
  };
}

describe("computeFrequencyStats / isLowFrequency", () => {
  it("counts PRESENT and LATE as attended and tracks classes", () => {
    const stats = computeFrequencyStats([
      { catechumenProfileId: "a", status: "PRESENT", classId: "c1" },
      { catechumenProfileId: "a", status: "LATE", classId: "c1" },
      { catechumenProfileId: "a", status: "ABSENT", classId: "c2" },
      { catechumenProfileId: "a", status: "JUSTIFIED", classId: "c1" },
    ]);
    const a = stats.get("a")!;
    expect(a.total).toBe(4);
    expect(a.attended).toBe(2);
    expect(a.rate).toBe(50);
    expect(a.classIds).toEqual(["c1", "c2"]);
  });

  it("requires a minimum number of records before flagging", () => {
    expect(
      isLowFrequency({ total: LOW_FREQUENCY_MIN_RECORDS - 1, rate: 0 }),
    ).toBe(false);
    expect(
      isLowFrequency({
        total: LOW_FREQUENCY_MIN_RECORDS,
        rate: LOW_FREQUENCY_THRESHOLD - 1,
      }),
    ).toBe(true);
    expect(isLowFrequency({ total: 10, rate: LOW_FREQUENCY_THRESHOLD })).toBe(
      false,
    );
  });
});

describe("computeAttendanceTrend", () => {
  it("returns null without records in both windows", () => {
    expect(computeAttendanceTrend([], NOW)).toBeNull();
    expect(
      computeAttendanceTrend(
        [{ status: "PRESENT", date: new Date("2026-09-01") }],
        NOW,
      ),
    ).toBeNull();
  });

  it("computes delta in percentage points (current - previous)", () => {
    const recent = new Date("2026-09-01T10:00:00");
    const older = new Date("2026-08-01T10:00:00");
    const trend = computeAttendanceTrend(
      [
        { status: "PRESENT", date: recent },
        { status: "ABSENT", date: recent },
        { status: "PRESENT", date: older },
        { status: "PRESENT", date: older },
        { status: "PRESENT", date: older },
        { status: "ABSENT", date: older },
      ],
      NOW,
    );
    expect(trend).toEqual({ current: 50, previous: 75, deltaPct: -25 });
  });

  it("ignores records dated in the future", () => {
    const trend = computeAttendanceTrend(
      [
        { status: "PRESENT", date: new Date("2026-09-01") },
        { status: "PRESENT", date: new Date("2026-08-01") },
        { status: "ABSENT", date: new Date("2026-12-01") },
      ],
      NOW,
    );
    expect(trend).toEqual({ current: 100, previous: 100, deltaPct: 0 });
  });
});

describe("daysUntilBirthday", () => {
  it("handles today, later this year and next year", () => {
    expect(daysUntilBirthday(new Date("2010-09-06T00:00:00Z"), NOW)).toBe(0);
    expect(daysUntilBirthday(new Date("2010-09-27T00:00:00Z"), NOW)).toBe(21);
    expect(daysUntilBirthday(new Date("2010-01-05T00:00:00Z"), NOW)).toBe(121);
  });
});

describe("buildNextActions", () => {
  const baseStats = {
    pendingSacraments: 0,
    pendingAttendanceMeeting: null,
    lowFrequency: { count: 0, threshold: LOW_FREQUENCY_THRESHOLD, sample: [] },
    upcomingBirthdays: [],
  };

  it("returns no actions when everything is up to date", () => {
    const actions = buildNextActions(baseStats, null, NOW);
    expect(actions).toEqual([]);
    expect(getCatechesisStatus(actions)).toBe("ok");
  });

  it("orders by priority: prepare (high) > register attendance > low frequency > info", () => {
    const actions = buildNextActions(
      {
        pendingSacraments: 2,
        pendingAttendanceMeeting: {
          id: "m0",
          date: "2026-08-30T09:00:00.000Z",
          class: { id: "c1", name: "Crisma 1" },
          enrollmentCount: 21,
        },
        lowFrequency: {
          count: 3,
          threshold: LOW_FREQUENCY_THRESHOLD,
          sample: [{ id: "p1", firstName: "Ana", lastName: "Lima", rate: 40 }],
        },
        upcomingBirthdays: [
          {
            id: "p2",
            firstName: "Emily",
            lastName: "Santos",
            birthDate: "2011-09-10T00:00:00.000Z",
            daysUntil: 4,
            className: "Crisma 1",
          },
        ],
      },
      focus({ ctaAction: "PREPARE" }),
      NOW,
    );

    expect(actions.map((a) => a.id)).toEqual([
      "prepare_meeting",
      "register_attendance",
      "low_frequency",
      "birthday",
      "pending_sacraments",
    ]);
    expect(actions[0].priority).toBe("high");
    expect(actions[0].href).toBe("/app/meetings/m1");
    expect(actions[0].meta).toMatchObject({
      className: "Crisma 1",
      meetingTitle: "Purgatório",
      location: "Paróquia",
    });
    expect(actions[1].href).toBe("/app/classes/c1/attendance?meetingId=m0");
    expect(actions[1].meta.count).toBe(21);
    expect(actions[2].meta).toMatchObject({ count: 3, names: "Ana" });
    expect(actions[3].meta).toMatchObject({
      name: "Emily Santos",
      daysUntil: 4,
    });
    expect(getCatechesisStatus(actions)).toBe("action_needed");
  });

  it("does not duplicate the focus meeting as pending attendance", () => {
    const actions = buildNextActions(
      {
        ...baseStats,
        pendingAttendanceMeeting: {
          id: "m1",
          date: "2026-09-06T09:00:00.000Z",
          class: { id: "c1", name: "Crisma 1" },
          enrollmentCount: 21,
        },
      },
      focus({ ctaAction: "CONTINUE_ATTENDANCE", focusKind: "in_progress" }),
      NOW,
    );
    expect(actions.map((a) => a.id)).toEqual(["continue_attendance"]);
  });

  it("ignores the focus meeting when it is only a recent past encounter", () => {
    const actions = buildNextActions(
      baseStats,
      focus({ ctaAction: "PREPARE", focusKind: "recent" }),
      NOW,
    );
    expect(actions).toEqual([]);
  });

  it("treats START of an upcoming encounter as informational", () => {
    const actions = buildNextActions(
      baseStats,
      focus({ ctaAction: "START", focusKind: "upcoming" }),
      NOW,
    );
    expect(actions[0]).toMatchObject({ id: "start_meeting", priority: "info" });
    expect(getCatechesisStatus(actions)).toBe("ok");
  });

  it("only surfaces birthdays inside the action window", () => {
    const far = buildNextActions(
      {
        ...baseStats,
        upcomingBirthdays: [
          {
            id: "p2",
            firstName: "Emily",
            lastName: "Santos",
            birthDate: "2011-10-01T00:00:00.000Z",
            daysUntil: BIRTHDAY_ACTION_WINDOW_DAYS + 1,
          },
        ],
      },
      null,
      NOW,
    );
    expect(far).toEqual([]);
  });

  it("maps attention-only situations to the attention status", () => {
    const actions = buildNextActions(
      {
        ...baseStats,
        lowFrequency: {
          count: 1,
          threshold: LOW_FREQUENCY_THRESHOLD,
          sample: [],
        },
      },
      null,
      NOW,
    );
    expect(getCatechesisStatus(actions)).toBe("attention");
  });
});
