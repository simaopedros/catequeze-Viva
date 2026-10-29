import { describe, expect, it, vi } from "vitest";
vi.mock("wasp/server", () => ({
  HttpError: class extends Error {
    constructor(
      public statusCode: number,
      message?: string,
    ) {
      super(message);
    }
  },
  prisma: {},
}));
import {
  listActivitiesByContent,
  submitActivity,
} from "../server/operations/activityOperations";
// Synthetic Prisma-like filtering makes both returned data and ACL predicates observable.
function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([key, value]: any) => {
    if (key === "AND") return value.every((part: any) => matches(row, part));
    if (key === "OR") return value.some((part: any) => matches(row, part));
    if (value && typeof value === "object") {
      if ("in" in value) return value.in.includes(row[key]);
      if ("some" in value)
        return (row[key] || []).some((item: any) => matches(item, value.some));
      if ("is" in value) return matches(row[key], value.is);
      return matches(row[key], value);
    }
    return row[key] === value;
  });
}
const students = [
  {
    id: "student",
    parishId: "parish",
    enrollments: [{ classId: "assigned", class: { parishId: "parish" } }],
  },
  {
    id: "other-class",
    parishId: "parish",
    enrollments: [{ classId: "other", class: { parishId: "parish" } }],
  },
  { id: "foreign", parishId: "foreign-parish", enrollments: [] },
];
function context(role = "LEAD_CATECHIST", _permitted = false) {
  const write = vi.fn(async ({ select }: any) =>
    select ? { id: "submission" } : { id: "submission", answer: "private" },
  );
  return {
    user: { id: "actor", isAdmin: role === "ADMIN" },
    entities: {
      Membership: {
        findMany: vi.fn().mockResolvedValue([{ parishId: "parish", role }]),
        findFirst: vi.fn().mockResolvedValue({ role }),
      },
      Parish: { findFirst: vi.fn().mockResolvedValue(null) },
      ClassCatechist: {
        findMany: vi.fn().mockResolvedValue([{ classId: "assigned" }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      ContentItem: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ parishId: "parish", createdById: "other" }),
      },
      Activity: {
        findUnique: vi.fn().mockResolvedValue({
          contentId: "content",
          content: { parishId: "parish" },
        }),
        findMany: vi.fn(async ({ include }: any) => [
          {
            submissions: students
              .map((student) => ({
                catechumenProfileId: student.id,
                catechumenProfile: student,
                answer: "synthetic",
              }))
              .filter(
                (submission) =>
                  include.submissions === true ||
                  matches(submission, include.submissions.where),
              ),
          },
        ]),
      },
      GuardianProfile: {
        findUnique: vi
          .fn()
          .mockResolvedValue(
            role === "GUARDIAN" ? { householdId: "own" } : null,
          ),
      },
      CatechumenProfile: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ userId: null, household: null }),
        findFirst: vi.fn(
          async ({ where }: any) =>
            students.find((student) => matches(student, where)) || null,
        ),
        findMany: vi
          .fn()
          .mockResolvedValue(role === "GUARDIAN" ? [{ id: "student" }] : []),
      },
      ClassEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
      ActivitySubmission: {
        findFirst: vi.fn().mockResolvedValue({ id: "submission" }),
        update: write,
        create: write,
      },
    },
  };
}
describe("C-02", () => {
  it("does not expose unrelated submissions", async () => {
    expect(
      (
        await listActivitiesByContent({ contentId: "content" }, context())
      )[0].submissions.map((s: any) => s.catechumenProfileId),
    ).toEqual(["student"]);
  });
  it.each(["LEAD_CATECHIST", "PARISH_COORDINATOR"])(
    "rejects foreign student for %s",
    async (role) => {
      const c = context(role);
      await expect(
        submitActivity(
          { activityId: "activity", catechumenProfileId: "foreign" },
          c,
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(c.entities.ActivitySubmission.findFirst).not.toHaveBeenCalled();
    },
  );
  it.each(["LEAD_CATECHIST", "PARISH_COORDINATOR", "GUARDIAN", "ADMIN"])(
    "preserves legitimate %s",
    async (role) => {
      const c = context(role, true);
      expect(
        await submitActivity(
          {
            activityId: "activity",
            catechumenProfileId: "student",
            answer: "new",
            score: 8,
          },
          c,
        ),
      ).toEqual({ id: "submission" });
      if (role === "GUARDIAN")
        expect(
          c.entities.ActivitySubmission.update.mock.calls[0][0].data,
        ).not.toHaveProperty("score");
    },
  );
});

it("rejects another class in the same parish", async () => {
  const c = context();
  await expect(
    submitActivity(
      { activityId: "activity", catechumenProfileId: "other-class" },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(c.entities.ActivitySubmission.update).not.toHaveBeenCalled();
});
it.each(["PARISH_COORDINATOR", "GUARDIAN", "ADMIN", "CONTENT_REVIEWER"])(
  "lists legitimate submissions for %s",
  async (role) => {
    const rows = await listActivitiesByContent(
      { contentId: "content" },
      context(role),
    );
    expect(rows[0].submissions.map((s: any) => s.catechumenProfileId)).toEqual(
      role === "GUARDIAN" ? ["student"] : ["student", "other-class"],
    );
  },
);
it("authorizes content independently from student", async () => {
  const c = context("GUARDIAN", true);
  c.entities.ContentItem.findUnique.mockResolvedValue({
    parishId: "foreign-parish",
    createdById: "other",
  });
  await expect(
    submitActivity(
      { activityId: "activity", catechumenProfileId: "student" },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(c.entities.ActivitySubmission.findFirst).not.toHaveBeenCalled();
});
it("creates a new authorized submission with a minimal response", async () => {
  const c = context("GUARDIAN", true);
  c.entities.ActivitySubmission.findFirst.mockResolvedValue(null as any);
  expect(
    await submitActivity(
      {
        activityId: "activity",
        catechumenProfileId: "student",
        answer: "new",
        score: 9,
      },
      c,
    ),
  ).toEqual({ id: "submission" });
  expect(c.entities.ActivitySubmission.create).toHaveBeenCalledWith(
    expect.objectContaining({
      select: { id: true },
      data: expect.objectContaining({ score: null }),
    }),
  );
});
it("rejects empty submission even for authorized staff", async () => {
  const c = context("PARISH_COORDINATOR");
  await expect(
    submitActivity(
      { activityId: "activity", catechumenProfileId: "student" },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(c.entities.ActivitySubmission.findFirst).not.toHaveBeenCalled();
});
it("does not expose submissions to a catechist without assigned classes", async () => {
  const c = context();
  c.entities.ClassCatechist.findMany.mockResolvedValue([]);
  expect(
    (await listActivitiesByContent({ contentId: "content" }, c))[0].submissions,
  ).toEqual([]);
});
it("allows the catechumen to submit without assigning their own score", async () => {
  const c = context("CATECHUMEN");
  c.entities.CatechumenProfile.findMany.mockResolvedValue([{ id: "student" }]);
  expect(
    await submitActivity(
      {
        activityId: "activity",
        catechumenProfileId: "student",
        answer: "new",
        score: 8,
      },
      c,
    ),
  ).toEqual({ id: "submission" });
  expect(
    c.entities.ActivitySubmission.update.mock.calls[0][0].data,
  ).not.toHaveProperty("score");
});
it("preserves assigned teacher submission to their content without a parish", async () => {
  const c = context();
  c.entities.ContentItem.findUnique.mockResolvedValue({
    parishId: null,
    createdById: "actor",
  } as any);
  c.entities.CatechumenProfile.findUnique.mockResolvedValue({
    id: "student",
    userId: null,
    household: null,
    parishId: "parish",
    enrollments: [
      { classId: "assigned", class: { id: "assigned", parishId: "parish" } },
    ],
  } as any);
  expect(
    await submitActivity(
      {
        activityId: "activity",
        catechumenProfileId: "student",
        answer: "new",
        score: 8,
      },
      c,
    ),
  ).toEqual({ id: "submission" });
  expect(c.entities.ActivitySubmission.update.mock.calls[0][0].data.score).toBe(
    8,
  );
});
it("scopes submissions for a community coordinator", async () => {
  const c = context("COMMUNITY_COORDINATOR");
  c.entities.Membership.findFirst.mockResolvedValue({
    role: "COMMUNITY_COORDINATOR",
    communityId: "community",
  } as any);
  (c.entities as any).CatechesisClass = {
    findMany: vi.fn().mockResolvedValue([{ id: "assigned" }]),
  };
  expect(
    (
      await listActivitiesByContent({ contentId: "content" }, c)
    )[0].submissions.map((s: any) => s.catechumenProfileId),
  ).toEqual(["student"]);
  await expect(
    submitActivity(
      {
        activityId: "activity",
        catechumenProfileId: "other-class",
        answer: "new",
      },
      c,
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
});
