import { generateRegistrationProtocol } from '../security/registrationTokens';

/** Persiste os dados comuns após a validação, dentro da transação do chamador. */
export async function createSubmissionRecords(tx: any, { input, campaign, options, payloadHash, emailHash, now, createdByUserId }: any) {
  const assisted = !!createdByUserId;
  const status = !assisted && input.contactEmail ? 'PENDING_EMAIL' : 'RECEIVED';
  const contactName = input.mode === 'FAMILY' ? input.contactName : `${input.applicant.firstName} ${input.applicant.lastName}`;
  const submission = await tx.registrationSubmission.create({ data: { campaignId: campaign.id, requestKey: input.requestKey, payloadHash, protocol: generateRegistrationProtocol(), status, ...(assisted ? { source: 'ASSISTED', createdByUserId } : {}), contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone, retentionUntil: new Date((status === 'PENDING_EMAIL' ? now : campaign.closesAt).getTime() + (status === 'PENDING_EMAIL' ? 30 : 180) * 86400000) } });
  const applicants = input.mode === 'FAMILY' ? input.applicants : [input.applicant];
  const ids: string[] = [];
  for (const [i, person] of applicants.entries()) {
    const application = await tx.registrationApplication.create({ data: { submissionId: submission.id, offeringId: person.offeringId, kind: input.mode === 'FAMILY' ? 'MINOR' : 'ADULT', firstName: person.firstName, lastName: person.lastName, birthDate: new Date(`${person.birthDate}T00:00:00Z`), communityId: person.communityId, ...options[i], consents: { create: { kind: 'PARTICIPATION', granted: true, textVersion: 'registration-consent-v1', actorName: contactName, actorRelationship: input.mode === 'FAMILY' ? input.relationship : null, verifiedContactHash: emailHash } } } });
    ids.push(application.id);
  }
  return { ...submission, applicationIds: ids };
}
