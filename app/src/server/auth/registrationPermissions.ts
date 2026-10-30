import { HttpError } from 'wasp/server';
import { canPerformRegistrationAction, REGISTRATION_ACTIONS, type RegistrationAction } from '../../shared/registrationPermissions';
import { getDioceseParishIds } from './helpers';

export function assertRegistrationsEnabled(): void {
  if (process.env.REGISTRATIONS_ENABLED !== 'true') throw new HttpError(404, 'Recurso indisponível.');
}

/** A campanha futura deve fornecer parishId a partir do registro persistido, nunca da entrada do usuário. */
export async function assertRegistrationPermission(
  context: any,
  args: { parishId: string; communityId?: string; action: RegistrationAction },
): Promise<void> {
  assertRegistrationsEnabled();
  if (!context.user) throw new HttpError(401);
  if (!args.parishId || !REGISTRATION_ACTIONS.includes(args.action)) throw new HttpError(403);
  if (context.user.isAdmin) return;
  const membership = await context.entities.Membership.findFirst({
    where: { userId: context.user.id, parishId: args.parishId, status: 'ACTIVE' },
    select: { id: true, role: true, communityId: true },
  });
  if (!membership) {
    // A diocese só atua em paróquias pertencentes à sua própria diocese.
    if ((await getDioceseParishIds(context)).includes(args.parishId) &&
        canPerformRegistrationAction('DIOCESE_ADMIN', args.action)) return;
    throw new HttpError(403);
  }
  if (membership.role === 'COMMUNITY_COORDINATOR' &&
      (!membership.communityId || args.communityId !== membership.communityId)) throw new HttpError(403);
  const grant = await context.entities.RegistrationPermissionGrant.findFirst({
    where: { membershipId: membership.id, action: args.action, revokedAt: null },
    select: { id: true },
  });
  if (!canPerformRegistrationAction(membership.role, args.action, { hasGrant: !!grant })) throw new HttpError(403);
}
