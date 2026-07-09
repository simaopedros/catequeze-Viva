/**
 * Auth hooks for Catequese Viva.
 */

import { PRODUCT_TRIAL_PLAN_ID } from '../shared/pricing';

interface OnAfterSignupArgs {
  user: { id: string; email: string | null };
  prisma: any;
  providerId?: unknown;
  req?: unknown;
}

/**
 * Runs right after a new user account is created (any auth method).
 *
 * 1. Starts the no-card product trial (Single entitlements for 7 days).
 * 2. Converts any PendingInvitations addressed to the new user's email into
 *    INVITED memberships. Keeps the PendingInvitation records alive so the
 *    token-based accept flow (family portal) still works — they are deleted
 *    only when the user explicitly accepts via acceptInvitationByToken.
 */
export const onAfterSignup = async ({ user, prisma }: OnAfterSignupArgs): Promise<void> => {
  if (!user?.id) return;

  // Product trial: access without Stripe until SUBSCRIPTION_TRIAL_DAYS elapse
  // (window is measured from User.createdAt in getPersonalPlanId).
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'trialing',
        subscriptionPlan: PRODUCT_TRIAL_PLAN_ID,
      },
    });
  } catch {
    // Non-fatal — ensureProductTrial will heal on first workspace/class action.
  }

  const email = user?.email;
  if (!email) return;

  const pending = await prisma.pendingInvitation.findMany({ where: { email } });
  if (pending.length === 0) return;

  for (const invitation of pending) {
    const existing = await prisma.membership.findFirst({
      where: { userId: user.id, parishId: invitation.parishId },
    });
    if (existing) continue;

    await prisma.membership.create({
      data: {
        userId: user.id,
        parishId: invitation.parishId,
        communityId: invitation.communityId ?? null,
        role: invitation.role,
        status: 'INVITED',
      },
    });
  }

  // Do NOT delete PendingInvitation records here — they carry the token
  // needed by acceptInvitationByToken on the family portal.
  // The records are cleaned up when the user accepts via the token flow.
};
