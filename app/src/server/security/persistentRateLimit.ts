/**
 * Postgres-backed rate limiting via RateLimitBucket.
 * Fail-open on DB errors so auth/invites stay available if the table is down.
 */
import { randomUUID } from "crypto";
import { HttpError, prisma } from "wasp/server";
import { logger } from "../logger";

export { maskInviteEmail } from "./inviteEmailMask";

export type PersistentRateLimitConfig = {
  /** Logical bucket prefix, e.g. "auth-fail-ip" or "invite-accept" */
  scope: string;
  /** Max requests allowed in the window */
  max: number;
  /** Window length in milliseconds */
  windowMs: number;
  message?: string;
};

export type RateLimitConsumeResult = {
  allowed: boolean;
  /** Seconds until the window resets (when denied) */
  retryAfterSec?: number;
  /** True when the check was skipped due to a DB error */
  failedOpen?: boolean;
};

function bucketKey(scope: string, id: string): string {
  return `${scope}:${id || "unknown"}`;
}

/**
 * Read-only check for `scope`+`id` (no increment).
 * Expired windows (resetAt <= now) are treated as empty.
 * Fail-open on DB errors.
 */
export async function peekPersistentRateLimit(
  id: string,
  config: PersistentRateLimitConfig,
): Promise<RateLimitConsumeResult> {
  const key = bucketKey(config.scope, id);
  const now = new Date();

  try {
    const rows = await prisma.$queryRaw<
      Array<{ count: number; resetAt: Date }>
    >`
      SELECT "count", "resetAt"
      FROM "RateLimitBucket"
      WHERE "key" = ${key}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row || new Date(row.resetAt) <= now) {
      return { allowed: true };
    }

    const count = Number(row.count);
    // Block when already at/above max so the next attempt is denied without consume.
    if (count >= config.max) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((new Date(row.resetAt).getTime() - now.getTime()) / 1000),
      );
      return { allowed: false, retryAfterSec };
    }

    return { allowed: true };
  } catch (err) {
    logger.warn("[rateLimit] fail-open on DB error", {
      scope: config.scope,
      error: err instanceof Error ? err.message : String(err),
    });
    return { allowed: true, failedOpen: true };
  }
}

/**
 * Atomically consume one slot for `scope`+`id`.
 * Returns whether the request is allowed (fail-open on DB errors).
 */
export async function consumePersistentRateLimit(
  id: string,
  config: PersistentRateLimitConfig,
): Promise<RateLimitConsumeResult> {
  const key = bucketKey(config.scope, id);
  const now = new Date();
  const resetAt = new Date(now.getTime() + config.windowMs);

  try {
    const rows = await prisma.$queryRaw<
      Array<{ count: number; resetAt: Date }>
    >`
      INSERT INTO "RateLimitBucket" ("id", "createdAt", "updatedAt", "key", "count", "resetAt")
      VALUES (${randomUUID()}, ${now}, ${now}, ${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt}
          ELSE "RateLimitBucket"."resetAt"
        END,
        "updatedAt" = ${now}
      RETURNING "count", "resetAt"
    `;

    const row = rows[0];
    if (!row) {
      logger.warn("[rateLimit] fail-open: empty RETURNING row", {
        scope: config.scope,
      });
      return { allowed: true, failedOpen: true };
    }

    // PG INTEGER via $queryRaw may arrive as number or bigint
    const count = Number(row.count);
    if (count > config.max) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((new Date(row.resetAt).getTime() - now.getTime()) / 1000),
      );
      return { allowed: false, retryAfterSec };
    }

    return { allowed: true };
  } catch (err) {
    logger.warn("[rateLimit] fail-open on DB error", {
      scope: config.scope,
      error: err instanceof Error ? err.message : String(err),
    });
    return { allowed: true, failedOpen: true };
  }
}

/** Throw HttpError 429 when the persistent limiter denies the request. */
export async function assertPersistentRateLimit(
  id: string,
  config: PersistentRateLimitConfig,
): Promise<void> {
  const result = await consumePersistentRateLimit(id, config);
  if (result.allowed) return;
  throw new HttpError(
    429,
    config.message || "Muitas tentativas. Tente novamente em breve.",
  );
}

/**
 * Auth failure buckets: only incremented on 4xx (except 429) after the request.
 * Email bucket key is ip + ":" + sha256(normalized identifier), never plaintext.
 */
export const AUTH_FAIL_EMAIL_RATE_LIMIT: PersistentRateLimitConfig = {
  scope: "auth-fail-email",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Muitas tentativas. Aguarde 15 minutos.",
};

export const AUTH_FAIL_IP_RATE_LIMIT: PersistentRateLimitConfig = {
  scope: "auth-fail-ip",
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Muitas tentativas. Aguarde 15 minutos.",
};

export const INVITE_LOOKUP_RATE_LIMIT: PersistentRateLimitConfig = {
  scope: "invite-lookup",
  windowMs: 60 * 1000,
  max: 10,
  message: "Muitas tentativas. Tente novamente em breve.",
};

export const INVITE_CREATE_RATE_LIMIT: PersistentRateLimitConfig = {
  scope: "invite-create",
  windowMs: 60 * 1000,
  max: 20,
  message: "Muitas tentativas. Tente novamente em breve.",
};

export const INVITE_RESEND_RATE_LIMIT: PersistentRateLimitConfig = {
  scope: "invite-resend",
  windowMs: 60 * 1000,
  max: 10,
  message: "Muitas tentativas. Tente novamente em breve.",
};

export const INVITE_ACCEPT_RATE_LIMIT: PersistentRateLimitConfig = {
  scope: "invite-accept",
  windowMs: 60 * 1000,
  max: 20,
  message: "Muitas tentativas. Tente novamente em breve.",
};
