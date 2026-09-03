/**
 * Regression tests for critical security findings (static analysis).
 * DB cases require DATABASE_URL + NODE_ENV=development.
 */
import { describe, it, expect } from 'vitest';
import {
  prisma,
  makeContext,
  USERS,
  PARISH_SAO_JOSE,
  PARISH_SANTA_MARIA,
} from './setup';
import { executeParishMigration } from '../server/operations/migrationOperations';
import { createParish, updateParish } from '../server/operations/parishOperations';
import { uploadDocumentWithToken } from '../server/operations/uploadTokenOperations';
import { escapeCsvCell } from '../server/security/csvSafety';
import { buildAiCacheHash } from '../server/ai/cache';
import {
  encryptSecret,
  decryptSecret,
  isEncryptedSecret,
} from '../server/auth/secretCrypto';
import {
  assertNotLocked,
  recordAuthFailure,
  clearAuthFailures,
  getAuthAttemptConfig,
} from '../server/security/authAttemptGuard';

const itDb =
  process.env.DATABASE_URL && process.env.NODE_ENV === 'development' ? it : it.skip;

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

describe('CSV formula escape', () => {
  it('prefixes formula-like cells', () => {
    expect(escapeCsvCell('=CMD()')).toMatch(/^'/);
    expect(escapeCsvCell('+1+1')).toMatch(/^'/);
    expect(escapeCsvCell('-2+3')).toMatch(/^'/);
    expect(escapeCsvCell('@SUM(A1)')).toMatch(/^'/);
    expect(escapeCsvCell('Normal Name')).toBe('Normal Name');
  });
});

describe('TOTP secret encryption', () => {
  it('round-trips AES-GCM envelope', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const enc = encryptSecret(plain);
    expect(isEncryptedSecret(enc)).toBe(true);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc)).toBe(plain);
    // legacy plaintext still decrypts
    expect(decryptSecret(plain)).toBe(plain);
  });
});

describe('AI cache scope hash', () => {
  it('differs across users and workspaces for same prompt', () => {
    const a = buildAiCacheHash({
      prompt: 'What is baptism?',
      userId: 'u1',
      workspaceId: 'w1',
      model: 'm',
    });
    const b = buildAiCacheHash({
      prompt: 'What is baptism?',
      userId: 'u2',
      workspaceId: 'w1',
      model: 'm',
    });
    const c = buildAiCacheHash({
      prompt: 'What is baptism?',
      userId: 'u1',
      workspaceId: 'w2',
      model: 'm',
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('2FA attempt lockout', () => {
  it('locks after consecutive failures', () => {
    const key = `test-2fa-${Date.now()}`;
    clearAuthFailures(key);
    const { MAX_FAILURES } = getAuthAttemptConfig();
    for (let i = 0; i < MAX_FAILURES; i++) {
      recordAuthFailure(key);
    }
    expect(() => assertNotLocked(key)).toThrow();
    clearAuthFailures(key);
    expect(() => assertNotLocked(key)).not.toThrow();
  });
});

describe('Critical containment — parish migration', () => {
  itDb('coordinator of destination cannot migrate source', async () => {
    const ctx = makeOpContext('coordSaoJose');
    await expect(
      executeParishMigration(
        {
          sourceParishId: PARISH_SANTA_MARIA,
          targetParishId: PARISH_SAO_JOSE,
          confirmSourceParishId: PARISH_SANTA_MARIA,
          confirmTargetParishId: PARISH_SAO_JOSE,
          confirmation: 'CONFIRM_MIGRATE',
        },
        ctx,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  itDb('platform admin requires confirmation tokens', async () => {
    const ctx = makeOpContext('admin');
    await expect(
      executeParishMigration(
        {
          sourceParishId: PARISH_SANTA_MARIA,
          targetParishId: PARISH_SAO_JOSE,
          confirmSourceParishId: 'wrong',
          confirmTargetParishId: PARISH_SAO_JOSE,
          confirmation: 'CONFIRM_MIGRATE',
        },
        ctx,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('Critical containment — createParish role ignore', () => {
  it('rejects createParish without city or state', async () => {
    const ctx = makeOpContext('admin');
    await expect(
      createParish({ name: 'Paróquia Sem Local', city: 'Sorocaba' } as any, ctx),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      createParish({ name: 'Paróquia Sem Local', state: 'SP' } as any, ctx),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  itDb('client-supplied SUPER_ADMIN is ignored', async () => {
    // Platform admin bypasses plan limits; role still forced to PARISH_COORDINATOR
    const ctx = makeOpContext('admin');
    const name = `Iso Parish ${Date.now()}`;
    let createdId: string | null = null;
    try {
      const result = await createParish(
        {
          name,
          city: 'TestCity',
          state: 'SP',
          role: 'SUPER_ADMIN' as any,
        },
        ctx,
      );
      createdId = result.id;
      const membership = await prisma.membership.findFirst({
        where: { userId: USERS.admin.id, parishId: result.id },
      });
      expect(membership?.role).toBe('PARISH_COORDINATOR');
      expect(membership?.role).not.toBe('SUPER_ADMIN');
      expect(membership?.role).not.toBe('DIOCESE_ADMIN');
    } finally {
      if (createdId) {
        await prisma.membership.deleteMany({ where: { parishId: createdId } });
        await prisma.tenantBilling
          .deleteMany({ where: { parishId: createdId } })
          .catch(() => {});
        await prisma.parish.delete({ where: { id: createdId } }).catch(() => {});
      }
    }
  });
});

describe('Critical containment — updateParish role gate', () => {
  itDb('catechist cannot deactivate parish', async () => {
    const ctx = makeOpContext('leadCatechist');
    await expect(
      updateParish({ id: PARISH_SAO_JOSE, active: false }, ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  itDb('guardian cannot update parish name', async () => {
    const ctx = makeOpContext('guardian');
    await expect(
      updateParish({ id: PARISH_SAO_JOSE, name: 'Hacked' }, ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('Critical containment — legacy upload token op', () => {
  it('uploadDocumentWithToken always returns 410', async () => {
    await expect(
      uploadDocumentWithToken(
        {
          token: 'any',
          name: 'x',
          type: 'OTHER',
          fileBase64: 'AAAA',
        },
        { user: null, entities: {} },
      ),
    ).rejects.toMatchObject({ statusCode: 410 });
  });
});
