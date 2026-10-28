import { describe, expect, it } from "vitest";
import {
  canEditOrganizationName,
  isOrganizationNameValid,
  organizationNameDismissKey,
  ORGANIZATION_NAME_DISMISS_MS as week,
  shouldShowOrganizationNameNotice as show,
} from "../shared/organizationName";
describe("organization name validation", () => {
  it.each(["PARISH", "DIOCESE"])("requires a name for %s", (type) => {
    for (const name of [null, undefined, "", " \n "])
      expect(isOrganizationNameValid(type, name)).toBe(false);
    expect(isOrganizationNameValid(type, " São José ")).toBe(true);
  });
  it("keeps individual names optional", () =>
    expect(isOrganizationNameValid("PERSONAL", "")).toBe(true));
});
describe("organization name notice", () => {
  const input = { type: "PARISH", name: null, canEdit: true, now: 2 * week };
  it("shows missing institutional names only for editors", () => {
    expect(show(input)).toBe(true);
    expect(show({ ...input, type: "DIOCESE", name: "  " })).toBe(true);
    expect(show({ ...input, name: "São José" })).toBe(false);
    expect(show({ ...input, type: "PERSONAL" })).toBe(false);
    expect(show({ ...input, canEdit: false })).toBe(false);
  });
  it("dismisses for exactly seven days across visits", () => {
    const dismissedAt = String(input.now);
    expect(show({ ...input, dismissedAt })).toBe(false);
    expect(show({ ...input, dismissedAt, now: input.now + week - 1 })).toBe(
      false,
    );
    expect(show({ ...input, dismissedAt, now: input.now + week })).toBe(true);
  });
  it("handles corrupt timestamps and isolates users and workspaces", () => {
    for (const dismissedAt of ["broken", "Infinity", String(input.now + 1)])
      expect(show({ ...input, dismissedAt })).toBe(true);
    expect(organizationNameDismissKey("u1", "p1")).not.toBe(
      organizationNameDismissKey("u2", "p1"),
    );
    expect(organizationNameDismissKey("u1", "p1")).not.toBe(
      organizationNameDismissKey("u1", "p2"),
    );
  });
  it("respects editing roles", () => {
    for (const role of [
      "PARISH_COORDINATOR",
      "DIOCESE_ADMIN",
      "SUPER_ADMIN",
      "COMMUNITY_COORDINATOR",
    ])
      expect(canEditOrganizationName(role)).toBe(true);
    for (const role of [
      "CATECHIST",
      "GUARDIAN",
      "CATECHUMEN",
      "PASTORAL_VIEWER",
    ])
      expect(canEditOrganizationName(role)).toBe(false);
    expect(canEditOrganizationName("CATECHIST", true)).toBe(true);
  });
});
