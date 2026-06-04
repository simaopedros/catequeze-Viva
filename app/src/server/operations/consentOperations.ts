import { HttpError } from 'wasp/server';

export const listConsents = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);
  return context.entities.ConsentRecord.findMany({
    where: {
      household: { guardians: { some: { userId: context.user.id } } },
    },
  });
};

export const saveConsent = async (args: { type: string; granted: boolean }, context: any) => {
  if (!context.user) throw new HttpError(401);

  const guardian = await context.entities.GuardianProfile.findUnique({ where: { userId: context.user.id } });
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
