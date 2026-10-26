import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  inviteAcceptErrorKind,
  inviteErrorDescKey,
  inviteErrorTitleKey,
} from "../shared/inviteAcceptErrors";

describe("family invite UX", () => {
  const acceptPage = readFileSync(
    resolve(__dirname, "../catequese/pages/family/InviteAcceptPage.tsx"),
    "utf8",
  );
  const codePage = readFileSync(
    resolve(__dirname, "../catequese/pages/family/FamilyInviteCodePage.tsx"),
    "utf8",
  );
  const staffPage = readFileSync(
    resolve(__dirname, "../catequese/pages/FamilyPortalInvitesPage.tsx"),
    "utf8",
  );
  const pt = JSON.parse(
    readFileSync(
      resolve(__dirname, "../i18n/locales/pt-BR/family.json"),
      "utf8",
    ),
  );

  it("maps HTTP statuses to invite error kinds", () => {
    expect(inviteAcceptErrorKind({ statusCode: 410 })).toBe("expired");
    expect(inviteAcceptErrorKind({ statusCode: 404 })).toBe("not_found");
    expect(inviteAcceptErrorKind({ statusCode: 403 })).toBe("wrong_email");
    expect(inviteAcceptErrorKind({ statusCode: 400 })).toBe("already_used");
    expect(
      inviteAcceptErrorKind({ message: "Este convite expirou." }),
    ).toBe("expired");
    expect(
      inviteAcceptErrorKind({
        message: "Este convite é para outro endereço de email.",
      }),
    ).toBe("wrong_email");
  });

  it("exposes Portuguese titles/descriptions for each kind", () => {
    for (const kind of [
      "expired",
      "wrong_email",
      "already_used",
      "not_found",
      "generic",
    ] as const) {
      const titleKey = inviteErrorTitleKey(kind);
      const descKey = inviteErrorDescKey(kind);
      expect(pt.invite[titleKey]).toBeTruthy();
      expect(pt.invite[descKey]).toBeTruthy();
      expect(String(pt.invite[descKey])).toMatch(/[A-Za-zÀ-ú]/);
    }
  });

  it("accept page wires error kinds and next-step copy", () => {
    expect(acceptPage).toContain("inviteAcceptErrorKind");
    expect(acceptPage).toContain("invite.status_pending");
    expect(acceptPage).toContain("invite.what_to_do_title");
    expect(acceptPage).toContain("InviteErrorState");
  });

  it("code page validates empty input and explains expired invites", () => {
    expect(codePage).toContain("invite_code.empty_error");
    expect(codePage).toContain("invite_code.help_expired");
    expect(pt.invite_code.empty_error).toMatch(/código/i);
  });

  it("staff list clarifies expired vs pending next actions", () => {
    expect(staffPage).toContain("status_expired_hint");
    expect(staffPage).toContain("resend_expired");
    expect(pt.portal_invites.status_expired_hint).toMatch(/Expirado/i);
  });
});
