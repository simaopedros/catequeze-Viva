import { HttpError, prisma } from "wasp/server";
import {
  ACCOUNT_TERMS_KIND,
  TERMS_VERSION,
} from "../../shared/consentVersions";

export const getAccountTermsStatus = async (_args: void, context: any) => {
  if (!context.user) throw new HttpError(401);
  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { termsAcceptanceRequired: true },
  });
  if (!user) throw new HttpError(401);
  return { required: user.termsAcceptanceRequired === true };
};

export const acceptAccountTerms = async (
  args: { accepted: boolean },
  context: any,
) => {
  if (!context.user) throw new HttpError(401);
  if (args?.accepted !== true)
    throw new HttpError(400, "É necessário aceitar os termos.");
  return prisma.$transaction(async (tx) => {
    // Serialize concurrent requests for this user without modifying historical records.
    await tx.user.update({
      where: { id: context.user.id },
      data: { termsAcceptanceRequired: false },
    });
    const existing = await tx.termsAcceptance.findFirst({
      where: {
        userId: context.user.id,
        kind: ACCOUNT_TERMS_KIND,
        version: TERMS_VERSION,
      },
    });
    if (existing) return existing;
    return tx.termsAcceptance.create({
      data: {
        userId: context.user.id,
        kind: ACCOUNT_TERMS_KIND,
        version: TERMS_VERSION,
      },
    });
  });
};
