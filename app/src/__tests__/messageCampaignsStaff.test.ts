import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("listMessageCampaigns staff gate", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/missingOperations.ts"),
    "utf8",
  );

  it("blocks family-only roles via assertStaffOperation", () => {
    const listBlock = ops.slice(
      ops.indexOf("export const listMessageCampaigns"),
      ops.indexOf("export const exportReport"),
    );
    expect(listBlock).toContain("requireWorkspaceAccess");
    expect(listBlock).toContain("assertStaffOperation");
    expect(listBlock).toContain("Apenas a equipe pastoral pode listar campanhas");
  });
});
