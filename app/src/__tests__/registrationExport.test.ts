import { beforeEach, describe, expect, it, vi } from 'vitest';
const { tx, permission } = vi.hoisted(() => ({ tx: { registrationApplication: { findMany: vi.fn() }, auditLog: { create: vi.fn() } }, permission: vi.fn() }));
vi.mock('wasp/server', () => ({ HttpError: class extends Error { constructor(public statusCode: number, message?: string) { super(message); } }, prisma: { $transaction: (fn: any) => fn(tx) } }));
vi.mock('../server/auth/registrationPermissions', () => ({ assertRegistrationsEnabled: vi.fn(), assertRegistrationPermission: permission }));
import { exportRegistrationApplications } from '../server/operations/registrationExportOperations';

const context = { user: { id: 'actor' }, entities: { RegistrationCampaign: { findUnique: vi.fn().mockResolvedValue({ id: 'campaign', parishId: 'parish' }) } } };
describe('exportação de inscrições', () => {
  beforeEach(() => { vi.clearAllMocks(); tx.registrationApplication.findMany.mockResolvedValue([{ id: 'app', firstName: '=formula', lastName: 'Private', birthDate: new Date('2010-01-01'), status: 'APPROVED', offeringId: 'offering', submission: { submittedAt: new Date('2026-01-01') } }]); });
  it('exige permissão e exporta apenas os campos escolhidos protegendo fórmulas', async () => {
    const result = await exportRegistrationApplications({ campaignId: 'campaign', fields: ['applicationId', 'firstName'], purpose: 'REGISTRATION_MANAGEMENT' }, context);
    expect(permission).toHaveBeenCalledWith(context, { parishId: 'parish', action: 'EXPORT_DATA' });
    expect(result.csv).toContain("'=formula");
    expect(result.csv).not.toContain('Private');
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain('formula');
  });
  it('não consulta inscrições quando falta permissão', async () => {
    permission.mockRejectedValueOnce(new Error('forbidden'));
    await expect(exportRegistrationApplications({ campaignId: 'campaign', fields: ['applicationId'], purpose: 'REGISTRATION_MANAGEMENT' }, context)).rejects.toThrow('forbidden');
    expect(tx.registrationApplication.findMany).not.toHaveBeenCalled();
  });
});
