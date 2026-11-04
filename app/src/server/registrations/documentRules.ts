import { evaluateRegistrationDocuments } from '../../shared/registrationDocuments';

export async function loadRegistrationDocumentRules(context: any, campaign: any) {
  const parish = await context.entities.Parish.findUnique({ where: { id: campaign.parishId }, select: { dioceseId: true } });
  return context.entities.DocumentStageRule.findMany({ where: { OR: [{ scope: 'PARISH', parishId: campaign.parishId }, ...(parish?.dioceseId ? [{ scope: 'DIOCESE', dioceseId: parish.dioceseId }] : [])] }, take: 84 });
}
export function registrationDocumentChecklist(item: any, rules: any[], documents: any[], profileDocuments: any[] = []) {
  return evaluateRegistrationDocuments({ stageKind: item.offering.documentStageKind, ageAtCutoff: item.ageAtCutoff, sponsor: item.sponsorFromOtherParish == null ? undefined : { fromOtherParish: item.sponsorFromOtherParish }, rules, documents, profileDocuments });
}
export const registrationDocumentSelect = { id: true, applicationId: true, type: true, name: true, status: true, source: true, createdAt: true, sizeBytes: true };
