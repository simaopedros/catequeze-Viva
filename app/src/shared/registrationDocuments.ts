import { DOCUMENT_TYPES, resolveDocumentRequirements, type DocumentStageKind, type DocumentType, type Rule } from './documents/requirements';

type Status = 'QUARANTINE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
type State = 'MISSING' | 'AWAITING_SECURITY' | 'AWAITING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'NOT_NEEDED';
const states: Record<Status, State> = { QUARANTINE: 'AWAITING_SECURITY', PENDING: 'AWAITING_REVIEW', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED' };
const priority: Record<Status, number> = { VERIFIED: 4, PENDING: 3, QUARANTINE: 2, REJECTED: 1 };
export function evaluateRegistrationDocuments(input: { stageKind: DocumentStageKind | null; ageAtCutoff: number | null; sponsor?: { fromOtherParish: boolean } | null; rules?: Rule[]; documents: { type: DocumentType; status: Status }[]; profileDocuments?: { type: DocumentType; status: 'PENDING' | 'VERIFIED' | 'REJECTED' }[] }) {
  const { requirements } = resolveDocumentRequirements({ stageKinds: [input.stageKind], age: input.ageAtCutoff, sponsors: input.sponsor ? [input.sponsor] : [], rules: input.rules });
  const checklist = DOCUMENT_TYPES.map(type => {
    const requirement = requirements[type];
    const best = input.documents.filter(d => d.type === type).reduce<Status | undefined>((a, d) => !a || priority[d.status] > priority[a] ? d.status : a, undefined);
    const reusedStatus = !best ? input.profileDocuments?.filter(d => d.type === type && d.status !== 'REJECTED').reduce<Status | undefined>((a, d) => !a || priority[d.status] > priority[a] ? d.status : a, undefined) : undefined;
    const selected = best ?? reusedStatus;
    const state: State = requirement === 'NOT_APPLICABLE' ? 'NOT_NEEDED' : selected ? states[selected] : 'MISSING';
    return { type, requirement, state, reused: !!reusedStatus && requirement !== 'NOT_APPLICABLE' };
  });
  return { checklist, warnings: checklist.filter(d => d.requirement === 'REQUIRED' && (d.state === 'MISSING' || d.state === 'REJECTED')).map(d => d.type), blocking: false as const };
}
