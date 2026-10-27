import { createHmac } from 'node:crypto';
import { emailFromVerificationToken } from '../emailLinkUtils';

/** Verification tokens expire in 48 hours (was effectively ~1y / Wasp default). */
export const EMAIL_VERIFICATION_TTL_SECONDS = 48 * 60 * 60;

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function jwtSecret(): string {
  // Same source as wasp/server config.auth.jwtSecret — avoid importing wasp/server
  // here so unit tests that load email builders stay lightweight.
  return process.env.JWT_SECRET || 'DEVJWTSECRET';
}

/**
 * Mint an HS256 JWT compatible with Wasp/oslo validateJWT.
 * Sync so getVerificationEmailContent can re-issue links with our TTL.
 */
export function mintEmailVerificationToken(
  email: string,
  ttlSeconds: number = EMAIL_VERIFICATION_TTL_SECONDS,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const header = base64urlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64urlJson({
    email,
    exp: nowSeconds + ttlSeconds,
  });
  const data = `${header}.${payload}`;
  const sig = createHmac('sha256', jwtSecret())
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

/** Replace the token in a Wasp verification URL with a 48h token. */
export function withEmailVerificationTtl(
  verificationLink: string,
  ttlSeconds: number = EMAIL_VERIFICATION_TTL_SECONDS,
): string {
  try {
    const url = new URL(verificationLink);
    const token = url.searchParams.get('token');
    if (!token) return verificationLink;
    const email = emailFromVerificationToken(token);
    if (!email) return verificationLink;
    url.searchParams.set('token', mintEmailVerificationToken(email, ttlSeconds));
    return url.toString();
  } catch {
    return verificationLink;
  }
}

export function emailVerificationTtlHours(): number {
  return EMAIL_VERIFICATION_TTL_SECONDS / 3600;
}
