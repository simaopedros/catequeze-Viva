import { describe, expect, it } from "vitest";
import {
  isUsableStripePriceId,
  readStripePriceEnv,
} from "../payment/stripePriceId";

/** Synthetic Stripe Price IDs that match the production format (not live account IDs). */
const TEST_MONTHLY = "price_1TestMonthlyXXXXXXXX";
const TEST_ANNUAL = "price_1TestAnnualXXXXXXXXX";

describe("isUsableStripePriceId", () => {
  it("accepts well-formed Stripe price ids", () => {
    expect(isUsableStripePriceId(TEST_MONTHLY)).toBe(true);
    expect(isUsableStripePriceId(TEST_ANNUAL)).toBe(true);
  });

  it("rejects placeholders, empty values, and leftover example ids", () => {
    expect(isUsableStripePriceId("")).toBe(false);
    expect(isUsableStripePriceId("price_...")).toBe(false);
    expect(isUsableStripePriceId("price_")).toBe(false);
    expect(isUsableStripePriceId("prod_xxxxxxxx")).toBe(false);
    expect(isUsableStripePriceId(undefined)).toBe(false);
  });
});

describe("readStripePriceEnv", () => {
  it("prefers a usable process.env id over a wasp placeholder", () => {
    expect(
      readStripePriceEnv(
        { STRIPE_SINGLE_PLAN_ID: "price_..." },
        { STRIPE_SINGLE_PLAN_ID: TEST_MONTHLY },
        "STRIPE_SINGLE_PLAN_ID",
      ),
    ).toBe(TEST_MONTHLY);
  });

  it("uses the wasp env when it already holds a usable price", () => {
    expect(
      readStripePriceEnv(
        { STRIPE_SINGLE_ANNUAL_PLAN_ID: TEST_ANNUAL },
        {},
        "STRIPE_SINGLE_ANNUAL_PLAN_ID",
      ),
    ).toBe(TEST_ANNUAL);
  });
});
