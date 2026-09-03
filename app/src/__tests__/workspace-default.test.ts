import { describe, expect, it } from "vitest";
import {
  isInstitutionalWorkspaceType,
  pickDefaultWorkspaceId,
} from "../shared/workspace";

describe("isInstitutionalWorkspaceType", () => {
  it("accepts parish, diocese and community", () => {
    expect(isInstitutionalWorkspaceType("PARISH")).toBe(true);
    expect(isInstitutionalWorkspaceType("DIOCESE")).toBe(true);
    expect(isInstitutionalWorkspaceType("COMMUNITY")).toBe(true);
  });

  it("rejects personal and unknown", () => {
    expect(isInstitutionalWorkspaceType("PERSONAL")).toBe(false);
    expect(isInstitutionalWorkspaceType(null)).toBe(false);
    expect(isInstitutionalWorkspaceType(undefined)).toBe(false);
  });
});

describe("pickDefaultWorkspaceId", () => {
  const personal = { id: "personal-1", isPersonal: true, type: "PERSONAL" };
  const parish = { id: "parish-1", isPersonal: false, type: "PARISH" };
  const other = { id: "parish-2", isPersonal: false, type: "PARISH" };

  it("keeps a still-valid stored workspace", () => {
    expect(pickDefaultWorkspaceId([personal, parish], "personal-1")).toBe(
      "personal-1",
    );
  });

  it("prefers an institutional parish when nothing is stored", () => {
    expect(pickDefaultWorkspaceId([personal, parish], null)).toBe("parish-1");
    expect(pickDefaultWorkspaceId([personal, parish])).toBe("parish-1");
  });

  it("falls back to personal when the stored id is stale", () => {
    expect(pickDefaultWorkspaceId([personal], "gone")).toBe("personal-1");
  });

  it("falls back to personal when there is no institutional workspace", () => {
    expect(pickDefaultWorkspaceId([personal], null)).toBe("personal-1");
  });

  it("picks the first institutional parish among several", () => {
    expect(pickDefaultWorkspaceId([personal, parish, other], null)).toBe(
      "parish-1",
    );
  });
});
