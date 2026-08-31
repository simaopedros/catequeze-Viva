/**
 * tenant-data-isolation.test.ts
 *
 * Regression tests for multi-tenant data leaks / IDOR fixes:
 * - listParishes never dumps all tenants (even for platform admin)
 * - listParishesAdmin is admin-only
 * - Cross-workspace reads/writes return 403
 *
 * Requires DATABASE_URL + seed_tests data.
 * Run: NODE_ENV=development npm run test:integration -- tenant-data-isolation
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  prisma,
  makeContext,
  USERS,
  PARISH_SAO_JOSE,
  PARISH_SANTA_MARIA,
  CLASS_CRISMA,
  CLASS_EUCARISTIA,
} from './setup';
import {
  listParishes,
  listParishesAdmin,
  searchParishesForOnboarding,
} from '../server/operations/parishOperations';
import { listParishCatechists } from '../server/operations/classOperations';
import { listContentItems } from '../server/operations/contentOperations';
import {
  listCatechumens,
  updateCatechumen,
} from '../server/operations/catechumenOperations';
import { getClassPastoralReport } from '../server/operations/pastoralReportOperations';
import { createHousehold } from '../server/operations/familyOperations';
import { uploadDocument } from '../server/operations/documentOperations';
import { sendMessageEmail } from '../server/operations/sendMessageOperation';
import { assertCanAccessContent } from '../server/auth/contentAccess';

const itDb =
  process.env.DATABASE_URL && process.env.NODE_ENV === 'development' ? it : it.skip;

/** Wasp-style entity map on top of Prisma (PascalCase). */
function makeOpContext(userKey: keyof typeof USERS) {
  const base = makeContext(userKey);
  const p = prisma as any;
  const entities = new Proxy(p, {
    get(target, prop: string | symbol) {
      if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
        const camel = prop.charAt(0).toLowerCase() + prop.slice(1);
        if (camel in target) return target[camel];
      }
      return Reflect.get(target, prop);
    },
  });
  return { ...base, entities };
}

describe('Tenant data isolation (leak / IDOR regressions)', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
  });

  describe('listParishes / listParishesAdmin', () => {
    itDb('coordinator only sees related parishes', async () => {
      const ctx = makeOpContext('coordSaoJose');
      const parishes = await listParishes(undefined as void, ctx);
      const ids = parishes.map((p: any) => p.id);
      expect(ids).toContain(PARISH_SAO_JOSE);
      expect(ids).not.toContain(PARISH_SANTA_MARIA);
    });

    itDb('platform admin listParishes is membership-scoped (no global dump)', async () => {
      const ctx = makeOpContext('admin');
      const allCount = await prisma.parish.count();
      const parishes = await listParishes(undefined as void, ctx);
      // Admin fixture may have zero memberships — must not equal full table dump
      expect(parishes.length).toBeLessThan(allCount);
    });

    itDb('listParishesAdmin returns all parishes for platform admin', async () => {
      const ctx = makeOpContext('admin');
      const parishes = await listParishesAdmin(undefined as void, ctx);
      const ids = parishes.map((p: any) => p.id);
      expect(ids).toContain(PARISH_SAO_JOSE);
      expect(ids).toContain(PARISH_SANTA_MARIA);
      expect(parishes.length).toBeGreaterThanOrEqual(2);
    });

    itDb('listParishesAdmin rejects non-admin', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(listParishesAdmin(undefined as void, ctx)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    itDb('searchParishesForOnboarding requires a filter', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        searchParishesForOnboarding({}, ctx),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('cross-tenant IDOR guards', () => {
    itDb('listParishCatechists denies foreign parishId', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        listParishCatechists({ parishId: PARISH_SANTA_MARIA }, ctx),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('listContentItems denies foreign workspaceId', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        listContentItems({ workspaceId: PARISH_SANTA_MARIA }, ctx),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('updateCatechumen denies cross-parish edit', async () => {
      const smCatechumen = await prisma.catechumenProfile.findFirst({
        where: { parishId: PARISH_SANTA_MARIA },
        select: { id: true },
      });
      expect(smCatechumen).toBeTruthy();
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        updateCatechumen(
          { id: smCatechumen!.id, firstName: 'Hacked' },
          ctx,
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('getClassPastoralReport denies foreign classId', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        getClassPastoralReport({ classId: CLASS_EUCARISTIA }, ctx),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('createHousehold denies foreign parishId', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        createHousehold(
          { name: 'Família Intrusa', parishId: PARISH_SANTA_MARIA },
          ctx,
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('uploadDocument denies foreign catechumenProfileId', async () => {
      const foreignId = 'cccccccc-9999-4ccc-a999-cccccccccccc';
      await prisma.catechumenProfile.create({
        data: {
          id: foreignId,
          firstName: 'Foreign',
          lastName: 'DocLeak',
          parishId: PARISH_SANTA_MARIA,
        },
      });
      try {
        const ctx = makeOpContext('coordSaoJose');
        await expect(
          uploadDocument(
            {
              name: 'doc.pdf',
              type: 'BAPTISM_CERTIFICATE',
              catechumenProfileId: foreignId,
              parishId: PARISH_SANTA_MARIA,
            },
            ctx,
          ),
        ).rejects.toMatchObject({ statusCode: 403 });
      } finally {
        await prisma.catechumenProfile.delete({ where: { id: foreignId } }).catch(() => {});
      }
    });

    itDb('sendMessageEmail rejects arbitrary recipient without workspace link', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        sendMessageEmail(
          {
            to: 'outsider@example.com',
            subject: 'spam',
            body: 'hello',
            workspaceId: PARISH_SAO_JOSE,
          },
          ctx,
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    itDb('sendMessageEmail requires workspaceId', async () => {
      const ctx = makeOpContext('coordSaoJose');
      await expect(
        sendMessageEmail(
          {
            to: 'coord.santamaria@catequese.com',
            subject: 'spam',
            body: 'hello',
          },
          ctx,
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('listCatechumens orphan isolation', () => {
    itDb('does not inject global orphan profiles into a workspace list', async () => {
      const orphan = await prisma.catechumenProfile.create({
        data: {
          firstName: 'Orphan',
          lastName: 'LeakTest',
          parishId: null,
          householdId: null,
        },
      });
      try {
        const ctx = makeOpContext('coordSaoJose');
        const rows = await listCatechumens(
          { workspaceId: PARISH_SAO_JOSE, take: 500 },
          ctx,
        );
        const list = Array.isArray(rows) ? rows : rows.items;
        expect(list.some((c: any) => c.id === orphan.id)).toBe(false);
      } finally {
        await prisma.catechumenProfile.delete({ where: { id: orphan.id } });
      }
    });
  });

  describe('assertCanAccessContent null parish', () => {
    itDb('denies non-creator access to unscoped content', async () => {
      const ctx = makeOpContext('coordSantaMaria');
      await expect(
        assertCanAccessContent(ctx, {
          parishId: null,
          createdById: USERS.coordSaoJose.id,
        }),
      ).rejects.toThrow('Você não tem acesso a este conteúdo.');
    });
  });

  describe('sanity: allowed same-tenant paths still work', () => {
    itDb('listParishCatechists allows own parish', async () => {
      const ctx = makeOpContext('coordSaoJose');
      const rows = await listParishCatechists({ parishId: PARISH_SAO_JOSE }, ctx);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
    });

    itDb('getClassPastoralReport allows own class', async () => {
      const ctx = makeOpContext('coordSaoJose');
      const report = await getClassPastoralReport({ classId: CLASS_CRISMA }, ctx);
      expect(report).toBeTruthy();
      expect(report.className).toBeTruthy();
    });
  });
});
