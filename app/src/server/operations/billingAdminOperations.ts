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
import { stripeClient } from "../../payment/stripe/stripeClient";
import { SubscriptionStatus } from "../../payment/plans";

const MANAGEABLE = new Set(["trialing", "active", "past_due"]);

const scopeSchema = z
  .object({
    parishId: z.string().uuid().optional(),
    dioceseId: z.string().uuid().optional(),
  })
  .refine((value) => Boolean(value.parishId) !== Boolean(value.dioceseId), {
    message: "Indique parishId ou dioceseId.",
  });

function billingWhere(scope: { parishId?: string; dioceseId?: string }) {
  return scope.parishId
    ? { parishId: scope.parishId }
    : { dioceseId: scope.dioceseId };
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
        owner: {
          select: {
            id: true,
            email: true,
            paymentProcessorUserId: true,
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

  const parishRows = parishes.map((parish: any) => ({
    id: parish.billing?.id ?? `parish:${parish.id}`,
    billingId: parish.billing?.id ?? null,
    kind: "parish" as const,
    entityId: parish.id,
    name: parish.name,
    type: parish.type,
    plan: parish.billing?.plan ?? null,
    status: parish.billing?.status ?? null,
    trialEndsAt: parish.billing?.trialEndsAt ?? null,
    ownerEmail: parish.owner?.email ?? null,
    ownerId: parish.owner?.id ?? null,
    hasStripe: Boolean(parish.owner?.paymentProcessorUserId),
    active: parish.active,
  }));

  const dioceseRows = dioceseBillings.map((row: any) => ({
    id: row.id,
    billingId: row.id,
    kind: "diocese" as const,
    entityId: row.dioceseId,
    name: row.diocese?.name ?? "Diocese",
    type: "DIOCESE",
    plan: row.plan,
    status: row.status,
    trialEndsAt: row.trialEndsAt,
    ownerEmail: null,
    ownerId: null,
    hasStripe: false,
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
