import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("getClassDetails family roster scope", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/classOperations.ts"),
    "utf8",
  );

  const start = ops.indexOf("export const getClassDetails");
  const next = ops.indexOf("export const ", start + 10);
  const fn = ops.slice(start, next > start ? next : undefined);

  it("requires ACTIVE membership for catechist class access", () => {
    expect(fn).toContain('status: "ACTIVE"');
    expect(fn).toContain("ClassCatechist.findFirst");
    expect(fn).toContain("Membership.findFirst");
  });

  it("filters enrollments to household/self for family surfaces", () => {
    expect(fn).toContain("familyEnrollmentFilter");
    expect(fn).toContain("enrollmentWhere");
    expect(fn).toContain("householdId: familyEnrollmentFilter.householdId");
    expect(fn).toContain("userId: familyEnrollmentFilter.userId");
    expect(fn).toContain("where: enrollmentWhere");
  });
});
