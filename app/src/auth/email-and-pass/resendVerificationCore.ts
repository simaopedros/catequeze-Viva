export const VERIFICATION_RESEND_INTERVAL_MS = 60 * 1000;

export type VerificationIdentity = {
  email: string;
  isEmailVerified: boolean;
  emailVerificationSentAt: string | null;
};

export type ResendVerificationDeps = {
  findIdentity: (email: string) => Promise<VerificationIdentity | null>;
  sendVerification: (email: string) => Promise<void>;
  now?: () => Date;
};

export type ResendVerificationOutcome =
  | "sent"
  | "unknown_email"
  | "already_verified"
  | "throttled";

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function isVerificationResendAllowed(
  sentAt: string | null,
  now: Date,
  intervalMs: number = VERIFICATION_RESEND_INTERVAL_MS,
): boolean {
  if (!sentAt) return true;
  const sent = new Date(sentAt).getTime();
  if (Number.isNaN(sent)) return true;
  return now.getTime() - sent > intervalMs;
}

/**
 * Re-sends the confirmation link for an existing, unverified email identity.
 * Never creates, deletes or updates the user or its password. Callers must
 * answer the same way for every outcome so the endpoint can't be used to
 * discover which emails have accounts.
 */
export async function resendVerificationEmailCore(
  email: string,
  deps: ResendVerificationDeps,
): Promise<ResendVerificationOutcome> {
  const identity = await deps.findIdentity(email);
  if (!identity) return "unknown_email";
  if (identity.isEmailVerified) return "already_verified";
  const now = deps.now ? deps.now() : new Date();
  if (!isVerificationResendAllowed(identity.emailVerificationSentAt, now)) {
    return "throttled";
  }
  await deps.sendVerification(identity.email);
  return "sent";
}
