import { describe, expect, it, vi } from 'vitest';
vi.mock('../server/operations/registrationCampaignOperations', () => ({ assertRegistrationsPlan: vi.fn() }));
import { loadPublicRegistrationCampaign, validPublicRegistrationSlug } from '../server/api/registrationPublicCampaignLoader';

describe('acesso público a campanhas', () => {
  it('valida o slug e restringe token ao período aberto', async () => {
    expect(validPublicRegistrationSlug('campanha-2026')).toBe(true); expect(validPublicRegistrationSlug('inválido/')).toBe(false);
    process.env.REGISTRATIONS_ENABLED = 'true';
    const campaign = { parishId: 'p', status: 'OPEN', opensAt: new Date('2020-01-01'), closesAt: new Date('2099-01-01') };
    const context = { entities: { RegistrationCampaign: { findUnique: vi.fn().mockResolvedValue(campaign) } } };
    expect(await loadPublicRegistrationCampaign(context, 'teste', true)).toBe(campaign);
    context.entities.RegistrationCampaign.findUnique.mockResolvedValue({ ...campaign, status: 'CLOSED' });
    expect(await loadPublicRegistrationCampaign(context, 'teste', true)).toBeNull();
    expect(await loadPublicRegistrationCampaign(context, 'teste')).not.toBeNull();
  });
});
