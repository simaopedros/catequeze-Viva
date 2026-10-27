import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("listDocuments family entities", () => {
  const wasp = readFileSync(resolve(__dirname, "../../main.wasp"), "utf8");

  it("declares GuardianProfile, CatechumenProfile and Household", () => {
    const start = wasp.indexOf("query listDocuments");
    const block = wasp.slice(start, start + 350);
    expect(block).toContain("GuardianProfile");
    expect(block).toContain("CatechumenProfile");
    expect(block).toContain("Household");
    expect(block).toContain("Parish");
    expect(block).toContain("ClassCatechist");
  });
});
