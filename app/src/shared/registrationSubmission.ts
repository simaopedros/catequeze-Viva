import { z } from 'zod';
import { calculateAgeAtCutoff } from './registrationCampaign';

const plain = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[<>\u0000-\u001f\u007f]/.test(value), 'Texto inválido');
const name = plain(100).refine(value => /\p{L}/u.test(value), 'Nome inválido');
const id = plain(100);
const email = z.string().trim().max(254).email().transform(value => value.toLowerCase());
const phone = z.string().trim().max(30).refine(value => /^[+\d\s().-]+$/.test(value) && (value.match(/\d/g)?.length ?? 0) >= 8 && (value.match(/\d/g)?.length ?? 0) <= 15, 'Telefone inválido').transform(value => (value.startsWith('+') ? '+' : '') + value.replace(/\D/g, ''));
const optionalEmail = z.union([email, z.literal('')]).optional().transform(value => value || undefined);
const optionalPhone = z.union([phone, z.literal('')]).optional().transform(value => value || undefined);
const birthDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value < new Date().toISOString().slice(0, 10);
}, 'Data inválida');
const windows = z.array(id).min(1).max(50).refine(values => new Set(values).size === values.length, 'Janelas repetidas');
const applicant = z.object({ firstName: name, lastName: name, birthDate, offeringId: id, communityId: id.optional(), windows }).strict();
const shared = { requestKey: z.string().uuid(), contactEmail: optionalEmail, contactPhone: optionalPhone };
const common = { ...shared, consent: z.literal(true), formToken: z.string().min(1).max(2048), captchaToken: z.string().min(1).max(2048), honeypot: z.string().max(200).optional() };
export const registrationSubmissionSchema = z.discriminatedUnion('mode', [
  z.object({ ...common, mode: z.literal('FAMILY'), contactName: name, relationship: plain(100), applicants: z.array(applicant).min(1).max(10) }).strict(),
  z.object({ ...common, mode: z.literal('ADULT'), applicant }).strict(),
]);
export const assistedRegistrationSchema = z.discriminatedUnion('mode', [
  z.object({ ...shared, consentConfirmedByStaff: z.literal(true), mode: z.literal('FAMILY'), contactName: name, relationship: plain(100), applicants: z.array(applicant).min(1).max(10) }).strict(),
  z.object({ ...shared, consentConfirmedByStaff: z.literal(true), mode: z.literal('ADULT'), applicant }).strict(),
]);
export type RegistrationSubmissionInput = z.infer<typeof registrationSubmissionSchema>;

export type SubmissionOffering = { id: string; audience: 'MINOR' | 'ADULT' | 'BOTH'; minAge: number | null; maxAge: number | null };
/** Valida opções em relação à campanha persistida, antes de criar qualquer registro. */
export function validateSubmissionOptions(input: RegistrationSubmissionInput | z.infer<typeof assistedRegistrationSchema>, campaign: { windows: string[]; communityIds: string[]; offerings: SubmissionOffering[]; ageCutoffDate: Date }) {
  const applicants = input.mode === 'FAMILY' ? input.applicants : [input.applicant];
  const kind = input.mode === 'FAMILY' ? 'MINOR' : 'ADULT';
  return applicants.map(person => {
    const offering = campaign.offerings.find(item => item.id === person.offeringId);
    if (!offering || (offering.audience !== 'BOTH' && offering.audience !== kind)) throw new Error('Oferta inválida');
    if (person.communityId && !campaign.communityIds.includes(person.communityId)) throw new Error('Comunidade inválida');
    if (person.windows.some(window => !campaign.windows.includes(window))) throw new Error('Janela inválida');
    const ageAtCutoff = calculateAgeAtCutoff(new Date(`${person.birthDate}T00:00:00.000Z`), campaign.ageCutoffDate);
    return { ageAtCutoff, needsReview: (offering.minAge !== null && ageAtCutoff < offering.minAge) || (offering.maxAge !== null && ageAtCutoff > offering.maxAge), preferences: person.windows.map((windowId, index) => ({ windowId, rank: index + 1 })) };
  });
}
