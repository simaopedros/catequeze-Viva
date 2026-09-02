/**
 * Platform-admin billing overrides: trial extension, complimentary plans,
 * and immediate Stripe cancellation.
 */
import { HttpError } from "wasp/server";
import * as z from "zod";
import { requirePlatformAdmin, writeAuditLog } from "../auth/helpers";
import { validateOrThrow } from "../validation";
import { loadPlanCatalog } from "../pricing/planCatalogService";
import { getPlanLimits } from "../../shared/planCatalog";
import { BILLING_MANAGER_ROLES } from "../../shared/billingAccess";
import { stripeClient } from "../../payment/stripe/stripeClient";
import { SubscriptionStatus } from "../../payment/plans";

const MANAGEABLE = new Set(["trialing", "active", "past_due"]);

const emptyToUndefined = (value: unknown) =>
  value == null || value === "" ? undefined : value;

const entityIdSchema = z.preprocess(
  emptyToUndefined,
  z.string().min(1).max(64).optional(),
);

const scopeSchema = z
  .object({
    parishId: entityIdSchema,
    dioceseId: entityIdSchema,
  })
  .refine((value) => Boolean(value.parishId) !== Boolean(value.dioceseId), {
    message: "Indique parishId ou dioceseId.",
  });

function billingWhere(scope: { parishId?: string; dioceseId?: string }) {
  return scope.parishId
    ? { parishId: scope.parishId }
    : { dioceseId: scope.dioceseId };
}

const OWNER_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  paymentProcessorUserId: true,
} as const;

const BILLING_MANAGER_ROLE_PRIORITY: Record<string, number> = {
  PERSONAL_OWNER: 0,
  PARISH_COORDINATOR: 1,
  DIOCESE_ADMIN: 2,
  SUPER_ADMIN: 3,
  COMMUNITY_COORDINATOR: 4,
};

export type LicenseOwnerUser = {
  id: string;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  paymentProcessorUserId?: string | null;
};

export function toLicenseOwnerFields(
  user: LicenseOwnerUser | null | undefined,
) {
  if (!user) {
    return {
      ownerId: null as string | null,
      ownerEmail: null as string | null,
      ownerName: null as string | null,
      hasStripe: false,
    };
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    ownerId: user.id,
    ownerEmail: user.email || user.username || null,
    ownerName: name || null,
    hasStripe: Boolean(user.paymentProcessorUserId),
  };
}

export function pickBestBillingManager(
  memberships: Array<{ role?: string | null; user?: LicenseOwnerUser | null }>,
): LicenseOwnerUser | null {
  let best: { score: number; user: LicenseOwnerUser } | null = null;
  for (const membership of memberships) {
    if (!membership.user) continue;
    const score = BILLING_MANAGER_ROLE_PRIORITY[membership.role ?? ""] ?? 99;
    if (!best || score < best.score) {
      best = { score, user: membership.user };
    }
  }
  return best?.user ?? null;
}

async function requireScopeEntity(
  context: any,
  scope: { parishId?: string; dioceseId?: string },
) {
  if (scope.parishId) {
    const parish = await context.entities.Parish.findUnique({
      where: { id: scope.parishId },
      select: { id: true, name: true },
    });
    if (!parish) throw new HttpError(404, "Paróquia não encontrada.");
    return parish;
  }
  const diocese = await context.entities.Diocese.findUnique({
    where: { id: scope.dioceseId },
    select: { id: true, name: true },
  });
  if (!diocese) throw new HttpError(404, "Diocese não encontrada.");
  return diocese;
}

export const listAdminLicenses = async (_args: void, context: any) => {
  requirePlatformAdmin(context.user);

  const [parishes, dioceseBillings] = await Promise.all([
    context.entities.Parish.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        active: true,
        dioceseId: true,
        diocese: { select: { id: true, name: true } },
        billing: {
          select: {
            id: true,
            plan: true,
            status: true,
            trialEndsAt: true,
          },
        },
        owner: { select: OWNER_USER_SELECT },
        memberships: {
          where: {
            status: "ACTIVE",
            role: { in: [...BILLING_MANAGER_ROLES] },
          },
          select: {
            role: true,
            user: { select: OWNER_USER_SELECT },
          },
        },
      },
    }),
    context.entities.TenantBilling.findMany({
      where: { dioceseId: { not: null } },
      select: {
        id: true,
        dioceseId: true,
        plan: true,
        status: true,
        trialEndsAt: true,
        diocese: { select: { id: true, name: true } },
      },
    }),
  ]);

  const dioceseOwnerById = new Map<string, LicenseOwnerUser>();
  for (const parish of parishes as any[]) {
    if (!parish.dioceseId || parish.type !== "DIOCESE") continue;
    const candidate =
      parish.owner ?? pickBestBillingManager(parish.memberships);
    if (!candidate) continue;
    dioceseOwnerById.set(parish.dioceseId, candidate);
  }

  const missingDioceseIds = (dioceseBillings as any[])
    .map((row) => row.dioceseId)
    .filter((id: string | null) => id && !dioceseOwnerById.has(id));

  if (missingDioceseIds.length > 0) {
    const dioceseAdmins = await context.entities.Membership.findMany({
      where: {
        status: "ACTIVE",
        role: "DIOCESE_ADMIN",
        parish: { dioceseId: { in: missingDioceseIds } },
      },
      select: {
        parish: { select: { dioceseId: true, type: true } },
        user: { select: OWNER_USER_SELECT },
      },
    });
    for (const membership of dioceseAdmins as any[]) {
      const dioceseId = membership.parish?.dioceseId;
      if (!dioceseId || !membership.user) continue;
      const existing = dioceseOwnerById.get(dioceseId);
      if (!existing || membership.parish?.type === "DIOCESE") {
        dioceseOwnerById.set(dioceseId, membership.user);
      }
    }
  }

  const parishRows = (parishes as any[]).map((parish) => {
    const owner =
      parish.owner ?? pickBestBillingManager(parish.memberships ?? []);
    return {
      id: parish.billing?.id ?? `parish:${parish.id}`,
      billingId: parish.billing?.id ?? null,
      kind: "parish" as const,
      entityId: parish.id,
      name: parish.name,
      type: parish.type,
      plan: parish.billing?.plan ?? null,
      status: parish.billing?.status ?? null,
      trialEndsAt: parish.billing?.trialEndsAt ?? null,
      ...toLicenseOwnerFields(owner),
      active: parish.active,
    };
  });

  const dioceseRows = (dioceseBillings as any[]).map((row) => ({
    id: row.id,
    billingId: row.id,
    kind: "diocese" as const,
    entityId: row.dioceseId,
    name: row.diocese?.name ?? "Diocese",
    type: "DIOCESE",
    plan: row.plan,
    status: row.status,
    trialEndsAt: row.trialEndsAt,
    ...toLicenseOwnerFields(dioceseOwnerById.get(row.dioceseId)),
    active: true,
  }));

  return [...parishRows, ...dioceseRows];
};

export const extendTenantTrial = async (
  rawArgs: { parishId?: string; dioceseId?: string; days?: number },
  context: any,
) => {
  requirePlatformAdmin(context.user);
  const scope = validateOrThrow(scopeSchema, {
    parishId: rawArgs.parishId,
    dioceseId: rawArgs.dioceseId,
  });
  const days = Math.min(90, Math.max(1, Math.floor(rawArgs.days ?? 7)));
  await requireScopeEntity(context, scope);

  const existing = await context.entities.TenantBilling.findUnique({
    where: billingWhere(scope),
  });

  const now = new Date();
  const base =
    existing?.trialEndsAt && new Date(existing.trialEndsAt) > now
      ? new Date(existing.trialEndsAt)
      : now;
  const trialEndsAt = new Date(base.getTime() + days * 86_400_000);

  const data = {
    status: "TRIAL" as const,
    trialEndsAt,
    plan: existing?.plan ?? "catechist_free",
  };

  const row = existing
    ? await context.entities.TenantBilling.update({
        where: { id: existing.id },
        data,
      })
    : await context.entities.TenantBilling.create({
        data: {
          ...billingWhere(scope),
          ...data,
        },
      });

  await writeAuditLog(context, "UPDATE", "TenantBilling", row.id, {
    operation: "ADMIN_EXTEND_TRIAL",
    parishId: scope.parishId,
    dioceseId: scope.dioceseId,
    days,
    trialEndsAt: trialEndsAt.toISOString(),
  });

  return row;
};

export const setComplimentaryPlan = async (
  rawArgs: { parishId?: string; dioceseId?: string; planSlug: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);
  const scope = validateOrThrow(scopeSchema, {
    parishId: rawArgs.parishId,
    dioceseId: rawArgs.dioceseId,
  });
  const planSlug = rawArgs.planSlug?.trim();
  if (!planSlug) throw new HttpError(400, "Plano obrigatório.");
  await requireScopeEntity(context, scope);

  const catalog = await loadPlanCatalog(context);
  const plan =
    catalog.bySlug[planSlug] ?? catalog.bySlug[planSlug.toLowerCase()];
  if (!plan) throw new HttpError(400, "Plano inválido.");
  const limits = getPlanLimits(plan.slug, catalog.bySlug);

  const payload = {
    plan: plan.slug,
    status: "ACTIVE" as const,
    trialEndsAt: null,
    maxClasses: limits.maxClasses,
    maxCatechumens: limits.maxCatechumens,
    maxCatechists: limits.maxCatechists,
    maxParishes: limits.maxParishes,
  };

  const existing = await context.entities.TenantBilling.findUnique({
    where: billingWhere(scope),
  });

  const row = existing
    ? await context.entities.TenantBilling.update({
        where: { id: existing.id },
        data: payload,
      })
    : await context.entities.TenantBilling.create({
        data: {
          ...billingWhere(scope),
          ...payload,
        },
      });

  await writeAuditLog(context, "UPDATE", "TenantBilling", row.id, {
    operation: "ADMIN_COMPLIMENTARY_PLAN",
    parishId: scope.parishId,
    dioceseId: scope.dioceseId,
    plan: plan.slug,
    note: "Local override. A later Stripe webhook for a real subscription may overwrite this.",
  });

  return row;
};

export const cancelTenantLicense = async (
  rawArgs: { parishId?: string; dioceseId?: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);
  const scope = validateOrThrow(scopeSchema, {
    parishId: rawArgs.parishId,
    dioceseId: rawArgs.dioceseId,
  });
  await requireScopeEntity(context, scope);

  const existing = await context.entities.TenantBilling.findUnique({
    where: billingWhere(scope),
  });
  if (!existing) {
    throw new HttpError(400, "Não há licença local para cancelar.");
  }

  const row = await context.entities.TenantBilling.update({
    where: { id: existing.id },
    data: {
      status: "CANCELED",
      plan: "catechist_free",
      maxClasses: null,
      maxCatechumens: null,
      maxCatechists: null,
      maxParishes: null,
    },
  });

  await writeAuditLog(context, "DELETE", "TenantBilling", row.id, {
    operation: "ADMIN_CANCEL_LICENSE",
    parishId: scope.parishId,
    dioceseId: scope.dioceseId,
  });

  return row;
};

export const cancelUserSubscriptionImmediate = async (
  args: { userId: string; confirm: boolean },
  context: any,
) => {
  requirePlatformAdmin(context.user);
  if (!args.confirm) {
    throw new HttpError(
      400,
      "Confirmação obrigatória para cancelar imediatamente.",
    );
  }

  const user = await context.entities.User.findUnique({
    where: { id: args.userId },
    select: {
      id: true,
      email: true,
      paymentProcessorUserId: true,
      isAdmin: true,
    },
  });
  if (!user) throw new HttpError(404, "Utilizador não encontrado.");
  if (!user.paymentProcessorUserId) {
    throw new HttpError(400, "Este utilizador não tem cliente Stripe.");
  }

  const listed = await stripeClient.subscriptions.list({
    customer: user.paymentProcessorUserId,
    status: "all",
    limit: 20,
  });
  const subscriptions = listed.data.filter((subscription) =>
    MANAGEABLE.has(subscription.status),
  );
  if (subscriptions.length === 0) {
    throw new HttpError(400, "Nenhuma assinatura Stripe ativa encontrada.");
  }

  for (const subscription of subscriptions) {
    await stripeClient.subscriptions.cancel(subscription.id);
  }

  await context.entities.User.update({
    where: { id: user.id },
    data: { subscriptionStatus: SubscriptionStatus.Deleted },
  });

  await writeAuditLog(context, "DELETE", "User", user.id, {
    operation: "ADMIN_CANCEL_STRIPE_IMMEDIATE",
    canceledCount: subscriptions.length,
  });

  return { success: true, canceledCount: subscriptions.length };
};
