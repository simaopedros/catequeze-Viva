import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from "wasp/server/auth";
import { rewriteClientLinkForFamilyPortal } from "../emailLinkUtils";

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
        <p>Se você criou conta no <strong>portal da família</strong>, use este link:</p>
        <a href="${familyLink}">Verificar email (portal da família)</a>
        <br /><br />
    `
    : "";

  const familyText = familyLink
    ? `\n\nPortal da família: ${familyLink}`
    : "";

  return {
    subject: "Confirme seu email — Catequese Viva",
    text: `Clique no link para verificar seu email: ${verificationLink}${familyText}`,
    html: `
        <p>Clique no link abaixo para verificar seu email:</p>
        <a href="${verificationLink}">Verificar email</a>
        <br /><br />
        ${familyBlock}
        <p style="color:#666;font-size:12px">Se você não criou esta conta, ignore este email.</p>
    `,
  };
};

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({
  passwordResetLink,
}) => {
  const familyLink = familyPortalVerificationLink(passwordResetLink);

  return {
    subject: "Redefinir senha — Catequese Viva",
    text: `Clique no link para redefinir sua senha: ${passwordResetLink}${
      familyLink ? `\n\nPortal da família: ${familyLink}` : ""
    }`,
    html: `
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${passwordResetLink}">Redefinir senha</a>
        ${
          familyLink
            ? `<br /><br /><p>Ou no portal da família:</p><a href="${familyLink}">Redefinir senha (família)</a>`
            : ""
        }
    `,
  };
};
