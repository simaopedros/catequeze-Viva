import { DOCUMENT_TYPES, resolveDocumentRequirements, type DocumentStageKind, type DocumentType, type Rule } from './documents/requirements';

type Status = 'QUARANTINE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
type State = 'MISSING' | 'AWAITING_SECURITY' | 'AWAITING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'NOT_NEEDED';
const states: Record<Status, State> = { QUARANTINE: 'AWAITING_SECURITY', PENDING: 'AWAITING_REVIEW', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED' };
const priority: Record<Status, number> = { VERIFIED: 4, PENDING: 3, QUARANTINE: 2, REJECTED: 1 };
export function evaluateRegistrationDocuments(input: { stageKind: DocumentStageKind | null; ageAtCutoff: number | null; sponsor?: { fromOtherParish: boolean } | null; rules?: Rule[]; documents: { type: DocumentType; status: Status }[] }) {
  const { requirements } = resolveDocumentRequirements({ stageKinds: [input.stageKind], age: input.ageAtCutoff, sponsors: input.sponsor ? [input.sponsor] : [], rules: input.rules });
  const checklist = DOCUMENT_TYPES.map(type => {
    const requirement = requirements[type];
    const best = input.documents.filter(d => d.type === type).reduce<Status | undefined>((a, d) => !a || priority[d.status] > priority[a] ? d.status : a, undefined);
    const state: State = requirement === 'NOT_APPLICABLE' ? 'NOT_NEEDED' : best ? states[best] : 'MISSING';
    return { type, requirement, state };
  });
  return { checklist, warnings: checklist.filter(d => d.requirement === 'REQUIRED' && (d.state === 'MISSING' || d.state === 'REJECTED')).map(d => d.type), blocking: false as const };
}
