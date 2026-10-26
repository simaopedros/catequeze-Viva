import { describe, expect, it } from "vitest";
import {
  isBirthDateAllowed,
  isPhoneAllowed,
  todayDateKey,
} from "../shared/personFields";
import {
  createCatechumenSchema,
  createHouseholdSchema,
} from "../client/validation/schemas";
import { getAgeFromDate } from "../i18n/format";

describe("personFields", () => {
  it("rejects future birth dates and accepts today/past", () => {
    const now = new Date(2026, 9, 26);
    expect(isBirthDateAllowed("2026-10-26", now)).toBe(true);
    expect(isBirthDateAllowed("2026-10-27", now)).toBe(false);
    expect(isBirthDateAllowed("", now)).toBe(true);
    expect(todayDateKey(now)).toBe("2026-10-26");
  });

  it("rejects short phone numbers like 123", () => {
    expect(isPhoneAllowed("123")).toBe(false);
    expect(isPhoneAllowed("(11) 98888-7777")).toBe(true);
    expect(isPhoneAllowed("")).toBe(true);
  });
});

describe("create schemas", () => {
  it("blocks future birth dates on catechumen create", () => {
    const future = "2999-01-01";
    const result = createCatechumenSchema.safeParse({
      firstName: "Ana",
      lastName: "Silva",
      birthDate: future,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "birth_date_future"),
      ).toBe(true);
    }
  });

  it("blocks phone 123 on household create", () => {
    const result = createHouseholdSchema.safeParse({
      name: "Família Silva",
      phone: "123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "phone_invalid"),
      ).toBe(true);
    }
  });
});

describe("getAgeFromDate", () => {
  it("does not return negative ages for future dates", () => {
    expect(getAgeFromDate("2999-01-01")).toBeNull();
  });
});
