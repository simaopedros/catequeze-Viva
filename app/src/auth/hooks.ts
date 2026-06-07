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
 * INVITED memberships, then removes the pending records. This links
 * invitations that were created before the person had an account — without
 * ever creating an orphaned placeholder User.
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

  await prisma.pendingInvitation.deleteMany({ where: { email } });
};
