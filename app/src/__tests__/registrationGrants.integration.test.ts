import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
vi.mock('wasp/server', async () => {
  const { PrismaClient } = await import('@prisma/client');
  return { prisma: new PrismaClient(), HttpError: class extends Error { constructor(public statusCode: number) { super(); } } };
});
import { grantRegistrationPermission, revokeRegistrationPermission } from '../server/operations/registrationGrantOperations';
import { assertRegistrationPermission } from '../server/auth/registrationPermissions';
import { prisma as opPrisma } from 'wasp/server';

const db = new PrismaClient();
const suffix = crypto.randomUUID();
const ids = { actor: `reg-actor-${suffix}`, target: `reg-target-${suffix}`, parish: `reg-parish-${suffix}`, other: `reg-other-${suffix}`, member: `reg-member-${suffix}` };
const entities = new Proxy(db as any, { get(target, key: string) { const name = key.charAt(0).toLowerCase() + key.slice(1); return Reflect.get(target, name); } });
const actor = { user: { id: ids.actor, isAdmin: false }, entities };
const target = { user: { id: ids.target, isAdmin: false }, entities };
describe.skipIf(!process.env.DATABASE_URL)('concessões de inscrições no banco local', () => {
  beforeAll(async () => {
    process.env.REGISTRATIONS_ENABLED = 'true';
    await db.user.createMany({ data: [{ id: ids.actor }, { id: ids.target }] });
    await db.parish.createMany({ data: [{ id: ids.parish, name: 'Paróquia de teste' }, { id: ids.other, name: 'Outra paróquia de teste' }] });
    await db.membership.createMany({ data: [
      { userId: ids.actor, parishId: ids.parish, role: 'PARISH_COORDINATOR' },
      { id: ids.member, userId: ids.target, parishId: ids.parish, role: 'PARISH_SECRETARY' },
      { userId: ids.target, parishId: ids.other, role: 'PARISH_SECRETARY' },
    ] });
  });
  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { userId: ids.actor } });
    await db.registrationPermissionGrant.deleteMany({ where: { membershipId: ids.member } });
    await db.membership.deleteMany({ where: { userId: { in: [ids.actor, ids.target] } } });
    await db.parish.deleteMany({ where: { id: { in: [ids.parish, ids.other] } } });
    await db.user.deleteMany({ where: { id: { in: [ids.actor, ids.target] } } });
    await db.$disconnect(); await opPrisma.$disconnect(); delete process.env.REGISTRATIONS_ENABLED;
  });
  it('concede, restringe à paróquia, audita e revoga', async () => {
    const action = 'APPROVE_ENROLLMENT' as const;
    await expect(grantRegistrationPermission({ membershipId: ids.member, action: 'MANAGE_ROLES_AND_GRANTS', reason: 'Teste' }, actor)).rejects.toMatchObject({ statusCode: 400 });
    await expect(grantRegistrationPermission({ membershipId: ids.member, action, reason: 'Teste' }, target)).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertRegistrationPermission(target, { parishId: ids.parish, action })).rejects.toMatchObject({ statusCode: 403 });
    const grant = await grantRegistrationPermission({ membershipId: ids.member, action, reason: 'Teste' }, actor);
    await expect(assertRegistrationPermission(target, { parishId: ids.parish, action })).resolves.toBeUndefined();
    await expect(assertRegistrationPermission(target, { parishId: ids.other, action })).rejects.toMatchObject({ statusCode: 403 });
    await db.membership.update({ where: { id: ids.member }, data: { status: 'SUSPENDED' } });
    await expect(assertRegistrationPermission(target, { parishId: ids.parish, action })).rejects.toMatchObject({ statusCode: 403 });
    await db.membership.update({ where: { id: ids.member }, data: { status: 'ACTIVE' } });
    await revokeRegistrationPermission({ grantId: grant.id, reason: 'Fim do teste' }, actor);
    await expect(assertRegistrationPermission(target, { parishId: ids.parish, action })).rejects.toMatchObject({ statusCode: 403 });
    expect(await db.auditLog.count({ where: { entityId: grant.id } })).toBe(2);
    delete process.env.REGISTRATIONS_ENABLED;
    await expect(grantRegistrationPermission({ membershipId: ids.member, action, reason: 'Teste' }, actor)).rejects.toMatchObject({ statusCode: 404 });
  });
});
