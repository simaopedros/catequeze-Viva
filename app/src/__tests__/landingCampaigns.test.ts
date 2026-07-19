import { describe, expect, it } from "vitest";
import { landingCampaigns } from "../landing-page/landingCampaigns";

describe("landing campaign contracts", () => {
  it("defines a distinct promise, demo and hero visual for each paid campaign", () => {
    const paid = [
      landingCampaigns.management,
      landingCampaigns.ai,
      landingCampaigns.attendance,
    ];
    expect(new Set(paid.map((item) => item.promise)).size).toBe(paid.length);
    expect(new Set(paid.map((item) => item.demonstration)).size).toBe(
      paid.length,
    );
    expect(new Set(paid.map((item) => item.heroVisual)).size).toBe(paid.length);
  });

  it("uses the honest no-card commitment consistently", () => {
    for (const campaign of Object.values(landingCampaigns)) {
      expect(campaign.cta).toEqual({
        destination: "/signup",
        commitment: "7-days-no-card",
      });
    }
  });
});
