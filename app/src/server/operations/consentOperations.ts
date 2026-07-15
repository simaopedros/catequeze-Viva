import { HttpError } from 'wasp/server';
import { resolveGuardianHouseholdIds, resolveGuardianProfileForUser } from '../auth/helpers';

export const listConsents = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);
  // Multi-household: all households the user is guardian of
  const householdIds = await resolveGuardianHouseholdIds(context, context.user.id);
  if (householdIds.length === 0) return [];
  return context.entities.ConsentRecord.findMany({
    where: { householdId: { in: householdIds } },
  });
};

export const saveConsent = async (
  args: { type: string; granted: boolean; householdId?: string },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);

  // Prefer explicit householdId, else stable first linked household
  const guardian = await resolveGuardianProfileForUser(context, context.user.id, {
    householdId: args.householdId || null,
  });
  if (!guardian?.householdId) throw new HttpError(400, 'Você não está vinculado a uma família.');

  const existing = await context.entities.ConsentRecord.findFirst({
    where: { householdId: guardian.householdId, type: args.type as any },
  });

  if (existing) {
    return context.entities.ConsentRecord.update({
      where: { id: existing.id },
      data: { granted: args.granted, grantedAt: args.granted ? new Date() : null },
    });
  }

  return context.entities.ConsentRecord.create({
    data: {
      type: args.type as any,
      granted: args.granted,
      grantedAt: args.granted ? new Date() : null,
      householdId: guardian.householdId,
    },
  });
};
