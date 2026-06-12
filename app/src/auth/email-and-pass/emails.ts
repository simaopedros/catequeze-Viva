import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from "wasp/server/auth";
import i18n from "../../i18n/config";
import { rewriteClientLinkForFamilyPortal } from "../emailLinkUtils";

const t = (key: string) => i18n.t(key, { ns: "auth", lng: "pt-BR" });

function familyPortalVerificationLink(verificationLink: string): string | null {
  return rewriteClientLinkForFamilyPortal(
    verificationLink,
    process.env.FAMILY_PORTAL_HOST,
  );
}

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({
  verificationLink,
}) => {
  const familyLink = familyPortalVerificationLink(verificationLink);
  const familyBlock = familyLink
    ? `
        <p>${t("email_verification_family_body")}</p>
        <a href="${familyLink}">${t("email_verification_family_button")}</a>
        <br /><br />
    `
    : "";

  const familyText = familyLink
    ? `\n\n${t("email_portal_label")} ${familyLink}`
    : "";

  return {
    subject: t("email_verification_subject"),
    text: `${t("email_verification_body")} ${verificationLink}${familyText}`,
    html: `
        <p>${t("email_verification_body")}</p>
        <a href="${verificationLink}">${t("email_verification_button")}</a>
        <br /><br />
        ${familyBlock}
        <p style="color:#666;font-size:12px">${t("email_footer_disclaimer")}</p>
    `,
  };
};

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({
  passwordResetLink,
}) => {
  const familyLink = familyPortalVerificationLink(passwordResetLink);

  return {
    subject: t("password_reset_subject"),
    text: `${t("password_reset_body")} ${passwordResetLink}${
      familyLink ? `\n\n${t("email_portal_label")} ${familyLink}` : ""
    }`,
    html: `
        <p>${t("password_reset_body")}</p>
        <a href="${passwordResetLink}">${t("password_reset_button")}</a>
        ${
          familyLink
            ? `<br /><br /><p>${t("password_reset_family_alt")}</p><a href="${familyLink}">${t("password_reset_family_button")}</a>`
            : ""
        }
    `,
  };
};
