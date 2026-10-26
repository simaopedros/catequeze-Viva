import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("createHousehold requires parishId", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/familyOperations.ts"),
    "utf8",
  );

  it("does not fall back to findFirst membership for parishId", () => {
    const createBlock = ops.slice(
      ops.indexOf("export const createHousehold"),
      ops.indexOf("export const addGuardianToHousehold"),
    );
    expect(createBlock).toContain(
      "É necessário especificar uma paróquia para criar a família.",
    );
    expect(createBlock).not.toContain("findFirst");
    expect(createBlock).toContain("args.parishId");
  });
});
