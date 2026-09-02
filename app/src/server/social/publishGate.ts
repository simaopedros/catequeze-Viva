/**
 * Publishing entitlement for the Comunidade (social) feed.
 *
 * Reading, opening and sharing posts is open to everyone, including anonymous
 * visitors. Authoring — posts, comments and reactions — requires an active
 * subscription, resolved with the same rules the rest of the app already uses:
 *
 *   - personal workspace: User.subscriptionStatus / subscriptionPlan, including
 *     the no-card product trial (see shared/pricing.ts)
 *   - institutional workspace: TenantBilling on any parish the user belongs to,
 *     with the diocese umbrella and owner cascade handled by
 *     resolveEffectiveBilling
 *
 * Collaborators invited into an institutional workspace inherit the host plan,
 * mirroring SubscriptionGate on the client so there is a single access rule.
 */
import { HttpError } from 'wasp/server';
import {
  getPersonalPlanId,
  getSocialLimits,
  getInstitutionalPlanId,
  planName,
  resolvePlanIdOrFree,
  type PlanId,
  type SocialLimits,
} from '../../shared/planLimits';
import {
  ensureProductTrial,
  resolveAllEffectiveBilling,
} from '../operations/billingEnforcement';
import { assertSocialEnabled } from './featureGate';
import { loadPlanCatalog } from '../pricing/planCatalogService';
import type { CatalogBySlug } from '../../shared/planCatalog';

export type SocialEntitlementSource = 'personal' | 'trial' | 'institutional' | 'free';

export interface SocialEntitlement {
  plan: PlanId;
  source: SocialEntitlementSource;
  limits: SocialLimits;
  canPublish: boolean;
  /** Parish the author was acting for when the entitlement came from a tenant. */
  parishId: string | null;
}

const FREE_ENTITLEMENT: SocialEntitlement = {
  plan: 'catechist_free',
  source: 'free',
  limits: getSocialLimits('catechist_free'),
  canPublish: false,
  parishId: null,
};

/** Start of the current day in UTC — the window used for the daily post quota. */
export function startOfDayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function entitlementFrom(
  plan: PlanId,
  source: SocialEntitlementSource,
  parishId: string | null,
  catalog?: CatalogBySlug,
): SocialEntitlement {
  const limits = getSocialLimits(plan, catalog);
  return {
    plan,
    source,
    limits,
    canPublish: limits.maxPostsPerDay === null || limits.maxPostsPerDay > 0,
    parishId,
  };
}

/**
 * Best entitlement available to the user across their personal plan and every
 * workspace they are an active member of. `unlimited` wins over `single`.
 */
export async function resolveSocialEntitlement(
  context: any,
  userId: string,
): Promise<SocialEntitlement> {
  const user = await ensureProductTrial(context, userId);
  const catalog = (await loadPlanCatalog(context)).bySlug;

  const personalPlan = resolvePlanIdOrFree(getPersonalPlanId(user), catalog);
  let best: SocialEntitlement =
    personalPlan === 'catechist_free'
      ? FREE_ENTITLEMENT
      : entitlementFrom(
          personalPlan,
          (user.subscriptionStatus || '').toLowerCase() === 'trialing' ? 'trial' : 'personal',
          null,
          catalog,
        );

  if (best.plan === 'unlimited') return best;

  const memberships = await context.entities.Membership.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { parishId: true },
  });

  const parishIds: string[] = [
    ...new Set(memberships.map((m: any) => m.parishId).filter(Boolean)),
  ] as string[];
  if (parishIds.length === 0) return best;

  const billings = await resolveAllEffectiveBilling(context, parishIds);

  for (const parishId of parishIds) {
    const plan = getInstitutionalPlanId(billings.get(parishId) as any);
    if (!plan) continue;

    const candidate = entitlementFrom(plan, 'institutional', parishId, catalog);
    if (plan === 'unlimited') return candidate;
    if (!best.canPublish) best = candidate;
  }

  return best;
}

/**
 * Throw unless the user may author in the Comunidade feed right now.
 * Returns the resolved entitlement so callers can apply media limits.
 */
export async function assertCanPublishSocial(
  context: any,
  opts: { skipQuota?: boolean } = {},
): Promise<SocialEntitlement> {
  assertSocialEnabled();

  if (!context.user) {
    throw new HttpError(401, 'Você precisa estar autenticado para publicar.');
  }

  const author = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { id: true, socialBannedAt: true, socialBanReason: true },
  });
  if (!author) {
    throw new HttpError(401, 'Você precisa estar autenticado para publicar.');
  }
  if (author.socialBannedAt) {
    throw new HttpError(
      403,
      author.socialBanReason
        ? `Sua conta está suspensa na Comunidade: ${author.socialBanReason}`
        : 'Sua conta está suspensa na Comunidade.',
    );
  }

  const entitlement = await resolveSocialEntitlement(context, context.user.id);

  if (!entitlement.canPublish) {
    throw new HttpError(
      403,
      'SUBSCRIPTION_REQUIRED: Assine para publicar na Comunidade. Ler e compartilhar continua livre.',
    );
  }

  if (!opts.skipQuota && entitlement.limits.maxPostsPerDay !== null) {
    const publishedToday = await context.entities.SocialPost.count({
      where: {
        authorId: context.user.id,
        createdAt: { gte: startOfDayUtc() },
      },
    });

    if (publishedToday >= entitlement.limits.maxPostsPerDay) {
      throw new HttpError(
        403,
        `LIMIT: Limite de publicações diárias do plano ${planName(entitlement.plan)} atingido ` +
          `(${publishedToday}/${entitlement.limits.maxPostsPerDay}). Tente novamente amanhã ou faça upgrade.`,
      );
    }
  }

  return entitlement;
}

/** Throw unless the media selection fits the author's plan. */
export function assertMediaWithinPlan(
  entitlement: SocialEntitlement,
  media: { kind: 'IMAGE' | 'VIDEO'; durationSeconds?: number | null }[],
): void {
  if (media.length > entitlement.limits.maxMediaPerPost) {
    throw new HttpError(
      403,
      `LIMIT: O plano ${planName(entitlement.plan)} permite ${entitlement.limits.maxMediaPerPost} ` +
        'mídias por publicação.',
    );
  }

  for (const item of media) {
    if (item.kind !== 'VIDEO') continue;
    const duration = item.durationSeconds ?? 0;
    if (duration > entitlement.limits.maxVideoSeconds) {
      const minutes = Math.floor(entitlement.limits.maxVideoSeconds / 60);
      throw new HttpError(
        403,
        `LIMIT: O plano ${planName(entitlement.plan)} permite vídeos de até ${minutes} minutos.`,
      );
    }
  }
}
