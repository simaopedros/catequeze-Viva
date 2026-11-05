import { createJWT, TimeSpan } from "wasp/auth/jwt";
import { config } from "wasp/server";

/**
 * Wasp's createPasswordResetLink hardcodes a 30 minute JWT and does not
 * accept an expiry. The reset page and resetPasswordAndInvalidateSessions
 * only require a JWT signed with the same secret and an `email` claim, so
 * the same mechanism can be minted here for 7 days. The token is single-use:
 * the reset action stores a RateLimitBucket marker until `exp`.
 */
export const HOTMART_SET_PASSWORD_TTL_DAYS = 7;
export const HOTMART_PASSWORD_RESET_PATH = "/password-reset";

export async function createHotmartSetPasswordLink(
  email: string,
): Promise<string> {
  const token = await createJWT(
    { email },
    { expiresIn: new TimeSpan(HOTMART_SET_PASSWORD_TTL_DAYS, "d") },
  );
  const base = String(config.frontendUrl || "https://catechis.app").replace(
    /\/$/,
    "",
  );
  return `${base}${HOTMART_PASSWORD_RESET_PATH}?token=${token}`;
}
