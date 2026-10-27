import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("ClassEnrollment (classId, status) index", () => {
  it("declares additive composite index in schema and migration", () => {
    const schema = readFileSync(resolve(__dirname, "../../schema.prisma"), "utf8");
    const start = schema.indexOf("model ClassEnrollment");
    const block = schema.slice(start, start + 900);
    expect(block).toContain("@@index([classId, status])");

    const sql = readFileSync(
      resolve(
        __dirname,
        "../../migrations/20261026200000_class_enrollment_class_status_index/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain('CREATE INDEX "ClassEnrollment_classId_status_idx"');
    expect(sql).toContain('"ClassEnrollment"("classId", "status")');
    expect(sql).not.toMatch(/DROP|ALTER COLUMN|DELETE/i);
  });
});
