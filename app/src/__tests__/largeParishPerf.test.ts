import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("large parish performance guards", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/catechumenOperations.ts"),
    "utf8",
  );
  const limiter = readFileSync(
    resolve(__dirname, "../server/middleware/rateLimiter.ts"),
    "utf8",
  );
  const seed = readFileSync(
    resolve(__dirname, "../server/scripts/seedLargeParish.mjs"),
    "utf8",
  );

  it("listCatechumens uses nested ENROLLED filter instead of id IN materialization", () => {
    const start = ops.indexOf("if (access.isCatechist)");
    const block = ops.slice(start, start + 900);
    expect(block).toContain("enrollments:");
    expect(block).toContain('status: "ENROLLED"');
    expect(block).not.toContain("enrolledIds");
    expect(block).not.toContain("ClassEnrollment.findMany");
  });

  it("upload rate limit allows a normal document collection day", () => {
    const start = limiter.indexOf("export const uploadRateLimiter");
    const block = limiter.slice(start, start + 280);
    expect(block).toContain("max: 100");
  });

  it("large parish seed is gated for local use only", () => {
    expect(seed).toContain("ALLOW_LARGE_PARISH_SEED");
    expect(seed).toContain("CATECHUMEN_COUNT = 500");
    expect(seed).toContain("CLASS_COUNT = 30");
    expect(seed).toMatch(/prod|homolog/);
  });
});
