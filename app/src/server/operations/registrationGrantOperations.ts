import { HttpError, prisma } from 'wasp/server';
import { REGISTRATION_ACTIONS, resolveRegistrationAccess, type RegistrationAction } from '../../shared/registrationPermissions';
import { assertRegistrationPermission, assertRegistrationsEnabled } from '../auth/registrationPermissions';

export async function grantRegistrationPermission(args: { membershipId: string; action: RegistrationAction; reason: string }, context: any) {
  assertRegistrationsEnabled();
  const membership = await context.entities.Membership.findUnique({ where: { id: args.membershipId } });
  if (!membership || membership.status !== 'ACTIVE') throw new HttpError(404);
  await assertRegistrationPermission(context, { parishId: membership.parishId, action: 'MANAGE_ROLES_AND_GRANTS' });
  if (!REGISTRATION_ACTIONS.includes(args.action) || resolveRegistrationAccess(membership.role, args.action) !== 'D' || !args.reason?.trim()) throw new HttpError(400);
  return prisma.$transaction(async (tx: any) => {
    const grant = await tx.registrationPermissionGrant.create({ data: { membershipId: membership.id, action: args.action, reason: args.reason.trim(), grantedById: context.user.id } });
    await tx.auditLog.create({ data: { action: 'CREATE', entityType: 'RegistrationPermissionGrant', entityId: grant.id, userId: context.user.id, parishId: membership.parishId, metadata: JSON.stringify({ action: args.action, reason: args.reason.trim() }) } });
    return grant;
  });
}

export async function revokeRegistrationPermission(args: { grantId: string; reason: string }, context: any) {
  assertRegistrationsEnabled();
  const grant = await context.entities.RegistrationPermissionGrant.findUnique({ where: { id: args.grantId }, include: { membership: true } });
  if (!grant || grant.revokedAt) throw new HttpError(404);
  await assertRegistrationPermission(context, { parishId: grant.membership.parishId, action: 'MANAGE_ROLES_AND_GRANTS' });
  if (!args.reason?.trim()) throw new HttpError(400);
  return prisma.$transaction(async (tx: any) => {
    const result = await tx.registrationPermissionGrant.updateMany({ where: { id: grant.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (result.count !== 1) throw new HttpError(404);
    await tx.auditLog.create({ data: { action: 'UPDATE', entityType: 'RegistrationPermissionGrant', entityId: grant.id, userId: context.user.id, parishId: grant.membership.parishId, metadata: JSON.stringify({ operation: 'REVOKE', reason: args.reason.trim() }) } });
    return { id: grant.id };
  });
}
