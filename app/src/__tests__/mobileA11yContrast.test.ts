import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("mobile a11y contrast polish (360px surfaces)", () => {
  const login = readFileSync(
    resolve(__dirname, "../auth/CustomLoginForm.tsx"),
    "utf8",
  );
  const familyLogin = readFileSync(
    resolve(__dirname, "../catequese/pages/family/FamilyLoginPage.tsx"),
    "utf8",
  );
  const reset = readFileSync(
    resolve(__dirname, "../auth/email-and-pass/CustomResetPasswordForm.tsx"),
    "utf8",
  );

  it("avoids 11px muted helper copy on login", () => {
    expect(login).not.toContain("text-[11px]");
    expect(login).toContain("text-sm font-medium text-brand-ink");
    expect(login).toContain("focus-visible:ring-2");
    expect(login).not.toContain("tabIndex={-1}");
  });

  it("keeps family portal helper copy at readable size", () => {
    expect(familyLogin).toContain('className="text-sm text-muted-foreground"');
    expect(familyLogin).not.toMatch(/token_hint[\s\S]{0,80}text-xs/);
  });

  it("gives reset password toggle a visible focus ring", () => {
    expect(reset).toContain("focus-visible:ring-2");
    expect(reset).toContain('className="text-sm text-muted-foreground"');
  });

  it("keeps Turmas chrome labels at least text-xs without light muted /60", () => {
    const classesPage = readFileSync(
      resolve(__dirname, "../catequese/pages/ClassesPage.tsx"),
      "utf8",
    );
    const detailPage = readFileSync(
      resolve(__dirname, "../catequese/pages/ClassDetailPage.tsx"),
      "utf8",
    );
    const attendancePage = readFileSync(
      resolve(__dirname, "../catequese/pages/AttendancePage.tsx"),
      "utf8",
    );
    const chrome = readFileSync(
      resolve(__dirname, "../client/components/brand/AppChrome.tsx"),
      "utf8",
    );
    for (const src of [classesPage, detailPage, attendancePage]) {
      expect(src).not.toContain("text-[11px]");
      expect(src).not.toContain("text-[10px]");
      expect(src).not.toContain("text-muted-foreground/60");
    }
    expect(chrome).toContain(
      "text-overline font-semibold uppercase text-muted-foreground",
    );
    expect(chrome).toContain(
      "text-xs font-medium tracking-wide text-muted-foreground",
    );
  });
});
