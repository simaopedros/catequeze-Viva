/**
 * User detail and governance actions for the platform admin panel.
 */
import { HttpError, prisma } from "wasp/server";
import { createSession } from "wasp/auth/session";
import { requirePlatformAdmin, writeAuditLog } from "../auth/helpers";

export const getUserAdminDetail = async (
  args: { id: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  const user = await context.entities.User.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      phone: true,
      isAdmin: true,
      locale: true,
      createdAt: true,
      subscriptionStatus: true,
      subscriptionPlan: true,
      paymentProcessorUserId: true,
      socialBannedAt: true,
      socialBanReason: true,
      suspendedAt: true,
      suspendedReason: true,
    },
  });

  if (!user) throw new HttpError(404, "Utilizador não encontrado.");

  const [memberships, auditLog, aiUsage, aiCredits, twoFactor, ownedParishes] =
    await Promise.all([
      context.entities.Membership.findMany({
        where: { userId: args.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          role: true,
          status: true,
          createdAt: true,
          parish: { select: { id: true, name: true, active: true, type: true } },
          community: { select: { id: true, name: true } },
        },
      }),
      context.entities.AuditLog.findMany({
        where: { userId: args.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      }),
      context.entities.DailyAiUsage.findMany({
        where: { userId: args.id },
        orderBy: { date: "desc" },
        take: 30,
        select: { id: true, date: true, count: true },
      }),
      context.entities.UserAiCredits.findUnique({
        where: { userId: args.id },
        select: { creditsLeft: true, lastReset: true },
      }),
      context.entities.UserTwoFactor.findUnique({
        where: { userId: args.id },
        select: { enabled: true, verified: true },
      }),
      context.entities.Parish.findMany({
        where: { ownerId: args.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true, active: true, dioceseId: true },
      }),
    ]);

  const parishIds = [
    ...new Set(
      [
        ...ownedParishes.map((p: { id: string }) => p.id),
        ...memberships.map((m: any) => m.parish?.id).filter(Boolean),
      ] as string[],
    ),
  ];
  const dioceseIds = [
    ...new Set(
      ownedParishes
        .map((p: { dioceseId?: string | null }) => p.dioceseId)
        .filter(Boolean) as string[],
    ),
  ];

  const tenantBillings =
    parishIds.length === 0 && dioceseIds.length === 0
      ? []
      : await context.entities.TenantBilling.findMany({
          where: {
            OR: [
              parishIds.length ? { parishId: { in: parishIds } } : undefined,
              dioceseIds.length ? { dioceseId: { in: dioceseIds } } : undefined,
            ].filter(Boolean),
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            plan: true,
            status: true,
            trialEndsAt: true,
            updatedAt: true,
            parishId: true,
            dioceseId: true,
            parish: { select: { id: true, name: true, type: true } },
            diocese: { select: { id: true, name: true } },
          },
        });

  const billingTimeline = [
    {
      id: `user-${user.id}`,
      at: user.createdAt,
      source: "personal" as const,
      name: user.email,
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
    },
    ...tenantBillings.map((row: any) => ({
      id: row.id,
      at: row.updatedAt,
      source: row.dioceseId ? ("diocese" as const) : ("parish" as const),
      name: row.diocese?.name || row.parish?.name || row.id,
      plan: row.plan,
      status: row.status,
      trialEndsAt: row.trialEndsAt,
    })),
  ];

  return {
    ...user,
    creditsLeft: aiCredits?.creditsLeft ?? 0,
    twoFactorEnabled: Boolean(twoFactor?.enabled && twoFactor?.verified),
    memberships,
    auditLog,
    aiUsage,
    ownedParishes,
    billingTimeline,
  };
};

export const adjustUserAiCredits = async (
  args: { userId: string; creditsLeft: number },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  const creditsLeft = Math.max(0, Math.floor(Number(args.creditsLeft)));
  if (!Number.isFinite(creditsLeft)) {
    throw new HttpError(400, "Quantidade de créditos inválida.");
  }

  const target = await context.entities.User.findUnique({
    where: { id: args.userId },
    select: { id: true },
  });
  if (!target) throw new HttpError(404, "Utilizador não encontrado.");

  const existing = await context.entities.UserAiCredits.findUnique({
    where: { userId: args.userId },
    select: { id: true, creditsLeft: true },
  });

  const row = existing
    ? await context.entities.UserAiCredits.update({
        where: { userId: args.userId },
        data: { creditsLeft },
      })
    : await context.entities.UserAiCredits.create({
        data: { userId: args.userId, creditsLeft },
      });

  await writeAuditLog(context, "UPDATE", "User", args.userId, {
    operation: "ADMIN_ADJUST_AI_CREDITS",
    from: existing?.creditsLeft ?? null,
    to: creditsLeft,
  });

  return { creditsLeft: row.creditsLeft };
};

export const setUserSuspended = async (
  args: { userId: string; suspended: boolean; reason?: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  if (args.userId === context.user.id) {
    throw new HttpError(403, "Não pode suspender a sua própria conta.");
  }

  const target = await context.entities.User.findUnique({
    where: { id: args.userId },
    select: { id: true, isAdmin: true, email: true },
  });
  if (!target) throw new HttpError(404, "Utilizador não encontrado.");
  if (target.isAdmin) {
    throw new HttpError(
      403,
      "Não pode suspender outro administrador da plataforma.",
    );
  }

  const reason = args.reason?.trim() || null;
  const updated = await context.entities.User.update({
    where: { id: args.userId },
    data: args.suspended
      ? { suspendedAt: new Date(), suspendedReason: reason }
      : { suspendedAt: null, suspendedReason: null },
  });

  await writeAuditLog(
    context,
    args.suspended ? "REJECT" : "APPROVE",
    "User",
    args.userId,
    {
      operation: args.suspended ? "ADMIN_SUSPEND_USER" : "ADMIN_UNSUSPEND_USER",
      reason,
    },
  );

  return {
    id: updated.id,
    suspendedAt: updated.suspendedAt,
    suspendedReason: updated.suspendedReason,
  };
};

export const impersonateUser = async (
  args: { userId: string },
  context: any,
) => {
  requirePlatformAdmin(context.user);

  if (args.userId === context.user.id) {
    throw new HttpError(400, "Não pode impersonar a si próprio.");
  }

  const target = await context.entities.User.findUnique({
    where: { id: args.userId },
    select: { id: true, email: true, isAdmin: true },
  });
  if (!target) throw new HttpError(404, "Utilizador não encontrado.");
  if (target.isAdmin) {
    throw new HttpError(
      403,
      "Não pode impersonar outro administrador da plataforma.",
    );
  }

  const auth = await (prisma as any).auth.findUnique({
    where: { userId: target.id },
    select: { id: true },
  });
  if (!auth?.id) {
    throw new HttpError(400, "Utilizador sem identidade de autenticação.");
  }

  const session = await createSession(auth.id);

  await writeAuditLog(context, "LOGIN", "User", args.userId, {
    operation: "ADMIN_IMPERSONATE",
    targetEmail: target.email,
  });

  return {
    sessionId: session.id,
    email: target.email,
    userId: target.id,
  };
};
