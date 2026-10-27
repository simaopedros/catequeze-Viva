import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("family login CTA", () => {
  it("uses family create-account copy on the family portal", () => {
    const form = readFileSync(
      resolve(__dirname, "../auth/CustomLoginForm.tsx"),
      "utf8",
    );
    expect(form).toContain("login_create_account_family");
    expect(form).toContain("isFamilyPortalHost()");
    const pt = JSON.parse(
      readFileSync(
        resolve(__dirname, "../i18n/locales/pt-BR/auth.json"),
        "utf8",
      ),
    );
    expect(pt.login_create_account_family).toMatch(/família/i);
    expect(pt.login_create_account_family).not.toMatch(/7 dias/i);
  });
});
