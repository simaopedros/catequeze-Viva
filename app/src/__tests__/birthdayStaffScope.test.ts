import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("listUpcomingBirthdays staff scope", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/pastoralReportOperations.ts"),
    "utf8",
  );

  it("requires coordinator/catechist when classId is provided", () => {
    expect(ops).toContain("listUpcomingBirthdays");
    expect(ops).toContain("isCoordinatorOrAbove");
    expect(ops).toContain("isCatechist");
    expect(ops).toContain(
      "Apenas coordenadores e catequistas podem consultar aniversários da turma.",
    );
  });
});
