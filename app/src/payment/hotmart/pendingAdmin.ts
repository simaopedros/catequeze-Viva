import { HttpError } from "wasp/server";
import { requirePlatformAdmin, writeAuditLog } from "../../server/auth/helpers";
import {
  activationUpdate,
  grantPlanAccess,
  protectedBillingReason,
} from "./applyEntitlement";
import type { HotmartPlanSlug } from "./postback";

const OPEN = { appliedAt: null, voidedAt: null };

function planSlugOf(value: unknown): HotmartPlanSlug {
  return value === "unlimited" ? "unlimited" : "single";
}

function serialize(row: any) {
  return {
    id: row.id,
    email: row.email,
    planSlug: planSlugOf(row.planSlug),
    interval: row.interval ?? null,
    transaction: row.transaction ?? null,
    hotmartSubscriberCode: row.hotmartSubscriberCode ?? null,
    accessEndsAt: row.accessEndsAt ?? null,
    createdAt: row.createdAt ?? null,
  };
}

export async function listPendingHotmartEntitlements(_args: unknown, context: any) {
  requirePlatformAdmin(context.user);
  const rows = await context.entities.PendingEntitlement.findMany({
    where: OPEN,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (rows || []).map(serialize);
}

export async function linkPendingHotmartEntitlement(
  raw: { pendingId?: string; userId?: string },
  context: any,
) {
  requirePlatformAdmin(context.user);
  const pendingId = String(raw?.pendingId || "").trim();
  const userId = String(raw?.userId || "").trim();
  if (!pendingId || !userId) {
    throw new HttpError(400, "Informe a compra e o usuário.");
  }
  const row = await context.entities.PendingEntitlement.findUnique({ where: { id: pendingId } });
  if (!row || row.appliedAt || row.voidedAt) {
    throw new HttpError(404, "Compra pendente não encontrada.");
  }
  const user = await context.entities.User.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "Usuário não encontrado.");
  const guard = protectedBillingReason(user);
  if (guard === "manual") {
    throw new HttpError(409, "Esta conta foi liberada manualmente e não pode ser sobrescrita.");
  }
  if (guard === "stripe") {
    throw new HttpError(409, "Esta conta tem assinatura Stripe ativa e não pode ser sobrescrita.");
  }
  const planSlug = planSlugOf(row.planSlug);
  await grantPlanAccess(
    context.entities.User,
    user.id,
    activationUpdate({
      planSlug,
      subscriberCode: row.hotmartSubscriberCode,
      accessEndsAt: row.accessEndsAt ? new Date(row.accessEndsAt) : null,
    }),
    context,
    planSlug,
  );
  const appliedAt = new Date();
  await context.entities.PendingEntitlement.update({
    where: { id: row.id },
    data: { appliedAt },
  });
  await writeAuditLog(context, "UPDATE", "PendingEntitlement", row.id, {
    userId: user.id,
    planSlug,
    transaction: row.transaction ?? null,
  });
  return { ok: true, userId: user.id, planSlug };
}
