import { expect, it, vi } from 'vitest';
vi.mock('wasp/server', () => ({ HttpError: class extends Error {}, prisma: {} }));
vi.mock('../server/email/events', () => ({ emitProductEventSafe: vi.fn() }));
import { getClassAttendanceMatrix } from '../server/operations/meetingOperations';

it('pages the full authorized class history beyond 80 meetings and 90 days', async () => {
  const rows = Array.from({ length: 161 }, (_, i) => ({ id: String(i), classId: 'c', date: new Date('2020-01-01'), attendance: [] }));
  const findMany = vi.fn(async (args: any) => {
    expect(args.where.classId).toBe('c');
    expect(args.where.date.gte).toBeUndefined();
    expect(args.where.status).toEqual({ not: 'CANCELLED' });
    expect(args.orderBy).toEqual([{ date: 'desc' }, { id: 'desc' }]);
    const offset = args.cursor ? rows.findIndex(r => r.id === args.cursor.id) + args.skip : 0;
    return rows.slice(offset, offset + args.take);
  });
  const ctx = { user: { id: 'admin', isAdmin: true }, entities: {
    CatechesisClass: { findUnique: vi.fn().mockResolvedValue({ parishId: 'w', catechists: [] }) },
    Parish: { findFirst: vi.fn().mockResolvedValue(null) },
    Membership: { findMany: vi.fn().mockResolvedValue([{ role: 'SUPER_ADMIN' }]) },
    Meeting: { findMany },
  } };
  const result: any[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await getClassAttendanceMatrix({ classId: 'c', allHistory: true, take: 80, cursor }, ctx);
    result.push(...page);
    if (page.length < 80) break;
    cursor = page.at(-1)?.id;
  }
  expect(result).toEqual(rows);
  expect(findMany).toHaveBeenCalledTimes(3);
});

it('keeps the explicit period for the recent export', async () => {
  const findMany = vi.fn().mockResolvedValue([]);
  const ctx = { user: { id: 'admin', isAdmin: true }, entities: {
    CatechesisClass: { findUnique: vi.fn().mockResolvedValue({ parishId: 'w', catechists: [] }) },
    Parish: { findFirst: vi.fn().mockResolvedValue(null) },
    Membership: { findMany: vi.fn().mockResolvedValue([{ role: 'SUPER_ADMIN' }]) },
    Meeting: { findMany },
  } };
  await getClassAttendanceMatrix({ classId: 'c', fromDate: '2026-01-01', toDate: '2026-04-01', take: 80 }, ctx);
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { classId: 'c', date: { gte: new Date('2026-01-01'), lt: new Date('2026-04-01') }, status: { not: 'CANCELLED' } },
    take: 80,
  }));
});
