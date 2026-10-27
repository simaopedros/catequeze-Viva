import { describe, expect, it } from "vitest";
import {
  aggregateEmailHealthByDay,
  aggregateEventCountsByMonth,
  aggregatePaidInvoicesByMonth,
  buildActivationRetention,
  buildTrialToPaidCohorts,
  displayAccountName,
  isLiveRevenueInvoice,
  isWithinDaysForward,
  lastNMonthKeys,
  mergeMonthlyCounts,
  monthKey,
  normalizeRecurringAmountToMonthlyBrl,
  pct,
  sumStripeMrrBrl,
} from "../server/operations/ownerDashboardHelpers";
import { formatMonthLabel, formatPercent } from "../i18n/format";

describe("ownerDashboardHelpers", () => {
  it("monthKey formats YYYY-MM in America/Sao_Paulo", () => {
    // 2024-01-15T15:00Z is still Jan 15 in São Paulo (UTC-3)
    expect(monthKey("2024-01-15T15:00:00.000Z")).toBe("2024-01");
  });

  it("lastNMonthKeys returns the requested count ending at current month", () => {
    const keys = lastNMonthKeys(3, new Date("2024-03-15T12:00:00.000Z"));
    expect(keys).toHaveLength(3);
    expect(keys[keys.length - 1]).toBe("2024-03");
  });

  it("aggregatePaidInvoicesByMonth sums BRL paid invoices and current month", () => {
    const months = ["2024-01", "2024-02", "2024-03"];
    const { byMonth, currentMonthTotalBrl, skippedNonLive } =
      aggregatePaidInvoicesByMonth(
        [
          {
            amountPaidCents: 990,
            currency: "brl",
            paidAt: "2024-01-10T12:00:00.000Z",
            status: "paid",
            livemode: true,
          },
          {
            amountPaidCents: 1980,
            currency: "brl",
            paidAt: "2024-03-05T12:00:00.000Z",
            status: "paid",
            livemode: true,
          },
          {
            amountPaidCents: 5000,
            currency: "usd",
            paidAt: "2024-03-05T12:00:00.000Z",
            status: "paid",
            livemode: true,
          },
          {
            amountPaidCents: 100,
            currency: "brl",
            paidAt: "2024-03-08T12:00:00.000Z",
            status: "open",
          },
          {
            amountPaidCents: 90,
            currency: "brl",
            paidAt: "2024-01-15T12:00:00.000Z",
            status: "paid",
            livemode: false,
          },
          {
            amountPaidCents: 0,
            currency: "brl",
            paidAt: "2024-02-01T12:00:00.000Z",
            status: "paid",
            livemode: true,
          },
        ],
        months,
      );
    expect(byMonth[0].amountBrl).toBe(9.9);
    expect(byMonth[1].amountBrl).toBe(0);
    expect(byMonth[2].amountBrl).toBe(19.8);
    expect(currentMonthTotalBrl).toBe(19.8);
    expect(skippedNonLive).toBe(2);
    expect(
      isLiveRevenueInvoice({
        amountPaidCents: 90,
        status: "paid",
        livemode: false,
        paidAt: "2024-01-01",
      }),
    ).toBe(false);
  });

  it("formatMonthLabel and formatPercent use pt-BR", () => {
    expect(formatMonthLabel("2025-11", "pt-BR")).toBe("nov/2025");
    expect(formatPercent(0, "pt-BR")).toBe("0,0%");
    expect(formatPercent(null, "pt-BR", { nullAsZero: true })).toBe("0,0%");
  });

  it("normalizeRecurringAmountToMonthlyBrl handles month and year intervals", () => {
    expect(
      normalizeRecurringAmountToMonthlyBrl({
        unitAmountCents: 990,
        interval: "month",
        quantity: 1,
      }),
    ).toBe(9.9);
    expect(
      normalizeRecurringAmountToMonthlyBrl({
        unitAmountCents: 11880,
        interval: "year",
        quantity: 1,
      }),
    ).toBe(9.9);
    expect(
      sumStripeMrrBrl([
        { unitAmountCents: 990, interval: "month", quantity: 2 },
        { unitAmountCents: 11880, interval: "year", quantity: 1 },
      ]),
    ).toBe(29.7);
  });

  it("buildTrialToPaidCohorts computes conversion rates", () => {
    const rows = buildTrialToPaidCohorts(
      [
        {
          userId: "a",
          signupAt: "2024-01-05T12:00:00.000Z",
          hadTrial: true,
          becamePaying: true,
        },
        {
          userId: "b",
          signupAt: "2024-01-20T12:00:00.000Z",
          hadTrial: true,
          becamePaying: false,
        },
        {
          userId: "c",
          signupAt: "2024-02-02T12:00:00.000Z",
          hadTrial: false,
          becamePaying: true,
        },
      ],
      ["2024-01", "2024-02"],
    );
    expect(rows[0]).toMatchObject({
      month: "2024-01",
      signups: 2,
      hadTrial: 2,
      becamePaying: 1,
      trialToPaidRate: 50,
    });
    expect(rows[1].trialToPaidRate).toBeNull();
    expect(pct(1, 0)).toBeNull();
  });

  it("buildActivationRetention skips activeLast7d when disabled", () => {
    const rows = buildActivationRetention(
      [
        {
          userId: "a",
          signupAt: "2024-01-05T12:00:00.000Z",
          createdClass: true,
          recordedAttendance: false,
          activeLast7d: true,
        },
        {
          userId: "b",
          signupAt: "2024-01-06T12:00:00.000Z",
          createdClass: false,
          recordedAttendance: true,
          activeLast7d: false,
        },
      ],
      ["2024-01"],
      { includeActiveLast7d: false },
    );
    expect(rows[0].createdClassPct).toBe(50);
    expect(rows[0].recordedAttendancePct).toBe(50);
    expect(rows[0].activeLast7dPct).toBeNull();
  });

  it("aggregateEmailHealthByDay buckets statuses", () => {
    const days = ["2024-03-01", "2024-03-02"];
    const result = aggregateEmailHealthByDay(
      [
        { createdAt: "2024-03-01T15:00:00.000Z", status: "SENT" },
        { createdAt: "2024-03-01T16:00:00.000Z", status: "FAILED" },
        { createdAt: "2024-03-02T12:00:00.000Z", status: "QUEUED" },
        { createdAt: "2024-03-02T13:00:00.000Z", status: "DELIVERED" },
      ],
      days,
    );
    expect(result[0]).toMatchObject({ day: "2024-03-01", SENT: 1, FAILED: 1 });
    expect(result[1]).toMatchObject({ day: "2024-03-02", QUEUED: 1, SENT: 0 });
  });

  it("mergeMonthlyCounts and event counts combine sources", () => {
    const months = ["2024-01", "2024-02"];
    const a = aggregateEventCountsByMonth(
      [{ at: "2024-01-10T12:00:00.000Z" }, { at: "2024-01-11T12:00:00.000Z" }],
      months,
    );
    const b = aggregateEventCountsByMonth(
      [{ at: "2024-01-12T12:00:00.000Z" }, { at: "2024-02-01T12:00:00.000Z" }],
      months,
    );
    expect(mergeMonthlyCounts(a, b)).toEqual([
      { month: "2024-01", count: 3 },
      { month: "2024-02", count: 1 },
    ]);
  });

  it("displayAccountName and isWithinDaysForward helpers", () => {
    expect(
      displayAccountName({ firstName: "Ana", lastName: "Silva", email: "a@b.c" }),
    ).toBe("Ana Silva");
    expect(displayAccountName({ email: "a@b.c" })).toBe("a@b.c");
    expect(
      displayAccountName({ email: "a@b.c" }, { allowEmailFallback: false }),
    ).toBe("");
    const now = new Date("2024-03-01T12:00:00.000Z");
    expect(isWithinDaysForward("2024-03-05T12:00:00.000Z", now, 7)).toBe(true);
    expect(isWithinDaysForward("2024-03-20T12:00:00.000Z", now, 7)).toBe(false);
    expect(isWithinDaysForward("2024-02-20T12:00:00.000Z", now, 7)).toBe(false);
  });
});
