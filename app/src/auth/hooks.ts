/**
 * Auth hooks for Catequese Viva.
 */

interface OnAfterSignupArgs {
  user: { id: string; email: string | null };
  prisma: any;
  providerId?: unknown;
  req?: unknown;
}

/**
 * Runs right after a new user account is created (any auth method).
 *
 * Converts any PendingInvitations addressed to the new user's email into
 * INVITED memberships. Keeps the PendingInvitation records alive so the
 * token-based accept flow (family portal) still works — they are deleted
 * only when the user explicitly accepts via acceptInvitationByToken.
 */
export const onAfterSignup = async ({ user, prisma }: OnAfterSignupArgs): Promise<void> => {
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
