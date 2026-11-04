import { HttpError } from 'wasp/server';
import { z } from 'zod';
import { assertRegistrationPermission, assertRegistrationsEnabled } from '../auth/registrationPermissions';
import { assertRegistrationsPlan } from './registrationCampaignOperations';
import { resolveRegistrationAccess, type RegistrationAction } from '../../shared/registrationPermissions';

export const idSchema = z.string().min(1).max(200);
export function parse(schema: z.ZodTypeAny, value: unknown): any {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, 'Dados inválidos.');
  return result.data;
}
export async function access(context: any, parishId: string) {
  assertRegistrationsEnabled();
  if (!context.user) throw new HttpError(401);
  const membership = await context.entities.Membership.findFirst({ where: { userId: context.user.id, parishId, status: 'ACTIVE' } });
  if (!membership && !context.user.isAdmin) throw new HttpError(404);
  await assertRegistrationsPlan(context, parishId);
  return membership;
}
export function level(context: any, membership: any, action: RegistrationAction) {
  return context.user.isAdmin ? 'S' : resolveRegistrationAccess(membership?.role, action);
}
export async function permitted(context: any, parishId: string, communityId: string | null, action: RegistrationAction) {
  try { await assertRegistrationPermission(context, { parishId, communityId: communityId ?? undefined, action }); return true; }
  catch (error: any) { if (error.statusCode === 403) return false; throw error; }
}
export async function requirePermission(context: any, parishId: string, communityId: string | null, action: RegistrationAction) {
  await assertRegistrationPermission(context, { parishId, communityId: communityId ?? undefined, action });
}
export function scoped(membership: any) { return membership?.role === 'COMMUNITY_COORDINATOR'; }
export async function audit(tx: any, context: any, parishId: string, entityType: string, entityId: string, action: 'CREATE' | 'UPDATE', metadata: any) {
  await tx.auditLog.create({ data: { parishId, userId: context.user.id, entityType, entityId, action, metadata: JSON.stringify(metadata) } });
}
