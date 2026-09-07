import { describe, expect, it } from "vitest";
import {
  ancestorOwners,
  annotateOrigin,
  canAdaptResource,
  canDismissResource,
  canEditResource,
  canPublishAt,
  cascadesToChildren,
  defaultPolicyFor,
  findCalendarConflicts,
  ownerTypeFromWorkspace,
  shouldPropagateUpdate,
  toDateKey,
  visibilityScopeForOwner,
} from "../shared/resourceInheritance";

describe("resource inheritance contract", () => {
  it("maps workspace types to owner types", () => {
    expect(ownerTypeFromWorkspace("DIOCESE")).toBe("DIOCESE");
    expect(ownerTypeFromWorkspace("PARISH")).toBe("PARISH");
    expect(ownerTypeFromWorkspace("PERSONAL")).toBe("PARISH");
    expect(ownerTypeFromWorkspace("COMMUNITY")).toBe("COMMUNITY");
  });

  it("lists ancestors for a class under a parish in a diocese", () => {
    const ancestors = ancestorOwners({
      ownerType: "CLASS",
      ownerId: "class-1",
      dioceseId: "dio-1",
      parishId: "parish-1",
      communityId: "comm-1",
      classId: "class-1",
    });
    expect(ancestors).toEqual([
      { ownerType: "DIOCESE", ownerId: "dio-1" },
      { ownerType: "PARISH", ownerId: "parish-1" },
      { ownerType: "COMMUNITY", ownerId: "comm-1" },
    ]);
  });

  it("does not treat the viewer as its own ancestor", () => {
    const ancestors = ancestorOwners({
      ownerType: "DIOCESE",
      ownerId: "dio-1",
      dioceseId: "dio-1",
    });
    expect(ancestors).toEqual([]);
  });

  it("skips diocese ancestors when the parish is standalone", () => {
    const ancestors = ancestorOwners({
      ownerType: "PARISH",
      ownerId: "parish-1",
      parishId: "parish-1",
    });
    expect(ancestors).toEqual([]);
  });

  it("defaults calendar diocese events to required+extendable", () => {
    expect(defaultPolicyFor("CALENDAR", "DIOCESE")).toBe("REQUIRED_EXTENDABLE");
    expect(defaultPolicyFor("OFFICIAL", "DIOCESE")).toBe("LOCKED");
    expect(defaultPolicyFor("CONTENT", "DIOCESE")).toBe("SUGGESTED");
    expect(defaultPolicyFor("CALENDAR", "CLASS")).toBe("LOCAL");
  });

  it("only cascades non-local policies", () => {
    expect(cascadesToChildren("LOCKED")).toBe(true);
    expect(cascadesToChildren("REQUIRED_EXTENDABLE")).toBe(true);
    expect(cascadesToChildren("SUGGESTED")).toBe(true);
    expect(cascadesToChildren("LOCAL")).toBe(false);
  });

  it("freezes adapted copies and keeps inherited ones live", () => {
    expect(shouldPropagateUpdate("INHERITED")).toBe(true);
    expect(shouldPropagateUpdate(null)).toBe(true);
    expect(shouldPropagateUpdate("ADAPTED")).toBe(false);
    expect(shouldPropagateUpdate("DISMISSED")).toBe(false);
  });

  it("restricts who can publish at each level", () => {
    expect(canPublishAt("DIOCESE_ADMIN", "DIOCESE")).toBe(true);
    expect(canPublishAt("PARISH_COORDINATOR", "DIOCESE")).toBe(false);
    expect(canPublishAt("PARISH_COORDINATOR", "PARISH")).toBe(true);
    expect(canPublishAt("LEAD_CATECHIST", "PARISH")).toBe(false);
    expect(canPublishAt("LEAD_CATECHIST", "CLASS")).toBe(true);
    expect(canPublishAt("GUARDIAN", "CLASS", true)).toBe(true);
  });

  it("locks inherited official items against parish edits", () => {
    expect(
      canEditResource({
        role: "PARISH_COORDINATOR",
        actorOwnerType: "PARISH",
        resourceOwnerType: "DIOCESE",
        policy: "LOCKED",
      }),
    ).toBe(false);
    expect(
      canEditResource({
        role: "DIOCESE_ADMIN",
        actorOwnerType: "DIOCESE",
        resourceOwnerType: "DIOCESE",
        policy: "LOCKED",
      }),
    ).toBe(true);
  });

  it("allows adapting suggested items and dismissing only suggested ones", () => {
    expect(canAdaptResource("SUGGESTED")).toBe(true);
    expect(canAdaptResource("REQUIRED_EXTENDABLE")).toBe(true);
    expect(canAdaptResource("LOCKED")).toBe(false);
    expect(canDismissResource("SUGGESTED")).toBe(true);
    expect(canDismissResource("LOCKED")).toBe(false);
    expect(canDismissResource("REQUIRED_EXTENDABLE")).toBe(false);
  });

  it("annotates origin as inherited when the viewer is downstream", () => {
    const origin = annotateOrigin({
      ownerType: "DIOCESE",
      ownerId: "dio-1",
      policy: "REQUIRED_EXTENDABLE",
      viewerOwnerType: "PARISH",
    });
    expect(origin.inherited).toBe(true);
    expect(origin.labelKey).toBe("origin.diocese");
    expect(origin.adoptionStatus).toBe("INHERITED");
  });

  it("maps owner type to visibility scope", () => {
    expect(visibilityScopeForOwner("DIOCESE")).toBe("DIOCESE");
    expect(visibilityScopeForOwner("PLATFORM")).toBe("GLOBAL");
    expect(visibilityScopeForOwner("CLASS")).toBe("CLASS");
  });
});

describe("layered calendar conflicts", () => {
  it("flags a class meeting on the same day as a diocese event", () => {
    const conflicts = findCalendarConflicts(
      [
        {
          id: "dio-event",
          name: "Semana catequética",
          date: "2026-09-12T00:00:00.000Z",
          ownerType: "DIOCESE",
          inheritancePolicy: "REQUIRED_EXTENDABLE",
        },
      ],
      [
        {
          id: "meeting-1",
          name: "Encontro 7",
          date: "2026-09-12T19:00:00.000Z",
          kind: "meeting",
        },
      ],
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].dateKey).toBe("2026-09-12");
    expect(conflicts[0].inherited.name).toBe("Semana catequética");
    expect(conflicts[0].local.kind).toBe("meeting");
  });

  it("does not flag suggested inherited events as conflicts", () => {
    const conflicts = findCalendarConflicts(
      [
        {
          id: "dio-event",
          name: "Opcional",
          date: "2026-09-12",
          ownerType: "DIOCESE",
          inheritancePolicy: "SUGGESTED",
        },
      ],
      [{ id: "m1", name: "Encontro", date: "2026-09-12", kind: "meeting" }],
    );
    expect(conflicts).toHaveLength(0);
  });

  it("normalizes date keys from ISO and date-only strings", () => {
    expect(toDateKey("2026-09-12T15:00:00.000Z")).toBe("2026-09-12");
    expect(toDateKey("2026-09-12")).toBe("2026-09-12");
  });
});
