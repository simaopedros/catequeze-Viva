import { describe, expect, it } from 'vitest';
import { DOCUMENT_STAGES, DOCUMENT_TYPES, DEFAULT_DOCUMENT_REQUIREMENTS } from '../shared/documents/requirements';
import { evaluateRegistrationDocuments } from '../shared/registrationDocuments';

const evaluate = (overrides: Partial<Parameters<typeof evaluateRegistrationDocuments>[0]> = {}) => evaluateRegistrationDocuments({ stageKind: 'CONFIRMATION_TEEN', ageAtCutoff: 12, sponsor: { fromOtherParish: true }, documents: [], ...overrides });
describe('documentos da inscrição', () => {
  it('aplica a tabela padrão de cada etapa e nunca bloqueia', () => {
    for (const stageKind of DOCUMENT_STAGES) {
      const result = evaluate({ stageKind });
      expect(result.blocking).toBe(false);
      expect(result.checklist.map(x => x.requirement)).toEqual(DOCUMENT_TYPES.map(t => DEFAULT_DOCUMENT_REQUIREMENTS[stageKind][t]));
    }
  });
  it('considera idade e padrinho para os requisitos', () => {
    expect(evaluate({ ageAtCutoff: 18 }).checklist.find(x => x.type === 'CONSENT_FORM')?.state).toBe('NOT_NEEDED');
    expect(evaluate().warnings).toContain('CONSENT_FORM');
    expect(evaluate({ sponsor: undefined }).warnings).not.toContain('PASTORAL_LETTER');
    expect(evaluate({ sponsor: { fromOtherParish: false } }).warnings).not.toContain('PASTORAL_LETTER');
    expect(evaluate().warnings).toContain('PASTORAL_LETTER');
  });
  it('prioriza paróquia sobre diocese e não avisa quando não aplicável', () => {
    const rules = [{ scope: 'DIOCESE' as const, stageKind: 'CONFIRMATION_TEEN' as const, documentType: 'BAPTISM_CERTIFICATE' as const, requirement: 'REQUIRED' as const }, { scope: 'PARISH' as const, stageKind: 'CONFIRMATION_TEEN' as const, documentType: 'BAPTISM_CERTIFICATE' as const, requirement: 'NOT_APPLICABLE' as const }];
    const result = evaluate({ rules });
    expect(result.checklist.find(x => x.type === 'BAPTISM_CERTIFICATE')?.state).toBe('NOT_NEEDED');
    expect(result.warnings).not.toContain('BAPTISM_CERTIFICATE');
  });
  it('conta quarentena e escolhe a melhor versão, mas rejeição avisa', () => {
    const doc = (status: 'QUARANTINE' | 'PENDING' | 'VERIFIED' | 'REJECTED') => ({ type: 'BAPTISM_CERTIFICATE' as const, status });
    for (const [docs, state, warning] of [[[doc('REJECTED')], 'REJECTED', true], [[doc('QUARANTINE')], 'AWAITING_SECURITY', false], [[doc('REJECTED'), doc('QUARANTINE'), doc('PENDING')], 'AWAITING_REVIEW', false], [[doc('PENDING'), doc('VERIFIED')], 'VERIFIED', false]] as const) {
      const result = evaluate({ documents: [...docs] });
      expect(result.checklist.find(x => x.type === 'BAPTISM_CERTIFICATE')?.state).toBe(state);
      expect(result.warnings.includes('BAPTISM_CERTIFICATE')).toBe(warning);
      expect(result.blocking).toBe(false);
    }
  });
});
