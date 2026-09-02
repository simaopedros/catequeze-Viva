/**
 * Test setup — Database connection and user simulation helpers.
 * 
 * Uses the existing seed_test_data.js data. All test users have password "Teste@123".
 * 
 * User IDs and parish IDs are hardcoded from the seed script for speed.
 */

import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll } from 'vitest';

// ═══ Database ═══════════════════════════════════════════════════════════════════
export const prisma = new PrismaClient();

/**
 * Prisma/Wasp may populate DATABASE_URL from a generated .env even when
 * Postgres is not running. Probe once during setup (before test files are
 * collected) so skipIf(!DATABASE_URL) and $connect both stay consistent.
 */
async function probeDatabase() {
  const g = globalThis as unknown as { __catequeseDbProbed?: boolean };
  if (g.__catequeseDbProbed) return;
  g.__catequeseDbProbed = true;
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.$connect();
  } catch {
    console.warn(
      '[tests] DATABASE_URL is set but the database is unreachable; continuing without DB.',
    );
    delete process.env.DATABASE_URL;
  }
}

await probeDatabase();

beforeAll(async () => {
  if (process.env.DATABASE_URL) {
    await prisma.$connect();
  }
});

afterAll(async () => {
  if (process.env.DATABASE_URL) {
    await prisma.$disconnect();
  }
});

// ═══ Constants from seed ════════════════════════════════════════════════════════
export const PARISH_SAO_JOSE = 'aaaaaaaa-1111-4aaa-a111-aaaaaaaaaaaa';
export const PARISH_SANTA_MARIA = 'bbbbbbbb-2222-4bbb-b222-bbbbbbbbbbbb';
export const CLASS_CRISMA = 'test-class-crisma-001';
export const CLASS_INFANTIL = 'test-class-infantil-001';
export const CLASS_EUCARISTIA = 'test-class-eucaristia-001';

// ═══ User IDs (from seed_test_data.js) ═════════════════════════════════════════
export const USERS = {
  admin:             { id: 'user-admin-00000001', email: 'admin@catequese.com',              isAdmin: true },
  diocese:           { id: 'user-diocese-00001', email: 'diocese@catequese.com',             isAdmin: false },
  coordSaoJose:      { id: 'user-coord-sj-0001', email: 'coord.saojose@catequese.com',       isAdmin: false },
  coordSantaMaria:   { id: 'user-coord-sm-0001', email: 'coord.santamaria@catequese.com',    isAdmin: false },
  communityCoord:    { id: 'user-comm-sj-00001', email: 'coord.comunidade@catequese.com',    isAdmin: false },
  leadCatechist:     { id: 'user-lead-sj-00001', email: 'catequista.lead@catequese.com',     isAdmin: false },
  assistantCatechist:{ id: 'user-aux-sj-000001', email: 'catequista.aux@catequese.com',      isAdmin: false },
  catechistSantaMaria:{ id: 'user-lead-sm-00001', email: 'catequista.sta@catequese.com',     isAdmin: false },
  guardian:          { id: 'user-guard-0000001', email: 'responsavel@catequese.com',         isAdmin: false },
  catechumen:        { id: 'user-catech-000001', email: 'catequizando@catequese.com',        isAdmin: false },
  multirole:         { id: 'user-multi-0000001', email: 'multirole@catequese.com',           isAdmin: false },
  reviewer:          { id: 'user-review-000001', email: 'revisor@catequese.com',             isAdmin: false },
  viewer:            { id: 'user-viewer-000001', email: 'visitante@catequese.com',           isAdmin: false },
  catechistNoClass:  { id: 'user-lead-notur-001', email: 'catequista.sem.turma@catequese.com', isAdmin: false },
};

// ═══ Helper: Simulate context for server operations ═════════════════════════════
export function makeContext(userKey: keyof typeof USERS) {
  const u = USERS[userKey];
  return {
    user: { id: u.id, isAdmin: u.isAdmin, email: u.email },
    // Fresh object per context: Wasp hands every request its own `entities`,
    // and scope helpers (resolveUserScope) cache by that identity. Sharing the
    // bare prisma instance would leak one user's scope into the next test.
    entities: new Proxy({} as typeof prisma, {
      get: (_target, prop) => (prisma as any)[prop],
    }),
  };
}

// ═══ Helper: Get user's memberships ═════════════════════════════════════════════
export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { id: true, role: true, parishId: true },
  });
}
