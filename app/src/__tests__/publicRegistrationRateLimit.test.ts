import { describe, it, expect, vi } from 'vitest';
vi.mock('wasp/server', () => ({ prisma: { $queryRaw: vi.fn().mockRejectedValue(new Error('unavailable')) }, HttpError: class extends Error {} }));
vi.mock('../server/logger', () => ({ logger: { warn: vi.fn() } }));
import { consumePersistentRateLimit, peekPersistentRateLimit } from '../server/security/persistentRateLimit';
describe('falhas do limitador persistente', () => {
 it('mantém fail-open por padrão e permite fail-closed explícito', async () => {
  const config = { scope: 'teste', max: 1, windowMs: 60000 };
  expect(await consumePersistentRateLimit('a', config)).toMatchObject({ allowed: true, failedOpen: true });
  expect(await consumePersistentRateLimit('a', { ...config, failClosed: true })).toMatchObject({ allowed: false, failedClosed: true, retryAfterSec: 60 });
  expect(await peekPersistentRateLimit('a', { ...config, failClosed: true })).toMatchObject({ allowed: false, failedClosed: true });
 });
});
