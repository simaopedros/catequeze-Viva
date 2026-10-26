import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED = [
  "forgot_title",
  "forgot_submit",
  "forgot_success_title",
  "reset_title",
  "reset_submit",
  "reset_success_title",
  "reset_error_missing_token",
];

describe("password reset auth copy", () => {
  for (const lang of ["pt-BR", "en", "es"]) {
    it(`has ${lang} strings for forgot/reset forms`, () => {
      const json = JSON.parse(
        readFileSync(
          resolve(__dirname, `../i18n/locales/${lang}/auth.json`),
          "utf8",
        ),
      );
      for (const key of REQUIRED) {
        expect(typeof json[key]).toBe("string");
        expect(json[key].length).toBeGreaterThan(2);
      }
      // Must not leave the default Wasp English UI as the only path.
      const page = readFileSync(
        resolve(
          __dirname,
          "../auth/email-and-pass/RequestPasswordResetPage.tsx",
        ),
        "utf8",
      );
      expect(page).toContain("CustomForgotPasswordForm");
      expect(page).not.toMatch(
        /from ["']wasp\/client\/auth["'].*ForgotPasswordForm|ForgotPasswordForm.*from ["']wasp\/client\/auth["']/,
      );
      expect(page).not.toContain('from "wasp/client/auth"');
    });
  }
});
