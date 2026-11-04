import { describe, it, expect } from 'vitest';
import { calculateAgeAtCutoff, canTransitionCampaign, generateCampaignSlug, offeredWindowsSchema, campaignSchema, offeringSchema } from '../shared/registrationCampaign';
describe('campanhas de inscrição', () => {
  it('aplica idade civil e aniversário em 28 de fevereiro', () => {
    const d = (s: string) => new Date(`${s}T00:00:00Z`);
    expect(calculateAgeAtCutoff(d('2012-02-29'), d('2023-02-28'))).toBe(11);
    expect(calculateAgeAtCutoff(d('2012-03-01'), d('2023-02-28'))).toBe(10);
    expect(calculateAgeAtCutoff(d('2024-01-01'), d('2023-12-31'))).toBe(-1);
  });
  it('limita transições e gera slug único', () => {
    expect(canTransitionCampaign('CLOSED', 'OPEN')).toBe(true);
    expect(canTransitionCampaign('ORGANIZING', 'OPEN')).toBe(false);
    expect(generateCampaignSlug('Inscrições', [])).toBe('inscricoes-campanha');
    expect(generateCampaignSlug('Confirm', [])).toBe('confirm-campanha');
    expect(generateCampaignSlug('Confirmar', [])).toBe('confirmar-campanha');
    expect(generateCampaignSlug('Crisma', ['crisma', 'crisma-2'])).toBe('crisma-3');
  });
  it('valida período, data civil, fuso e faixa de idade', () => {
    const c = { yearId: 'ano', title: 'Teste', opensAt: '2027-01-01', closesAt: '2027-02-01', ageCutoffDate: '2027-02-28', timezone: 'America/Sao_Paulo', offeredWindows: [], offeredCommunityIds: [] };
    expect(campaignSchema.safeParse(c).success).toBe(true);
    expect(campaignSchema.safeParse({ ...c, ageCutoffDate: '2027-02-29' }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...c, timezone: 'fuso inválido' }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...c, closesAt: c.opensAt }).success).toBe(false);
    expect(offeringSchema.safeParse({ stageId: 'x', documentStageKind: 'FIRST_EUCHARIST', plannedSeats: 10, minAge: 12, maxAge: 7, audience: 'MINOR' }).success).toBe(false);
  });
  it('rejeita janelas sobrepostas, ids repetidos e HTML', () => {
    const w = { id: 'a', weekday: 6, startTime: '09:00', endTime: '10:00', label: 'Manhã' };
    expect(offeredWindowsSchema.safeParse([w]).success).toBe(true);
    expect(offeredWindowsSchema.safeParse([w, { ...w, id: 'b', startTime: '09:30' }]).success).toBe(false);
    expect(offeredWindowsSchema.safeParse([{ ...w, label: '<b>x</b>' }]).success).toBe(false);
  });
});
