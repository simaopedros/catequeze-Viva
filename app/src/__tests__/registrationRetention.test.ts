import { describe, expect, it, vi } from 'vitest';
import { REGISTRATION_DRAFT_RETENTION_DAYS, retentionCutoff } from '../shared/registrationRetention';

describe('retenção de inscrições', () => {
  it('calcula o limite de credenciais sem alterar a data de referência', () => {
    const now = new Date('2026-03-31T12:00:00Z');
    expect(retentionCutoff(now, REGISTRATION_DRAFT_RETENTION_DAYS).toISOString()).toBe('2026-03-01T12:00:00.000Z');
    expect(now.toISOString()).toBe('2026-03-31T12:00:00.000Z');
  });
});

const { permission } = vi.hoisted(() => ({ permission: vi.fn() }));
vi.mock('wasp/server', () => ({ HttpError: class extends Error { constructor(public statusCode: number) { super(); } } }));
vi.mock('../server/auth/registrationPermissions', () => ({ assertRegistrationsEnabled: vi.fn(), assertRegistrationPermission: permission }));
import { previewRegistrationRetention, getRegistrationOperationalReport } from '../server/operations/registrationRetentionOperations';

it('exige autorização antes de consultar a prévia', async () => {
  const count = vi.fn();
  const context = { user: { id: 'user' }, entities: { RegistrationCampaign: { findUnique: vi.fn().mockResolvedValue({ id: 'campaign', parishId: 'parish' }) }, RegistrationAccessToken: { count }, RegistrationSubmission: { count } } };
  permission.mockRejectedValueOnce(new Error('forbidden'));
  await expect(previewRegistrationRetention({ campaignId: 'campaign' }, context)).rejects.toThrow('forbidden');
  expect(count).not.toHaveBeenCalled();
});

it('retorna apenas contagens no relatório', async () => {
  const context = { user: { id: 'user' }, entities: { RegistrationCampaign: { findUnique: vi.fn().mockResolvedValue({ id: 'campaign', parishId: 'parish' }) }, RegistrationApplication: { groupBy: vi.fn().mockResolvedValue([{ status: 'ENROLLED', _count: { _all: 2 } }]) } } };
  await expect(getRegistrationOperationalReport({ campaignId: 'campaign' }, context)).resolves.toEqual({ counts: [{ status: 'ENROLLED', count: 2 }] });
  expect(permission).toHaveBeenCalledWith(context, { parishId: 'parish', action: 'VIEW_AGGREGATE_REPORTS' });
});
