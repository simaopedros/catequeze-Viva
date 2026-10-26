import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { audienceAllowsRole } from "../shared/pastoralAnnouncementAudience";

describe("pastoral announcement scope", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/pastoralAnnouncementOperations.ts"),
    "utf8",
  );

  it("maps audience to roles", () => {
    expect(audienceAllowsRole("all", "GUARDIAN")).toBe(true);
    expect(audienceAllowsRole("families", "GUARDIAN")).toBe(true);
    expect(audienceAllowsRole("families", "LEAD_CATECHIST")).toBe(false);
    expect(audienceAllowsRole("catechists", "LEAD_CATECHIST")).toBe(true);
    expect(audienceAllowsRole("coordinators", "PARISH_COORDINATOR")).toBe(true);
    expect(audienceAllowsRole("coordinators", "GUARDIAN")).toBe(false);
  });

  it("hides drafts from non-publishers and scopes acknowledge/republish", () => {
    expect(ops).toContain("canPublishAt");
    expect(ops).toContain('status: "PUBLISHED"');
    expect(ops).toContain("audienceAllowsRole");
    expect(ops).toContain("resolveActorForResource");
    expect(ops).toContain("actorCanViewOfficialResource");
  });
});
