import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const opsPath = resolve(__dirname, "../server/operations/catechumenOperations.ts");
const waspPath = resolve(__dirname, "../../main.wasp");

describe("catechumen household link hardening", () => {
  const ops = readFileSync(opsPath, "utf8");
  const wasp = readFileSync(waspPath, "utf8");

  it("validates household parish on create and update", () => {
    expect(ops).toContain(
      "A família deve pertencer à mesma paróquia do catequizando.",
    );
    expect(ops).toContain(
      "Não é possível alterar a família deste perfil.",
    );
    expect(ops).toMatch(
      /hasOwnProperty\.call\(data,\s*"householdId"\)/,
    );
  });

  it("declares Household on createCatechumen for the lookup", () => {
    const match = wasp.match(
      /action\s+createCatechumen\s*\{[\s\S]*?entities:\s*\[([^\]]+)\]/,
    );
    expect(match).toBeTruthy();
    const entities = match![1];
    expect(entities).toContain("Household");
  });
});
