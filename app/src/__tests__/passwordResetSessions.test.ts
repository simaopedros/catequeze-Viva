import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("password reset invalidates sessions", () => {
  const ops = readFileSync(
    resolve(__dirname, "../server/operations/userOperations.ts"),
    "utf8",
  );
  const form = readFileSync(
    resolve(__dirname, "../auth/email-and-pass/CustomResetPasswordForm.tsx"),
    "utf8",
  );
  const wasp = readFileSync(resolve(__dirname, "../../main.wasp"), "utf8");

  it("server action deletes Lucia sessions after hash update", () => {
    const start = ops.indexOf(
      "export const resetPasswordAndInvalidateSessions",
    );
    const block = ops.slice(start, start + 1800);
    expect(block).toContain("updateAuthIdentityProviderData");
    expect(block).toContain("session.deleteMany");
    expect(block).toContain("validateJWT");
  });

  it("reset form uses the session-invalidating action", () => {
    expect(form).toContain("resetPasswordAndInvalidateSessions");
    expect(form).not.toMatch(/from "wasp\/client\/auth"/);
  });

  it("declares public auth:false action in main.wasp", () => {
    const start = wasp.indexOf("action resetPasswordAndInvalidateSessions");
    const block = wasp.slice(start, start + 280);
    expect(block).toContain("auth: false");
  });
});
