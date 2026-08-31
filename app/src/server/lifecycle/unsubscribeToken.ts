import { createHmac, timingSafeEqual } from "node:crypto";

export function getLifecycleEmailSecret(): string {
  return (
    process.env.LIFECYCLE_EMAIL_SECRET ||
    process.env.JWT_SECRET ||
    process.env.MAINTENANCE_SECRET ||
    ""
  );
}

export function createUnsubscribeToken(userId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(userId).digest("base64url");
  return `${userId}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string | null | undefined,
  secret: string,
): string | null {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!userId || !sig) return null;
  const expected = createHmac("sha256", secret)
    .update(userId)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  return userId;
}
