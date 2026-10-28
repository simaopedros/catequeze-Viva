import { ConsentType } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import { CONSENT_TEXT_VERSION } from "../../shared/consentVersions";

export const listConsents = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);
  return context.entities.ConsentRecord.findMany({
    where: {
      household: { guardians: { some: { userId: context.user.id } } },
    },
  });
};

export const saveConsent = async (
  args: { type: string; granted: boolean },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  if (!args || !Object.values(ConsentType).includes(args.type as ConsentType)) {
    throw new HttpError(400, "Tipo de autorização inválido.");
  }
  if (typeof args.granted !== "boolean") {
    throw new HttpError(400, "Informe se a autorização foi concedida.");
  }
  const type = args.type as ConsentType;

  return prisma.$transaction(async (tx) => {
    const guardian = await tx.guardianProfile.findUnique({
      where: { userId: context.user.id },
    });
    if (!guardian?.householdId)
      throw new HttpError(400, "Você não está vinculado a uma família.");

    const record = await tx.consentRecord.upsert({
      where: { householdId_type: { householdId: guardian.householdId, type } },
      create: {
        householdId: guardian.householdId,
        type,
        granted: args.granted,
        grantedAt: args.granted ? new Date() : null,
        textVersion: CONSENT_TEXT_VERSION,
      },
      update: {
        granted: args.granted,
        grantedAt: args.granted ? new Date() : null,
        textVersion: CONSENT_TEXT_VERSION,
      },
    });
    await tx.consentEvent.create({
      data: {
        consentRecordId: record.id,
        householdId: guardian.householdId,
        type,
        granted: args.granted,
        textVersion: CONSENT_TEXT_VERSION,
        actorUserId: context.user.id,
      },
    });
    return record;
  });
};
