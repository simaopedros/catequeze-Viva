import { describe, expect, it } from "vitest";
import {
  hasUsablePassword,
  isValidBuyerEmail,
  normalizeBuyerEmail,
  splitBuyerName,
} from "./buyerAccount";
import { parseHotmartPostback } from "./postback";

describe("hotmart buyer account helpers", () => {
  it("normalizes case and whitespace and rejects an invalid address", () => {
    expect(normalizeBuyerEmail("  Ana@Example.com ")).toBe("ana@example.com");
    expect(normalizeBuyerEmail("   ")).toBeNull();
    expect(isValidBuyerEmail("ana@example.com")).toBe(true);
    expect(isValidBuyerEmail("not-an-email")).toBe(false);
    expect(isValidBuyerEmail("a@b")).toBe(false);
  });

  it("uses the buyer name and falls back to the email local part", () => {
    expect(splitBuyerName("  Ana   Silva  ", "ana@example.com")).toEqual({
      firstName: "Ana",
      lastName: "Silva",
    });
    expect(splitBuyerName("   ", "maria.souza@example.com")).toEqual({
      firstName: "maria",
      lastName: "souza",
    });
    expect(splitBuyerName(null, "@example.com")).toEqual({
      firstName: "Catequista",
      lastName: null,
    });
  });

  it("treats an unset marker as no password", () => {
    expect(hasUsablePassword("stored-hash")).toBe(true);
    expect(hasUsablePassword("unset.abc")).toBe(false);
    expect(hasUsablePassword("")).toBe(false);
    expect(hasUsablePassword(null)).toBe(false);
  });

  it("keeps the buyer name and a normalized email from the postback", () => {
    const parsed = parseHotmartPostback({
      id: "evt",
      event: "PURCHASE_APPROVED",
      version: "2.0.0",
      data: {
        product: { ucode: "ucode" },
        buyer: { email: "  Ana@Example.com ", name: "Ana Silva" },
        purchase: {
          transaction: "HP1",
          price: { value: 47 },
          original_offer_price: { value: 47 },
          approved_date: Date.parse("2026-11-06T15:00:00Z"),
        },
      },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.parsed.email).toBe("ana@example.com");
    expect(parsed.parsed.buyerName).toBe("Ana Silva");
  });
});
