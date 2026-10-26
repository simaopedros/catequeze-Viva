import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("listMessageCampaigns staff gate", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/missingOperations.ts"),
    "utf8",
  );

  it("uses assertCanWriteParish instead of bare requireWorkspaceAccess", () => {
    const listBlock = ops.slice(
      ops.indexOf("export const listMessageCampaigns"),
      ops.indexOf("export const exportReport"),
    );
    expect(listBlock).toContain("assertCanWriteParish");
    expect(listBlock).not.toContain("requireWorkspaceAccess");
  });
});
