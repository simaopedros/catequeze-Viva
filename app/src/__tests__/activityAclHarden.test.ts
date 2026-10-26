import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("activity ACL hardening", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/activityOperations.ts"),
    "utf8",
  );

  it("createActivity requires pastoral staff roles", () => {
    const start = ops.indexOf("export const createActivity");
    const block = ops.slice(start, start + 500);
    expect(block).toContain("assertCanCreateActivity");
    expect(ops).toContain("Apenas a equipe pastoral pode criar atividades.");
  });

  it("listActivitiesByContent scopes submissions for non-staff", () => {
    const start = ops.indexOf("export const listActivitiesByContent");
    const block = ops.slice(start, start + 900);
    expect(block).toContain("familyCatechumenIds");
    expect(block).toContain("submissionFilter");
  });

  it("submitActivity ignores client score unless staff", () => {
    const start = ops.indexOf("export const submitActivity");
    const block = ops.slice(start, start + 4500);
    expect(block).toContain("staffScorer");
    expect(block).toContain("const score = staffScorer ? args.score : undefined");
    expect(block).not.toMatch(
      /parishIds\.includes\(activity\.content\.parishId\)\s*\{\s*authorized = true;\s*\}/,
    );
  });
});
