/**
 * Additive funnel tracking helpers. Recording only — never throws to callers.
 * Metadata must not include PII (no emails).
 */

export const FUNNEL_EVENT_TYPE = {
  CHECKOUT_STARTED: "checkout_started",
  EMAIL_VERIFIED: "email_verified",
  ONBOARDING_COMPLETED: "onboarding_completed",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  PAYMENT_FAILED: "payment_failed",
} as const;

export type FunnelEventType =
  (typeof FUNNEL_EVENT_TYPE)[keyof typeof FUNNEL_EVENT_TYPE];

export const FUNNEL_EVENT_SOURCE = {
  CHECKOUT: "checkout",
  AUTH: "auth",
  ONBOARDING: "onboarding",
  STRIPE_WEBHOOK: "stripe_webhook",
} as const;

export type FunnelEventSource =
  (typeof FUNNEL_EVENT_SOURCE)[keyof typeof FUNNEL_EVENT_SOURCE];

export type FunnelEventDelegate = {
  findUnique?: (args: {
    where: { externalId: string };
  }) => Promise<{ id: string } | null>;
  create: (args: {
    data: {
      userId?: string | null;
      type: string;
      source: string;
      externalId?: string | null;
      metadata?: unknown;
    };
  }) => Promise<unknown>;
};

export type UserFunnelDelegate = {
  updateMany: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<{ count: number }>;
};

type RecordArgs = {
  funnelEvent: FunnelEventDelegate | null | undefined;
  userId?: string | null;
  type: FunnelEventType | string;
  source: FunnelEventSource | string;
  externalId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Idempotent create when externalId is set (unique). Swallows all errors.
 */
export async function recordFunnelEvent(args: RecordArgs): Promise<boolean> {
  const delegate = args.funnelEvent;
  if (!delegate?.create) return false;

  const externalId = args.externalId?.trim() || null;

  try {
    if (externalId && typeof delegate.findUnique === "function") {
      const existing = await delegate.findUnique({
        where: { externalId },
      });
      if (existing) return false;
    }

    await delegate.create({
      data: {
        userId: args.userId ?? null,
        type: args.type,
        source: args.source,
        externalId,
        metadata: args.metadata ?? undefined,
      },
    });
    return true;
  } catch (error: any) {
    // Unique race on externalId — treat as already recorded
    if (error?.code === "P2002") return false;
    return false;
  }
}

/**
 * Sets User.onboardingCompletedAt once and records funnel event.
 */
export async function markOnboardingCompletedOnce(args: {
  user: UserFunnelDelegate | null | undefined;
  funnelEvent: FunnelEventDelegate | null | undefined;
  userId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<boolean> {
  if (!args.userId || !args.user?.updateMany) return false;

  try {
    const updated = await args.user.updateMany({
      where: { id: args.userId, onboardingCompletedAt: null },
      data: { onboardingCompletedAt: new Date() },
    });
    if (!updated?.count) return false;

    await recordFunnelEvent({
      funnelEvent: args.funnelEvent,
      userId: args.userId,
      type: FUNNEL_EVENT_TYPE.ONBOARDING_COMPLETED,
      source: FUNNEL_EVENT_SOURCE.ONBOARDING,
      externalId: `onboarding_completed_${args.userId}`,
      metadata: args.metadata ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sets User.emailVerifiedAt once and records funnel event.
 */
export async function markEmailVerifiedOnce(args: {
  user: UserFunnelDelegate | null | undefined;
  funnelEvent: FunnelEventDelegate | null | undefined;
  userId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<boolean> {
  if (!args.userId || !args.user?.updateMany) return false;

  try {
    const updated = await args.user.updateMany({
      where: { id: args.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
    if (!updated?.count) return false;

    await recordFunnelEvent({
      funnelEvent: args.funnelEvent,
      userId: args.userId,
      type: FUNNEL_EVENT_TYPE.EMAIL_VERIFIED,
      source: FUNNEL_EVENT_SOURCE.AUTH,
      externalId: `email_verified_${args.userId}`,
      metadata: args.metadata ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Resolve FunnelEvent delegate from Wasp context.entities or raw prisma. */
export function getFunnelEventDelegate(
  entitiesOrPrisma: any,
): FunnelEventDelegate | null {
  if (!entitiesOrPrisma) return null;
  return (
    entitiesOrPrisma.FunnelEvent ??
    entitiesOrPrisma.funnelEvent ??
    null
  );
}

export function getUserDelegate(entitiesOrPrisma: any): UserFunnelDelegate | null {
  if (!entitiesOrPrisma) return null;
  return entitiesOrPrisma.User ?? entitiesOrPrisma.user ?? null;
}
