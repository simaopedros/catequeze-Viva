import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("content draft access", () => {
  const access = readFileSync(
    resolve(__dirname, "../server/auth/contentAccess.ts"),
    "utf8",
  );
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/contentOperations.ts"),
    "utf8",
  );

  it("blocks unpublished parish content for non-staff members", () => {
    expect(access).toContain("isUnpublishedContentStatus");
    expect(access).toContain("Você não tem acesso a este rascunho.");
    expect(access).toContain("getUserRoleAndParish(context, item.parishId)");
  });

  it("scopes getUserRoleAndParish to the content parish when provided", () => {
    const start = access.indexOf("export async function getUserRoleAndParish");
    const block = access.slice(start, start + 700);
    expect(block).toContain("parishId?: string | null");
    expect(block).toContain("...(parishId ? { parishId } : {})");
  });

  it("listContentItems hides drafts from non-staff by default", () => {
    expect(ops).toContain("staffCanSeeDrafts");
    expect(ops).toContain('status: { in: ["APPROVED", "PUBLISHED"] }');
  });
});
