import { describe, expect, it } from "vitest";
import {
  isUsableStripePriceId,
  readStripePriceEnv,
} from "../payment/stripePriceId";

/** Homolog Stripe TEST prices already on the VPS — do not invent others. */
const HOMOLOG_TEST_MONTHLY = "price_1U9lJjQ654W7D9A6bWCcgQBP";
const HOMOLOG_TEST_ANNUAL = "price_1U9lJvQ654W7D9A6ji7lHdJi";

describe("isUsableStripePriceId", () => {
  it("accepts the homolog TEST Plano Único prices", () => {
    expect(isUsableStripePriceId(HOMOLOG_TEST_MONTHLY)).toBe(true);
    expect(isUsableStripePriceId(HOMOLOG_TEST_ANNUAL)).toBe(true);
  });

  it("rejects placeholders, empty values, and leftover example ids", () => {
    expect(isUsableStripePriceId("")).toBe(false);
    expect(isUsableStripePriceId("price_...")).toBe(false);
    expect(isUsableStripePriceId("price_")).toBe(false);
    expect(isUsableStripePriceId("prod_VA5UCaJ0fQvwMo")).toBe(false);
    expect(isUsableStripePriceId(undefined)).toBe(false);
  });
});

describe("readStripePriceEnv", () => {
  it("prefers a usable process.env TEST id over a wasp placeholder", () => {
    expect(
      readStripePriceEnv(
        { STRIPE_SINGLE_PLAN_ID: "price_..." },
        { STRIPE_SINGLE_PLAN_ID: HOMOLOG_TEST_MONTHLY },
        "STRIPE_SINGLE_PLAN_ID",
      ),
    ).toBe(HOMOLOG_TEST_MONTHLY);
  });

  it("uses the wasp env when it already holds the TEST price", () => {
    expect(
      readStripePriceEnv(
        { STRIPE_SINGLE_ANNUAL_PLAN_ID: HOMOLOG_TEST_ANNUAL },
        {},
        "STRIPE_SINGLE_ANNUAL_PLAN_ID",
      ),
    ).toBe(HOMOLOG_TEST_ANNUAL);
  });
});
