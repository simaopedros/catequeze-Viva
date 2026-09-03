import { describe, it, expect } from "vitest";
import {
  canManageWorkspaceBilling,
  isBillingCollaboratorRole,
  isBillingManagerRole,
} from "../shared/billingAccess";

describe("billingAccess", () => {
  it("treats coordinators and personal owners as billing managers", () => {
    expect(isBillingManagerRole("PARISH_COORDINATOR")).toBe(true);
    expect(isBillingManagerRole("PERSONAL_OWNER")).toBe(true);
    expect(canManageWorkspaceBilling("PARISH_COORDINATOR")).toBe(true);
  });

  it("treats lead and assistant catechists as collaborators (not payers)", () => {
    expect(isBillingCollaboratorRole("LEAD_CATECHIST")).toBe(true);
    expect(isBillingCollaboratorRole("ASSISTANT_CATECHIST")).toBe(true);
    expect(canManageWorkspaceBilling("LEAD_CATECHIST")).toBe(false);
    expect(canManageWorkspaceBilling("ASSISTANT_CATECHIST")).toBe(false);
  });

  it("grants billing to personal workspace owner even if role empty", () => {
    expect(canManageWorkspaceBilling(null, { isPersonalOwner: true })).toBe(
      true,
    );
  });

  it("never treats collaborators as payers, even on a personal workspace flag", () => {
    expect(
      canManageWorkspaceBilling("ASSISTANT_CATECHIST", {
        isPersonalOwner: true,
      }),
    ).toBe(false);
    expect(
      canManageWorkspaceBilling("LEAD_CATECHIST", { isPersonalOwner: true }),
    ).toBe(false);
    expect(canManageWorkspaceBilling("CONTENT_REVIEWER")).toBe(false);
    expect(canManageWorkspaceBilling("GUARDIAN")).toBe(false);
  });
});
