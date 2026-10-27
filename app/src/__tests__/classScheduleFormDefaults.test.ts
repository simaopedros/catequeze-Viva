import { describe, expect, it } from "vitest";
import {
  classScheduleFormDefaults,
  classSchedulePayload,
  formatClassSchedule,
} from "../shared/classSchedule";

const dayLabel = (i: number) =>
  ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][i];

describe("classScheduleFormDefaults", () => {
  it("loads stored day and times without inventing Saturday defaults", () => {
    expect(
      classScheduleFormDefaults({
        dayOfWeek: "1",
        startTime: "19:00",
        endTime: "20:30",
      }),
    ).toEqual({
      dayOfWeek: "1",
      startTime: "19:00",
      endTime: "20:30",
    });
  });

  it("normalizes weekday aliases into select values 0-6", () => {
    expect(
      classScheduleFormDefaults({
        dayOfWeek: "segunda-feira",
        startTime: "09:00",
        endTime: null,
      }),
    ).toEqual({
      dayOfWeek: "1",
      startTime: "09:00",
      endTime: "",
    });
  });

  it("leaves blanks when nothing is stored (sem horário)", () => {
    expect(classScheduleFormDefaults({})).toEqual({
      dayOfWeek: "",
      startTime: "",
      endTime: "",
    });
    expect(classScheduleFormDefaults(null)).toEqual({
      dayOfWeek: "",
      startTime: "",
      endTime: "",
    });
    expect(
      classScheduleFormDefaults({
        dayOfWeek: null,
        startTime: null,
        endTime: null,
      }),
    ).toEqual({
      dayOfWeek: "",
      startTime: "",
      endTime: "",
    });
  });
});

describe("classSchedulePayload", () => {
  it("keeps a no-op blank save as null instead of Saturday defaults", () => {
    expect(
      classSchedulePayload({ dayOfWeek: "", startTime: "", endTime: "" }),
    ).toEqual({
      dayOfWeek: null,
      startTime: null,
      endTime: null,
    });
  });

  it("preserves an untouched stored schedule", () => {
    expect(
      classSchedulePayload({
        dayOfWeek: "1",
        startTime: "19:00",
        endTime: "20:30",
      }),
    ).toEqual({
      dayOfWeek: "1",
      startTime: "19:00",
      endTime: "20:30",
    });
  });
});

describe("formatClassSchedule consistency", () => {
  it("uses stored day only — does not invent a day from meetings", () => {
    expect(
      formatClassSchedule(
        {
          dayOfWeek: null,
          meetings: [{ date: "2026-03-16" }], // Monday
        },
        dayLabel,
        "Sem horário",
      ),
    ).toBe("Sem horário");
  });

  it("shows stored day and time when present", () => {
    expect(
      formatClassSchedule(
        { dayOfWeek: "1", startTime: "19:00", endTime: "20:30" },
        dayLabel,
        "Sem horário",
      ),
    ).toBe("Segunda-feira 19:00-20:30");
  });
});
