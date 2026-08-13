/**
 * import-catechumens.test.ts — plan limits and birth-date validation on CSV import.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importCatechumensCSV } from '../server/operations/importOperations';

const PARISH_ID = 'parish-import-001';

function makeImportContext(opts?: {
  maxCatechumens?: number | null;
  enrolledCount?: number;
  parishType?: 'PARISH' | 'PERSONAL';
}) {
  const maxCatechumens = opts?.maxCatechumens ?? 2;
  const enrolledCount = opts?.enrolledCount ?? 1;
  const parishType = opts?.parishType ?? 'PARISH';

  return {
    user: { id: 'user-admin-00000001', isAdmin: true, email: 'admin@catequese.com' },
    entities: {
      Parish: {
        findUnique: vi.fn().mockResolvedValue({
          type: parishType,
          dioceseId: null,
          ownerId: 'owner-1',
        }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      TenantBilling: {
        findUnique: vi.fn().mockResolvedValue({
          plan: 'SINGLE',
          status: 'ACTIVE',
          trialEndsAt: null,
          maxClasses: 3,
          maxCatechumens,
          maxCatechists: 1,
          maxParishes: 1,
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      ClassEnrollment: {
        count: vi.fn().mockResolvedValue(enrolledCount),
      },
      ClassCatechist: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      User: {
        findUnique: vi.fn().mockResolvedValue({
          subscriptionStatus: 'active',
          subscriptionPlan: 'single',
          createdAt: new Date(),
          paymentProcessorUserId: 'cus_test',
        }),
      },
      Membership: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      CatechumenProfile: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    },
  };
}

describe('importCatechumensCSV plan limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws LIMIT when new rows would exceed maxCatechumens', async () => {
    const ctx = makeImportContext({ maxCatechumens: 2, enrolledCount: 1 });
    const csv = [
      'nome,sobrenome,nascimento',
      'Ana,Silva,2010-05-01',
      'Beto,Souza,2011-06-02',
    ].join('\n');

    await expect(
      importCatechumensCSV({ csvData: csv, parishId: PARISH_ID }, ctx),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('LIMIT:'),
    });
    expect(ctx.entities.CatechumenProfile.createMany).not.toHaveBeenCalled();
  });

  it('does not create a row whose birthDate is present but invalid', async () => {
    const ctx = makeImportContext({ maxCatechumens: 150, enrolledCount: 0 });
    const csv = [
      'nome,sobrenome,nascimento',
      'Ana,Silva,2010-05-01',
      'Beto,Souza,not-a-date',
    ].join('\n');

    const result = await importCatechumensCSV({ csvData: csv, parishId: PARISH_ID }, ctx);

    expect(result.created).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.details.some((d) => d.includes('nascimento inválida'))).toBe(true);
    expect(ctx.entities.CatechumenProfile.createMany).toHaveBeenCalledTimes(1);
    const payload = ctx.entities.CatechumenProfile.createMany.mock.calls[0][0];
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].firstName).toBe('Ana');
    expect(payload.data[0].birthDate).toBeInstanceOf(Date);
    expect(Number.isNaN(payload.data[0].birthDate.getTime())).toBe(false);
  });
});
