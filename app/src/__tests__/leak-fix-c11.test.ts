import { expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {},
  prisma: {},
}));
vi.mock("../server/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("../server/storage/documentStorage", () => ({
  deleteDocumentFile: vi.fn(),
}));
vi.mock("../server/storage/contentSourceStorage", () => ({
  deleteContentSourceFile: vi.fn(),
}));
import { listCatechumens } from "../server/operations/catechumenOperations";
import { listHouseholds } from "../server/operations/familyOperations";
import { getContentItem } from "../server/operations/contentOperations";
function context(role = "LEAD_CATECHIST") {
  return {
    user: { id: role, isAdmin: role === "ADMIN" },
    entities: {
      Parish: { findFirst: vi.fn().mockResolvedValue(null) },
      Membership: {
        findFirst: vi.fn().mockResolvedValue({
          id: "membership",
          role,
          communityId: role === "COMMUNITY_COORDINATOR" ? "community" : null,
        }),
        findMany: vi.fn().mockResolvedValue([{ parishId: "parish", role }]),
      },
      CatechesisClass: { findMany: vi.fn().mockResolvedValue([{ id: "a" }]) },
      ClassCatechist: {
        findMany: vi.fn().mockResolvedValue([{ classId: "a" }]),
      },
      GuardianProfile: {
        findUnique: vi.fn().mockResolvedValue({ householdId: "home" }),
        findMany: vi.fn().mockResolvedValue([{ householdId: "home" }]),
      },
      ClassEnrollment: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ catechumenProfileId: "person" }]),
      },
    } as any,
  };
}
function visible(where: any, id: string): boolean {
  if (!where) return true;
  if (where.class) return visible(where.class, id);
  if (where.classId) return where.classId.in.includes(id);
  if (where.id?.in) return where.id.in.includes(id);
  if (where.enrollments?.some?.catechumenProfile?.id) {
    return where.enrollments.some.catechumenProfile.OR[0].userId === "GUARDIAN";
  }
  if (where.enrollments) return ["a", "b"].includes(id);
  if (where.OR) return where.OR.some((w: any) => visible(w, id));
  return true;
}
it.each([
  "LEAD_CATECHIST",
  "COMMUNITY_COORDINATOR",
  "PARISH_COORDINATOR",
  "GUARDIAN",
  "ADMIN",
])("C-11: preserves legitimate enrollments for %s", async (role) => {
  const c = context(role);
  c.entities.CatechumenProfile = {
    findMany: vi.fn(async ({ select }: any) => [
      {
        enrollments: ["a", "b"]
          .filter((id) => visible(select.enrollments.where, id))
          .map((classId) => ({ classId })),
      },
    ]),
  };
  const rows = await listCatechumens({ workspaceId: "parish" }, c);
  expect(rows[0].enrollments.map((e: any) => e.classId)).toEqual(
    role === "LEAD_CATECHIST" || role === "COMMUNITY_COORDINATOR"
      ? ["a"]
      : ["a", "b"],
  );
});
it.each([
  "LEAD_CATECHIST",
  "COMMUNITY_COORDINATOR",
  "PARISH_COORDINATOR",
  "GUARDIAN",
  "ADMIN",
])("C-11: siblings and counts respect %s scope", async (role) => {
  const c = context(role);
  c.entities.CatechumenProfile = {
    findMany: vi.fn().mockResolvedValue([{ householdId: "home" }]),
  };
  c.entities.Household = {
    findMany: vi.fn(async ({ include }: any) => {
      const catechumens = ["a", "b"]
        .filter((id) =>
          visible(include.catechumens.where?.enrollments?.some, id),
        )
        .map((id) => ({ id }));
      return [
        {
          catechumens,
          _count: {
            catechumens: include._count.select.catechumens.where
              ? catechumens.length
              : 2,
          },
        },
      ];
    }),
  };
  const rows = await listHouseholds({ workspaceId: "parish" }, c);
  const ids =
    role === "LEAD_CATECHIST" || role === "COMMUNITY_COORDINATOR"
      ? ["a"]
      : ["a", "b"];
  expect(rows[0].catechumens).toEqual(ids.map((id) => ({ id })));
  expect(rows[0]._count.catechumens).toBe(ids.length);
});
it.each([
  "LEAD_CATECHIST",
  "COMMUNITY_COORDINATOR",
  "PARISH_COORDINATOR",
  "GUARDIAN",
  "ADMIN",
])(
  "C-11: shared content filters meetings and omits internal notes for %s",
  async (role) => {
    const c = context(role);
    c.entities.ContentItem = {
      findUnique: vi.fn(async ({ include }: any) => ({
        id: "content",
        parishId: "parish",
        status: "PUBLISHED",
        meetings: ["a", "b"]
          .filter((id) => visible(include.meetings.where, id))
          .map((classId) => ({
            classId,
            ...(include.meetings.select ? {} : { notes: "synthetic-private" }),
          })),
      })),
    };
    expect((await getContentItem({ id: "content" }, c)).meetings).toEqual(
      (role === "LEAD_CATECHIST" || role === "COMMUNITY_COORDINATOR"
        ? ["a"]
        : ["a", "b"]
      ).map((classId) => ({ classId })),
    );
  },
);
vi.mock("../server/operations/twoFactorOperations", () => ({
  assertTwoFactorSessionVerified: vi.fn(),
}));
import { getCatechumenProfile } from "../server/operations/catechumenOperations";
import { getCatechumenAttendanceReport } from "../server/operations/catechumenReportOperations";
import { listDocumentRequirements } from "../server/operations/documentStageOperations";
function profileContext(role: string) {
  const c = context(role);
  c.entities.GuardianProfile.findUnique.mockResolvedValue(
    role === "GUARDIAN" ? { householdId: "home" } : null,
  );
  c.entities.DocumentStageRule = { findMany: vi.fn().mockResolvedValue([]) };
  const profile = (select: any) => ({
    id: "person",
    parishId: "parish",
    householdId: "home",
    parish: { dioceseId: null },
    documents: [],
    sponsors: [],
    enrollments: ["a", "b"]
      .filter((id) => visible(select.enrollments.where, id))
      .map((classId) => ({
        classId,
        status: "ENROLLED",
        class: {
          id: classId,
          parishId: "parish",
          documentStageKind:
            classId === "a" ? "PRE_CATECHESIS" : "FIRST_EUCHARIST",
        },
      })),
    attendanceRecords: ["a", "b"]
      .filter((id) => visible(select.attendanceRecords?.where?.meeting, id))
      .map((classId) => ({
        status: classId === "a" ? "PRESENT" : "ABSENT",
        meeting: {
          title: classId,
          date: new Date("2026-01-01"),
          class: { name: classId },
        },
      })),
  });
  c.entities.CatechumenProfile = {
    findUnique: vi.fn(async ({ select }: any) => profile(select)),
    findMany: vi.fn(async ({ select }: any) => [profile(select)]),
  };
  return c;
}
for (const surface of ["profile", "report", "requirements"]) {
  it.each([
    "LEAD_CATECHIST",
    "COMMUNITY_COORDINATOR",
    "PARISH_COORDINATOR",
    "GUARDIAN",
    "ADMIN",
  ])(`C-11: ${surface} respects %s visibility`, async (role) => {
    const c = profileContext(role);
    const scoped =
      role === "LEAD_CATECHIST" || role === "COMMUNITY_COORDINATOR";
    if (surface === "profile") {
      const profile = await getCatechumenProfile({ id: "person" }, c);
      expect(profile.enrollments.map((e: any) => e.classId)).toEqual(
        scoped ? ["a"] : ["a", "b"],
      );
      expect(
        profile.documentRequirements.missing.includes("BAPTISM_CERTIFICATE"),
      ).toBe(!scoped);
    } else if (surface === "report") {
      const report = await getCatechumenAttendanceReport(
        { catechumenId: "person" },
        c,
      );
      expect(report?.total).toBe(scoped ? 1 : 2);
      expect(report?.records.map((r: any) => r.meetingTitle)).toEqual(
        scoped ? ["a"] : ["a", "b"],
      );
    } else {
      const requirements = await listDocumentRequirements(
        { workspaceId: "parish" },
        c,
      );
      expect(requirements[0].missing.includes("BAPTISM_CERTIFICATE")).toBe(
        !scoped,
      );
    }
  });
}
