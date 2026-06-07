/**
 * Shared billing-cascade helpers used by both the in-app cancellation action
 * (payment/operations.ts) and the Woovi webhook (payment/woovi/webhook.ts).
 *
 * Keeps the activation/downgrade logic in one place and — unlike the previous
 * implementation — handles users that own multiple parishes or administer more
 * than one diocese, instead of silently acting on only the first match.
 */

export function getNextPeriodEnd(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Every diocese the user is responsible for: dioceses they administer
 * (active DIOCESE_ADMIN membership) plus dioceses of parishes they own.
 */
export async function getUserDioceseIds(context: any, userId: string): Promise<string[]> {
  const ids = new Set<string>();

  const adminMemberships = await context.entities.Membership.findMany({
    where: { userId, role: 'DIOCESE_ADMIN', status: 'ACTIVE' },
    select: { parish: { select: { dioceseId: true } } },
  });
  for (const m of adminMemberships) {
    if (m.parish?.dioceseId) ids.add(m.parish.dioceseId);
  }

  const ownedParishes = await context.entities.Parish.findMany({
    where: { ownerId: userId, dioceseId: { not: null } },
    select: { dioceseId: true },
  });
  for (const p of ownedParishes) {
    if (p.dioceseId) ids.add(p.dioceseId);
  }

  return [...ids];
}

/**
 * Downgrade every tenant billed through this user to the free plan: all the
 * parishes they own and all the dioceses they administer/own.
 */
export async function cascadeCancelToTenantBilling(context: any, userId: string): Promise<void> {
  await context.entities.TenantBilling.updateMany({
    where: { parish: { ownerId: userId, type: { not: 'PERSONAL' } } },
    data: {
      plan: 'CATECHIST_FREE',
      status: 'CANCELED',
      maxClasses: null,
      maxCatechumens: null,
    },
  });

  const dioceseIds = await getUserDioceseIds(context, userId);
  if (dioceseIds.length > 0) {
    await context.entities.TenantBilling.updateMany({
      where: { dioceseId: { in: dioceseIds } },
      data: {
        plan: 'CATECHIST_FREE',
        status: 'CANCELED',
        maxClasses: null,
        maxCatechumens: null,
      },
    });
  }
}

/**
 * Activate the given paid plan for every tenant billed through this user.
 * DIOCESE plans activate each diocese the user administers/owns; the other
 * paid plans activate every parish the user owns.
 */
export async function cascadeActivatePlanToTenantBilling(
  context: any,
  userId: string,
  billingPlan: 'CATECHIST_FREE' | 'CATECHIST_PRO' | 'CATECHIST_AI' | 'PARISH' | 'DIOCESE',
): Promise<void> {
  if (billingPlan === 'DIOCESE') {
    const dioceseIds = await getUserDioceseIds(context, userId);
    for (const dioceseId of dioceseIds) {
      const existing = await context.entities.TenantBilling.findUnique({
        where: { dioceseId },
      });
      if (existing) {
        await context.entities.TenantBilling.update({
          where: { id: existing.id },
          data: { plan: 'DIOCESE', status: 'ACTIVE', currentPeriodEnd: getNextPeriodEnd() },
        });
      } else {
        await context.entities.TenantBilling.create({
          data: { dioceseId, plan: 'DIOCESE', status: 'ACTIVE', currentPeriodEnd: getNextPeriodEnd() },
        });
      }
    }
    return;
  }

  // Institutional (PARISH) plan: activate every institutional parish the user
  // owns. Never touch the PERSONAL workspace billing — that level is governed by
  // the user's personal subscription, not by TenantBilling.
  await context.entities.TenantBilling.updateMany({
    where: { parish: { ownerId: userId, type: { not: 'PERSONAL' } } },
    data: {
      plan: billingPlan,
      status: 'ACTIVE',
      maxClasses: null,
      maxCatechumens: null,
      currentPeriodEnd: getNextPeriodEnd(),
    },
  });
}
