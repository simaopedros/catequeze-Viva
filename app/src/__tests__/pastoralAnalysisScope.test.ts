import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("getCatechumenPastoralAnalysis staff scope", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/pastoralReportOperations.ts"),
    "utf8",
  );

  it("requires coordinator/catechist after assertCanAccessClass", () => {
    const start = ops.indexOf("export const getCatechumenPastoralAnalysis");
    const end = ops.indexOf("export const listUpcomingBirthdays", start);
    const block = ops.slice(start, end);
    expect(block).toContain("requireWorkspaceAccess");
    expect(block).toContain("isCoordinatorOrAbove");
    expect(block).toContain("isCatechist");
    expect(block).toContain(
      "Apenas coordenadores e catequistas podem aceder à análise pastoral.",
    );
  });
});
